import {
  reporting,
  sentryCspReporterForEndpoint,
} from "@komw/next-safe-middleware/dist/api";

const sentryCspEndpoint = process.env.SENTRY_CSP_ENDPOINT;

const consoleLogReporter = (data) =>
  console.log(JSON.stringify(data, undefined, 2));

export default reporting(
  consoleLogReporter,
  ...(sentryCspEndpoint
    ? [sentryCspReporterForEndpoint(sentryCspEndpoint)]
    : [])
);
