// rollup.config.js
import { swc } from "rollup-plugin-swc3";
import dts from "rollup-plugin-dts";

const isCI = () => !!process.env.CI

export default [
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.js",
      format: "cjs",
      name: "main",
    },
    plugins: [swc({
      minify: isCI()
    })],
  },
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.mjs",
      format: "es",
      name: "module",
    },
    plugins: [swc({
      minify: isCI()
    })],
  },
  {
    input: "src/document/index.tsx",
    output: {
      file: "dist/document/index.js",
      format: "cjs",
      name: "document",
    },
    plugins: [swc({
      minify: isCI()
    })],
  },
  {
    input: "src/document/index.tsx",
    output: {
      file: "dist/document/index.mjs",
      format: "es",
      name: "document-module",
    },
    plugins: [swc({
      minify: isCI()
    })],
  },
  {
    input: "src/index.ts",
    output: [{ file: "dist/index.d.ts", format: "es", name: "dts" }],
    plugins: [dts()],
  },
  {
    input: "src/document/index.tsx",
    output: [{ file: "dist/document/index.d.ts", format: "es", name: "dts" }],
    plugins: [dts()],
  },
];
