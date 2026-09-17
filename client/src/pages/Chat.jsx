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
  }

  async function handleSelect(id) {
    setActiveId(id);
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
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelect}
        onNewChat={handleNewChat}
        onRename={handleRename}
        onDelete={handleDelete}
        user={user}
        onLogout={logout}
      />

      <main className="chat-panel">
        <MessageList messages={messages} isThinking={isThinking} />
        {error && <div className="chat-error">{error}</div>}
        <Composer onSend={handleSend} disabled={isThinking} />
      </main>
    </div>
  );
}
