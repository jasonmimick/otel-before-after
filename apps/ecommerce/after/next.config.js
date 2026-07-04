/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Next 14 only loads instrumentation.ts (the OTel SDK entrypoint) with this flag
  experimental: {
    instrumentationHook: true,
  },
};

module.exports = nextConfig;
