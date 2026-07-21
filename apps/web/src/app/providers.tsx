"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { RackieProvider } from "@/components/rackie/RackieProvider";
import { AuthProvider } from "@/lib/auth";
import { installAppResumeBridge } from "@/lib/query/focus-refetch";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            // Voltar de tunel/queda de rede revalida sozinho, sem F5.
            refetchOnReconnect: true,
          },
        },
      }),
  );

  // Liga o retorno ao foco do app (inclusive o resume do WebView Android) a
  // revalidacao do React Query — a maior causa de "precisa F5" no WebView, onde
  // o visibilitychange padrao nem sempre dispara.
  useEffect(() => installAppResumeBridge(), []);
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <RackieProvider>{children}</RackieProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
