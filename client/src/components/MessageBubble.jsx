function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const images = (message.attachments || []).filter((a) => a.mime_type?.startsWith("image/"));
  const files = (message.attachments || []).filter((a) => !a.mime_type?.startsWith("image/"));

  return (
    <div className={`message-row ${isUser ? "from-user" : "from-assistant"}`}>
      <div className="avatar">{isUser ? "You" : "AI"}</div>
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

        {message.content && <p className="message-text">{message.content}</p>}
      </div>
    </div>
  );
}
