/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['@ketopath/eslint-config'],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '.next/',
    'out/',
    'coverage/',
    'pnpm-lock.yaml',
  ],
};
