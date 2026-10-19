import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  { ignores: ['dist', 'dist-preview', 'playwright-report', 'test-results', 'public/theme-init.js'] },
  js.configs.recommended,
  reactHooks.configs.flat['recommended-latest'],
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, __SW__: 'readonly' },
    },
  },
  {
    files: ['scripts/**', 'e2e/**', '*.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
]
