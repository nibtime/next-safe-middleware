const nextSafe = require("next-safe");

const isDev = process.env.NODE_ENV !== "production";

/** @type {import('next').NextConfig['headers']} */
const headers = async () => [
  {
    source: "/:path*",
    headers: nextSafe({ isDev }),
  },
];

/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    workerThreads: true,
    urlImports: ["https://unpkg.com"],
    nextScriptWorkers: true,
  },
};
