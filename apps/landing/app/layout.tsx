import type { Metadata, Viewport } from "next";
import { Anton, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { LenisProvider } from "@/lib/lenis";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

// Display condensada estilo cartaz de academia — só pra headlines (h1/h2 e
// números grandes), via utilitário font-display. O corpo continua na Inter.
const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hipertrof.AI — Treinar nunca foi tão viciante",
  description:
    "Planos de musculação gerados por IA a partir do seu perfil, progressão automática e a Rackie na torcida. Instalável como PWA, funciona até offline.",
};

// Next injeta width=device-width, initial-scale=1 por padrão. Aqui só somamos
// a cor de tema (chrome do navegador mobile) e o esquema dark — sem travar o
// zoom do usuário (acessibilidade).
export const viewport: Viewport = {
  themeColor: "#0e1014",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={cn(
        "h-full",
        "antialiased",
        "font-sans",
        inter.variable,
        anton.variable,
        geistMono.variable,
      )}
    >
      <body className="min-h-full flex flex-col">
        <LenisProvider>{children}</LenisProvider>
      </body>
    </html>
  );
}
