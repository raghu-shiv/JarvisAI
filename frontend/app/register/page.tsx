"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await register({ username, email, password });
      router.push("/login");
    } catch {
      setError("Could not create account.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg border border-border bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">Create account</h1>
        <p className="mb-6 text-sm text-slate-500">Start using JarvisAI locally.</p>
        <label className="mb-4 block text-sm font-medium">
          Username
          <input className="mt-1 w-full rounded-md border border-border px-3 py-2" value={username} onChange={(event) => setUsername(event.target.value)} />
        </label>
        <label className="mb-4 block text-sm font-medium">
          Email
          <input className="mt-1 w-full rounded-md border border-border px-3 py-2" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="mb-4 block text-sm font-medium">
          Password
          <input className="mt-1 w-full rounded-md border border-border px-3 py-2" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
        <button className="w-full rounded-md bg-primary px-4 py-2 font-medium text-white" type="submit">
          Create account
        </button>
      </form>
    </main>
  );
}
