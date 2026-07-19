"use client";

import { ClipboardList, Dumbbell, House, TrendingUp, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PublicUser } from "@workout/shared";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

// Cinco e o teto. Nao pelo alvo de toque — em 320px seis colunas ainda dariam
// 53px cada, acima dos 44px recomendados — mas pelo ROTULO: "Biblioteca" em
// 10px com tracking passa de 53px e comecaria a cortar. Por isso /history e
// /achievements tambem nao estao aqui; sao alcancados de /progress e do painel.
//
// Grupos entrou no lugar de Perfil (que foi pro header, ao lado de "Sair"):
// perfil se mexe uma vez por mes, grupo se abre pra ver se alguem te passou. A
// barra do polegar deve refletir a frequencia de uso, nao o organograma do app.
const LINKS: NavLink[] = [
  { href: "/", label: "Painel", icon: House },
  { href: "/exercises", label: "Biblioteca", icon: Dumbbell },
  { href: "/plans", label: "Planos", icon: ClipboardList },
  { href: "/progress", label: "Progresso", icon: TrendingUp },
  { href: "/groups", label: "Grupos", icon: Users },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * A letra do avatar.
 *
 * `name` e nullable no schema (da pra se cadastrar so com e-mail), e o trim
 * cobre quem salvou espacos em branco — nos dois casos o e-mail assume.
 *
 * Array.from em vez de charAt: charAt corta um par substituto no meio e um nome
 * comecado por emoji viraria um losango. Custa nada e nao tem esse jeito de
 * falhar.
 */
function inicialDe(user: PublicUser): string {
  const base = user.name?.trim() || user.email;
  return (Array.from(base)[0] ?? "?").toUpperCase();
}

export function Nav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-[var(--bg)]/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-5">
          <Link href="/" className="flex items-baseline gap-2">
            {/* tracking curto de proposito. O 0.2em anterior existia pra dar
                corpo a uma sigla de 4 letras; em "Hipertrof.AI", com 12
                caracteres e caixa mista, o mesmo espacamento esticaria o
                wordmark pra ~160px e o desmancharia em letras soltas. */}
            <span className="font-[family-name:var(--font-display-face)] text-lg font-bold tracking-[0.02em] text-[var(--chalk)]">
              Hipertrof.AI
            </span>
            <span className="hidden font-[family-name:var(--font-mono-face)] text-[10px] uppercase tracking-widest text-[var(--muted-2)] sm:inline">
              projetofit
            </span>
          </Link>

          {/* No mobile a navegacao vive na barra de baixo, ao alcance do polegar. */}
          <nav className="hidden items-center gap-1 text-sm sm:flex">
            {LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative px-3 py-2 font-medium transition-colors",
                    active
                      ? "text-[var(--text)]"
                      : "text-[var(--muted)] hover:text-[var(--text)]",
                  )}
                >
                  {link.label}
                  {active ? (
                    <span className="absolute inset-x-3 -bottom-px h-0.5 bg-[var(--chalk)]" />
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3 text-sm">
            {user ? (
              <>
                {/* Perfil saiu da barra de baixo, entao ESTE e o unico caminho
                    ate ele no mobile. Um icone de contorno de 17px nao dava
                    conta desse papel: ficava mais apagado que o "Sair" ao lado,
                    que e texto — a acao rara e destrutiva chamava mais atencao
                    que a frequente. O avatar com a inicial e o padrao que se
                    le como "sua conta" sem precisar de rotulo. */}
                <Link
                  href="/profile"
                  aria-label="Seu perfil"
                  aria-current={pathname === "/profile" ? "page" : undefined}
                  className="inline-flex min-h-11 items-center gap-2 transition-opacity hover:opacity-80"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-full font-[family-name:var(--font-display-face)] text-sm font-bold",
                      // Preenchido, nao contornado: e o unico elemento solido do
                      // header, entao o olho vai nele primeiro.
                      "bg-[var(--chalk)] text-black",
                      // Na propria pagina, um anel destaca sem trocar a cor —
                      // trocar faria o avatar sumir no fundo.
                      pathname === "/profile" &&
                        "ring-2 ring-[var(--chalk)] ring-offset-2 ring-offset-[var(--bg)]",
                    )}
                  >
                    {inicialDe(user)}
                  </span>
                  <span className="hidden font-[family-name:var(--font-mono-face)] text-xs text-[var(--muted)] md:inline">
                    {user.email}
                  </span>
                </Link>
                {/* Menor e mais apagado que o avatar de proposito: sair e a
                    acao que menos se quer acertar por engano. */}
                <button
                  type="button"
                  onClick={logout}
                  className="text-xs text-[var(--muted-2)] transition-colors hover:text-[var(--text)]"
                >
                  Sair
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-md border px-3 py-1.5 font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface-2)]"
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      <BottomTabs pathname={pathname} />
    </>
  );
}

/** Barra de abas fixa — so no mobile. */
function BottomTabs({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--bg)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      <ul className="grid grid-cols-5">
        {LINKS.map((link) => {
          const active = isActive(pathname, link.href);
          const Icon = link.icon;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                // min-h-14 mantem o alvo de toque acima dos 44px recomendados.
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 transition-colors",
                  active ? "text-[var(--chalk)]" : "text-[var(--muted-2)]",
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 1.8} aria-hidden />
                <span className="text-[10px] font-medium tracking-wide">
                  {link.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
