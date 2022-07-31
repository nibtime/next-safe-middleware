import type { ChainFinalizer, MiddlewareChainContext } from "./types";

export const memoizeInChainCache =
  <Args extends any[], T>(
    key: string,
    f: (ctx: MiddlewareChainContext, ...args: Args) => T | Promise<T>
  ) =>
  (ctx: MiddlewareChainContext) =>
  async (...args: Args) => {
    const cached = ctx.cache.get(key) as T;
    if (cached) {
      return cached;
    }
    const fetched = await f(ctx, ...args);
    ctx.cache.set(key, fetched);
    return fetched;
  };

const globalCache = {};

export const memoizeInGlobalCache =
  <Args extends any[], T>(key: string, f: (...args: Args) => T | Promise<T>) =>
  async (...args: Parameters<typeof f>) => {
    const cached = globalCache[key] as T;
    if (cached) {
      return cached;
    }
    const fetched = await f(...args);
    globalCache[key] = fetched;
    return fetched;
  };

export const memoizeResponseHeader = <T>(
  header: string,
  fromHeaderValue: (x: string) => T,
  toHeaderValue: (x: T) => string,
  merger?: (x1: T, x2: T) => T
) => {
  const writeHeaderCallback: ChainFinalizer = (req, evt, ctx) => {
    const cached = ctx.cache.get(header) as T;
    if (cached) {
      const resHeaders = ctx.res.get().headers;
      const headerValue = toHeaderValue(cached);
      if (headerValue) {
        resHeaders.set(header, headerValue);
      }
    }
  };
  return (ctx: MiddlewareChainContext): [T, (value: T) => void] => {
    ctx.finalize.addCallback(writeHeaderCallback);
    const fromCacheOrRes = (): T => {
      const fromCache = ctx.cache.get(header) as T;
      if (fromCache) {
        return fromCache;
      }
      const resHeaders = ctx.res.get().headers;
      const value = resHeaders.get(header) || "";
      return fromHeaderValue(value);
    };

    const set = (value: T) => {
      const fromCache = ctx.cache.get(header) as T;
      if (!fromCache || !merger) {
        ctx.cache.set(header, value);
        return;
      }
      ctx.cache.set(header, merger(fromCache, value));
    };
    const value = fromCacheOrRes();
    return [value, set];
  };
};
