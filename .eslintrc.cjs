const { resolve } = require('node:path');

const project = resolve(__dirname, 'tsconfig.eslint.json');

/** @type {import('eslint').ESLint.ConfigData} */
module.exports = {
  root: true,
  plugins: ['@typescript-eslint', 'simple-import-sort', 'import'],
  parserOptions: {
    project,
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    curly: 'error',
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
    'import/no-default-export': 'error',
    '@typescript-eslint/explicit-function-return-type': ['error'],
    '@typescript-eslint/no-floating-promises': 'error',
  },
  settings: {
    'import/resolver': {
      typescript: {
        project,
      },
    },
  },
  ignorePatterns: [
    '.eslintrc.cjs',
    'jest.config.*.ts',
    'dist/**',
    'coverage/**',
    'scripts/**',
  ],
};
