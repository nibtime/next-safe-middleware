/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  swcMinify: true,
  crossOrigin: "anonymous",
  experimental: {
    workerThreads: true,
    urlImports: ["https://unpkg.com"],
    nextScriptWorkers: true,
    runtime: "experimental-edge",
  },
};
