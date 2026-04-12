import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8765";

const nextConfig: NextConfig = {
  async rewrites() {
    // afterFiles: real Next.js routes (e.g. app/api/route-directions) win first;
    // only unmatched /api/* goes to the Python backend.
    return {
      afterFiles: [
        {
          source: "/api/:path*",
          destination: `${BACKEND_URL}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
