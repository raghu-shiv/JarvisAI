"use client";

import { useEffect, useState } from "react";
import { Check, FileText, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { Message, PromptTemplate } from "@/types/chat";

type PromptForm = {
  name: string;
  description: string;
  system_prompt: string;
};

const emptyForm: PromptForm = {
  name: "",
  description: "",
  system_prompt: "",
};

export function PromptPanel({
  activeConversationId,
  onPromptApplied,
}: {
  activeConversationId?: string;
  onPromptApplied: (message: Message) => void;
}) {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [form, setForm] = useState<PromptForm>(emptyForm);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [applyingPromptId, setApplyingPromptId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void loadPrompts();
  }, []);

  async function loadPrompts() {
    setIsLoading(true);
    setError("");
    try {
      const data = await apiFetch<PromptTemplate[]>("/prompts/");
      setPrompts(data);
      setSelectedPromptId((current) => current ?? data[0]?.id ?? null);
    } catch {
      setError("Could not load prompt templates.");
    } finally {
      setIsLoading(false);
    }
  }

  function updateForm(field: keyof PromptForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingPromptId(null);
    setError("");
  }

  function startEdit(prompt: PromptTemplate) {
    setEditingPromptId(prompt.id);
    setSelectedPromptId(prompt.id);
    setForm({
      name: prompt.name,
      description: prompt.description,
      system_prompt: prompt.system_prompt,
    });
  }

  async function savePrompt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    const systemPrompt = form.system_prompt.trim();
    if (!name || !systemPrompt) {
      setError("Prompt name and system prompt are required.");
      return;
    }

    setIsSaving(true);
    setError("");
    setNotice("");
    try {
      const payload = {
        name,
        description: form.description.trim(),
        system_prompt: systemPrompt,
        variables: {},
        is_public: false,
      };
      const saved = await apiFetch<PromptTemplate>(editingPromptId ? `/prompts/${editingPromptId}/` : "/prompts/", {
        method: editingPromptId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });

      setPrompts((current) => {
        if (editingPromptId) {
          return current.map((prompt) => (prompt.id === saved.id ? saved : prompt));
        }
        return [...current, saved].sort((left, right) => left.name.localeCompare(right.name));
      });
      setSelectedPromptId(saved.id);
      setNotice(editingPromptId ? "Prompt updated." : "Prompt created.");
      resetForm();
    } catch {
      setError("Could not save prompt template.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deletePrompt(prompt: PromptTemplate) {
    const confirmed = window.confirm(`Delete "${prompt.name}"?`);
    if (!confirmed) return;

    setError("");
    setNotice("");
    try {
      await apiFetch<void>(`/prompts/${prompt.id}/`, { method: "DELETE" });
      const remaining = prompts.filter((item) => item.id !== prompt.id);
      setPrompts(remaining);
      setSelectedPromptId(remaining[0]?.id ?? null);
      if (editingPromptId === prompt.id) resetForm();
      setNotice("Prompt deleted.");
    } catch {
      setError("Could not delete prompt template.");
    }
  }

  async function applyPrompt(prompt: PromptTemplate) {
    if (!activeConversationId) {
      setError("Select a conversation before applying a prompt.");
      return;
    }

    setApplyingPromptId(prompt.id);
    setError("");
    setNotice("");
    setSelectedPromptId(prompt.id);
    try {
      const message = await apiFetch<Message>(`/conversations/${activeConversationId}/apply_prompt/`, {
        method: "POST",
        body: JSON.stringify({ prompt_id: prompt.id }),
      });
      onPromptApplied(message);
      setNotice("Prompt applied to conversation.");
    } catch {
      setError("Could not apply prompt template.");
    } finally {
      setApplyingPromptId(null);
    }
  }

  return (
    <aside className="border-l border-border bg-white">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4 font-semibold">
        <FileText size={18} />
        Prompts
      </div>

      <div className="space-y-4 p-4">
        {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        {notice ? <div className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-700">{notice}</div> : null}

        <form className="space-y-3 rounded-lg border border-border p-3" onSubmit={savePrompt}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">{editingPromptId ? "Edit prompt" : "New prompt"}</h2>
            {editingPromptId ? (
              <button className="rounded p-1 text-slate-500 hover:bg-muted" type="button" onClick={resetForm} aria-label="Cancel edit">
                <X size={15} />
              </button>
            ) : null}
          </div>

          <label className="block text-xs font-medium text-slate-600">
            Name
            <input
              className="mt-1 h-9 w-full rounded-md border border-border px-2 text-sm outline-none focus:ring-2 focus:ring-teal-700"
              value={form.name}
              onChange={(event) => updateForm("name", event.target.value)}
              placeholder="Security reviewer"
            />
          </label>

          <label className="block text-xs font-medium text-slate-600">
            Description
            <input
              className="mt-1 h-9 w-full rounded-md border border-border px-2 text-sm outline-none focus:ring-2 focus:ring-teal-700"
              value={form.description}
              onChange={(event) => updateForm("description", event.target.value)}
              placeholder="Review code for auth and data risks"
            />
          </label>

          <label className="block text-xs font-medium text-slate-600">
            System prompt
            <textarea
              className="mt-1 min-h-24 w-full resize-none rounded-md border border-border px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-700"
              value={form.system_prompt}
              onChange={(event) => updateForm("system_prompt", event.target.value)}
              placeholder="You are a senior security reviewer..."
            />
          </label>

          <button className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-white disabled:opacity-50" type="submit" disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin" size={15} /> : editingPromptId ? <Save size={15} /> : <Plus size={15} />}
            {editingPromptId ? "Save prompt" : "Create prompt"}
          </button>
        </form>

        <div className="space-y-2">
          {isLoading ? (
            <div className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-500">
              <Loader2 className="animate-spin" size={15} />
              Loading prompts
            </div>
          ) : null}

          {!isLoading && prompts.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-slate-500">Prompt templates will appear here after they are created.</p>
          ) : null}

          {prompts.map((prompt) => (
            <div
              key={prompt.id}
              className={`rounded-lg border p-3 ${prompt.id === selectedPromptId ? "border-teal-300 bg-teal-50/40" : "border-border"}`}
            >
              <button className="w-full text-left" type="button" onClick={() => setSelectedPromptId(prompt.id)}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 truncate font-medium">{prompt.name}</div>
                  {prompt.id === selectedPromptId ? <Check className="shrink-0 text-teal-700" size={15} /> : null}
                </div>
                <div className="mt-1 line-clamp-2 text-sm text-slate-500">{prompt.description || prompt.system_prompt}</div>
              </button>

              <div className="mt-3 flex gap-2">
                <button
                  className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border px-2 py-1.5 text-sm hover:bg-white disabled:opacity-50"
                  type="button"
                  onClick={() => void applyPrompt(prompt)}
                  disabled={Boolean(applyingPromptId) || !activeConversationId}
                >
                  {applyingPromptId === prompt.id ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                  Apply
                </button>
                <button className="rounded-md border border-border px-2 py-1.5 hover:bg-white" type="button" onClick={() => startEdit(prompt)} aria-label="Edit prompt">
                  <Pencil size={14} />
                </button>
                <button className="rounded-md border border-border px-2 py-1.5 hover:bg-white" type="button" onClick={() => void deletePrompt(prompt)} aria-label="Delete prompt">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
