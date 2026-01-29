import type { NextConfig } from "next";

const isStandalone = process.env.BUILD_STANDALONE === 'true';

const nextConfig: NextConfig = {
  output: isStandalone ? 'standalone' : 'export',
  trailingSlash: !isStandalone, // Required for static hosting
  images: {
    unoptimized: !isStandalone  // Required for static export
  }
};

export default nextConfig;

