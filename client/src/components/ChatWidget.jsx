import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";

const STORAGE_KEY = "noffelo_customer_chat_v1";

const welcomeMessage = {
  id: "welcome",
  role: "assistant",
  content: "Hi, I am NOFFELO assistant. Ask me about the menu, orders, reservations, or cafe info."
};

const quickReplies = [
  { label: "See Menu", message: "Recommend something from the menu" },
  { label: "Track Order", message: "I want to track my order" },
  { label: "Book Table", message: "I want to book a table" },
  { label: "Help", message: "What can you help me with?" }
];

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
    .filter((message) => ["user", "assistant"].includes(message.role) && message.id !== "welcome")
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

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(readStoredMessages);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const messageListRef = useRef(null);

  const canSend = draft.trim().length > 0 && !loading;
  const visibleQuickReplies = useMemo(() => quickReplies.slice(0, 4), []);

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
      const data = await api.customerChat({ message: content, history });
      setMessages((current) => [...current, makeMessage("assistant", data.reply || "I could not prepare an answer.")]);
    } catch (_error) {
      setMessages((current) => [
        ...current,
        makeMessage("assistant", "I could not reach the cafe assistant right now. Please try again.")
      ]);
    } finally {
      setLoading(false);
    }
  }

  function submitForm(event) {
    event.preventDefault();
    sendMessage();
  }

  return (
    <div className="chat-widget customer-chat-widget">
      {open ? (
        <section className="chat-panel" aria-label="NOFFELO chat assistant">
          <header className="chat-panel-header">
            <div>
              <span>NOFFELO</span>
              <strong>Cafe assistant</strong>
            </div>
            <button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="Close chat">
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
                <p>Thinking</p>
              </article>
            ) : null}
          </div>

          <div className="chat-quick-replies" aria-label="Quick replies">
            {visibleQuickReplies.map((reply) => (
              <button key={reply.label} type="button" onClick={() => sendMessage(reply.message)} disabled={loading}>
                {reply.label}
              </button>
            ))}
          </div>

          <form className="chat-form" onSubmit={submitForm}>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about menu, order, table..."
              aria-label="Message NOFFELO assistant"
            />
            <button className="icon-button" type="submit" disabled={!canSend} aria-label="Send message">
              {loading ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
            </button>
          </form>
        </section>
      ) : null}

      <button className="chat-launcher" type="button" onClick={() => setOpen(true)} aria-label="Open cafe chat" title="Chat">
        <MessageCircle size={22} />
        <Bot size={16} />
      </button>
    </div>
  );
}
