/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

if (process.env.NEXT_BUILD_PHASE === "phase-export") {
  nextConfig.basePath = "/UpPlus";
  nextConfig.assetPrefix = "/UpPlus/";
  nextConfig.output = "export";
  nextConfig.images = { unoptimized: true };
}

module.exports = nextConfig;
