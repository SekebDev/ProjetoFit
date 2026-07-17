import path from "node:path";
import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Em dev o SW atrapalha o HMR e mascara mudancas; PWA se testa no build de prod.
  disable: process.env.NODE_ENV !== "production",
});

const nextConfig: NextConfig = {
  output: "standalone",
  // O wrapper do Serwist injeta um `webpack` config; o `next dev` (Turbopack, o
  // padrao no Next 16) aborta ao ver webpack sem turbopack config. Este objeto
  // vazio silencia isso — em dev o SW fica desativado e o webpack e ignorado.
  turbopack: {},
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@workout/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/yuhonas/free-exercise-db/**",
      },
    ],
  },
};

export default withSerwist(nextConfig);
