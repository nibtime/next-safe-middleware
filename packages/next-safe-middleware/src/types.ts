import type { CSPDirective } from './middleware/nextSafe';
export type { CSPDirective };
export type CSP = Partial<Record<CSPDirective, string | string[]>>;
export type CSPFilter = Partial<Record<CSPDirective, RegExp>>;
