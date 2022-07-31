import type { NextFetchEvent, NextRequest } from "next/server";
import { userAgent as nextUserAgent } from "next/server";
import { mergeDeepWithKey } from "ramda";
import {
  MiddlewareChainContext,
  ChainableMiddleware,
} from "../compose/types";
import {
  MiddlewareBuilder,
  MiddlewareConfig,
  WithoutBoolUnions,
  NextUserAgent,
} from "./types";

export const unpackConfig = async <Config extends Record<string, unknown>>(
  cfg: MiddlewareConfig<Config>,
  req: NextRequest,
  evt: NextFetchEvent,
  ctx: MiddlewareChainContext
) => {
  const userAgent: NextUserAgent = nextUserAgent({ headers: req.headers });
  return typeof cfg === "function"
    ? {
        ...(await cfg({
          req,
          evt,
          ctx,
          userAgent,
        })),
        userAgent,
      }
    : { userAgent, ...cfg };
};

type KeyMerger = (k: string, x: any, z: any) => any;

const mergeConfigs =
  <Config extends Record<string, unknown>, K extends string = string, V = any>(
    left: MiddlewareConfig<WithoutBoolUnions<Config>>,
    right: MiddlewareConfig<Config>,
    keyMerger: KeyMerger = (k, l, r) => r
  ): MiddlewareConfig<WithoutBoolUnions<Config>> =>
  async ({ req, evt, ctx }) => {
    const leftCfg = await unpackConfig(left, req, evt, ctx);
    const rightCfg = await unpackConfig(right, req, evt, ctx);
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
  (cfg?: MiddlewareConfig<Config>): ChainableMiddleware =>
  async (req, evt, ctx) => {
    if (cfg) {
      const unpackedCfg = await unpackConfig(cfg, req, evt, ctx);
      return builder(
        mergeConfigs(
          typeof defaultCfg === "function"
            ? defaultCfg(unpackedCfg)
            : defaultCfg,
          unpackedCfg,
          chainMergers([...keyMergers, ...defaultConfigMergers])
        )
      )(req, evt, ctx);
    } else {
      return builder(
        typeof defaultCfg === "function" ? defaultCfg({}) : defaultCfg
      )(req, evt, ctx);
    }
  };
