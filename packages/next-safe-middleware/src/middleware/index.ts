export { default as nextSafe } from "./nextSafe";
export type { NextSafeCfg } from "./nextSafe";

export { default as reporting } from "./reporting";
export type { ReportingCfg } from "./reporting";

import { default as strictDynamic } from "./strictDynamic";
export { strictDynamic };
export type { StrictDynamicCfg } from "./strictDynamic";

/**
 * @deprecated use the `strictDynamic` middleware builder to configure a strict CSP.
 */
export const provideHashesOrNonce = strictDynamic();

export { default as strictInlineStyles } from "./strictInlineStyles";
export type { StrictInlineStylesCfg } from "./strictInlineStyles";

export { default as csp } from "./csp";
export type { CspCfg } from "./csp";

export { default as telemetry } from "./telemetry";
export type { TelemetryCfg } from "./telemetry";
