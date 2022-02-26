import type { NextSafeCfgCSP } from './middleware/nextSafe';
export type CSPDirective = keyof Omit<NextSafeCfgCSP, 'reportOnly'>;
export type CSP = Partial<Record<CSPDirective, string | string[]>>;
export type CSPFilter = Partial<Record<CSPDirective, RegExp>>;
