import type { NextFetchEvent, NextRequest } from "next/server";
import type {
  ChainMatcher,
  MiddlewareChain,
  ChainableMiddleware,
  NextMiddlewareResult,
  ChainFinalizer,
  MiddlewareChainContext,
  NextMiddleware,
} from "./types";

import { NextResponse } from "next/server";

// https://www.30secondsofcode.org/js/s/deep-freeze
const deepFreeze = <T>(obj: T): T => {
  Object.keys(obj).forEach((prop) => {
    if (typeof obj[prop] === "object") deepFreeze(obj[prop]);
  });
  return Object.freeze(obj);
};

/**
 *
 * @param middlewares the middlewares to chain in sequence
 * @returns
 * the chained middlewares as a single Next.js middleware
 * to export from `middleware.js`
 *
 */
export const chain =
  (...middlewares: Parameters<MiddlewareChain>): NextMiddleware =>
  async (req: NextRequest, evt: NextFetchEvent) => {
    let chainResponse: NextMiddlewareResult;
    const cache: Partial<Record<string, any>> = {};
    const finalizers: ChainFinalizer[] = [];

    const ctx = deepFreeze<MiddlewareChainContext>({
      res: {
        get: () => {
          if (!chainResponse) {
            chainResponse = NextResponse.next();
          }
          return chainResponse;
        },
        set: (res) => (chainResponse = res),
      },
      cache: {
        get: (k) => cache[k],
        set: (k, v) => (cache[k] = v),
      },
      finalize: {
        addCallback: (f) => {
          if (!finalizers.includes(f)) {
            finalizers.push(f);
          }
        },
      },
    });

    const finalize = async () => {
      try {
        return Promise.all(
          finalizers.map((finalize) => finalize(req, evt, ctx))
        );
      } catch (error) {
        console.error("[chain]: finalization error", { error });
      }
    };

    for await (const middleware of middlewares) {
      const mwRes = await middleware(req, evt, ctx);
      if (mwRes) {
        return mwRes;
      }
    }
    await finalize();
    return chainResponse;
  };

/**
 *
 * @param matcher
 * predicate on a NextRequest, whether a middleware chain should run on it
 * @returns
 * a matched chain function that will only run chained middlewares on matched requests
 * @example
 * import { csp, strictDynamic, chainMatch, isPageRequest } from `@next-safe/middleware`
 *
 * const securityMiddlewares = [csp(), strictDynamic()];
 *
 * export default chainMatch(isPageRequest)(...securityMiddlewares);
 *
 */
export const chainMatch =
  (matcher: ChainMatcher): MiddlewareChain =>
  (...middlewares) =>
  async (req, evt) => {
    if (matcher(req)) {
      return chain(...middlewares)(req, evt);
    }
  };

export const chainableMiddleware = (
  middleware: ChainableMiddleware
): ChainableMiddleware => {
  return async (req, evt, ctx) => {
    if (ctx) {
      return middleware(req, evt, ctx);
    }
    return chain(middleware)(req, evt);
  };
};

/**
 *
 * @param nextMiddleware
 * a Next.js middleware, according to spec
 * @returns
 * a chainable middleware that continues
 * the response (if any) of `nextMiddleware` to a chain context
 */
export const continued = (
  nextMiddleware: NextMiddleware
): ChainableMiddleware =>
  chainableMiddleware(async (req, evt, ctx) => {
    const mwRes = await nextMiddleware(req, evt);
    if (mwRes) {
      ctx.res.set(mwRes);
    }
  });

export * from "./cache";
export * from "./matchers";
