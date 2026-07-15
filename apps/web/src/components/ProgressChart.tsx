"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Os graficos de /progress.
 *
 * "use client" nao basta: o ResponsiveContainer mede o DOM, e no servidor nao
 * ha o que medir. Quem importa isto usa next/dynamic com ssr: false — o que de
 * quebra tira o recharts do bundle inicial, que no celular e o que importa.
 */

const EIXO = {
  stroke: "var(--muted-2)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

/** Sem isto o tooltip do recharts vem branco no tema escuro. */
const TOOLTIP_ESTILO = {
  contentStyle: {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: "var(--muted)" },
  itemStyle: { color: "var(--chalk)" },
} as const;

function formataDiaMes(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

/** 12400 -> "12,4k" — no eixo do celular nao cabe o numero inteiro. */
function formataCompacto(v: number): string {
  return v >= 1000
    ? `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`
    : String(v);
}

/**
 * O formatter do recharts entrega `ValueType | undefined`, nao number: o tipo
 * cobre grafico de faixa (array) e categoria (string). Como o valor pode faltar
 * (o connectNulls=false deixa buracos de proposito), o narrowing e real, nao
 * cerimonia pro compilador.
 */
function formataValor(v: unknown, unidade: string): string {
  return typeof v === "number" ? `${v.toLocaleString("pt-BR")} ${unidade}` : "—";
}

/**
 * Da ao grafico um nome acessivel e esconde o SVG do leitor de tela.
 *
 * Sem isto o recharts entrega uma arvore de <path> e <text> soltos, que o leitor
 * soletra como lixo. Com role="img" + aria-label o grafico e anunciado como uma
 * imagem com descricao — e a descricao carrega os numeros, porque quem usa
 * leitor de tela nao ve a tendencia que a linha desenha.
 */
function Acessivel({
  descricao,
  children,
}: {
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <div role="img" aria-label={descricao}>
      <div aria-hidden>{children}</div>
    </div>
  );
}

interface VolumeChartProps {
  data: { weekStart: string; volume: number; sessionCount: number }[];
  descricao: string;
}

/** Volume semanal: Σ series×reps×carga por semana. */
export function VolumeChart({ data, descricao }: VolumeChartProps) {
  const barras = data.map((d) => ({
    semana: formataDiaMes(d.weekStart),
    volume: Math.round(d.volume),
    treinos: d.sessionCount,
  }));

  return (
    <Acessivel descricao={descricao}>
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={barras} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
        <CartesianGrid
          strokeDasharray="2 4"
          stroke="var(--border-soft)"
          vertical={false}
        />
        <XAxis dataKey="semana" {...EIXO} />
        <YAxis {...EIXO} tickFormatter={formataCompacto} width={40} />
        <Tooltip
          {...TOOLTIP_ESTILO}
          cursor={{ fill: "var(--surface-2)", opacity: 0.4 }}
          formatter={(v) => [formataValor(v, "kg"), "Volume"]}
          labelFormatter={(l) => `Semana de ${String(l)}`}
        />
        <Bar dataKey="volume" fill="var(--m-back)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
    </Acessivel>
  );
}

interface SeriesChartProps {
  data: { date: string; value: number | null }[];
  /** Unidade mostrada no tooltip ("kg", "%"). */
  unidade: string;
  rotulo: string;
  descricao: string;
  cor?: string;
}

/**
 * Serie temporal — serve pra carga de um exercicio e pro peso corporal.
 *
 * `connectNulls` fica FALSE de proposito: um buraco na serie (treino so de peso
 * corporal, semana sem pesagem) tem que aparecer como buraco. Ligar os pontos
 * por cima inventaria uma progressao que nao houve.
 */
export function SeriesChart({
  data,
  unidade,
  rotulo,
  descricao,
  cor,
}: SeriesChartProps) {
  const traco = cor ?? "var(--m-legs)";
  const pontos = data.map((d) => ({
    dia: formataDiaMes(d.date),
    valor: d.value,
  }));

  return (
    <Acessivel descricao={descricao}>
    <ResponsiveContainer width="100%" height={200}>
      <LineChart
        data={pontos}
        margin={{ top: 4, right: 8, bottom: 0, left: -8 }}
      >
        <CartesianGrid
          strokeDasharray="2 4"
          stroke="var(--border-soft)"
          vertical={false}
        />
        <XAxis dataKey="dia" {...EIXO} />
        <YAxis {...EIXO} width={40} domain={["auto", "auto"]} />
        <Tooltip
          {...TOOLTIP_ESTILO}
          cursor={{ stroke: "var(--border)" }}
          formatter={(v) => [formataValor(v, unidade), rotulo]}
        />
        <Line
          type="monotone"
          dataKey="valor"
          stroke={traco}
          strokeWidth={2}
          dot={{ r: 3, strokeWidth: 0, fill: traco }}
          activeDot={{ r: 5 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
    </Acessivel>
  );
}
