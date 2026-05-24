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
    <aside className="hidden min-h-0 flex-col border-l border-slate-200 bg-white xl:flex">
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-4">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-700">
          <FileText size={18} />
        </span>
        <div>
          <div className="text-sm font-semibold text-slate-950">Prompt Library</div>
          <div className="text-xs text-slate-500">{prompts.length} templates</div>
        </div>
      </div>

      <div className="enterprise-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div> : null}
        {notice ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{notice}</div> : null}

        <form className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 shadow-sm" onSubmit={savePrompt}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-950">{editingPromptId ? "Edit prompt" : "New prompt"}</h2>
            {editingPromptId ? (
              <button className="rounded p-1 text-slate-500 hover:bg-white hover:text-slate-900" type="button" onClick={resetForm} aria-label="Cancel edit" title="Cancel edit">
                <X size={15} />
              </button>
            ) : null}
          </div>

          <label className="block text-xs font-medium text-slate-600">
            Name
            <input
              className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm outline-none placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20"
              value={form.name}
              onChange={(event) => updateForm("name", event.target.value)}
              placeholder="Security reviewer"
            />
          </label>

          <label className="block text-xs font-medium text-slate-600">
            Description
            <input
              className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm outline-none placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20"
              value={form.description}
              onChange={(event) => updateForm("description", event.target.value)}
              placeholder="Review code for auth and data risks"
            />
          </label>

          <label className="block text-xs font-medium text-slate-600">
            System prompt
            <textarea
              className="mt-1 min-h-24 w-full resize-none rounded-md border border-slate-300 bg-white px-2 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20"
              value={form.system_prompt}
              onChange={(event) => updateForm("system_prompt", event.target.value)}
              placeholder="You are a senior security reviewer..."
            />
          </label>

          <button className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-white shadow-sm shadow-cyan-950/15 hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none" type="submit" disabled={isSaving}>
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
            <p className="rounded-md border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">Prompt templates will appear here after they are created.</p>
          ) : null}

          {prompts.map((prompt) => (
            <div
              key={prompt.id}
              className={`rounded-lg border p-3 shadow-sm ${prompt.id === selectedPromptId ? "border-cyan-300 bg-cyan-50/60" : "border-slate-200 bg-white hover:border-slate-300"}`}
            >
              <button className="w-full text-left" type="button" onClick={() => setSelectedPromptId(prompt.id)}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 truncate font-medium text-slate-950">{prompt.name}</div>
                  {prompt.id === selectedPromptId ? <Check className="shrink-0 text-cyan-700" size={15} /> : null}
                </div>
                <div className="mt-1 line-clamp-2 text-sm text-slate-500">{prompt.description || prompt.system_prompt}</div>
              </button>

              <div className="mt-3 flex gap-2">
                <button
                  className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  onClick={() => void applyPrompt(prompt)}
                  disabled={Boolean(applyingPromptId) || !activeConversationId}
                >
                  {applyingPromptId === prompt.id ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                  Apply
                </button>
                <button className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-950" type="button" onClick={() => startEdit(prompt)} aria-label="Edit prompt" title="Edit prompt">
                  <Pencil size={14} />
                </button>
                <button className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-slate-600 hover:bg-red-50 hover:text-red-700" type="button" onClick={() => void deletePrompt(prompt)} aria-label="Delete prompt" title="Delete prompt">
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
