import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Every visible string goes through next-intl. Raw JSX text fails lint;
 * punctuation and typographic glyphs used as separators are allowed.
 * Attribute strings (aria-label, placeholder, title, alt) are checked by
 * scripts/check-i18n.mjs, which runs as part of `npm run lint`.
 */
const noRawJsxText = {
  files: ["src/app/**/*.tsx", "src/components/**/*.tsx"],
  rules: {
    "react/jsx-no-literals": [
      "error",
      {
        noStrings: true,
        ignoreProps: true,
        allowedStrings: ["·", "—", "/", "#", "%", "+", "−", "(", ")", ":", ",", "…", "▲", "▼", "×"],
      },
    ],
  },
};

const strictTypes = {
  files: ["src/**/*.ts", "src/**/*.tsx"],
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  noRawJsxText,
  strictTypes,
  globalIgnores([
    ".agents/**",
    ".claude/**",
    ".codex/**",
    ".aider-desk/**",
    ".impeccable/**",
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/mockServiceWorker.js",
    "src/lib/api/schema.d.ts",
  ]),
]);

export default eslintConfig;
