module.exports = {
  semi: false,
  trailingComma: 'all',
  singleQuote: true,
  printWidth: 80,
  tabWidth: 2,
  plugins: [
    'prettier-plugin-jsdoc',
    '@trivago/prettier-plugin-sort-imports',
    'prettier-plugin-astro',
    'prettier-plugin-svelte',
  ],
}
