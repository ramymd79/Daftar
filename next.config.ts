import type { NextConfig } from "next";

const githubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  ...(githubPages
    ? { basePath: "/Daftar", assetPrefix: "/Daftar/" }
    : {}),
};

export default nextConfig;
