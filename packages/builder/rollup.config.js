// rollup.config.js
import { swc, defineRollupSwcOption } from "rollup-plugin-swc3";
import dts from "rollup-plugin-dts";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

const isDev = process.env.NODE_ENV === "development";
const minify = !isDev;
const sourcemap = !minify;

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

const resolve = [
  commonjs({}),
  nodeResolve({
    resolveOnly: ["@swc/helpers", "tslib", "ramda"],
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
    plugins: [...resolve, swc(mainCfg)],
  },
  {
    input: "src/index.ts",
    output: [{ file: "dist/index.d.ts", format: "es", name: "main-dts" }],
    plugins: [dts()],
  },
];

const cryptoNode = [
  {
    input: "src/crypto-node/index.ts",
    output: {
      file: "crypto-node/index.js",
      format: "cjs",
      name: "main",
      sourcemap,
    },
    plugins: [...resolve, swc(mainCfg)],
  },
  {
    input: "src/crypto-node/index.ts",
    output: {
      file: "crypto-node/index.mjs",
      format: "es",
      name: "main-mjs",
      sourcemap,
    },
    plugins: [...resolve, swc(mainCfg)],
  },
  {
    input: "src/crypto-node/index.ts",
    output: [
      { file: "crypto-node/index.d.ts", format: "es", name: "main-dts" },
    ],
    plugins: [dts()],
  },
];

export default [...main, ...cryptoNode];
