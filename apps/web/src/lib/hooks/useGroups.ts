import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateGroupInput,
  Group,
  GroupSummary,
  JoinGroupInput,
  Leaderboard,
  LeaderboardMetric,
  LeaderboardPeriod,
} from "@workout/shared";
import { apiFetch } from "@/lib/api";
import { fusoDoNavegador } from "@/lib/timezone";

/** Os grupos de que o usuario participa (a tela /groups). */
export function useGroups() {
  return useQuery({
    queryKey: ["groups"],
    queryFn: () => apiFetch<GroupSummary[]>("/groups"),
  });
}

/**
 * O detalhe de um grupo — inclui o codigo de convite e a lista de membros.
 *
 * Quem nao e membro toma 404 (nunca 403, pra nao confirmar que o grupo existe).
 * A tela trata isso como "grupo nao encontrado" sem distinguir os dois casos,
 * que e exatamente o efeito que o servidor quis.
 */
export function useGroup(id: string) {
  return useQuery({
    queryKey: ["group", id],
    queryFn: () => apiFetch<Group>(`/groups/${encodeURIComponent(id)}`),
    enabled: Boolean(id),
  });
}

/**
 * O ranking do grupo.
 *
 * O `tz` entra na chave junto com periodo e metrica: semana, mes e sequencia so
 * existem dentro de um fuso, e quem viaja precisa ver o recorte refeito em vez
 * do cache do fuso antigo.
 *
 * `staleTime: 0` sobrepondo os 30s globais — o ranking e justamente a tela onde
 * o usuario volta pra ver se alguem passou na frente.
 */
export function useLeaderboard(
  id: string,
  period: LeaderboardPeriod,
  metric: LeaderboardMetric,
) {
  const tz = fusoDoNavegador();
  return useQuery({
    queryKey: ["group-leaderboard", id, period, metric, tz],
    queryFn: () =>
      apiFetch<Leaderboard>(
        `/groups/${encodeURIComponent(id)}/leaderboard` +
          `?tz=${encodeURIComponent(tz)}&period=${period}&metric=${metric}`,
      ),
    enabled: Boolean(id),
    staleTime: 0,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGroupInput) =>
      apiFetch<Group>("/groups", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useJoinGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: JoinGroupInput) =>
      apiFetch<GroupSummary>("/groups/join", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useLeaveGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/groups/${encodeURIComponent(id)}/leave`, {
        method: "DELETE",
      }),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: ["groups"] });
      // O detalhe some junto: sair pode ter apagado o grupo (ultimo membro) ou
      // passado a posse adiante. Em nenhum dos casos o cache antigo vale.
      qc.removeQueries({ queryKey: ["group", id] });
      qc.removeQueries({ queryKey: ["group-leaderboard", id] });
    },
  });
}
