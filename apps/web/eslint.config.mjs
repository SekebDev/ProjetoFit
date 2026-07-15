import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
  ...nextCoreWebVitals,
  ...nextTypescript,
  { rules: { "no-console": ["error", { allow: ["warn", "error"] }], "no-debugger": "error" } },
  { files: ["e2e/**"], rules: { "no-console": "off" } },
];
