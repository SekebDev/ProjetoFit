"use client";

import type {
  LeaderboardEntry,
  LeaderboardMetric,
  LeaderboardPeriod,
} from "@workout/shared";
import { useEffect, useState } from "react";
import { Mascot } from "@/components/Mascot";
import {
  chaveDaOrdem,
  gravaOrdem,
  leOrdem,
  ordemAtual,
  quemUltrapassou,
} from "@/lib/groups/overtake";
import { useLeaderboard } from "@/lib/hooks/useGroups";
import { comNome, pickPhrase } from "@/lib/rackie/phrases";
import { cn } from "@/lib/utils";

/**
 * O ranking do grupo.
 *
 * O aviso de ultrapassagem so vale pra UMA combinacao — XP da semana, que e a
 * visao padrao. Guardar a ordem de todas as doze combinacoes significaria doze
 * avisos disparando em cascata conforme a pessoa troca de aba, cada um sobre um
 * recorte que ela talvez nunca tenha olhado. As outras abas sao pra consultar,
 * nao pra cobrar.
 */
const PERIODO_AVISO: LeaderboardPeriod = "week";
const METRICA_AVISO: LeaderboardMetric = "xp";

const PERIODOS: { value: LeaderboardPeriod; label: string }[] = [
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "all", label: "Geral" },
];

const METRICAS: { value: LeaderboardMetric; label: string }[] = [
  { value: "xp", label: "XP" },
  { value: "sessions", label: "Treinos" },
  { value: "volume", label: "Volume" },
  { value: "streak", label: "Sequência" },
];

interface Props {
  groupId: string;
  /** Pra grifar sua linha e saber de quem medir a ultrapassagem. */
  meuUserId: string;
}

export function Leaderboard({ groupId, meuUserId }: Props) {
  const [period, setPeriod] = useState<LeaderboardPeriod>(PERIODO_AVISO);
  const [metric, setMetric] = useState<LeaderboardMetric>(METRICA_AVISO);
  const { data, isLoading } = useLeaderboard(groupId, period, metric);

  // Congelados no mount, de proposito. Se a ordem anterior fosse relida a cada
  // render, o efeito abaixo (que grava a ordem nova) apagaria o aviso no render
  // seguinte — a pessoa veria a faixa piscar e sumir.
  const [ordemAnterior] = useState(() =>
    leOrdem(chaveDaOrdem(groupId, PERIODO_AVISO, METRICA_AVISO)),
  );
  // pickPhrase sorteia; sortear durante o render viola react-hooks/purity.
  const [frase] = useState(() => pickPhrase("overtaken"));

  const naVisaoDoAviso = period === PERIODO_AVISO && metric === METRICA_AVISO;
  const entries = data?.entries ?? [];
  const ultrapassaram = naVisaoDoAviso
    ? quemUltrapassou(ordemAnterior, entries, meuUserId)
    : [];

  useEffect(() => {
    if (!naVisaoDoAviso) return;
    const atuais = data?.entries;
    // Ranking vazio nao substitui a ordem guardada: seria apagar a memoria por
    // causa de um carregamento em andamento ou de um grupo recem-criado.
    if (!atuais || atuais.length === 0) return;
    gravaOrdem(
      chaveDaOrdem(groupId, PERIODO_AVISO, METRICA_AVISO),
      ordemAtual(atuais),
    );
  }, [groupId, naVisaoDoAviso, data]);

  // A metrica de sequencia ignora periodo: o servidor devolve sempre "all",
  // porque uma sequencia recortada em uma semana nao e uma sequencia.
  const periodoTravado = metric === "streak";

  return (
    <section>
      <Abas
        opcoes={METRICAS}
        valor={metric}
        onChange={(v) => setMetric(v)}
        rotulo="Métrica do ranking"
      />

      <div className="mt-2">
        <Abas
          opcoes={PERIODOS}
          valor={periodoTravado ? "all" : period}
          onChange={(v) => setPeriod(v)}
          rotulo="Período do ranking"
          desabilitado={periodoTravado}
        />
      </div>

      {periodoTravado ? (
        <p className="mt-2 font-[family-name:var(--font-mono-face)] text-[11px] text-[var(--muted-2)]">
          Sequência conta desde o início — período não se aplica.
        </p>
      ) : null}

      {ultrapassaram.length > 0 ? (
        <FaixaUltrapassagem nomes={ultrapassaram} frase={frase} />
      ) : null}

      {isLoading ? (
        <ul className="mt-4 space-y-2">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="h-14 animate-pulse rounded-lg border bg-[var(--surface)]"
            />
          ))}
        </ul>
      ) : (
        // Sem estado vazio de proposito: o servidor devolve TODO membro, com 0
        // pra quem nao treinou (groups.service.ts). Uma lista vazia so
        // aconteceria num grupo sem ninguem, que nao existe — quem sai por
        // ultimo apaga o grupo.
        <ol className="mt-4 space-y-2">
          {entries.map((e) => (
            <li key={e.userId}>
              <Linha entry={e} metric={metric} souEu={e.userId === meuUserId} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/**
 * A faixa de quem te passou.
 *
 * Fixa, e nao o balao da Rackie: o balao some sozinho em 2,2s, e o aviso
 * precisa continuar visivel enquanto a pessoa le o ranking pra entender o que
 * aconteceu. Alem disso, disparar o balao ao montar significaria setar estado
 * dentro de um efeito — o que o React 19 barra por bons motivos.
 */
function FaixaUltrapassagem({
  nomes,
  frase,
}: {
  nomes: string[];
  frase: string;
}) {
  // Com mais de um, a frase no singular perde a graca — vira um resumo.
  const texto =
    nomes.length === 1
      ? comNome(frase, nomes[0])
      : `${nomes.length} pessoas passaram na sua frente. Bora revidar.`;

  return (
    <section
      role="status"
      className="mt-4 flex items-center gap-3 rounded-xl border border-[var(--m-arms)]/40 bg-[var(--m-arms)]/10 p-3"
    >
      <Mascot state="sad" size="sm" className="shrink-0" />
      <p className="text-sm text-[var(--text)]">{texto}</p>
    </section>
  );
}

function Linha({
  entry,
  metric,
  souEu,
}: {
  entry: LeaderboardEntry;
  metric: LeaderboardMetric;
  souEu: boolean;
}) {
  const podio = entry.position <= 3;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3",
        souEu
          ? "border-[var(--chalk)] bg-[var(--surface-2)]"
          : "bg-[var(--surface)]",
      )}
    >
      <span
        className={cn(
          "w-8 shrink-0 text-center font-[family-name:var(--font-display-face)] text-xl font-bold tabular-nums",
          podio ? "text-[var(--m-shoulders)]" : "text-[var(--muted-2)]",
        )}
      >
        {entry.position}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {entry.name}
          {souEu ? (
            <span className="ml-1.5 font-[family-name:var(--font-mono-face)] text-[10px] uppercase tracking-widest text-[var(--muted-2)]">
              você
            </span>
          ) : null}
        </p>
        {entry.behindLeader > 0 ? (
          <p className="font-[family-name:var(--font-mono-face)] text-[11px] text-[var(--muted-2)]">
            {formataValor(entry.behindLeader, metric)} atrás do líder
          </p>
        ) : null}
      </div>

      <span className="shrink-0 font-[family-name:var(--font-display-face)] text-base font-bold tabular-nums">
        {formataValor(entry.value, metric)}
      </span>
    </div>
  );
}

function Abas<T extends string>({
  opcoes,
  valor,
  onChange,
  rotulo,
  desabilitado = false,
}: {
  opcoes: { value: T; label: string }[];
  valor: T;
  onChange: (v: T) => void;
  rotulo: string;
  desabilitado?: boolean;
}) {
  return (
    <div role="group" aria-label={rotulo} className="flex flex-wrap gap-2">
      {opcoes.map((o) => {
        const ativo = o.value === valor;
        return (
          <button
            key={o.value}
            type="button"
            disabled={desabilitado}
            aria-pressed={ativo}
            onClick={() => onChange(o.value)}
            className={cn(
              "min-h-11 rounded-md border px-3 text-sm font-medium transition-colors",
              ativo
                ? "border-[var(--chalk)] bg-[var(--chalk)] text-black"
                : "text-[var(--muted)] hover:border-[var(--muted-2)] hover:text-[var(--text)]",
              desabilitado && "cursor-not-allowed opacity-40",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Cada metrica tem sua unidade — um numero cru nao diz o que e. */
function formataValor(valor: number, metric: LeaderboardMetric): string {
  const n = Math.round(valor).toLocaleString("pt-BR");
  switch (metric) {
    case "xp":
      return `${n} XP`;
    case "sessions":
      return valor === 1 ? "1 treino" : `${n} treinos`;
    case "volume":
      return `${n} kg`;
    case "streak":
      return valor === 1 ? "1 dia" : `${n} dias`;
  }
}
