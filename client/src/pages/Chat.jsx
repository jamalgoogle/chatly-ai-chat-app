import { useEffect, useState, useCallback } from "react";
import api from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import Sidebar from "../components/Sidebar.jsx";
import MessageList from "../components/MessageList.jsx";
import Composer from "../components/Composer.jsx";

export default function Chat() {
  const { user, logout } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState("");
  const [revealId, setRevealId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadConversations = useCallback(async () => {
    const { data } = await api.get("/conversations");
    setConversations(data.conversations);
    return data.conversations;
  }, []);

  useEffect(() => {
    loadConversations().then((convos) => {
      if (convos.length > 0) setActiveId(convos[0].id);
    });
  }, [loadConversations]);

  useEffect(() => {
    setRevealId(null);
    if (!activeId) {
      setMessages([]);
      return;
    }
    api.get(`/conversations/${activeId}/messages`).then(({ data }) => {
      setMessages(data.messages);
    });
  }, [activeId]);

  async function handleNewChat() {
    const { data } = await api.post("/conversations");
    setConversations((prev) => [{ ...data, updated_at: new Date().toISOString() }, ...prev]);
    setActiveId(data.id);
    setMessages([]);
    setSidebarOpen(false);
  }

  async function handleSelect(id) {
    setActiveId(id);
    setSidebarOpen(false);
  }

  async function handleRename(id, title) {
    await api.patch(`/conversations/${id}`, { title });
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }

  async function handleDelete(id) {
    await api.delete(`/conversations/${id}`);
    const remaining = conversations.filter((c) => c.id !== id);
    setConversations(remaining);
    if (activeId === id) {
      setActiveId(remaining[0]?.id ?? null);
    }
  }

  async function handleSend(text, files) {
    setError("");
    let conversationId = activeId;

    if (!conversationId) {
      const { data } = await api.post("/conversations");
      conversationId = data.id;
      setActiveId(conversationId);
      setConversations((prev) => [{ ...data, updated_at: new Date().toISOString() }, ...prev]);
    }

    const formData = new FormData();
    formData.append("content", text);
    files.forEach((f) => formData.append("files", f));

    setIsThinking(true);
    try {
      const { data } = await api.post(`/conversations/${conversationId}/messages`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessages((prev) => [...prev, data.userMessage, data.assistantMessage]);
      setRevealId(data.assistantMessage.id);
      loadConversations();
    } catch (err) {
      setError(err.response?.data?.error || "Could not send that message. Try again.");
    } finally {
      setIsThinking(false);
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        className={sidebarOpen ? "open" : ""}
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelect}
        onNewChat={handleNewChat}
        onRename={handleRename}
        onDelete={handleDelete}
        user={user}
        onLogout={logout}
      />

      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      <main className="chat-panel">
        <div className="mobile-topbar">
          <button
            className="sidebar-toggle-btn"
            aria-label={sidebarOpen ? "Close chat list" : "Open chat list"}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            ☰
          </button>
          <span className="mobile-topbar-title">Chatly</span>
        </div>

        <MessageList messages={messages} isThinking={isThinking} revealId={revealId} />
        {error && <div className="chat-error">{error}</div>}
        <Composer onSend={handleSend} disabled={isThinking} />
      </main>
    </div>
  );
}