import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version ?? 'unknown',
  },
};

export default nextConfig;
