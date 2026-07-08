import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async redirects() {
    return [
      {
        source: "/users",
        destination: "/settings?tab=users",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
