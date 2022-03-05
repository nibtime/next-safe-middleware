export * from "./types";
export * from "./utils";

export { default as chain } from "./chain";

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
export type { StrictInlineStylesCfg as StrictStylesCfg } from "./strictInlineStyles";
