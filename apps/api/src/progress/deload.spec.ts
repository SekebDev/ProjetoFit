import { describe, expect, it } from "vitest";
import type { WeeklyVolume } from "@workout/shared";
import {
  DELOAD_CYCLE_WEEKS,
  DELOAD_DROP_THRESHOLD,
  computeDeload,
} from "./deload";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
// Uma segunda-feira qualquer, meia-noite UTC, pra ancorar as semanas.
const BASE = Date.parse("2026-01-05T00:00:00.000Z");

/** Constroi semanas consecutivas (ASC) a partir de uma lista de volumes. */
function semanas(volumes: number[]): WeeklyVolume[] {
  return volumes.map((volume, i) => ({
    weekStart: new Date(BASE + i * WEEK_MS).toISOString(),
    volume,
    sessionCount: volume > 0 ? 3 : 0,
  }));
}

/** Inicio da "semana corrente" = a semana logo apos a ultima do array. */
function semanaCorrente(qtd: number): string {
  return new Date(BASE + qtd * WEEK_MS).toISOString();
}

describe("computeDeload", () => {
  it("nao opina com menos de duas semanas completas", () => {
    const weeks = semanas([1000]);
    const d = computeDeload(weeks, semanaCorrente(1));

    expect(d.recommend).toBe(false);
    expect(d.reason).toBeNull();
    expect(d.baselineVolume).toBeNull();
  });

  it("ignora a semana corrente em andamento", () => {
    // 3 semanas estaveis + a semana corrente com volume baixo (parcial).
    const weeks = semanas([1000, 1000, 1000, 50]);
    // A ultima entra como semana corrente e nao pode virar "queda".
    const d = computeDeload(weeks, semanaCorrente(3));

    expect(d.lastWeekVolume).toBe(1000);
    expect(d.reason).not.toBe("FATIGUE");
  });

  it("sinaliza FATIGUE quando o volume da ultima semana cai abaixo do limiar", () => {
    // base ~1000, ultima completa = 700 (queda de 30%).
    const weeks = semanas([1000, 1000, 1000, 700]);
    const d = computeDeload(weeks, semanaCorrente(4));

    expect(d.baselineVolume).toBe(1000);
    expect(d.lastWeekVolume).toBe(700);
    expect(d.dropPct).toBeCloseTo(0.3);
    expect(d.dropPct as number).toBeGreaterThanOrEqual(DELOAD_DROP_THRESHOLD);
    expect(d.reason).toBe("FATIGUE");
    expect(d.recommend).toBe(true);
  });

  it("nao sinaliza FATIGUE numa queda pequena", () => {
    // queda de 10%, abaixo do limiar de 15%.
    const weeks = semanas([1000, 1000, 1000, 900]);
    const d = computeDeload(weeks, semanaCorrente(4));

    expect(d.reason).toBeNull();
    expect(d.recommend).toBe(false);
  });

  it("sinaliza CYCLE apos muitas semanas pesadas seguidas", () => {
    // Volume estavel por 6 semanas: sem queda, mas ciclo longo demais.
    const weeks = semanas(Array.from({ length: 6 }, () => 1000));
    const d = computeDeload(weeks, semanaCorrente(6));

    expect(d.hardWeekStreak).toBeGreaterThanOrEqual(DELOAD_CYCLE_WEEKS);
    expect(d.reason).toBe("CYCLE");
    expect(d.recommend).toBe(true);
  });

  it("uma semana de descanso zera a contagem do ciclo", () => {
    // O 0 no meio quebra a sequencia de semanas pesadas.
    const weeks = semanas([1000, 1000, 1000, 0, 1000, 1000]);
    const d = computeDeload(weeks, semanaCorrente(6));

    expect(d.hardWeekStreak).toBeLessThan(DELOAD_CYCLE_WEEKS);
    expect(d.reason).toBeNull();
    expect(d.recommend).toBe(false);
  });

  it("marca BOTH quando fadiga e ciclo batem juntos", () => {
    // 5 semanas a 1000 + ultima a 850: queda de exatos 15% (fadiga) e a semana
    // ainda conta como pesada (>= 85% da base), esticando o ciclo.
    const weeks = semanas([1000, 1000, 1000, 1000, 1000, 850]);
    const d = computeDeload(weeks, semanaCorrente(6));

    expect(d.dropPct).toBeCloseTo(0.15);
    expect(d.hardWeekStreak).toBeGreaterThanOrEqual(DELOAD_CYCLE_WEEKS);
    expect(d.reason).toBe("BOTH");
    expect(d.recommend).toBe(true);
  });

  it("preenche semanas ausentes com zero (query so traz semanas treinadas)", () => {
    // Sem a densificacao, [1000, (falta), 1000] pareceria duas semanas seguidas.
    const weeks: WeeklyVolume[] = [
      { weekStart: new Date(BASE).toISOString(), volume: 1000, sessionCount: 3 },
      {
        weekStart: new Date(BASE + 2 * WEEK_MS).toISOString(),
        volume: 1000,
        sessionCount: 3,
      },
    ];
    const d = computeDeload(weeks, semanaCorrente(3));

    // A semana ausente (indice 1) vira 0, entao o ciclo nao passa de 1.
    expect(d.hardWeekStreak).toBeLessThan(DELOAD_CYCLE_WEEKS);
  });
});
