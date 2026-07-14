import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Saída self-contained para a imagem Docker de produção.
  output: "standalone",
  // Necessário em monorepo: rastreia dependências a partir da raiz.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // Garante resolução única do pacote workspace no bundle.
  transpilePackages: ["@workout/shared"],
};

export default nextConfig;
