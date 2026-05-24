"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bot, ShieldCheck } from "lucide-react";
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
      router.push("/chat");
    } catch {
      setError("Could not create account.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <section className="grid w-full max-w-4xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 md:grid-cols-[1fr_380px]">
        <div className="hidden bg-slate-950 p-8 text-white md:flex md:flex-col md:justify-between">
          <div>
            <span className="grid h-11 w-11 place-items-center rounded-lg bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-300/25">
              <Bot size={24} />
            </span>
            <h2 className="mt-6 text-2xl font-semibold">JarvisAI</h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-300">Create a workspace identity for managed assistant sessions and prompt operations.</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-slate-300">
            <ShieldCheck size={16} className="text-cyan-300" />
            Account scoped to this workspace
          </div>
        </div>

      <form onSubmit={handleSubmit} className="w-full p-6 sm:p-8">
        <h1 className="mb-1 text-xl font-semibold text-slate-950">Create account</h1>
        <p className="mb-6 text-sm text-slate-500">Start using JarvisAI locally.</p>
        <label className="mb-4 block text-sm font-medium">
          Username
          <input className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20" value={username} onChange={(event) => setUsername(event.target.value)} />
        </label>
        <label className="mb-4 block text-sm font-medium">
          Email
          <input className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="mb-4 block text-sm font-medium">
          Password
          <input className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error ? <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}
        <button className="h-10 w-full rounded-md bg-primary px-4 font-semibold text-white shadow-sm shadow-cyan-950/20 hover:bg-cyan-800" type="submit">
          Create account
        </button>
        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link className="font-semibold text-cyan-700 hover:text-cyan-800" href="/login">
            Sign in
          </Link>
        </p>
      </form>
      </section>
    </main>
  );
}
