import { extendCsp } from "../utils";
import type { MiddlewareBuilder } from "./types";
import { pullCspFromResponse, pushCspToResponse, fetchHashes } from "./utils";
import { withDefaultConfig, ensureChainContext, unpackConfig } from "./builder";

export type StrictInlineStylesCfg = {
  /**
   * if set to true, it will extend an existing style-src directive
   * from further left in the middleware chain
   *
   * Default: `true`. This respects an existing `style-src` configuration
   * that relies on additonal stylesheets on top of inline styles.
   *
   * Set to `false` if you use a CSS-in-JS solution like Stitches that relies on
   * inline styles and don't need to include any further stylesheet for your app.
   */
  extendStyleSrc?: boolean;
};

const strictInlineStyles: MiddlewareBuilder<StrictInlineStylesCfg> = (cfg) =>
  ensureChainContext(async (req, evt, res) => {
    if (process.env.NODE_ENV === "development") {
      return;
    }
    let fetchedHashes: string[] = [];
    try {
      fetchedHashes = await fetchHashes(req, "style-hashes.txt", "/");
      if (fetchedHashes) {
        const { extendStyleSrc } = await unpackConfig(req, res, cfg);
        const mode = extendStyleSrc ? "append" : "override";
        let csp = pullCspFromResponse(res) ?? {};
        csp = extendCsp(
          csp,
          {
            "style-src": [...fetchedHashes, "'unsafe-hashes'"],
          },
          mode
        );
        pushCspToResponse(csp, res);
      }
    } catch (err) {
      console.error(
        "[strictInlineStyles]: Internal error. No style hashes were added to CSP",
        { err, fetchedHashes }
      );
    } finally {
      if (!fetchedHashes.length) {
        console.log(
          "[strictInlineStyles]: No styles. Is your app using any inline styles at all?. If yes, this is unexpected"
        );
      }
    }
  });

export default withDefaultConfig(strictInlineStyles, {
  extendStyleSrc: true,
});
