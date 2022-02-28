import type { NextApiHandler } from "next";
import { extractReportingData } from "types/reporting";

const handler: NextApiHandler = (req, res) => {
  const reportingData = extractReportingData(req.body);
  if (reportingData) {
    console.log(JSON.stringify(reportingData));
    // Accepted: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/202
    res.status(202).end();
    return;
  }
  // Unprocessable Entity: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/422
  res.status(422).end();
};

export default handler;
