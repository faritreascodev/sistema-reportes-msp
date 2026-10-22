import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Paquetes con binarios nativos o que leen archivos en runtime: no se empaquetan.
  serverExternalPackages: [
    "puppeteer",
    "sharp",
    "better-sqlite3",
    "@prisma/adapter-better-sqlite3",
    "node-forge",
    "pizzip",
    "@signpdf/signpdf",
    "@signpdf/placeholder-pdf-lib",
    "@signpdf/utils",
    "pdf-lib",
    "qrcode",
  ],
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
