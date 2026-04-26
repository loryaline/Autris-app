import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Supabase Storage : autoriser next/image à charger les couvertures /
  // images de fiches WB depuis n'importe quel projet Supabase.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/**" },
      { protocol: "https", hostname: "*.supabase.in", pathname: "/storage/v1/object/**" },
    ],
  },
};

export default nextConfig;
