import type { NextApiHandler } from "next";
import type { Reporter } from "./types";
import { extractReportingData } from "./utils";

/**
 * @param reporters
 * argument list of functions that process reporting data
 * (log to console, send to logging service, etc.)
 * @returns
 * a `NextApiHandler` that processes all incoming reporting data
 * as specified by the passed reporter functions.
 */
const reportingApiHandler: (...reporters: Reporter[]) => NextApiHandler =
  (...reporters) =>
  async (req, res) => {
    try {
      const data = extractReportingData(req.body);
      if (data) {
        await Promise.allSettled(
          reporters.map(async (reporter) => {
            reporter(data, req);
          })
        );
        // Accepted: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/202
        res.status(202).end();
        return;
      }
    } finally {
      // Unprocessable Entity: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/422
      res.status(422).end();
    }
  };

export default reportingApiHandler;
