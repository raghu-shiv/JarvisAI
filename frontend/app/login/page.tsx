"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot } from "lucide-react";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await login(username, password);
      router.push("/chat");
    } catch {
      setError("Invalid username or password.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg border border-border bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-primary text-white">
            <Bot size={22} />
          </span>
          <div>
            <h1 className="text-xl font-semibold">JarvisAI</h1>
            <p className="text-sm text-slate-500">Sign in to your workspace</p>
          </div>
        </div>
        <label className="mb-4 block text-sm font-medium">
          Username
          <input className="mt-1 w-full rounded-md border border-border px-3 py-2" value={username} onChange={(event) => setUsername(event.target.value)} />
        </label>
        <label className="mb-4 block text-sm font-medium">
          Password
          <input className="mt-1 w-full rounded-md border border-border px-3 py-2" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
        <button className="w-full rounded-md bg-primary px-4 py-2 font-medium text-white" type="submit">
          Sign in
        </button>
      </form>
    </main>
  );
}
