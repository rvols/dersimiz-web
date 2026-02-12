const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    return [
      // Proxy avatar uploads through Next.js so images load same-origin (avoids cross-origin img issues)
      { source: '/api-uploads/:path*', destination: `${apiUrl.replace(/\/$/, '')}/uploads/:path*` },
    ];
  },
  webpack: (config, { dev }) => {
    if (dev) config.cache = false;
    return config;
  },
};

module.exports = withNextIntl(nextConfig);
