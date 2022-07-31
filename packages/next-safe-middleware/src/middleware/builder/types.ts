import type { NextRequest, NextFetchEvent } from "next/server";

import type {
  MiddlewareChainContext,
  ChainableMiddleware,
} from "../compose/types";

export interface NextUserAgent {
  isBot: boolean;
  ua: string;
  browser: {
    name?: string;
    version?: string;
  };
  device: {
    model?: string;
    type?: string;
    vendor?: string;
  };
  engine: {
    name?: string;
    version?: string;
  };
  os: {
    name?: string;
    version?: string;
  };
  cpu: {
    architecture?: string;
  };
}

export type ConfigInitializerParams = {
  req: NextRequest;
  evt: NextFetchEvent;
  ctx: MiddlewareChainContext;
  userAgent: NextUserAgent;
};

export type ConfigInitalizer<Config extends Record<string, unknown>> = (
  params: ConfigInitializerParams
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

export type ConfigurableMiddleware<Config extends Record<string, unknown>> = (
  cfg: MiddlewareConfig<WithoutBoolUnions<Config>>
) => ChainableMiddleware;

export type MiddlewareBuilder<Config extends Record<string, unknown>> = (
  cfg: MiddlewareConfig<WithoutBoolUnions<Config>>
) => ChainableMiddleware;

