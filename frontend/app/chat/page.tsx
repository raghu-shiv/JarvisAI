"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, LogOut, MessageSquarePlus, Send } from "lucide-react";
import { MarkdownMessage } from "@/components/markdown-message";
import { PromptPanel } from "@/components/prompt-panel";
import { apiFetch } from "@/lib/api";
import { clearTokens, getAccessToken } from "@/lib/auth";
import { createChatSocket } from "@/lib/websocket";
import type { Conversation, Message } from "@/types/chat";

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const socket = useMemo(() => {
    if (!activeConversation) return null;
    const token = getAccessToken();
    if (!token) return null;
    return createChatSocket(activeConversation.id, token);
  }, [activeConversation]);

  useEffect(() => {
    if (!getAccessToken()) {
      window.location.href = "/login";
      return;
    }
    void loadConversations();
  }, []);

  useEffect(() => {
    if (!activeConversation) return;
    setMessages(activeConversation.messages ?? []);
  }, [activeConversation]);

  useEffect(() => {
    if (!socket) return;

    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === "assistant.started") {
        setIsStreaming(true);
        setMessages((current) => [...current, { id: payload.message_id, role: "assistant", content: "", status: "streaming", created_at: new Date().toISOString() }]);
      }
      if (payload.type === "assistant.delta") {
        setMessages((current) =>
          current.map((message) => (message.id === payload.message_id ? { ...message, content: message.content + payload.delta } : message)),
        );
      }
      if (payload.type === "assistant.completed" || payload.type === "assistant.failed") {
        setIsStreaming(false);
      }
    };

    return () => socket.close();
  }, [socket]);

  async function loadConversations() {
    const data = await apiFetch<Conversation[]>("/conversations/");
    setConversations(data);
    setActiveConversation(data[0] ?? null);
  }

  async function createConversation() {
    const conversation = await apiFetch<Conversation>("/conversations/", {
      method: "POST",
      body: JSON.stringify({ title: "New conversation" }),
    });
    setConversations((current) => [conversation, ...current]);
    setActiveConversation(conversation);
  }

  function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim() || !socket || isStreaming) return;

    const message: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: draft.trim(),
      status: "completed",
      created_at: new Date().toISOString(),
    };
    setMessages((current) => [...current, message]);
    socket.send(JSON.stringify({ type: "user.message", content: draft.trim() }));
    setDraft("");
  }

  function logout() {
    clearTokens();
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
        <nav className="space-y-1 px-3">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              className={`w-full truncate rounded-md px-3 py-2 text-left text-sm ${conversation.id === activeConversation?.id ? "bg-muted font-medium" : "hover:bg-muted"}`}
              onClick={() => setActiveConversation(conversation)}
            >
              {conversation.title}
            </button>
          ))}
        </nav>
      </aside>

      <section className="flex min-w-0 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border bg-white px-5">
          <h1 className="truncate text-base font-semibold">{activeConversation?.title ?? "No conversation selected"}</h1>
          <span className="rounded-md border border-border px-2 py-1 text-xs text-slate-600">Mock provider</span>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            {messages.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-white p-8 text-center text-slate-500">
                Create or select a conversation, then ask JarvisAI to draft, debug, summarize, or reason through work.
              </div>
            ) : (
              messages.map((message) => (
                <article key={message.id} className={`rounded-lg border border-border bg-white p-4 ${message.role === "user" ? "ml-12" : "mr-12"}`}>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{message.role}</div>
                  <MarkdownMessage content={message.content} />
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
            <button className="grid h-12 w-12 place-items-center rounded-md bg-primary text-white disabled:opacity-50" disabled={!activeConversation || isStreaming} aria-label="Send message">
              <Send size={18} />
            </button>
          </div>
        </form>
      </section>

      <PromptPanel />
    </main>
  );
}
