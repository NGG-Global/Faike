import type { NextConfig } from "next";
import { RD_UPLOAD_PROXY, UPLOAD_ID_PATTERN } from "./src/config/upload";

const nextConfig: NextConfig = {
  // Temporary same-origin upload route to Reality Defender (src/config/upload.ts).
  async rewrites() {
    if (!RD_UPLOAD_PROXY.enabled) return [];
    return [
      {
        source: `${RD_UPLOAD_PROXY.path}/:id(${UPLOAD_ID_PATTERN})`,
        destination: `${RD_UPLOAD_PROXY.target}/:id`,
      },
    ];
  },
};

export default nextConfig;
