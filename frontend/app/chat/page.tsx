"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, Check, Clipboard, Layers3, Loader2, LogOut, MessageSquarePlus, Pencil, RotateCcw, Search, Send, ShieldCheck, Sparkles, Trash2, X } from "lucide-react";
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
        setMessages((current) => [
          ...current,
          {
            id: payload.message_id,
            role: "assistant",
            content: "",
            status: "streaming",
            provider: payload.provider,
            model: payload.model,
            created_at: new Date().toISOString(),
          },
        ]);
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
    <main className="grid min-h-screen grid-cols-1 bg-background text-slate-950 lg:grid-cols-[288px_minmax(0,1fr)] xl:grid-cols-[288px_minmax(0,1fr)_336px]">
      <aside className="flex min-h-0 flex-col border-r border-slate-200 bg-slate-950 text-slate-100">
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-300/25">
              <Bot size={20} />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">JarvisAI</div>
              <div className="text-xs text-slate-400">Enterprise Copilot</div>
            </div>
          </div>
          <button className="rounded-md p-2 text-slate-400 hover:bg-white/10 hover:text-white" onClick={logout} aria-label="Log out" title="Log out">
            <LogOut size={18} />
          </button>
        </div>
        <div className="p-4">
          <button className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-cyan-500 px-3 text-sm font-semibold text-slate-950 shadow-sm shadow-cyan-950/30 hover:bg-cyan-400" onClick={createConversation}>
            <MessageSquarePlus size={16} />
            New chat
          </button>
        </div>
        <div className="px-4 pb-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
            <input
              className="h-10 w-full rounded-md border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search conversations"
            />
          </label>
        </div>
        {conversationError ? (
          <div className="mx-4 mb-3 rounded-md border border-red-300/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">{conversationError}</div>
        ) : null}
        <div className="flex items-center justify-between px-4 pb-2 text-[11px] font-semibold uppercase text-slate-500">
          <span>Conversations</span>
          <span>{filteredConversations.length}</span>
        </div>
        <nav className="enterprise-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {isLoadingConversations ? (
            <div className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-400">
              <Loader2 className="animate-spin" size={15} />
              Loading conversations
            </div>
          ) : null}
          {!isLoadingConversations && conversations.length === 0 ? (
            <div className="rounded-md border border-dashed border-white/15 px-3 py-4 text-sm text-slate-400">No conversations yet.</div>
          ) : null}
          {!isLoadingConversations && conversations.length > 0 && filteredConversations.length === 0 ? (
            <div className="rounded-md border border-dashed border-white/15 px-3 py-4 text-sm text-slate-400">No matching conversations.</div>
          ) : null}
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`group flex min-h-10 items-center gap-1 rounded-md px-2 text-sm ${
                conversation.id === activeConversation?.id ? "bg-white/[0.12] font-medium text-white ring-1 ring-white/10" : "text-slate-300 hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              {editingConversationId === conversation.id ? (
                <>
                  <input
                    className="min-w-0 flex-1 rounded border border-cyan-300/40 bg-slate-900 px-2 py-1 text-sm font-normal text-white outline-none"
                    value={editingTitle}
                    onChange={(event) => setEditingTitle(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void saveRename(conversation);
                      if (event.key === "Escape") setEditingConversationId(null);
                    }}
                    autoFocus
                  />
                  <button className="rounded p-1 text-slate-300 hover:bg-white/10 hover:text-white" onClick={() => void saveRename(conversation)} aria-label="Save conversation title">
                    <Check size={15} />
                  </button>
                  <button className="rounded p-1 text-slate-300 hover:bg-white/10 hover:text-white" onClick={() => setEditingConversationId(null)} aria-label="Cancel rename">
                    <X size={15} />
                  </button>
                </>
              ) : (
                <>
                  <button className="min-w-0 flex-1 truncate py-2 text-left" onClick={() => selectConversation(conversation)}>
                    {conversation.title}
                  </button>
                  <button className="rounded p-1 text-slate-400 opacity-0 hover:bg-white/10 hover:text-white group-hover:opacity-100" onClick={() => startRename(conversation)} aria-label="Rename conversation">
                    <Pencil size={14} />
                  </button>
                  <button className="rounded p-1 text-slate-400 opacity-0 hover:bg-white/10 hover:text-red-200 group-hover:opacity-100" onClick={() => void deleteConversation(conversation)} aria-label="Delete conversation">
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))}
        </nav>
      </aside>

      <section className="flex min-h-screen min-w-0 flex-col">
        <header className="flex min-h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-5 backdrop-blur">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Layers3 size={14} />
              Workspace Chat
            </div>
            <h1 className="truncate text-base font-semibold text-slate-950">{activeConversation?.title ?? "No conversation selected"}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                socketStatus === "ready"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : socketStatus === "error"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${socketStatus === "ready" ? "bg-emerald-500" : socketStatus === "error" ? "bg-red-500" : "bg-slate-400"}`} />
              {connectionLabel}
            </span>
            <span className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 sm:inline-flex">
              <ShieldCheck size={13} />
              Mock provider
            </span>
          </div>
        </header>
        <div className="enterprise-scrollbar flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            {streamError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-sm">{streamError}</div>
            ) : null}
            {!activeConversation ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-lg bg-cyan-50 text-cyan-700">
                  <Sparkles size={22} />
                </div>
                <h2 className="text-base font-semibold text-slate-950">No conversation selected</h2>
                <p className="mt-1 text-sm text-slate-500">Start a new conversation or select one from the sidebar.</p>
              </div>
            ) : isLoadingMessages ? (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
                <Loader2 className="animate-spin" size={18} />
                Loading messages
              </div>
            ) : messageError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700 shadow-sm">
                <p className="mb-3">{messageError}</p>
                <button className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-red-700 shadow-sm ring-1 ring-red-100 hover:bg-red-50" onClick={() => void loadMessages(activeConversation.id)}>
                  Try again
                </button>
              </div>
            ) : messages.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-lg bg-slate-100 text-slate-600">
                  <MessageSquarePlus size={21} />
                </div>
                <h2 className="text-base font-semibold text-slate-950">This conversation is empty</h2>
                <p className="mt-1 text-sm text-slate-500">Send a message or apply a saved prompt to begin.</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <article
                  key={message.id}
                  className={`rounded-lg border p-4 shadow-sm ${
                    message.role === "user" ? "ml-0 border-cyan-200 bg-cyan-50/60 sm:ml-12" : "mr-0 border-slate-200 bg-white sm:mr-12"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <span>{message.role}</span>
                      {message.provider || message.model ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 normal-case tracking-normal text-slate-600 ring-1 ring-slate-200">
                          {[message.provider, message.model].filter(Boolean).join(" / ")}
                        </span>
                      ) : null}
                      {message.status === "streaming" ? <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-cyan-700 ring-1 ring-cyan-100">Streaming</span> : null}
                      {message.status === "failed" ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-700 ring-1 ring-red-100">Failed</span> : null}
                    </div>
                    <div className="flex items-center gap-1">
                      {message.role === "assistant" ? (
                        <button className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900" onClick={() => void copyMessage(message)} aria-label="Copy message" title="Copy message">
                          {copiedMessageId === message.id ? <Check size={15} /> : <Clipboard size={15} />}
                        </button>
                      ) : null}
                      {message.status === "failed" ? (
                        <button className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900" onClick={() => prepareRetry(index)} aria-label="Prepare retry" title="Prepare retry">
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
        <form onSubmit={sendMessage} className="border-t border-slate-200 bg-white/95 p-4 shadow-[0_-12px_30px_rgba(15,23,42,0.04)]">
          <div className="mx-auto flex max-w-3xl items-end gap-3">
            <textarea
              className="min-h-12 flex-1 resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Message JarvisAI"
            />
            <button className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-primary text-white shadow-sm shadow-cyan-950/20 hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none" disabled={!canSendMessage} aria-label="Send message" title="Send message">
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
