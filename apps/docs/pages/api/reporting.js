import {
  reporting,
  sentryCspReporterForEndpoint,
} from "@komw/next-safe-middleware/dist/api";

const sentryCspEndpoint = process.env.SENTRY_CSP_ENDPOINT;

/** @type {import('@komw/next-safe-middleware/dist/api').Reporter} */
const consoleLogReporter = (data) =>
  console.log(JSON.stringify(data.payload, undefined, 2));

export default reporting(
  consoleLogReporter,
  ...(sentryCspEndpoint
    ? [sentryCspReporterForEndpoint(sentryCspEndpoint)]
    : [])
);
