"use client";

import { useQuery } from "@tanstack/react-query";
import type { Health } from "@workout/shared";
import { apiFetch } from "@/lib/api";

export default function Home() {
  const { data, isLoading, isError, error } = useQuery<Health>({
    queryKey: ["health"],
    queryFn: () => apiFetch<Health>("/health"),
    refetchInterval: 5_000,
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">WorkoutApp</h1>
        <p className="text-sm text-neutral-500">
          Fase 0 — scaffold do monorepo (web + api + shared)
        </p>
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Status da API
        </h2>

        {isLoading && <p className="text-neutral-500">Verificando…</p>}

        {isError && (
          <p className="text-red-600">
            API offline: {(error as Error).message}
          </p>
        )}

        {data && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
              <span className="font-medium">online ({data.status})</span>
            </div>
            <p className="text-sm text-neutral-500">
              uptime: {data.uptime.toFixed(1)}s
            </p>
            <p className="text-sm text-neutral-500">
              checado em: {new Date(data.timestamp).toLocaleTimeString("pt-BR")}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
