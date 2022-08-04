// CSP typing taken and adapted from SvelteKit CSP integration
// https://kit.svelte.dev/docs/types#additional-types-csp

export type ActionSource = "strict-dynamic" | "report-sample";
export type BaseSource =
  | "self"
  | "unsafe-eval"
  | "unsafe-hashes"
  | "unsafe-inline"
  | "none";
export type HashAlgorithm = "sha256" | "sha384" | "sha512";
export type HashWithAlgorithm = `${HashAlgorithm}-${string}`;
export type NonceWithPrefix = `${"nonce"}-${string}`;
export type CryptoSource = HashWithAlgorithm | NonceWithPrefix;
export type FrameSource = HostSource | SchemeSource | "self" | "none";
export type HostNameScheme = `${string}.${string}` | "localhost";
export type HostSource = `${HostProtocolSchemes}${HostNameScheme}${PortScheme}`;
export type HostProtocolSchemes = `${string}://` | "";
export type HttpDelineator = "/" | "?" | "#" | "\\";
export type PortScheme = `:${number}` | "" | ":*";
export type SchemeSource =
  | "http:"
  | "https:"
  | "data:"
  | "mediastream:"
  | "blob:"
  | "filesystem:"
  | "ws:"
  | "wss:";
export type Source = HostSource | SchemeSource | CryptoSource | BaseSource;
export type Sources = Source[];
export type UriPath =
  | `${HttpDelineator}${string}`
  | `${HostSource}${HttpDelineator}${string}`;

export interface CspDirectives {
  "child-src"?: Sources;
  "default-src"?: Array<Source | ActionSource>;
  "frame-src"?: Sources;
  "worker-src"?: Sources;
  "connect-src"?: Sources;
  "font-src"?: Sources;
  "img-src"?: Sources;
  "manifest-src"?: Sources;
  "media-src"?: Sources;
  "object-src"?: Sources;
  "prefetch-src"?: Sources;
  "script-src"?: Array<Source | ActionSource>;
  "script-src-elem"?: Sources;
  "script-src-attr"?: Sources;
  "style-src"?: Array<Source | ActionSource>;
  "style-src-elem"?: Sources;
  "style-src-attr"?: Sources;
  "base-uri"?: Array<Source | ActionSource>;
  sandbox?:
    | boolean
    | Array<
        | "allow-downloads-without-user-activation"
        | "allow-forms"
        | "allow-modals"
        | "allow-orientation-lock"
        | "allow-pointer-lock"
        | "allow-popups"
        | "allow-popups-to-escape-sandbox"
        | "allow-presentation"
        | "allow-same-origin"
        | "allow-scripts"
        | "allow-storage-access-by-user-activation"
        | "allow-top-navigation"
        | "allow-top-navigation-by-user-activation"
      >;
  "form-action"?: Array<Source | ActionSource>;
  "frame-ancestors"?: Array<HostSource | SchemeSource | FrameSource>;
  "navigate-to"?: Array<Source | ActionSource>;
  "report-uri"?: UriPath[];
  "report-to"?: string[];

  "require-trusted-types-for"?: Array<"script">;
  "trusted-types"?: Array<"none" | "allow-duplicates" | "*" | string>;
  "upgrade-insecure-requests"?: boolean;
  /** @deprecated */
  "require-sri-for"?: Array<"script" | "style" | "script style">;
  /** @deprecated */
  "block-all-mixed-content"?: boolean;
  /** @deprecated */
  "plugin-types"?: Array<`${string}/${string}` | "none">;
  /** @deprecated */
  referrer?: Array<
    | "no-referrer"
    | "no-referrer-when-downgrade"
    | "origin"
    | "origin-when-cross-origin"
    | "same-origin"
    | "strict-origin"
    | "strict-origin-when-cross-origin"
    | "unsafe-url"
    | "none"
  >;
}

export type CspDirectivesLenient = Partial<
  Partial<Record<keyof CspDirectives, string | string[] | boolean>>
>;

type BooleanDirectiveKeys =
  | "upgrade-insecure-requests"
  | "block-all-mixed-content"
  | "sandbox";

export type BooleanCspDirectives = Pick<CspDirectives, BooleanDirectiveKeys>;

export type NonBooleanCspDirectives = Omit<CspDirectives, BooleanDirectiveKeys>;

export type CspFilter = {
  [K in keyof NonBooleanCspDirectives]?: RegExp | NonBooleanCspDirectives[K];
};

export type ICspCryptoConfig = {
  nonceBits?: number;
  hashAlgorithm?: HashAlgorithm;
};

export interface ICspCrypto {
  withConfig(cfg: ICspCryptoConfig): ICspCrypto;
  nonce(): string;
  nonceWithPrefix(): NonceWithPrefix;
  hash(text: string): string;
  hashWithAlgorithm(text: string): HashWithAlgorithm;
}
