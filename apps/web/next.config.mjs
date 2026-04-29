import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ketopath/auth', '@ketopath/shared', '@ketopath/ui'],
  experimental: {
    typedRoutes: true,
  },
};

export default withNextIntl(nextConfig);
