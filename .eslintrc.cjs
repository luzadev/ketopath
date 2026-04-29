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
    // Service worker servito direttamente al browser: ESLint TS-aware non
    // riesce a parsarlo perché non è nel project. Il file resta tracciato.
    'apps/web/public/**/*.js',
  ],
};
