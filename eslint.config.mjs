// Config ESLint de base, utilisée par packages/shared et apps/api.
// apps/web a sa propre config (règles Next.js) qui réutilise `projectRules`.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const MESSAGE_PARAMETRES_NOMMES =
  'Paramètres nommés : une fonction déclarée reçoit au plus un argument (un objet de paramètres).';

/**
 * Règles propres au projet, partagées par toutes les configs ESLint du monorepo.
 * Les paramètres nommés sont imposés aux fonctions que l'on déclare (fonctions, méthodes,
 * fonctions fléchées nommées), pas aux callbacks dont la signature est imposée par une API
 * (`reduce`, `forEach`, `superRefine`…).
 */
export const projectRules = {
  'no-restricted-syntax': [
    'error',
    { selector: 'FunctionDeclaration[params.length>1]', message: MESSAGE_PARAMETRES_NOMMES },
    {
      selector: "MethodDefinition[kind!='constructor'] > FunctionExpression[params.length>1]",
      message: MESSAGE_PARAMETRES_NOMMES,
    },
    {
      selector: 'VariableDeclarator > ArrowFunctionExpression[params.length>1]',
      message: MESSAGE_PARAMETRES_NOMMES,
    },
  ],
};

export default defineConfig([
  globalIgnores([
    '**/dist/**',
    '**/.next/**',
    '**/coverage/**',
    '**/node_modules/**',
    '**/src/generated/**',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
    },
    rules: projectRules,
  },
  {
    // Les paramètres des contrôleurs Nest sont injectés par décorateur (@Param, @Body…).
    files: ['**/*.controller.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  prettier,
]);
