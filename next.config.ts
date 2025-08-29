import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true, // ignora erros de TS durante o build
  },
  eslint: {
    ignoreDuringBuilds: true, // ignora erros de ESLint durante o build
  },
};

export default nextConfig;
