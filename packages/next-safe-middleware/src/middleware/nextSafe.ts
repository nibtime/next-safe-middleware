import _nextSafe from 'next-safe';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { Middleware } from './types';

// because of type bug.
const nextSafe = _nextSafe as unknown as typeof _nextSafe.nextSafe;

export type NextSafeCfg = Parameters<typeof nextSafe>[0];
export type NextSafeCfgInitializer = (
  req: NextRequest
) => NextSafeCfg | Promise<NextSafeCfg>;

export type CSPDirective = keyof Omit<
  Exclude<NonNullable<NextSafeCfg>['contentSecurityPolicy'], false>,
  'reportOnly'
>;

const nextSafeMiddleware: (
  init?: NextSafeCfg | NextSafeCfgInitializer
) => Middleware = (init) => async (req, evt, res, next) => {
  const response = res ?? NextResponse.next();
  const cfg = typeof init === 'function' ? await init(req) : init;
  nextSafe(cfg).forEach((header) =>
    response.headers.set(header.key, header.value)
  );
  return next ? next(response) : response;
};

export default nextSafeMiddleware;
