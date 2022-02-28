import type { NextFetchEvent, NextRequest } from "next/server";
import type { Middleware } from "./types";

// https://www.youtube.com/watch?v=tVCUAXOBF7w
const weAreChained =
  (...middlewares: (Middleware | Promise<Middleware>)[]) =>
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
