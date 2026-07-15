"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Painel" },
  { href: "/exercises", label: "Biblioteca" },
  { href: "/profile", label: "Perfil" },
];

export function Nav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b bg-[var(--bg)]/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-5">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-display-face)] text-lg font-bold tracking-[0.2em] text-[var(--chalk)]">
            RACK
          </span>
          <span className="hidden font-[family-name:var(--font-mono-face)] text-[10px] uppercase tracking-widest text-[var(--muted-2)] sm:inline">
            projetofit
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {LINKS.map((l) => {
            const active =
              l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "relative px-3 py-2 font-medium transition-colors",
                  active
                    ? "text-[var(--text)]"
                    : "text-[var(--muted)] hover:text-[var(--text)]",
                )}
              >
                {l.label}
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
              <span className="hidden font-[family-name:var(--font-mono-face)] text-xs text-[var(--muted)] md:inline">
                {user.email}
              </span>
              <button
                type="button"
                onClick={logout}
                className="text-[var(--muted)] transition-colors hover:text-[var(--text)]"
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
  );
}
