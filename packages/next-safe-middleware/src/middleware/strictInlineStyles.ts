import type { CSP } from "../types";
import { extendCsp } from "../utils";
import type { MiddlewareBuilder } from "./types";
import {
  cspNonce,
  pullCspFromResponse,
  pushCspToResponse,
  fetchHashes,
} from "./utils";
import { withDefaultConfig, ensureChainContext, unpackConfig } from "./builder";

export type StrictInlineStylesCfg = {
  /**
   * if set to true, it will extend an existing style-src directive
   * from further left in the middleware chain
   *
   * Default: `true`
   */
  extendStyleSrc?: boolean;
};

const strictInlineStyles: MiddlewareBuilder<StrictInlineStylesCfg> = (cfg) =>
  ensureChainContext(async (req, evt, res) => {
    if (process.env.NODE_ENV === "development") {
      return;
    }
    const { extendStyleSrc } = await unpackConfig(req, res, cfg);
    const mode = extendStyleSrc ? "append" : "override";
    const csp = pullCspFromResponse(res) ?? {};
    try {
      let extendedCsp: CSP | undefined;
      const getCsp = () => extendedCsp || csp;
      const styleSrcHashes = await fetchHashes(req, "style-hashes.txt");
      // if fetched hashes, it's a static page. Hash-based strict CSP
      if (styleSrcHashes) {
        extendedCsp = extendCsp(
          getCsp(),
          {
            "style-src": styleSrcHashes,
          },
          mode
        );
      }
      // if not it's a dynamic page. Nonce-based strict CSP
      else {
        extendedCsp = extendCsp(
          getCsp(),
          {
            "style-src": `'nonce-${cspNonce(res)}'`,
          },
          mode
        );
      }
      if (extendedCsp) {
        pushCspToResponse(extendedCsp, res);
      }
    } catch (err) {
      console.error(
        "[strictStyles]: Internal error. Didn't add hashes or nonce to CSP",
        { err }
      );
    }
  });

export default withDefaultConfig(strictInlineStyles, {
  extendStyleSrc: true,
});
