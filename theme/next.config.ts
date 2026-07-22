import type { NextConfig } from "next";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:6500";
let remoteHostname = "localhost";
let remoteProtocol: "http" | "https" = "http";
let remotePort: string | undefined = "6500";

try {
  const url = new URL(apiBase);
  remoteHostname = url.hostname;
  remoteProtocol = url.protocol.replace(":", "") as "http" | "https";
  remotePort = url.port || undefined;
} catch {
  // keep defaults
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.18.20", "127.0.0.1", "localhost"],
  images: {
    remotePatterns: [
      {
        protocol: remoteProtocol,
        hostname: remoteHostname,
        ...(remotePort ? { port: remotePort } : {}),
        pathname: "/uploads/**",
      },
    ],
  },
};

export default nextConfig;
