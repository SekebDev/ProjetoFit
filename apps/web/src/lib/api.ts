export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

const TOKEN_KEY = "wk_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

interface ZodIssue {
  path: (string | number)[];
  message: string;
}
interface ApiErrorBody {
  message?: string;
  issues?: ZodIssue[];
}

/**
 * Um 400 do ZodValidationPipe traz `issues` com o caminho exato do campo.
 * Ignorar isso deixava o usuário com um "Dados inválidos" sem pista de onde.
 */
function errorMessage(body: ApiErrorBody | null, status: number): string {
  const base = body?.message ?? `Requisição falhou: ${status}`;
  const first = body?.issues?.[0];
  if (!first) return base;
  return `${base} (${first.path.join(".")}: ${first.message})`;
}

/**
 * Erro de API com o status preservado.
 *
 * Estende Error de proposito: todo `catch` que so le `.message` continua
 * funcionando. O `status` existe porque algumas telas precisam distinguir o
 * motivo — a geracao por IA responde 503 quando a chave nao esta configurada e
 * 429 quando o limite estourou, e as duas coisas pedem textos diferentes de um
 * "algo deu errado" generico.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Cliente HTTP central. A chave da OpenAI NUNCA passa por aqui — só pelo Nest. */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(errorMessage(body, res.status), res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
