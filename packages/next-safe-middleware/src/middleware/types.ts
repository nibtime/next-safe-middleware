import type { NextFetchEvent, NextRequest } from 'next/server';

export type Middleware = (
  req: NextRequest,
  evt: NextFetchEvent,
  res?: Response,
  next?: (res: Response) => void
) => Promise<Response | void> | Response | void;
