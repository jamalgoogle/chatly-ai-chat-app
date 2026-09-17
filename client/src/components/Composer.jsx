import { useRef, useState } from "react";

export default function Composer({ onSend, disabled }) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  function handleFilePick(e) {
    const picked = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...picked].slice(0, 5));
    e.target.value = "";
  }

  function removeFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed && files.length === 0) return;
    if (disabled) return;

    await onSend(trimmed, files);
    setText("");
    setFiles([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="composer">
      {files.length > 0 && (
        <div className="composer-file-list">
          {files.map((f, i) => (
            <div key={i} className="composer-file-chip">
              <span>{f.name}</span>
              <button onClick={() => removeFile(i)}>✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="composer-row">
        <button
          className="attach-btn"
          title="Attach images or files"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          📎
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={handleFilePick}
          accept="image/*,.pdf,.txt,.md,.csv,.json,.doc,.docx,.log"
        />

        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Message the assistant…"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            autoResize();
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />

        <button className="send-btn" onClick={handleSend} disabled={disabled}>
          {disabled ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
