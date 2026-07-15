import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import { Nav } from "@/components/Nav";
import { Providers } from "./providers";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display-face",
});
const body = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body-face",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-face",
});

export const metadata: Metadata = {
  title: "ProjetoFit — RACK",
  description: "App de treino pessoal: biblioteca, progressao e planos por IA",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={display.variable + " " + body.variable + " " + mono.variable}
    >
      {/* A bottom-tab e fixa e cobriria o fim da pagina; o token ja zera no >=sm. */}
      <body className="min-h-screen pb-[var(--bottom-nav-space)]">
        <Providers>
          <Nav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
