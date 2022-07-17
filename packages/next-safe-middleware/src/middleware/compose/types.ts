import type {
  NextRequest,
  NextResponse,
  NextMiddleware,
  NextFetchEvent,
} from "next/server";

export type NextMiddlewareResult = NextResponse | Response | null | undefined;
export type { NextMiddleware };

export type ChainFinalizer<K extends string = string, V = any> = (
  req: NextRequest,
  evt: NextFetchEvent,
  ctx: MiddlewareChainContext<K, V>
) => void | Promise<void>;

export type MiddlewareChainContext<K extends string = string, V = any> = {
  res: {
    readonly get: () => NextMiddlewareResult;
    readonly set: (res: NextMiddlewareResult, override?: boolean) => void
  }
  cache: {
    readonly get: (key: K) => V | null | undefined;
    readonly set: (key: K, value: V) => void;
  }
  finalize: {
    readonly addCallback: (finalizer: ChainFinalizer<K, V>) => void
    readonly terminatedByResponse: () => NextMiddlewareResult
  }
};

export type ChainableMiddleware<K extends string = string, V = any> = (
  ...params: [
    ...spec: Parameters<NextMiddleware>,
    ctx?: Readonly<MiddlewareChainContext<K, V>>
  ]
) => NextMiddlewareResult | void | Promise<NextMiddlewareResult | void>;

export type Middleware = ChainableMiddleware;

export type EnsuredChainableMiddleware<K extends string = string, V = any> = (
  ...params: Required<Parameters<ChainableMiddleware<K, V>>>
) => ReturnType<ChainableMiddleware<K, V>>;

export type MiddlewareChain<K extends string = string, V = any> = (
  ...middlewares: (ChainableMiddleware<K, V> | Promise<ChainableMiddleware>)[]
) => NextMiddleware;

export type NextRequestPredicate = (req: NextRequest) => boolean;
export type ChainMatcher = NextRequestPredicate;
