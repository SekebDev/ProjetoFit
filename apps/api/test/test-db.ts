/**
 * Banco dedicado ao E2E — separado do `workout` de dev de proposito: a suite
 * limpa tabelas, e a biblioteca de exercicios do dev nao pode ser colateral.
 *
 * Vive num arquivo proprio (e nao na config) porque a config ja tem export
 * default; misturar os dois gera warning de MIXED_EXPORTS no bundle.
 */
export const TEST_DATABASE_URL =
  "postgresql://workout:workout@localhost:5433/workout_test?schema=public";
