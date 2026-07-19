module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  // O ecossistema RN publica ESM; sem isso o Jest quebra ao importar.
  // `.pnpm` entra na lista porque a raiz do monorepo usa pnpm e resolve os
  // pacotes RN por dentro do store (node_modules/.pnpm/<pkg>@<hash>/...).
  transformIgnorePatterns: [
    "node_modules/(?!\\.pnpm|((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|nativewind)",
  ],
  collectCoverageFrom: [
    "lib/**/*.{ts,tsx}",
    "app/**/*.{ts,tsx}",
    "!**/node_modules/**",
  ],
};
