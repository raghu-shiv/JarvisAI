"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { PromptTemplate } from "@/types/chat";

export function PromptPanel() {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);

  useEffect(() => {
    apiFetch<PromptTemplate[]>("/prompts/")
      .then(setPrompts)
      .catch(() => setPrompts([]));
  }, []);

  return (
    <aside className="border-l border-border bg-white">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4 font-semibold">
        <FileText size={18} />
        Prompts
      </div>
      <div className="space-y-3 p-4">
        {prompts.length === 0 ? (
          <p className="text-sm text-slate-500">Prompt templates will appear here after they are created.</p>
        ) : (
          prompts.map((prompt) => (
            <button key={prompt.id} className="w-full rounded-lg border border-border p-3 text-left hover:bg-muted">
              <div className="font-medium">{prompt.name}</div>
              <div className="mt-1 line-clamp-2 text-sm text-slate-500">{prompt.description}</div>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
