import { ACHIEVEMENTS, type AchievementDef } from "./catalog";

/**
 * Os numeros do usuario que o catalogo consulta. Um campo por
 * `AchievementMetric` — o compilador cobra quando uma metrica nova e criada.
 */
export interface UnlockStats {
  /** Sessoes concluidas (nunca as em aberto). */
  sessions: number;
  /**
   * MELHOR sequencia ja atingida, nao a atual.
   *
   * Usar a atual seria tirar de volta uma conquista quando a chama apaga —
   * conquista desbloqueada nao volta atras.
   */
  streakBest: number;
  prs: number;
  /** Σ reps×carga somando o historico inteiro, em kg. */
  volume: number;
  /**
   * Quantos treinos ja comecaram antes das 6h no fuso do usuario.
   *
   * E contagem, nao flag: a conquista tem meta 1, entao qualquer valor >= 1
   * desbloqueia — e contar o historico faz o desbloqueio se recuperar sozinho
   * caso a gravacao tenha falhado numa madrugada anterior.
   */
  earlyBird: number;
}

/** O valor da metrica que esta conquista observa. */
function metricValue(def: AchievementDef, stats: UnlockStats): number {
  return stats[def.metric];
}

/**
 * Quanto o usuario ja andou rumo a esta conquista, limitado a meta.
 *
 * O teto e o que deixa a UI desenhar a barra direto como `progress / target`
 * sem estourar em quem ja passou muito do limiar.
 */
export function progressFor(def: AchievementDef, stats: UnlockStats): number {
  return Math.min(def.target, metricValue(def, stats));
}

/**
 * As conquistas que os numeros atuais desbloqueiam e que o usuario ainda nao
 * tem.
 *
 * Avalia o catalogo INTEIRO a cada chamada, em vez de so o degrau seguinte:
 * quem cruza dois limiares de uma vez leva os dois, e um desbloqueio que falhou
 * de gravar antes se recupera sozinho na proxima sessao.
 */
export function evaluateUnlocks(
  stats: UnlockStats,
  unlockedCodes: readonly string[],
): AchievementDef[] {
  const jaTem = new Set(unlockedCodes);
  return ACHIEVEMENTS.filter(
    (def) => !jaTem.has(def.code) && metricValue(def, stats) >= def.target,
  );
}
