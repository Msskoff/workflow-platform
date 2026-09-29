// Config ESLint de base, utilisée par packages/shared et apps/api.
// apps/web a sa propre config (règles Next.js) qui réutilise `projectRules`.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Règles propres au projet, partagées par toutes les configs ESLint du monorepo. */
export const projectRules = {
  // Paramètres nommés : une fonction reçoit au plus un argument (un objet de paramètres).
  'max-params': ['error', 1],
};

export default defineConfig([
  globalIgnores(['**/dist/**', '**/.next/**', '**/coverage/**', '**/node_modules/**']),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
    },
    rules: projectRules,
  },
  prettier,
]);
