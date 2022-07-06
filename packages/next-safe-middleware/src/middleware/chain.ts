import type { NextFetchEvent, NextRequest } from "next/server";
import { ChainableMiddleware } from "..";
import type { ChainMatcher, MiddlewareChain, NextMiddleware } from "./types";

/**
 *
 * @param middlewares the middlewares to chain in sequence
 * @returns
 * the chained middlewares as a single Next.js middleware
 * to export from `middleware.js`
 *
 */
export const chain: MiddlewareChain =
  (...middlewares) =>
  async (req: NextRequest, evt: NextFetchEvent) => {
    let res: Response | void;
    const next = (resp: Response) => {
      res = resp;
    };
    for await (const middleware of middlewares) {
      const mwRes = await middleware(req, evt, res || undefined, next);
      if (mwRes) {
        return mwRes;
      }
    }
    return res;
  };

/**
 *
 * @param matcher
 * predicate on a NextRequest, whether a middleware chain should run on it
 * @returns
 * a matched chain function that will only run chained middlewares on matched requests
 * @example
 * import { csp, strictDynamic, chainMatch } from `@next-safe/middleware`
 *
 * const securityMiddlewares = [csp(), strictDynamic()];
 *
 * const isPage = (req: NextRequest) => {
 *   const excluded = /^\/(_next|api|fonts)\//.test(req.nextUrl.pathname);
 *   const hasNoSlugParam = !req.nextUrl.searchParams.get('slug')
 *   return !excluded && hasNoSlugParam
 * }
 *
 * export default chainMatch(isPage)(...securityMiddlewares);
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

/**
 *
 * @param nextMiddleware
 * a Next.js middleware, according to spec
 * @returns
 * a chainable middleware that continues 
 * the response (if any) of `nextMiddleware` to a chain context 
 */
export const continued =
  (nextMiddleware: NextMiddleware): ChainableMiddleware =>
  async (req, evt, _, next) => {
    const mwRes = await nextMiddleware(req, evt);
    if (mwRes && next) {
      next(mwRes);
    }
  };
