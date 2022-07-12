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

export type ConfigInitializerParams<K extends string = string, V = any> = {
  req: NextRequest;
  evt: NextFetchEvent;
  ctx?: MiddlewareChainContext<K, V>;
  userAgent: NextUserAgent;
};

export type ConfigInitalizer<
  Config extends Record<string, unknown>,
  K extends string = string,
  V = any
> = (params: ConfigInitializerParams<K, V>) => Config | Promise<Config>;

export type MiddlewareConfig<
  Config extends Record<string, unknown>,
  K extends string = string,
  V = any
> = Config | ConfigInitalizer<Config, K, V>;

export type WithoutBoolUnions<T extends object> = {
  [P in keyof T]: T[P] extends boolean
    ? T[P]
    : Exclude<T[P], boolean> extends Record<string, unknown>
    ? WithoutBoolUnions<Exclude<T[P], boolean>>
    : Exclude<T[P], boolean>;
};

export type MiddlewareBuilder<
  Config extends Record<string, unknown>,
  K extends string = string,
  V = any
> = (
  cfg: MiddlewareConfig<WithoutBoolUnions<Config>, K, V>
) => ChainableMiddleware<K, V>;
