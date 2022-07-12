import type { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import type { UAParserInstance } from "ua-parser-js";

type NextMiddlewareResult = NextResponse | Response | null | undefined | void;

export type NextMiddleware = (
  request: NextRequest,
  event: NextFetchEvent
) => NextMiddlewareResult | Promise<NextMiddlewareResult>;

export type Middleware = (
  ...params: [
    ...spec: Parameters<NextMiddleware>,
    res?: Response,
    next?: (res: Response) => void
  ]
) => ReturnType<NextMiddleware>;

export type ChainableMiddleware = Middleware;

export type EnsuredChainableMiddleware = (
  ...params: Required<Parameters<Middleware>>
) => ReturnType<Middleware>;

export type ConfigInitalizer<Config extends Record<string, unknown>> = (
  req: NextRequest,
  res: Response,
  ua: UAParserInstance
) => Config | Promise<Config>;

export type MiddlewareConfig<Config extends Record<string, unknown>> =
  | Config
  | ConfigInitalizer<Config>;

export type WithoutBoolUnions<T extends object> = {
  [P in keyof T]: T[P] extends boolean
    ? T[P]
    : Exclude<T[P], boolean> extends Record<string, unknown>
    ? WithoutBoolUnions<Exclude<T[P], boolean>>
    : Exclude<T[P], boolean>;
};

export type MiddlewareBuilder<Config extends Record<string, unknown>> = (
  cfg: MiddlewareConfig<WithoutBoolUnions<Config>>
) => Middleware;

export type MiddlewareChain = (
  ...middlewares: (ChainableMiddleware | Promise<ChainableMiddleware>)[]
) => NextMiddleware;

export type NextRequestPredicate = (req: NextRequest) => boolean;
export type ChainMatcher = NextRequestPredicate;
