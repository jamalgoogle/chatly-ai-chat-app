import { useEffect, useState } from "react";

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Reveals `text` a few characters at a time. Only runs when `enabled` is
// true (the message that just arrived) — history loaded from the server
// shows instantly.
function useTypewriter(text, enabled) {
  const [shown, setShown] = useState(enabled ? "" : text || "");

  useEffect(() => {
    if (!enabled || !text) {
      setShown(text || "");
      return;
    }
    setShown("");
    let i = 0;
    const step = Math.max(1, Math.round(text.length / 220)); // keep long replies snappy
    const id = setInterval(() => {
      i += step;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 15);
    return () => clearInterval(id);
  }, [text, enabled]);

  return shown;
}

// Strips leftover Markdown syntax (**bold**, *italic*, "* " bullets) so
// text always renders plain, even for older saved messages.
function stripMarkdown(text) {
  if (!text) return text;
  return text
    .replace(/^(\s*)\*\s+/gm, "$1- ")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1");
}

export default function MessageBubble({ message, animate = false }) {
  const isUser = message.role === "user";
  const images = (message.attachments || []).filter((a) => a.mime_type?.startsWith("image/"));
  const files = (message.attachments || []).filter((a) => !a.mime_type?.startsWith("image/"));
  const cleanContent = stripMarkdown(message.content);
  const revealAssistantText = useTypewriter(cleanContent, animate && !isUser);
  const displayText = isUser ? cleanContent : revealAssistantText;
  const stillTyping = animate && !isUser && displayText.length < (cleanContent || "").length;

  return (
    <div className={`message-row ${isUser ? "from-user" : "from-assistant"}`}>
      <div className="message-bubble">
        {images.length > 0 && (
          <div className="image-grid">
            {images.map((img) => (
              <a key={img.id} href={img.url} target="_blank" rel="noreferrer">
                <img src={img.url} alt={img.original_name} />
              </a>
            ))}
          </div>
        )}

        {files.length > 0 && (
          <div className="file-chip-list">
            {files.map((f) => (
              <a key={f.id} className="file-chip" href={f.url} target="_blank" rel="noreferrer">
                <span className="file-icon">📄</span>
                <span className="file-name">{f.original_name}</span>
                <span className="file-size">{formatSize(f.size_bytes)}</span>
              </a>
            ))}
          </div>
        )}

        {message.content && (
          <p className="message-text">
            {displayText}
            {stillTyping && <span className="type-cursor" />}
          </p>
        )}
      </div>
    </div>
  );
}