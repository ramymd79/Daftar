import type { NextConfig } from "next";

const githubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: githubPages ? "/Daftar" : "",
  },
  ...(githubPages
    ? { basePath: "/Daftar", assetPrefix: "/Daftar/" }
    : {}),
};

export default nextConfig;
