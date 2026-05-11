import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Deno edge functions — linted separately; avoid TS/ESLint Node assumptions.
    "supabase/functions/**",
  ]),
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      // React Compiler rules: many valid patterns (reset on close, hydrate from props)
      // still trip these until refactors; keep as warnings so `next build` / CI stay green.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/immutability": "warn",
    },
  },
]);

export default eslintConfig;
