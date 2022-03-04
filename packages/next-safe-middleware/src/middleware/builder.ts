import { NextRequest, NextResponse } from "next/server";
import { mergeDeepWithKey } from "ramda";
import {
  EnsuredMiddleware,
  Middleware,
  MiddlewareBuilder,
  MiddlewareConfig,
  WithoutBoolUnions,
} from "./types";

export const unpackConfig = async <Config extends Record<string, unknown>>(
  req: NextRequest,
  res: Response,
  cfg: MiddlewareConfig<Config>
) => {
  return typeof cfg === "function" ? cfg(req, res) : cfg;
};

type KeyMerger = (k: string, x: any, z: any) => any;

export const mergeConfigs =
  <Config extends Record<string, unknown>>(
    left: MiddlewareConfig<WithoutBoolUnions<Config>>,
    right: MiddlewareConfig<Config>,
    keyMerger: KeyMerger = (k, l, r) => r
  ): MiddlewareConfig<WithoutBoolUnions<Config>> =>
  async (req: NextRequest, res: Response) => {
    const leftCfg = await unpackConfig(req, res, left);
    const rightCfg = await unpackConfig(req, res, right);
    return mergeDeepWithKey(keyMerger, leftCfg, rightCfg);
  };

const isTrue = (x: any): x is true => typeof x === "boolean" && x;

const isFalse = (x: any): x is false => typeof x === "boolean" && !x;

const isNonBool = <T>(x: any): x is Exclude<T, boolean> =>
  typeof x !== "boolean" && !!x;

const defaultConfigMergers: KeyMerger[] = [
  // overwrite true flags with default config
  (k, l, r) => (isTrue(r) && isNonBool(l) ? l : undefined),
  // nullify default config on false flags
  (k, l, r) => (isFalse(r) && isNonBool(l) ? null : undefined),
  // if all mergers returned undefined, choose right value
  (k, l, r) => r,
];

const chainMergers =
  (mergers: KeyMerger[]): KeyMerger =>
  (k, l, r) =>
    mergers.reduce(
      (v, next) => (typeof v === "undefined" ? next(k, l, r) : v),
      undefined as any
    );

export const withDefaultConfig =
  <Config extends Record<string, unknown>>(
    builder: MiddlewareBuilder<Config>,
    defaultCfg:
      | WithoutBoolUnions<Config>
      | ((cfg: Partial<Config>) => WithoutBoolUnions<Config>),
    ...keyMergers: KeyMerger[]
  ) =>
  (cfg?: MiddlewareConfig<Config>): Middleware =>
  async (req, evt, res, next) => {
    if (cfg) {
      const unpackedCfg = await unpackConfig(req, res, cfg);
      return builder(
        mergeConfigs(
          typeof defaultCfg === "function"
            ? defaultCfg(unpackedCfg)
            : defaultCfg,
          unpackedCfg,
          chainMergers([...keyMergers, ...defaultConfigMergers])
        )
      )(req, evt, res, next);
    } else {
      return builder(
        typeof defaultCfg === "function" ? defaultCfg({}) : defaultCfg
      )(req, evt, res, next);
    }
  };

export const ensureChainContext = (
  middleware: EnsuredMiddleware,
  ensureResponse: (
    req: NextRequest
  ) => Response | Promise<Response> = NextResponse.next
): Middleware => {
  return async (req, evt, res, next) => {
    const ensuredRes = res || (await ensureResponse(req));
    const ensuredNext = next || (() => void 0);
    ensuredNext(ensuredRes);
    return middleware(req, evt, ensuredRes, ensuredNext);
  };
};
