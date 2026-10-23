import globals from 'globals';

const CROSS_BROWSER = 'Chrome-only; see "Cross-browser rules" in CLAUDE.md.';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'contentScript.js', 'background.js', 'popup.js'],
  },
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        chrome: 'readonly',
        /** Replaced by esbuild: true only in the smoke-test build. */
        __E2E__: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-restricted-globals': [
        'error',
        { name: 'browser', message: 'Use `chrome.*`; Firefox supports it with promises.' },
      ],
      'no-restricted-properties': [
        'error',
        ...['offscreen', 'sidePanel', 'tabGroups', 'debugger', 'tts'].map((property) => ({
          object: 'chrome',
          property,
          message: CROSS_BROWSER,
        })),
        {
          object: 'navigator',
          property: 'userAgent',
          message: 'Detect the feature, not the browser. See CLAUDE.md.',
        },
      ],
    },
  },
  {
    files: ['**/*.mjs', 'scripts/**/*.js', 'e2e/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
