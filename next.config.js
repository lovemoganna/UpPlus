/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  images: {
    unoptimized: true,
  },
  basePath: "/UpPlus",
  assetPrefix: "/UpPlus/",
  trailingSlash: true,
};

module.exports = nextConfig;
