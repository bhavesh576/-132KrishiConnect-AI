/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Proxy API calls to FastAPI — works locally AND behind the preview
    // proxy (browser never calls localhost directly).
    return [
      {
        source: "/api/:path*",
        destination: process.env.KC_API_URL || "http://127.0.0.1:8000/:path*",
      },
    ];
  },
};

export default nextConfig;
