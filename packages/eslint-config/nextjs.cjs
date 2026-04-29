/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: [require.resolve('./index.cjs'), 'next/core-web-vitals'],
  rules: {
    'react/no-unescaped-entities': 'off',
    '@next/next/no-html-link-for-pages': 'off',
  },
};
