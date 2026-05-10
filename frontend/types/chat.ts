export type Message = {
  id: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  status: "pending" | "streaming" | "completed" | "failed";
  provider?: string;
  model?: string;
  token_count?: number;
  error?: string;
  created_at: string;
};

export type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  messages?: Message[];
};

export type PromptTemplate = {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  variables: Record<string, string>;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};
