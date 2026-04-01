import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import "./MessagesPage.css";

import { API_BASE, API_ORIGIN } from "../config.js";

// Deduplicate conversations: keep only the latest per seller (by shopName)
function deduplicateConversations(convs) {
  const map = new Map();
  for (const c of convs) {
    const key = c.sellerId || c.shopName || c._id;
    const existing = map.get(key);
    if (!existing || new Date(c.updatedAt) > new Date(existing.updatedAt)) {
      map.set(key, c);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  );
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "2-digit", month: "short" });
}

function getInitials(name = "") {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}

const AVATAR_COLORS = [
  "#5c6b3a","#7a6248","#3a6b5c","#6b3a5c","#3a4f6b","#6b5a3a","#4a6b3a","#6b3a3a",
];
function avatarColor(name = "") {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function MessagesPage({ user, initialChatContext, onBack }) {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [senderNames, setSenderNames] = useState({});
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const socket = useMemo(() => io(API_ORIGIN, { withCredentials: true }), []);

  useEffect(() => () => socket.disconnect(), [socket]);

  useEffect(() => {
    socket.emit("chat:join-user", user?.id);
  }, [socket, user?.id]);

  // Phase 5: Resolve sender name from ID
  const resolveSenderName = async (senderId, conversation) => {
    if (senderNames[senderId]) return senderNames[senderId];
    
    // Check if sender is conversation buyer or seller
    if (senderId === conversation?.buyerId) {
      const res = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const name = `${data.user?.firstName || "Buyer"} ${data.user?.lastName || ""}`.trim();
        setSenderNames(prev => ({ ...prev, [senderId]: name }));
        return name;
      }
    } else if (senderId === conversation?.sellerId) {
      // For seller, they're the shop owner
      return conversation?.shopName || "Shop Owner";
    }
    return "User";
  };

  useEffect(() => {
    // Phase 5: Pre-fetch sender names for current messages
    if (activeConversation && messages.length) {
      messages.forEach(m => {
        if (!senderNames[m.senderId]) {
          resolveSenderName(m.senderId, activeConversation).catch(() => {});
        }
      });
    }
  }, [activeConversation?._id, messages.length, senderNames]);

  const loadConversations = async () => {
    const res = await fetch(`${API_BASE}/chat/conversations`, { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    setConversations(data.conversations || []);
  };

  const deleteConversation = async (conversationId, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this conversation? This action cannot be undone.")) return;
    
    try {
      const res = await fetch(`${API_BASE}/chat/conversations/${conversationId}`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (res.ok) {
        // Remove from local state
        setConversations((prev) => prev.filter((c) => c._id !== conversationId));
        // Clear active conversation if it was deleted
        if (activeConversation?._id === conversationId) {
          setActiveConversation(null);
          setMessages([]);
        }
      } else {
        alert("Failed to delete conversation.");
      }
    } catch {
      alert("Network error. Please try again.");
    }
  };

  const loadMessages = async (conversationId) => {
    const res = await fetch(`${API_BASE}/chat/conversations/${conversationId}/messages`, { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    setActiveConversation(data.conversation);
    setMessages(data.messages || []);
    socket.emit("chat:join-conversation", conversationId);
  };

  useEffect(() => {
    loadConversations().catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeConversation && conversations.length > 0) {
      loadMessages(conversations[0]._id).catch(() => {});
    }
  }, [conversations]);

  useEffect(() => {
    if (!initialChatContext) return;
    const start = async () => {
      const res = await fetch(`${API_BASE}/chat/conversations/get-or-create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sellerId: initialChatContext.sellerId,
          shopName: initialChatContext.shopName || "",
          sellerEmail: initialChatContext.sellerEmail || "",
          productId: initialChatContext.productId || "",
          productName: initialChatContext.productName || "",
          productPrice: Number(initialChatContext.productPrice) || 0,
          createIntentCard: !!initialChatContext.createIntentCard,
          createCheckoutSummary: !!initialChatContext.createCheckoutSummary,
          checkoutItems: initialChatContext.checkoutItems || [],
          checkoutTotal: Number(initialChatContext.checkoutTotal) || 0,
          orderId: initialChatContext.orderId || "",
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      await loadConversations();
      await loadMessages(data.conversation._id);
    };
    start().catch(() => {});
  }, [initialChatContext, user?.id]);

  useEffect(() => {
    const onMessage = (message) => {
      if (message.conversationId === activeConversation?._id) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === message._id)) return prev;
          const stripped = prev.filter((m) => !(m.pending && m.text === message.text && m.senderId === message.senderId));
          return [...stripped, message];
        });
      }
    };
    const onConversationUpdated = () => loadConversations().catch(() => {});
    socket.on("chat:message", onMessage);
    socket.on("chat:conversation-updated", onConversationUpdated);
    return () => {
      socket.off("chat:message", onMessage);
      socket.off("chat:conversation-updated", onConversationUpdated);
    };
  }, [socket, activeConversation?._id]);

  // Auto-scroll to the newest bubble whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    // Limit to 5 images total
    const totalImages = selectedImages.length + files.length;
    if (totalImages > 5) {
      alert("Maximum 5 images allowed.");
      return;
    }
    
    const newImages = [...selectedImages, ...files];
    setSelectedImages(newImages);
    
    // Create previews
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews([...imagePreviews, ...newPreviews]);
  };

  const removeSelectedImage = (index) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    
    // Revoke object URL to free memory
    URL.revokeObjectURL(imagePreviews[index]);
    
    setSelectedImages(newImages);
    setImagePreviews(newPreviews);
  };

  const sendMessage = async () => {
    if (!activeConversation?._id) return;
    
    const text = draft.trim();
    
    // Allow sending if there's text OR images
    if (!text && selectedImages.length === 0) return;
    
    const tempId = `pending-${Date.now()}`;
    
    // Handle uploaded images (now from Cloudinary - full HTTPS URLs)
    const images = selectedImages.map(file => file.secure_url) || [];
    const optimisticMessage = {
      _id: tempId,
      text,
      senderId: user?.id,
      senderRole: user?.role || "buyer",
      pending: true,
      images: imagePreviews,
    };
    
    setMessages((prev) => [...prev, optimisticMessage]);
    setDraft("");
    setSelectedImages([]);
    setImagePreviews([]);
    
    try {
      // Use FormData for image uploads
      const formData = new FormData();
      if (text) formData.append("text", text);
      selectedImages.forEach(file => formData.append("images", file));
      
      const res = await fetch(`${API_BASE}/chat/conversations/${activeConversation._id}/messages`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.message) {
        setMessages((prev) => {
          const without = prev.filter((m) => m._id !== tempId);
          if (without.some((m) => m._id === data.message._id)) return without;
          return [...without, data.message];
        });
      } else {
        setMessages((prev) => prev.filter((m) => m._id !== tempId));
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
    }
  };

  return (
    <div className="messages-page">
      <div className="messages-topbar">
        <button onClick={onBack} className="messages-back">← Back</button>
        <h2>Messages</h2>
      </div>
      <div className="messages-layout">
        <aside className="messages-list">
          <div className="messages-list-header">
            <span>Chats</span>
          </div>
          {deduplicateConversations(conversations).map((c) => {
            const name = c.shopName || c.productName || "Conversation";
            const isActive = activeConversation?._id === c._id;
            const lastMsg = c.lastMessage || "No messages yet";
            const time = formatTime(c.updatedAt);
            return (
              <button
                key={c._id}
                type="button"
                className={`conv-item ${isActive ? "active" : ""}`}
                onClick={() => loadMessages(c._id)}
              >
                <div
                  className="conv-avatar"
                  style={{ background: avatarColor(name) }}
                >
                  {getInitials(name)}
                </div>
                <div className="conv-info">
                  <div className="conv-row-top">
                    <span className="conv-title">{name}</span>
                    <span className="conv-time">{time}</span>
                  </div>
                  <div className="conv-row-bottom">
                    <span className="conv-sub">{lastMsg}</span>
                  </div>
                </div>
                <span
                  className="conv-delete"
                  onClick={(e) => deleteConversation(c._id, e)}
                  title="Delete conversation"
                >
                  🗑️
                </span>
              </button>
            );
          })}
        </aside>
        <section className="messages-chat">
          {activeConversation ? (
            <>
              <div className="chat-header">
                <div>
                  <strong>{activeConversation.shopName || activeConversation.productName || "Chat"}</strong>
                  {activeConversation.shopName && activeConversation.productName && (
                    <div className="chat-header-sub">{activeConversation.productName}</div>
                  )}
                </div>
                <span>₹{Number(activeConversation.productPrice || 0).toLocaleString()}</span>
              </div>
              <div className="chat-body">
                {messages.map((m) => (
                  <div key={m._id} className={`bubble ${m.senderId === user?.id ? "mine" : ""} ${m.pending ? "pending" : ""}`}>
                    {/* Show sender identity unless it's the user's own message */}
                    {m.senderId !== user?.id && (
                      <div style={{ fontSize: "0.85em", fontWeight: "600", marginBottom: "4px", opacity: 0.7 }}>
                        {senderNames[m.senderId] || "User"}
                      </div>
                    )}
                    <div>{m.text}</div>
                    {/* Display attached images */}
                    {m.images?.length > 0 && (
                      <div className="message-images">
                        {m.images.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`Attachment ${idx + 1}`}
                            className="message-image"
                            onClick={() => window.open(img, "_blank")}
                          />
                        ))}
                      </div>
                    )}
                    {/* Checkout summary card */}
                    {m.meta?.cardType === "checkout_summary" && m.meta?.lineItems?.length > 0 && (
                      <ul className="bubble-cart-list">
                        {m.meta.lineItems.map((line, idx) => (
                          <li key={idx}>
                            {line.name} ×{line.quantity} — ₹{(Number(line.price) * line.quantity).toLocaleString()}
                          </li>
                        ))}
                      </ul>
                    )}
                    {/* Purchase intent card */}
                    {m.meta?.cardType === "purchase_intent" && (
                      <div style={{ marginTop: "8px", padding: "8px", backgroundColor: "#f5f5f5", borderRadius: "6px", fontSize: "0.9em" }}>
                        <strong>Item:</strong> {m.meta.productName || "Item"}<br/>
                        <strong>Price:</strong> ₹{Number(m.meta.productPrice || 0).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="chat-input-area">
                {/* Image previews before sending */}
                {imagePreviews.length > 0 && (
                  <div className="image-preview-row">
                    {imagePreviews.map((preview, idx) => (
                      <div key={idx} className="preview-thumb">
                        <img src={preview} alt={`Preview ${idx + 1}`} />
                        <button
                          type="button"
                          className="remove-image"
                          onClick={() => removeSelectedImage(idx)}
                          title="Remove image"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="chat-input">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    style={{ display: "none" }}
                  />
                  <button
                    type="button"
                    className="attach-btn"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach images"
                  >
                    📎
                  </button>
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    placeholder="Type a message…"
                  />
                  <button onClick={sendMessage}>Send</button>
                </div>
              </div>
            </>
          ) : (
            <div className="chat-empty">Select a conversation to start messaging.</div>
          )}
        </section>
      </div>
    </div>
  );
}
