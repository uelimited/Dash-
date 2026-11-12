import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === 'production' ? '.next-production' : '.next-ue',
};
export default nextConfig;
