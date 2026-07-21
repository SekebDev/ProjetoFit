/**
 * Rodapé server-side: crédito da stack e do dataset de exercícios, com a
 * Rackie de bobeira no canto. Sem client JS — nada anima aqui.
 */
export function Footer() {
  return (
    <footer className="border-t px-6 py-12">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 text-center text-sm text-muted-foreground">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/mascot/idle.webp"
          alt=""
          aria-hidden
          className="h-16 w-auto select-none opacity-80"
          loading="lazy"
          draggable={false}
        />
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-foreground">
          Hipertrof.AI — ProjetoFit
        </p>
        <p>Next.js · NestJS · Prisma · PostgreSQL</p>
        <p>
          Exercícios do{" "}
          <a
            href="https://github.com/yuhonas/free-exercise-db"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            free-exercise-db
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
