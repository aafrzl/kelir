import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // structure.md: pure game systems stay free of React, three.js, UI and stores.
    files: ["src/game/systems/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react/*", "react-dom", "react-dom/*"],
              message: "Game systems are pure TypeScript: no React.",
            },
            {
              group: ["three", "three/*", "@react-three/*"],
              message: "Game systems are pure TypeScript: no three.js or R3F.",
            },
            {
              group: ["@/ui", "@/ui/*", "@/stores", "@/stores/*", "**/ui/**", "**/stores/**"],
              message: "Game systems must not import UI or stores; GameLoop wires them together.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
