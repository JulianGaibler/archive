import js from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import ts from 'typescript-eslint'
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
      // Probably want to turn this rule on in the future but for now
      // the effort to fix all the errors is too much
      // '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    languageOptions: {
      parserOptions: {
      },
    },
  },
  // jsdoc.configs['flat/recommended'],
  // {
  //   files: ['**/*.js', '**/*.ts'],
  //   plugins: {
  //     jsdoc,
  //   },
  //   rules: {
  //     'jsdoc/require-description': 'warn'
  //   }
  // },
  prettierConfig,
  {
    languageOptions: {
      globals: {
        ...globals.nodeBuiltin,
        ...globals.browser,
        '$$Generic': 'readonly',
      },
    },
    ignores: ['**/*.config.js'],
  },
)
