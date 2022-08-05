import type { NextRequest } from "next/server";
import type { ChainFinalizer, MiddlewareChainContext } from "./compose/types";
import pRetry from "p-retry";
import { CspBuilder } from "@strict-csp/builder";
import {
  CSP_HEADER,
  CSP_HEADER_REPORT_ONLY,
  CSP_LOCATION_MIDDLEWARE,
  CSP_MANIFEST_FILENAME,
} from "../constants";
import type { CspManifest } from "../types";
import { memoize, memoizeInChain } from "./compose";


const cspBuilderFromCtx = (ctx: MiddlewareChainContext): CspBuilder => {
  const headers = ctx.res.get().headers;
  const cspContent = headers.get(CSP_HEADER);
  const cspContentReportOnly = headers.get(CSP_HEADER_REPORT_ONLY);

  if (cspContent) {
    return new CspBuilder([CSP_HEADER, cspContent]);
  }

  if (cspContentReportOnly) {
    return new CspBuilder([CSP_HEADER_REPORT_ONLY, cspContentReportOnly]);
  }
  return new CspBuilder();
};

const memoizedCspBuilder = memoizeInChain("csp-builder", cspBuilderFromCtx);

const builderToResponse: ChainFinalizer = async (_req, _evt, ctx) => {
  const builder = ctx.cache.get("csp-builder") as CspBuilder;
  if (!builder.isEmpty()) {
    const headers = ctx.res.get().headers;
    headers.delete(CSP_HEADER);
    headers.delete(CSP_HEADER_REPORT_ONLY);
    headers.set(...builder.toHeaderKeyValue());
  }
};

export const cachedCspBuilder = async (ctx: MiddlewareChainContext) => {
  ctx.finalize.addCallback(builderToResponse);
  return memoizedCspBuilder(ctx)(ctx);
};

const fetchCspManifest = async (req: NextRequest): Promise<CspManifest> => {
  const { origin, basePath } = req.nextUrl;
  const baseUrl = basePath
    ? `${origin}${basePath}/${CSP_LOCATION_MIDDLEWARE}`
    : `${origin}/${CSP_LOCATION_MIDDLEWARE}`;

  const manifestUrl = encodeURI(`${baseUrl}/${CSP_MANIFEST_FILENAME}`);

  const res = await fetch(manifestUrl);
  return res.json();
};

const fetchCspManifestWithRetry = (
  req: NextRequest,
  retries = 5
): Promise<CspManifest | undefined> =>
  pRetry(
    async () => {
      if (process.env.NODE_ENV === "development") {
        return undefined;
      }
      const result = await fetchCspManifest(req);
      return result;
    },
    { retries }
  );

export const cachedCspManifest = memoize(fetchCspManifestWithRetry);
