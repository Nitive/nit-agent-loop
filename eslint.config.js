import { defineConfig } from "eslint/config"
import js from "@eslint/js"
import eslintConfigPrettier from "eslint-config-prettier"
import globals from "globals"
import tseslint from "typescript-eslint"

export default defineConfig(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      ".codex/**",
      ".pnpm-store/**",
      "agent/.codex/**",
      "agent/.agents/**",
    ],
  },
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
)
