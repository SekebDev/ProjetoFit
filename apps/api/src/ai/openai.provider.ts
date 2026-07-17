import type { Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";

/** Token de DI do cliente da OpenAI. `null` quando nao ha chave configurada. */
export const OPENAI = Symbol("OPENAI");

export type OpenAiClient = OpenAI | null;

/**
 * Constroi o cliente da OpenAI, ou `null` se a chave nao estiver configurada.
 *
 * Duas decisoes moram aqui, as duas deliberadas:
 *
 * 1. `null` em vez de lancar. Sem a chave, o app inteiro continua de pe e so a
 *    geracao por IA responde 503 — quem usa plano manual (Fases 0-4) nao e
 *    punido por nao ter conta na OpenAI, e o e2e roda sem chave no CI.
 *
 * 2. Provider em vez de `new OpenAI()` no escopo do modulo (como no esboco do
 *    documento). O escopo do modulo roda no import: sem chave explodiria antes
 *    de o Nest subir, e nao haveria como injetar um dublê nos testes — o que
 *    significaria chamar (e pagar) a OpenAI de verdade a cada rodada.
 *
 * A chave nunca sai daqui: nao vai pra log, nao vai pra resposta, e o Next nem
 * sabe que ela existe.
 */
export const openAiProvider: Provider = {
  provide: OPENAI,
  inject: [ConfigService],
  useFactory: (config: ConfigService): OpenAiClient => {
    const apiKey = config.get<string>("OPENAI_API_KEY")?.trim();
    // String vazia conta como ausente: o docker-compose passa
    // `OPENAI_API_KEY: ${OPENAI_API_KEY:-}`, entao "nao configurei" chega aqui
    // como "" e nao como undefined.
    return apiKey ? new OpenAI({ apiKey }) : null;
  },
};
