import type { NextFetchEvent, NextRequest } from "next/server";
import type { ChainableMiddleware, NextMiddleware } from "./types";

/**
 * 
 * @param middlewares the middlewares to chain in sequence
 * @returns 
 * the chained middlewares as a single Next.js middleware
 * to export from `middleware.js`  
 * 
 */
const weAreChained =
  (
    ...middlewares: (ChainableMiddleware | Promise<ChainableMiddleware>)[]
  ): NextMiddleware =>
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

export default weAreChained;
