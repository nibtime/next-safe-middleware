import type { MiddlewareBuilder } from "./builder/types";
import type { ChainableMiddleware } from "./compose/types";

import { unpackConfig, withDefaultConfig } from "./builder";
import { chain, continued, chainableMiddleware } from "./compose";

export type TelemetryCfg = {
  middlewares: (ChainableMiddleware | Promise<ChainableMiddleware>)[];
  profileLabel?: string;
  logHeaders?: boolean;
  logExecutionTime?: boolean;
  logUrl?: boolean;
};

const _telemetry: MiddlewareBuilder<TelemetryCfg> = (cfg) =>
  chainableMiddleware(async (req, evt, ctx) => {
    let { logHeaders, logExecutionTime, middlewares, profileLabel, logUrl } =
      await unpackConfig(cfg, req, evt, ctx);
    if (!middlewares.length) {
      return;
    }
    const timedLabel = `${Date.now()} [${profileLabel}]`;
    if (logExecutionTime) {
      console.time(timedLabel);
    }
    const mwRes = await continued(chain(...middlewares))(req, evt, ctx);
    if (logExecutionTime) {
      console.timeEnd(timedLabel);
    }
    if (logHeaders || logUrl) {
      console.info(
        `${timedLabel}:`,
        JSON.stringify({
          url: logUrl ? req.url : undefined,
          headers: logHeaders
            ? {
                req: Object.fromEntries([...req.headers.entries()]),
                res: ctx?.res?.get()
                  ? Object.fromEntries([...ctx.res.get().headers.entries()])
                  : undefined,
              }
            : undefined,
        })
      );
    }
    return mwRes;
  });

const telemetry = withDefaultConfig(_telemetry, {
  middlewares: [],
  profileLabel: "middleware",
  logHeaders: false,
  logExecutionTime: true,
  logUrl: false,
});

export default telemetry;
