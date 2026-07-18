/**
 * O fuso do navegador — o servidor nao tem como adivinhar.
 *
 * Sem mandar isto, as semanas do grafico sairiam fatiadas no fuso do servidor,
 * um treino de domingo a noite apareceria na semana seguinte, e a sequencia que
 * multiplica o XP contaria os dias errados.
 */
export function fusoDoNavegador(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
