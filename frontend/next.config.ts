import type { NextConfig } from 'next';
import path from 'node:path';
const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === 'production' ? '.next-production' : '.next-ue',
  outputFileTracingRoot: path.resolve(__dirname, '..'),
  outputFileTracingExcludes: {'/*': ['../backend/**/.env*', '../backend/**/*.log']},
};
export default nextConfig;
