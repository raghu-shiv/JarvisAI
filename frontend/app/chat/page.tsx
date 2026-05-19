"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, Check, Clipboard, Loader2, LogOut, MessageSquarePlus, Pencil, RotateCcw, Search, Send, Trash2, X } from "lucide-react";
import { MarkdownMessage } from "@/components/markdown-message";
import { PromptPanel } from "@/components/prompt-panel";
import { apiFetch } from "@/lib/api";
import { getAccessToken, logout as logoutSession } from "@/lib/auth";
import { createChatSocket } from "@/lib/websocket";
import type { Conversation, Message } from "@/types/chat";

type SocketStatus = "idle" | "connecting" | "ready" | "closed" | "error";

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [conversationError, setConversationError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>("idle");
  const [streamError, setStreamError] = useState("");

  const filteredConversations = conversations.filter((conversation) => conversation.title.toLowerCase().includes(searchQuery.trim().toLowerCase()));
  const connectionLabel =
    socketStatus === "ready"
      ? "Connected"
      : socketStatus === "connecting"
        ? "Connecting"
        : socketStatus === "error"
          ? "Connection error"
          : socketStatus === "closed"
            ? "Disconnected"
            : "Idle";

  const socket = useMemo(() => {
    if (!activeConversation?.id) return null;
    const token = getAccessToken();
    if (!token) return null;
    return createChatSocket(activeConversation.id, token);
  }, [activeConversation?.id]);
  const canSendMessage = Boolean(activeConversation && socket && socketStatus === "ready" && !isStreaming && !isLoadingMessages && draft.trim());

  useEffect(() => {
    if (!getAccessToken()) {
      window.location.href = "/login";
      return;
    }
    void loadConversations();
  }, []);

  useEffect(() => {
    if (!activeConversation) return;
    void loadMessages(activeConversation.id);
  }, [activeConversation]);

  useEffect(() => {
    if (!socket) {
      setSocketStatus(activeConversation ? "connecting" : "idle");
      return;
    }

    setSocketStatus("connecting");
    setStreamError("");

    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === "connection.ready") {
        setSocketStatus("ready");
      }
      if (payload.type === "assistant.started") {
        setIsStreaming(true);
        setStreamError("");
        setMessages((current) => [...current, { id: payload.message_id, role: "assistant", content: "", status: "streaming", created_at: new Date().toISOString() }]);
      }
      if (payload.type === "assistant.delta") {
        setMessages((current) =>
          current.map((message) => (message.id === payload.message_id ? { ...message, content: message.content + payload.delta } : message)),
        );
      }
      if (payload.type === "assistant.completed") {
        setMessages((current) =>
          current.map((message) =>
            message.id === payload.message_id ? { ...message, content: payload.content ?? message.content, status: "completed", error: "" } : message,
          ),
        );
        setIsStreaming(false);
      }
      if (payload.type === "assistant.failed") {
        setIsStreaming(false);
        setStreamError(payload.error || "The assistant response failed.");
        setMessages((current) =>
          current.map((message) =>
            message.id === payload.message_id ? { ...message, status: "failed", error: payload.error || "The assistant response failed." } : message,
          ),
        );
      }
      if (payload.type === "error") {
        setStreamError(payload.error || "The chat stream returned an error.");
      }
      if (payload.type === "rate_limited") {
        setStreamError(payload.error || "You are sending messages too quickly.");
        setIsStreaming(false);
        setMessages((current) => {
          const lastMessage = current[current.length - 1];
          if (lastMessage?.role === "user") {
            return current.slice(0, -1);
          }
          return current;
        });
      }
    };

    socket.onerror = () => {
      setSocketStatus("error");
      setStreamError("The chat connection failed.");
      setIsStreaming(false);
    };

    socket.onclose = () => {
      setSocketStatus((current) => (current === "error" ? "error" : "closed"));
      setIsStreaming(false);
    };

    return () => {
      socket.onclose = null;
      socket.close();
    };
  }, [activeConversation?.id, socket]);

  async function loadConversations() {
    setIsLoadingConversations(true);
    setConversationError("");
    try {
      const data = await apiFetch<Conversation[]>("/conversations/");
      setConversations(data);
      setActiveConversation(data[0] ?? null);
    } catch {
      setConversationError("Could not load conversations.");
    } finally {
      setIsLoadingConversations(false);
    }
  }

  async function loadMessages(conversationId: string) {
    setIsLoadingMessages(true);
    setMessageError("");
    try {
      const data = await apiFetch<Message[]>(`/conversations/${conversationId}/messages/`);
      setMessages(data);
    } catch {
      setMessageError("Could not load messages.");
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  }

  function selectConversation(conversation: Conversation) {
    if (isStreaming) return;
    setActiveConversation(conversation);
    setEditingConversationId(null);
    setStreamError("");
  }

  async function createConversation() {
    setConversationError("");
    try {
      const conversation = await apiFetch<Conversation>("/conversations/", {
        method: "POST",
        body: JSON.stringify({ title: "New conversation" }),
      });
      setConversations((current) => [conversation, ...current]);
      setActiveConversation(conversation);
    } catch {
      setConversationError("Could not create a new conversation.");
    }
  }

  function startRename(conversation: Conversation) {
    setEditingConversationId(conversation.id);
    setEditingTitle(conversation.title);
  }

  async function saveRename(conversation: Conversation) {
    const title = editingTitle.trim();
    if (!title) return;
    setConversationError("");
    try {
      const updated = await apiFetch<Conversation>(`/conversations/${conversation.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      });
      setConversations((current) => current.map((item) => (item.id === updated.id ? { ...item, title: updated.title } : item)));
      if (activeConversation?.id === updated.id) {
        setActiveConversation((current) => (current ? { ...current, title: updated.title } : current));
      }
      setEditingConversationId(null);
    } catch {
      setConversationError("Could not rename the conversation.");
    }
  }

  async function deleteConversation(conversation: Conversation) {
    const confirmed = window.confirm(`Delete "${conversation.title}"?`);
    if (!confirmed) return;

    setConversationError("");
    try {
      await apiFetch<void>(`/conversations/${conversation.id}/`, { method: "DELETE" });
      const remaining = conversations.filter((item) => item.id !== conversation.id);
      setConversations(remaining);
      if (activeConversation?.id === conversation.id) {
        setActiveConversation(remaining[0] ?? null);
        setMessages([]);
      }
    } catch {
      setConversationError("Could not delete the conversation.");
    }
  }

  function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSendMessage || !socket || !activeConversation) return;

    const message: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: draft.trim(),
      status: "completed",
      created_at: new Date().toISOString(),
    };
    setStreamError("");
    setMessages((current) => [...current, message]);
    if (activeConversation.title === "New conversation") {
      const title = message.content.slice(0, 60);
      setActiveConversation({ ...activeConversation, title });
      setConversations((current) => current.map((conversation) => (conversation.id === activeConversation.id ? { ...conversation, title } : conversation)));
    }
    socket.send(JSON.stringify({ type: "user.message", content: draft.trim() }));
    setDraft("");
  }

  async function copyMessage(message: Message) {
    await navigator.clipboard.writeText(message.content);
    setCopiedMessageId(message.id);
    window.setTimeout(() => setCopiedMessageId(null), 1500);
  }

  function prepareRetry(messageIndex: number) {
    const previousUserMessage = [...messages.slice(0, messageIndex)].reverse().find((message) => message.role === "user");
    if (previousUserMessage) {
      setDraft(previousUserMessage.content);
    }
  }

  async function logout() {
    await logoutSession();
    window.location.href = "/login";
  }

  return (
    <main className="grid min-h-screen grid-cols-[280px_1fr_320px] bg-background">
      <aside className="border-r border-border bg-white">
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2 font-semibold">
            <Bot size={20} />
            JarvisAI
          </div>
          <button className="rounded-md p-2 hover:bg-muted" onClick={logout} aria-label="Log out">
            <LogOut size={18} />
          </button>
        </div>
        <div className="p-3">
          <button className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white" onClick={createConversation}>
            <MessageSquarePlus size={16} />
            New chat
          </button>
        </div>
        <div className="px-3 pb-3">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              className="h-9 w-full rounded-md border border-border bg-white pl-8 pr-2 text-sm outline-none focus:ring-2 focus:ring-teal-700"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search conversations"
            />
          </label>
        </div>
        {conversationError ? (
          <div className="mx-3 mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{conversationError}</div>
        ) : null}
        <nav className="space-y-1 px-3">
          {isLoadingConversations ? (
            <div className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-500">
              <Loader2 className="animate-spin" size={15} />
              Loading conversations
            </div>
          ) : null}
          {!isLoadingConversations && conversations.length === 0 ? (
            <div className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-slate-500">No conversations yet.</div>
          ) : null}
          {!isLoadingConversations && conversations.length > 0 && filteredConversations.length === 0 ? (
            <div className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-slate-500">No matching conversations.</div>
          ) : null}
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`group flex min-h-10 items-center gap-1 rounded-md px-2 text-sm ${conversation.id === activeConversation?.id ? "bg-muted font-medium" : "hover:bg-muted"}`}
            >
              {editingConversationId === conversation.id ? (
                <>
                  <input
                    className="min-w-0 flex-1 rounded border border-border bg-white px-2 py-1 text-sm font-normal outline-none"
                    value={editingTitle}
                    onChange={(event) => setEditingTitle(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void saveRename(conversation);
                      if (event.key === "Escape") setEditingConversationId(null);
                    }}
                    autoFocus
                  />
                  <button className="rounded p-1 hover:bg-white" onClick={() => void saveRename(conversation)} aria-label="Save conversation title">
                    <Check size={15} />
                  </button>
                  <button className="rounded p-1 hover:bg-white" onClick={() => setEditingConversationId(null)} aria-label="Cancel rename">
                    <X size={15} />
                  </button>
                </>
              ) : (
                <>
                  <button className="min-w-0 flex-1 truncate py-2 text-left" onClick={() => selectConversation(conversation)}>
                    {conversation.title}
                  </button>
                  <button className="rounded p-1 opacity-0 hover:bg-white group-hover:opacity-100" onClick={() => startRename(conversation)} aria-label="Rename conversation">
                    <Pencil size={14} />
                  </button>
                  <button className="rounded p-1 opacity-0 hover:bg-white group-hover:opacity-100" onClick={() => void deleteConversation(conversation)} aria-label="Delete conversation">
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))}
        </nav>
      </aside>

      <section className="flex min-w-0 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border bg-white px-5">
          <h1 className="truncate text-base font-semibold">{activeConversation?.title ?? "No conversation selected"}</h1>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-md border px-2 py-1 text-xs ${
                socketStatus === "ready"
                  ? "border-teal-200 bg-teal-50 text-teal-700"
                  : socketStatus === "error"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-border text-slate-600"
              }`}
            >
              {connectionLabel}
            </span>
            <span className="rounded-md border border-border px-2 py-1 text-xs text-slate-600">Mock provider</span>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            {streamError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{streamError}</div>
            ) : null}
            {!activeConversation ? (
              <div className="rounded-lg border border-dashed border-border bg-white p-8 text-center text-slate-500">
                Start a new conversation or select one from the sidebar.
              </div>
            ) : isLoadingMessages ? (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-white p-8 text-slate-500">
                <Loader2 className="animate-spin" size={18} />
                Loading messages
              </div>
            ) : messageError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
                <p className="mb-3">{messageError}</p>
                <button className="rounded-md bg-white px-3 py-2 text-sm font-medium text-red-700" onClick={() => void loadMessages(activeConversation.id)}>
                  Try again
                </button>
              </div>
            ) : messages.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-white p-8 text-center text-slate-500">This conversation is empty.</div>
            ) : (
              messages.map((message, index) => (
                <article key={message.id} className={`rounded-lg border border-border bg-white p-4 ${message.role === "user" ? "ml-12" : "mr-12"}`}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <span>{message.role}</span>
                      {message.status === "streaming" ? <span className="rounded bg-teal-50 px-2 py-0.5 text-teal-700">Streaming</span> : null}
                      {message.status === "failed" ? <span className="rounded bg-red-50 px-2 py-0.5 text-red-700">Failed</span> : null}
                    </div>
                    <div className="flex items-center gap-1">
                      {message.role === "assistant" ? (
                        <button className="rounded p-1 text-slate-500 hover:bg-muted" onClick={() => void copyMessage(message)} aria-label="Copy message">
                          {copiedMessageId === message.id ? <Check size={15} /> : <Clipboard size={15} />}
                        </button>
                      ) : null}
                      {message.status === "failed" ? (
                        <button className="rounded p-1 text-slate-500 hover:bg-muted" onClick={() => prepareRetry(index)} aria-label="Prepare retry">
                          <RotateCcw size={15} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <MarkdownMessage content={message.content} />
                  {message.error ? <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{message.error}</p> : null}
                </article>
              ))
            )}
          </div>
        </div>
        <form onSubmit={sendMessage} className="border-t border-border bg-white p-4">
          <div className="mx-auto flex max-w-3xl gap-3">
            <textarea
              className="min-h-12 flex-1 resize-none rounded-md border border-border px-3 py-2 outline-none focus:ring-2 focus:ring-teal-700"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Message JarvisAI"
            />
            <button className="grid h-12 w-12 place-items-center rounded-md bg-primary text-white disabled:opacity-50" disabled={!canSendMessage} aria-label="Send message">
              {isStreaming ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            </button>
          </div>
          {activeConversation && socketStatus !== "ready" ? <p className="mx-auto mt-2 max-w-3xl text-xs text-slate-500">{connectionLabel}. Sending is available when connected.</p> : null}
        </form>
      </section>

      <PromptPanel
        activeConversationId={activeConversation?.id}
        onPromptApplied={(message) => {
          if (activeConversation) {
            setMessages((current) => [...current, message]);
          }
        }}
      />
    </main>
  );
}
