import { describe, expect, it } from "vitest";
import { pickNextWorkout, type SchedulableDay } from "./next-workout";

/** Monta um dia agendado enxuto. weekday ISO 1=segunda .. 7=domingo. */
function dia(id: string, weekday: number | null): SchedulableDay {
  return { id, name: id, focus: null, weekday };
}

describe("pickNextWorkout", () => {
  it("devolve null quando nenhum dia esta agendado", () => {
    const days = [dia("a", null), dia("b", null)];
    expect(pickNextWorkout(days, 3, [])).toBeNull();
  });

  it("escolhe o dia agendado para hoje e marca isToday", () => {
    // Hoje = quarta (3). O dia B esta agendado para quarta.
    const days = [dia("a", 1), dia("b", 3), dia("c", 5)];
    const escolha = pickNextWorkout(days, 3, []);

    expect(escolha?.day.id).toBe("b");
    expect(escolha?.isToday).toBe(true);
  });

  it("pega o proximo dia agendado quando hoje nao tem treino", () => {
    // Hoje = terca (2); agendados sao segunda (1) e quinta (4). Quinta esta a
    // 2 dias; segunda so daqui a 6 (semana que vem). Quinta vence.
    const days = [dia("a", 1), dia("b", 4)];
    const escolha = pickNextWorkout(days, 2, []);

    expect(escolha?.day.id).toBe("b");
    expect(escolha?.isToday).toBe(false);
  });

  it("da a volta na semana quando o unico dia ja passou", () => {
    // Hoje = sexta (5); unico agendado = segunda (1), a 3 dias.
    const days = [dia("a", 1)];
    const escolha = pickNextWorkout(days, 5, []);

    expect(escolha?.day.id).toBe("a");
    expect(escolha?.isToday).toBe(false);
  });

  it("avanca para o proximo quando o dia de hoje ja foi treinado hoje", () => {
    // Hoje = quarta (3). B e de quarta, mas ja foi feito hoje -> anda uma
    // semana e a vez passa pra C (sexta, a 2 dias).
    const days = [dia("b", 3), dia("c", 5)];
    const escolha = pickNextWorkout(days, 3, ["b"]);

    expect(escolha?.day.id).toBe("c");
    expect(escolha?.isToday).toBe(false);
  });

  it("mantem hoje quando o treinado hoje foi outro dia, nao o de hoje", () => {
    // Terminou "a" hoje, mas o agendado pra hoje e "b" e ele ainda nao foi.
    const days = [dia("a", 1), dia("b", 3)];
    const escolha = pickNextWorkout(days, 3, ["a"]);

    expect(escolha?.day.id).toBe("b");
    expect(escolha?.isToday).toBe(true);
  });

  it("no empate de distancia vence o primeiro da ordem", () => {
    // Dois dias no mesmo weekday (5), hoje = segunda (1). Vence o primeiro.
    const days = [dia("primeiro", 5), dia("segundo", 5)];
    const escolha = pickNextWorkout(days, 1, []);

    expect(escolha?.day.id).toBe("primeiro");
  });

  it("ignora dias sem weekday ao escolher", () => {
    // "a" nao tem dia fixo; o proximo agendado e "b" (domingo, 7), hoje sabado (6).
    const days = [dia("a", null), dia("b", 7)];
    const escolha = pickNextWorkout(days, 6, []);

    expect(escolha?.day.id).toBe("b");
    expect(escolha?.isToday).toBe(false);
  });
});
