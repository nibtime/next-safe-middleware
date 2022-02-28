import { NextRequest, NextResponse } from "next/server";
import { mergeDeepRight } from "ramda";
import {
  EnsuredMiddleware,
  Middleware,
  MiddlewareBuilder,
  MiddlewareConfig,
} from "./types";

export const unpackConfig = async <Config extends Record<string, unknown>>(
  req: NextRequest,
  res: Response,
  cfg: MiddlewareConfig<Config>
) => {
  return typeof cfg === "function" ? cfg(req, res) : cfg;
};

export const mergeConfigs =
  <Config extends Record<string, unknown>>(
    left: MiddlewareConfig<Config>,
    right: MiddlewareConfig<Config>
  ) =>
  async (req: NextRequest, res: Response) => {
    const leftCfg = await unpackConfig(req, res, left);
    const rightCfg = await unpackConfig(req, res, right);
    return mergeDeepRight(leftCfg, rightCfg) as Config;
  };

export const withDefaultConfig =
  <Config extends Record<string, unknown>>(
    builder: MiddlewareBuilder<Config>,
    defaultCfg: MiddlewareConfig<Config>
  ) =>
  (cfg?: MiddlewareConfig<Config>) => {
    if (cfg) {
      return builder(mergeConfigs(defaultCfg, cfg));
    } else {
      return builder(defaultCfg);
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
