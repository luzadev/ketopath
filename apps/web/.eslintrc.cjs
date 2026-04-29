/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['@ketopath/eslint-config/nextjs.cjs'],
  ignorePatterns: [
    // Service worker servito al browser: out-of-project per il TS parser.
    'public/**/*.js',
  ],
};
