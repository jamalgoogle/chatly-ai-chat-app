import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { getAssistantReply } from "../utils/ai.js";
import { attachmentToContentPart } from "../utils/fileParser.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB per file
});

const router = Router();
router.use(requireAuth);

// Make sure a conversation belongs to the logged-in user before touching it.
async function loadOwnedConversation(conversationId, userId) {
  const [rows] = await pool.query(
    "SELECT id, title FROM conversations WHERE id = ? AND user_id = ?",
    [conversationId, userId]
  );
  return rows[0] || null;
}

router.get("/", asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id, title, created_at, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC",
    [req.userId]
  );
  res.json({ conversations: rows });
}));

router.post("/", asyncHandler(async (req, res) => {
  const [result] = await pool.query(
    "INSERT INTO conversations (user_id, title) VALUES (?, 'New chat')",
    [req.userId]
  );
  res.status(201).json({ id: result.insertId, title: "New chat" });
}));

router.patch("/:id", asyncHandler(async (req, res) => {
  const convo = await loadOwnedConversation(req.params.id, req.userId);
  if (!convo) return res.status(404).json({ error: "Conversation not found" });

  const title = (req.body.title || "").trim().slice(0, 255);
  if (!title) return res.status(400).json({ error: "Title cannot be empty" });

  await pool.query("UPDATE conversations SET title = ? WHERE id = ?", [title, convo.id]);
  res.json({ id: convo.id, title });
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const convo = await loadOwnedConversation(req.params.id, req.userId);
  if (!convo) return res.status(404).json({ error: "Conversation not found" });

  await pool.query("DELETE FROM conversations WHERE id = ?", [convo.id]);
  res.json({ ok: true });
}));

router.get("/:id/messages", asyncHandler(async (req, res) => {
  const convo = await loadOwnedConversation(req.params.id, req.userId);
  if (!convo) return res.status(404).json({ error: "Conversation not found" });

  const [messages] = await pool.query(
    "SELECT id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY id ASC",
    [convo.id]
  );

  if (messages.length > 0) {
    const ids = messages.map((m) => m.id);
    const [attachments] = await pool.query(
      `SELECT id, message_id, original_name, mime_type, size_bytes, stored_path
       FROM attachments WHERE message_id IN (?)`,
      [ids]
    );
    const byMessage = {};
    for (const a of attachments) {
      (byMessage[a.message_id] ||= []).push(a);
    }
    for (const m of messages) {
      m.attachments = (byMessage[m.id] || []).map((a) => ({
        ...a,
        url: `/uploads/${path.basename(a.stored_path || "")}`,
      }));
    }
  }

  res.json({ conversation: convo, messages });
}));

// Send a message: multipart/form-data with a "content" text field and
// optional "files" (up to 5). Saves the user message + attachments, asks
// Gemini for a reply using the whole conversation as context, saves and
// returns the assistant's reply too.
router.post("/:id/messages", upload.array("files", 5), asyncHandler(async (req, res) => {
  const convo = await loadOwnedConversation(req.params.id, req.userId);
  if (!convo) return res.status(404).json({ error: "Conversation not found" });

  const content = (req.body.content || "").trim();
  const files = req.files || [];
  if (!content && files.length === 0) {
    return res.status(400).json({ error: "Message is empty" });
  }

  const [userMsgResult] = await pool.query(
    "INSERT INTO messages (conversation_id, role, content) VALUES (?, 'user', ?)",
    [convo.id, content]
  );
  const userMessageId = userMsgResult.insertId;

  const savedAttachments = [];
  for (const file of files) {
    const [attResult] = await pool.query(
      `INSERT INTO attachments (message_id, original_name, stored_path, mime_type, size_bytes)
       VALUES (?, ?, ?, ?, ?)`,
      [userMessageId, file.originalname, file.path, file.mimetype, file.size]
    );
    savedAttachments.push({
      id: attResult.insertId,
      message_id: userMessageId,
      original_name: file.originalname,
      stored_path: file.path,
      mime_type: file.mimetype,
      size_bytes: file.size,
    });
  }

  // Build conversation history for Gemini, oldest first.
  const [priorMessages] = await pool.query(
    "SELECT id, role, content FROM messages WHERE conversation_id = ? AND id < ? ORDER BY id ASC",
    [convo.id, userMessageId]
  );

  const history = priorMessages.map((m) => ({ role: m.role, content: m.content || "" }));

  const userContentParts = [];
  if (content) userContentParts.push({ text: content });
  for (const att of savedAttachments) userContentParts.push(attachmentToContentPart(att));

  history.push({
    role: "user",
    content: userContentParts.length === 1 && userContentParts[0].text !== undefined
      ? userContentParts[0].text
      : userContentParts,
  });

  let replyText;
  try {
    replyText = await getAssistantReply(history);
  } catch (err) {
    console.error("AI reply error:", err);
    return res.status(503).json({ error: err.message || "Could not get a reply from the AI service." });
  }

  const [assistantMsgResult] = await pool.query(
    "INSERT INTO messages (conversation_id, role, content) VALUES (?, 'assistant', ?)",
    [convo.id, replyText]
  );

  await pool.query("UPDATE conversations SET updated_at = NOW() WHERE id = ?", [convo.id]);

  // Auto-title a brand new chat from the first message.
  if (convo.title === "New chat" && content) {
    const autoTitle = content.slice(0, 60);
    await pool.query("UPDATE conversations SET title = ? WHERE id = ?", [autoTitle, convo.id]);
  }

  res.status(201).json({
    userMessage: {
      id: userMessageId,
      role: "user",
      content,
      attachments: savedAttachments.map((a) => ({
        id: a.id,
        original_name: a.original_name,
        mime_type: a.mime_type,
        size_bytes: a.size_bytes,
        url: `/uploads/${path.basename(a.stored_path)}`,
      })),
    },
    assistantMessage: {
      id: assistantMsgResult.insertId,
      role: "assistant",
      content: replyText,
    },
  });
}));

export default router;
