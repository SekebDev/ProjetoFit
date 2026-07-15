"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password, name);
      router.push("/profile");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-sm flex-col justify-center px-5 py-8">
      <p className="font-[family-name:var(--font-mono-face)] text-xs uppercase tracking-[0.25em] text-[var(--muted-2)]">
        {mode === "login" ? "Acesso" : "Cadastro"}
      </p>
      <h1 className="mb-6 mt-1 font-[family-name:var(--font-display-face)] text-3xl font-bold tracking-tight">
        {mode === "login" ? "Entrar" : "Criar conta"}
      </h1>

      <form onSubmit={handle} className="space-y-3">
        {mode === "register" ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome"
            className="w-full rounded-md border bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--muted-2)] focus:border-[var(--muted)]"
          />
        ) : null}
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail"
          className="w-full rounded-md border bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--muted-2)] focus:border-[var(--muted)]"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha (min. 8)"
          className="w-full rounded-md border bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--muted-2)] focus:border-[var(--muted)]"
        />
        {error ? (
          <p className="text-sm text-[var(--m-chest)]">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-[var(--chalk)] px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "..." : mode === "login" ? "Entrar" : "Criar conta"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "login" ? "register" : "login");
          setError(null);
        }}
        className={cn(
          "mt-4 text-center text-sm text-[var(--muted)] hover:text-[var(--text)]",
        )}
      >
        {mode === "login"
          ? "Nao tem conta? Cadastre-se"
          : "Ja tem conta? Entrar"}
      </button>
    </main>
  );
}
