/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  crossOrigin: "anonymous",
  swcMinify: true,
  experimental: {
    workerThreads: true,
    urlImports: ["https://unpkg.com"],
    nextScriptWorkers: true,
  },
  images: {
    domains: ['user-images.githubusercontent.com'],
  }
};
const withNextra = require("nextra")({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.js",
  unstable_staticImage: true,
});

module.exports = withNextra(nextConfig);
