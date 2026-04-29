import { withSentryConfig } from '@sentry/nextjs';
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

const isSentryEnabled = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);

const sentryWebpackPluginOptions = {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Source map upload requires SENTRY_AUTH_TOKEN — disabled until configured.
  disableServerWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
  disableClientWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
};

const composed = withNextIntl(nextConfig);

export default isSentryEnabled ? withSentryConfig(composed, sentryWebpackPluginOptions) : composed;
