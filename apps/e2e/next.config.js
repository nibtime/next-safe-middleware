
/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  crossOrigin: "anonymous",
  swcMinify: true,
  experimental: {
    workerThreads: true,
    urlImports: ["https://unpkg.com"],
    nextScriptWorkers: true,
  },
};
