import { useQuery } from "@tanstack/react-query";
import type { Achievement, Game } from "@workout/shared";
import { apiFetch } from "@/lib/api";
import { fusoDoNavegador } from "@/lib/timezone";

/**
 * XP e nivel — a barra do painel.
 *
 * `staleTime: 0` sobrepondo os 30s globais, pelo mesmo motivo da sequencia: quem
 * termina o treino e volta pro painel precisa ver a barra ter andado.
 */
export function useGame() {
  return useQuery({
    queryKey: ["game"],
    queryFn: () => apiFetch<Game>("/game"),
    staleTime: 0,
  });
}

/** O catalogo inteiro com o progresso do usuario (a tela /achievements). */
export function useAchievements() {
  const tz = fusoDoNavegador();
  return useQuery({
    // O tz entra na chave: varias conquistas medem sequencia, que muda de
    // significado quando o fuso muda.
    queryKey: ["game-achievements", tz],
    queryFn: () =>
      apiFetch<Achievement[]>(`/game/achievements?tz=${encodeURIComponent(tz)}`),
  });
}
