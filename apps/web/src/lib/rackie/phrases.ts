/**
 * Frases da Rackie — a parceira de treino "amigo raiz": zoa chamando de frango,
 * comemora PR, empurra pra subir o peso. Brincadeira, nunca culpa (o README da
 * mascote proibe culpa, nao zoacao). No descanso ela protege a recuperacao, do
 * jeito dela.
 *
 * Pool curado no cliente de proposito: roda offline no PWA, sem custo nem
 * latencia de IA. A chave OPENAI_API_KEY continua so no backend.
 */

/** Em que momento a Rackie fala. Cada contexto tem seu tom. */
export type RackieContext = "set" | "pr" | "day" | "rest";

const POOLS: Record<RackieContext, readonly string[]> = {
  // Serie comum concluida: zoacao leve + empurrao pra proxima.
  set: [
    "Mais uma na conta, frango. Bora.",
    "Isso! Tá pegando o jeito.",
    "Boa série. Não relaxa que tem mais.",
    "Fez bonito. Próxima!",
    "Tá suando já, frango? Segue o jogo.",
    "Essa foi limpa. Manda a próxima.",
    "Registrado. Agora não amarela.",
    "Pegou pesado? Nem senti daqui.",
  ],
  // Bateu recorde: comemoracao no talo.
  pr: [
    "PR NA CONTA! Agora sim, monstro!",
    "SUBIU O PESO! Cadê aquele frango de ontem?",
    "Recorde batido! Tá voando hoje!",
    "Isso é PR novo, hein! Orgulho.",
    "Passou do que fez da última vez. É ISSO!",
    "Bateu o recorde e nem despenteou. Absurdo.",
  ],
  // Dia concluido: fechamento com orgulho.
  day: [
    "Fechou o dia! Frango virou galo.",
    "Treino concluído. Pode se gabar hoje.",
    "É isso! Descansa que amanhã tem mais.",
    "Fechou com chave de ouro. Bebe uma água.",
    "Dia batido. Tô orgulhoso de você, viu?",
    "Acabou! Agora recupera essas perna.",
  ],
  // Descanso: protege a recuperacao, no tom de amigo raiz.
  rest: [
    "Recupera essas perna de frango que já já tem mais.",
    "Descanso também é treino, não inventa moda.",
    "Respira, bebe água. O peso não vai fugir.",
    "Calma, campeão. Recuperar é parte do jogo.",
  ],
};

/**
 * Sorteia uma frase do contexto, evitando repetir a ultima mostrada (`exclude`).
 * Pura de proposito: facil de testar e sem efeito colateral no render.
 */
export function pickPhrase(
  context: RackieContext,
  exclude?: string | null,
): string {
  const pool = POOLS[context];
  // Pool com um item so, ou exclude que nem esta no pool: nada a filtrar.
  const candidatos =
    pool.length > 1 && exclude ? pool.filter((f) => f !== exclude) : pool;
  const i = Math.floor(Math.random() * candidatos.length);
  return candidatos[i];
}
