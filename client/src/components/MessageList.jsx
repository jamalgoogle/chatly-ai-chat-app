import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble.jsx";

export default function MessageList({ messages, isThinking, revealId }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  if (messages.length === 0 && !isThinking) {
    return (
      <div className="message-list empty-state">
        <div className="empty-state-inner">
          <h2>Start a conversation</h2>
          <p>Ask a question, or attach an image or file to talk about.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} animate={m.id === revealId} />
      ))}

      {isThinking && (
        <div className="message-row from-assistant">
          <div className="message-bubble">
            <span className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}