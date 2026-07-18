import { describe, expect, it } from "vitest";
import { computeStreak } from "./streak";

// Semana de referencia: 2024-01-01 e uma segunda-feira.
//   01 Seg · 02 Ter · 03 Qua · 04 Qui · 05 Sex · 06 Sab · 07 Dom · 08 Seg
const SEG_TER_QUA_SEX = [1, 2, 3, 5]; // seg, ter, qua, sex

describe("computeStreak", () => {
  it("sem dias agendados devolve estado unscheduled", () => {
    const r = computeStreak({
      today: "2024-01-05",
      trainedDates: ["2024-01-05"],
      scheduleWeekdays: [],
    });
    expect(r.state).toBe("unscheduled");
    expect(r.current).toBe(0);
    expect(r.best).toBe(0);
  });

  it("repoe um dia agendado faltante com treino em dia de folga", () => {
    // Faltou quarta (03), mas treinou quinta (04): repoe. Sequencia intacta.
    const r = computeStreak({
      today: "2024-01-05",
      trainedDates: ["2024-01-01", "2024-01-02", "2024-01-04", "2024-01-05"],
      scheduleWeekdays: SEG_TER_QUA_SEX,
    });
    expect(r.current).toBe(4);
    expect(r.best).toBe(4);
    expect(r.state).toBe("active");
    expect(r.scheduledToday).toBe(true);
    expect(r.trainedToday).toBe(true);
  });

  it("dia agendado de hoje ainda nao cumprido deixa a sequencia em risco", () => {
    const r = computeStreak({
      today: "2024-01-03", // quarta, dia agendado
      trainedDates: ["2024-01-01", "2024-01-02"],
      scheduleWeekdays: SEG_TER_QUA_SEX,
    });
    expect(r.current).toBe(2);
    expect(r.state).toBe("atRisk");
    expect(r.scheduledToday).toBe(true);
    expect(r.trainedToday).toBe(false);
  });

  it("dia de folga com a sequencia salva devolve resting", () => {
    const r = computeStreak({
      today: "2024-01-04", // quinta, folga
      trainedDates: ["2024-01-01", "2024-01-02", "2024-01-03"],
      scheduleWeekdays: SEG_TER_QUA_SEX,
    });
    expect(r.current).toBe(3);
    expect(r.state).toBe("resting");
    expect(r.scheduledToday).toBe(false);
  });

  it("sem treino nenhum e sequencia zerada devolve idle", () => {
    const r = computeStreak({
      today: "2024-01-01",
      trainedDates: [],
      scheduleWeekdays: SEG_TER_QUA_SEX,
    });
    expect(r.current).toBe(0);
    expect(r.best).toBe(0);
    expect(r.state).toBe("idle");
  });

  it("faltar sem repor quebra a sequencia atual mas guarda o melhor", () => {
    // So segundas. Treinou 01/08/15 (3 seguidas), faltou 22, voltou 29 (hoje).
    const r = computeStreak({
      today: "2024-01-29",
      trainedDates: ["2024-01-01", "2024-01-08", "2024-01-15", "2024-01-29"],
      scheduleWeekdays: [1],
    });
    expect(r.current).toBe(1);
    expect(r.best).toBe(3);
    expect(r.state).toBe("active");
  });

  it("folga dentro da janela de reposicao de um dia faltante fica em risco", () => {
    // Treinou seg (01) e ter (02), faltou qua (03). Hoje e quinta (04, folga):
    // ainda da pra repor a quarta hoje -> em risco.
    const r = computeStreak({
      today: "2024-01-04",
      trainedDates: ["2024-01-01", "2024-01-02"],
      scheduleWeekdays: SEG_TER_QUA_SEX,
    });
    expect(r.current).toBe(2);
    expect(r.state).toBe("atRisk");
    expect(r.scheduledToday).toBe(false);
  });
});
