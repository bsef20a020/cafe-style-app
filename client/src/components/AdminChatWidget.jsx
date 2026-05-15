import { BarChart3, Loader2, MessageCircle, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";

const STORAGE_KEY = "noffelo_admin_chat_v1";

const welcomeMessage = {
  id: "admin-welcome",
  role: "assistant",
  content: "Admin assistant ready. Ask about orders, revenue, reservations, or menu performance."
};

const suggestedQuestions = ["Today's orders?", "Revenue this week?", "Pending orders?"];

function readStoredMessages() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) && parsed.length ? parsed : [welcomeMessage];
  } catch (_error) {
    return [welcomeMessage];
  }
}

function compactHistory(messages) {
  return messages
    .filter((message) => ["user", "assistant"].includes(message.role) && message.id !== "admin-welcome")
    .slice(-10)
    .map(({ role, content }) => ({ role, content }));
}

function makeMessage(role, content) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content
  };
}

export default function AdminChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(readStoredMessages);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const messageListRef = useRef(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-20)));
    } catch (_error) {
      // Chat history is a convenience only.
    }
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    const list = messageListRef.current;
    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }, [messages, loading, open]);

  async function sendMessage(text) {
    const content = String(text || draft).trim();
    if (!content || loading) return;

    const userMessage = makeMessage("user", content);
    const history = compactHistory(messages);

    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setLoading(true);

    try {
      const data = await api.adminChat({ message: content, history });
      setMessages((current) => [...current, makeMessage("assistant", data.reply || "No admin insight was returned.")]);
    } catch (error) {
      const message =
        error.status === 401
          ? "Your admin session expired. Please sign in again."
          : "Admin assistant could not load right now.";
      setMessages((current) => [...current, makeMessage("assistant", message)]);
    } finally {
      setLoading(false);
    }
  }

  function submitForm(event) {
    event.preventDefault();
    sendMessage();
  }

  return (
    <div className="chat-widget admin-chat-widget">
      {open ? (
        <section className="chat-panel admin-chat-panel" aria-label="NOFFELO admin chat assistant">
          <header className="chat-panel-header">
            <div>
              <span>NOFFELO Admin</span>
              <strong>Business assistant</strong>
            </div>
            <button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="Close admin chat">
              <X size={18} />
            </button>
          </header>

          <div className="chat-messages" ref={messageListRef} aria-live="polite">
            {messages.map((message) => (
              <article className={`chat-message ${message.role}`} key={message.id}>
                <p>{message.content}</p>
              </article>
            ))}
            {loading ? (
              <article className="chat-message assistant is-typing">
                <Loader2 className="spin" size={15} />
                <p>Checking live data</p>
              </article>
            ) : null}
          </div>

          <div className="chat-quick-replies" aria-label="Suggested admin questions">
            {suggestedQuestions.map((question) => (
              <button key={question} type="button" onClick={() => sendMessage(question)} disabled={loading}>
                {question}
              </button>
            ))}
          </div>

          <form className="chat-form" onSubmit={submitForm}>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about revenue, orders..."
              aria-label="Message admin assistant"
            />
            <button className="icon-button" type="submit" disabled={!draft.trim() || loading} aria-label="Send admin message">
              {loading ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
            </button>
          </form>
        </section>
      ) : null}

      <button className="chat-launcher admin-chat-launcher" type="button" onClick={() => setOpen(true)} aria-label="Open admin chat" title="Admin chat">
        <MessageCircle size={22} />
        <BarChart3 size={16} />
      </button>
    </div>
  );
}
