import fs from "fs";

const TEXT_EXTENSIONS = [".txt", ".md", ".csv", ".json", ".log", ".js", ".py", ".html", ".css"];
const MAX_TEXT_CHARS = 6000;

// Turns one uploaded file into a Gemini "part".
// - Images become an inlineData part (base64) so the model can see them.
// - Plain-text-ish files get their text read and inlined so the model can read them.
// - Anything else (pdf, docx, zip, etc.) is only referenced by name — this starter
//   project doesn't extract their text. Add pdf-parse / mammoth here if you need that.
export function attachmentToContentPart(attachment) {
  const { original_name, stored_path, mime_type } = attachment;
  const ext = original_name.slice(original_name.lastIndexOf(".")).toLowerCase();

  if (mime_type.startsWith("image/")) {
    const buffer = fs.readFileSync(stored_path);
    const base64 = buffer.toString("base64");
    return {
      inlineData: { mimeType: mime_type, data: base64 },
    };
  }

  if (TEXT_EXTENSIONS.includes(ext)) {
    let text = fs.readFileSync(stored_path, "utf-8");
    if (text.length > MAX_TEXT_CHARS) {
      text = text.slice(0, MAX_TEXT_CHARS) + "\n...[truncated]";
    }
    return {
      text: `--- File: ${original_name} ---\n${text}\n--- end of file ---`,
    };
  }

  return {
    text: `[User attached a file named "${original_name}" (${mime_type}). Its content could not be read automatically — ask the user to paste the relevant part if you need it.]`,
  };
}
