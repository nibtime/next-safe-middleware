import type {
  NextRequest,
  NextResponse,
  NextMiddleware,
  NextFetchEvent,
} from "next/server";

export type NextMiddlewareResult = NextResponse | Response | null | undefined;
export type { NextMiddleware };

export type ChainFinalizer = (
  req: NextRequest,
  evt: NextFetchEvent,
  ctx: Readonly<MiddlewareChainContext>
) => void | Promise<void>;

export type MiddlewareChainContext = {
  readonly res: {
    readonly get: () => Response | NextResponse;
    readonly set: (res: Response | NextResponse) => void;
  };
  readonly cache: {
    readonly get: (key: string) => unknown;
    readonly set: (key: string, value: unknown) => void;
  };
  readonly finalize: {
    readonly addCallback: (finalizer: ChainFinalizer) => void;
  };
};

export type ChainableMiddleware = (
  ...params: [
    ...spec: Parameters<NextMiddleware>,
    ctx: MiddlewareChainContext
  ]
) => NextMiddlewareResult | void | Promise<NextMiddlewareResult | void>;

export type Middleware = ChainableMiddleware;

export type MiddlewareChain = (
  ...middlewares: (ChainableMiddleware | Promise<ChainableMiddleware>)[]
) => NextMiddleware;

export type NextRequestPredicate = (req: NextRequest) => boolean;
export type ChainMatcher = NextRequestPredicate;
