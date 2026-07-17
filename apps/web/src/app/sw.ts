/// <reference lib="webworker" />
// Service worker do Serwist (compilado pelo @serwist/next em build → public/sw.js).
// Fora do typecheck do app (excluido no tsconfig) porque usa a lib "webworker",
// que conflita com a lib "dom" do resto do projeto.
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { ExpirationPlugin, Serwist, StaleWhileRevalidate } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Lista de precache injetada pelo @serwist/next no build (shell + assets).
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // GET da API (plano ativo, exercicios, perfil): stale-while-revalidate pra
    // conseguir consultar o treino offline. Vem ANTES do defaultCache pra ter
    // precedencia. So GET — mutacoes nunca sao cacheadas.
    {
      matcher: ({ url, request }) =>
        request.method === "GET" && url.pathname.startsWith("/api/"),
      handler: new StaleWhileRevalidate({
        cacheName: "api-get",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 1 semana
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
