import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ketopath/auth', '@ketopath/db', '@ketopath/shared', '@ketopath/ui'],
  experimental: {
    typedRoutes: true,
  },
  webpack(config) {
    // I package interni usano .js nelle import (NodeNext). Webpack non lo
    // risolve di default per i file TS: gli diciamo di provare anche .ts/.tsx.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    return config;
  },
};

export default withNextIntl(nextConfig);
