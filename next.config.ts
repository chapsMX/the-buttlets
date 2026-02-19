import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@neynar/react", "@pigment-css/react"],
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
};

export default nextConfig;
