import js from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import ts from 'typescript-eslint'
import svelte from 'eslint-plugin-svelte'
import svelteConfig from './svelte.config.js'
import eslintPluginAstro from 'eslint-plugin-astro';
import globals from 'globals'

export default ts.config(
  // js
  js.configs.recommended,
  // ts
  ts.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // svelte
  ...svelte.configs['flat/recommended'],
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: {
      parserOptions: {
        parser: ts.parser,
        svelteConfig: svelteConfig,
      },
    },
  },
  {
    rules: {
      'svelte/no-at-html-tags': 'off',
    },
  },
  ...eslintPluginAstro.configs.recommended,
  {
    files: ['**/*.astro'],
    rules: {
      // Astro frontmatter variable initialization triggers false positives
      'no-useless-assignment': 'off',
    },
  },
  {
    files: ['**/*.svelte'],
    rules: {
      // Svelte $bindable() props trigger false positives
      'no-useless-assignment': 'off',
    },
  },
  prettierConfig,
  {
    languageOptions: {
      globals: {
        ...globals.nodeBuiltin,
        ...globals.browser,
        $$Generic: 'readonly',
      },
    },
    ignores: ['**/*.config.js'],
  },
  {
    files: ['**/*.stories.svelte'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['**/generated/graphql.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
)
