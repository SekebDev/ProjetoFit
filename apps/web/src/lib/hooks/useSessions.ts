import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  LastLoad,
  LogSetInput,
  Session,
  SessionSummary,
  SetLog,
} from "@workout/shared";
import { apiFetch } from "@/lib/api";

/** Historico de sessoes, da mais recente pra mais antiga (a tela /history). */
export function useSessionHistory() {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: () => apiFetch<SessionSummary[]>("/sessions"),
  });
}

/**
 * A sessao em aberto do usuario (ou null) — o que deixa o painel oferecer
 * "continuar treino". `enabled` fica a cargo de quem chama: sem usuario logado
 * nao ha o que buscar.
 */
export function useActiveSession() {
  return useQuery({
    queryKey: ["session-active"],
    queryFn: () => apiFetch<Session | null>("/sessions/active"),
    // staleTime: 0 sobrepondo os 30s globais: quem inicia um treino e volta pro
    // painel precisa ver o "continuar" na hora, nao o null cacheado de antes.
    staleTime: 0,
  });
}

/**
 * A sessao do dia, criando se ainda nao existir.
 *
 * useQuery num POST parece torto, mas o POST /sessions e idempotente de
 * proposito: devolve a sessao aberta em vez de criar outra. Entao ele se
 * comporta como "busca ou cria", que e exatamente o que a tela precisa ao
 * montar — inclusive quando o usuario recarrega no meio do treino.
 */
export function useSession(planDayId: string) {
  return useQuery({
    queryKey: ["session", planDayId],
    queryFn: () =>
      apiFetch<Session>("/sessions", {
        method: "POST",
        body: JSON.stringify({ planDayId }),
      }),
    enabled: Boolean(planDayId),
    // Sem isto, voltar pra aba dispararia um POST a cada foco. E inofensivo
    // (idempotente), mas nao ha motivo pra bater no servidor a toa.
    refetchOnWindowFocus: false,
    // staleTime: 0 explicito, sobrepondo os 30s globais do QueryClient
    // (app/providers.tsx). Com qualquer staleTime > 0, remontar depois de
    // encerrar serviria a sessao ENCERRADA do cache e a tela mostraria "Treino
    // concluido" de novo em vez de comecar outro — o e2e "voltar pro mesmo dia
    // depois de encerrar" existe justamente pra travar isto.
    // Revalidando sempre, o POST devolve a sessao aberta se houver e cria uma
    // nova se nao houver: e exatamente pra isso que ele e idempotente.
    staleTime: 0,
  });
}

/** Ultima carga de cada exercicio do dia, pra pre-preencher os campos. */
export function useLastLoads(planDayId: string) {
  return useQuery({
    queryKey: ["last-loads", planDayId],
    queryFn: () =>
      apiFetch<LastLoad[]>(
        `/sessions/last-loads?planDayId=${encodeURIComponent(planDayId)}`,
      ),
    enabled: Boolean(planDayId),
  });
}

export function useLogSet(sessionId: string, planDayId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LogSetInput) =>
      apiFetch<SetLog>(`/sessions/${sessionId}/logs`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (log) => {
      // Espelha no cache o upsert que o servidor fez: troca a serie de mesmo
      // (exercicio, numero) em vez de empilhar outra.
      qc.setQueryData<Session>(["session", planDayId], (old) => {
        if (!old) return old;
        const outras = old.setLogs.filter(
          (l) =>
            !(l.exerciseId === log.exerciseId && l.setNumber === log.setNumber),
        );
        return { ...old, setLogs: [...outras, log] };
      });
    },
  });
}

export function useFinishSession(sessionId: string, planDayId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notes: string | null) =>
      apiFetch<Session>(`/sessions/${sessionId}/finish`, {
        method: "PATCH",
        body: JSON.stringify({ notes }),
      }),
    onSuccess: (session) => {
      qc.setQueryData(["session", planDayId], session);
      // A sessao fechou: some do "continuar treino" do painel.
      void qc.invalidateQueries({ queryKey: ["session-active"] });
      // A sessao virou historico: agora ela conta como "ultima carga".
      void qc.invalidateQueries({ queryKey: ["last-loads", planDayId] });
      // ...e so agora ela entra no /history e nos graficos, porque os dois so
      // olham sessao encerrada. Sem invalidar, quem termina o treino e abre o
      // progresso ve o estado de antes do treino que acabou de fazer.
      void qc.invalidateQueries({ queryKey: ["sessions"] });
      void qc.invalidateQueries({ queryKey: ["progress-summary"] });
      void qc.invalidateQueries({ queryKey: ["progress-exercise"] });
      // A sessao encerrada muda o volume da semana — reavalia o deload no dash.
      void qc.invalidateQueries({ queryKey: ["progress-deload"] });
    },
  });
}
