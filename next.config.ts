import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.imgur.com",
      },
      {
        protocol: "https",
        hostname: process.env.NEXT_IMAGE_SUPABASE_URL!,
      },
    ],
  },
  webpack: (config, { isServer }) => {
    config.ignoreWarnings = config.ignoreWarnings || [];
    config.ignoreWarnings.push({
      message:
        /Critical dependency: the request of a dependency is an expression/,
    });
    return config;
  },
};

export default nextConfig;
