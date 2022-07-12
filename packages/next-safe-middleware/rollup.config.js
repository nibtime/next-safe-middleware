// rollup.config.js
import { swc, defineRollupSwcOption } from "rollup-plugin-swc3";
import dts from "rollup-plugin-dts";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import { mergeDeepRight } from "ramda";
import commonjs from "@rollup/plugin-commonjs";

const isDev = process.env.NODE_ENV === "development";
const minify = !isDev
const sourcemap = !minify

const swcBase = defineRollupSwcOption({
  minify,
  tsconfig: false,
  sourceMaps: sourcemap,
  jsc: {
    parser: {
      syntax: "typescript",
    },
    externalHelpers: true,
    target: "es2020",
  },
});
const mainCfg = swcBase;

const documentCfg = defineRollupSwcOption(
  mergeDeepRight(swcBase, {
    jsc: {
      parser: {
        tsx: true,
      },
    },
  })
);

const apiCfg = swcBase;

const composeCfg = swcBase;

const resolve = [
  commonjs({}),
  nodeResolve({
    resolveOnly: [
      "@swc/helpers",
      "tslib",
      "next-safe",
      "ramda",
    ],
  }),
];

const main = [
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.js",
      format: "cjs",
      name: "main",
      sourcemap,
    },
    external: ["next"],
    plugins: [...resolve, swc(mainCfg)],
  },
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.mjs",
      format: "es",
      name: "main-mjs",
      sourcemap,
    },
    external: ["next"],
    plugins: [...resolve, swc(mainCfg)],
  },
  {
    input: "src/index.ts",
    output: [{ file: "dist/index.d.ts", format: "es", name: "main-dts" }],
    plugins: [dts()],
  },
];

const document = [
  {
    input: "src/document/index.tsx",
    output: {
      file: "dist/document/index.js",
      format: "cjs",
      name: "document",
      sourcemap,
    },
    external: ["next", "react"],
    plugins: [...resolve, swc(documentCfg)],
  },
  {
    input: "src/document/index.tsx",
    output: {
      file: "dist/document/index.mjs",
      format: "es",
      name: "document-mjs",
      sourcemap,
    },
    external: ["next", "react"],
    plugins: [...resolve, swc(documentCfg)],
  },
  {
    input: "src/document/index.tsx",
    output: [
      { file: "dist/document/index.d.ts", format: "es", name: "document-dts" },
    ],
    plugins: [dts()],
  },
];

const api = [
  {
    input: "src/api/index.ts",
    output: {
      file: "dist/api/index.js",
      format: "cjs",
      name: "api",
      sourcemap,
    },
    external: ["next"],
    plugins: [...resolve, swc(apiCfg)],
  },
  {
    input: "src/api/index.ts",
    output: {
      file: "dist/api/index.mjs",
      format: "es",
      name: "api-mjs",
      sourcemap,
    },
    external: ["next"],
    plugins: [...resolve, swc(apiCfg)],
  },
  {
    input: "src/api/index.ts",
    output: [{ file: "dist/api/index.d.ts", format: "es", name: "api-dts" }],
    plugins: [dts()],
  },
];

const compose = [
  {
    input: "src/middleware/compose/index.ts",
    output: {
      file: "dist/compose/index.js",
      format: "cjs",
      name: "compose",
      sourcemap,
    },
    external: ["next"],
    plugins: [...resolve, swc(composeCfg)],
  },
  {
    input: "src/middleware/compose/index.ts",
    output: {
      file: "dist/compose/index.mjs",
      format: "es",
      name: "compose-mjs",
      sourcemap,
    },
    external: ["next"],
    plugins: [...resolve, swc(composeCfg)],
  },
  {
    input: "src/middleware/compose/index.ts",
    output: [{ file: "dist/compose/index.d.ts", format: "es", name: "compose-dts" }],
    plugins: [dts()],
  },
];

export default [...main, ...document, ...api, ...compose];
