import type { NextFetchEvent, NextRequest } from "next/server";
import { deepFreeze } from "../utils";
import type {
  ChainMatcher,
  MiddlewareChain,
  ChainableMiddleware,
  NextMiddlewareResult,
  ChainFinalizer,
  MiddlewareChainContext,
  NextMiddleware,
} from "./types";

/**
 *
 * @param middlewares the middlewares to chain in sequence
 * @returns
 * the chained middlewares as a single Next.js middleware
 * to export from `middleware.js`
 *
 */
export const chain =
  <K extends string = string, V = any>(
    ...middlewares: Parameters<MiddlewareChain<K, V>>
  ): NextMiddleware =>
  async (req: NextRequest, evt: NextFetchEvent) => {
    type Ctx = MiddlewareChainContext<K, V>;

    let chainResponse: NextMiddlewareResult;
    let terminatedByResponse = null;
    const cache: Partial<Record<K, V>> = {};
    const finalizers: ChainFinalizer[] = [];

    const ctx: Readonly<Ctx> = deepFreeze({
      res: {
        get: () => chainResponse,
        set: (res, override = true) => {
          if (override) {
            chainResponse = res;
          } else if (!chainResponse) {
            chainResponse = res;
          }
        },
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
        terminatedByResponse: () => terminatedByResponse,
      },
    });

    const finalize = async () => {
      try {
        for (const callback of finalizers.reverse()) {
          await callback(req, evt, ctx);
        }
      } catch (error) {
        console.error("[chain]: finalization error", { error });
      }
    };

    for await (const middleware of middlewares) {
      const mwRes = await middleware(req, evt, ctx);
      if (mwRes) {
        terminatedByResponse = mwRes;
        await finalize();
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
  <K extends string = string, V = any>(
    matcher: ChainMatcher
  ): MiddlewareChain<K, V> =>
  (...middlewares) =>
  async (req, evt) => {
    if (matcher(req)) {
      return chain(...middlewares)(req, evt);
    }
  };

/**
 *
 * @param nextMiddleware
 * a Next.js middleware, according to spec
 * @returns
 * a chainable middleware that continues
 * the response (if any) of `nextMiddleware` to a chain context
 */
export const continued =
  <K extends string = string, V = any>(
    nextMiddleware: NextMiddleware
  ): ChainableMiddleware<K, V> =>
  async (req, evt, ctx) => {
    const mwRes = await nextMiddleware(req, evt);
    if (mwRes && ctx) {
      ctx.res.set(mwRes);
    }
  };

export * from "./matchers";
