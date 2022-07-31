import type { CtxHeaders } from "./types";
import { CSP_NONCE_HEADER } from "../../constants";
import { getCtxHeader, setCtxHeader } from "./headers";

let nonceBits = 128;

export const setNonceBits = (bits: number) => (nonceBits = bits);

export const generateNonce = (bits = 128): string => {
  const crypto = require("crypto");
  return crypto.randomBytes(Math.floor(bits / 8)).toString("base64");
};

export const nonce = () => generateNonce(nonceBits);

export const getCtxNonce = (ctx: CtxHeaders) => {
  return getCtxHeader(ctx, CSP_NONCE_HEADER);
};

export const getCreateCtxNonceIdempotent = (ctx: CtxHeaders) => {
  if (process.env.NODE_ENV !== "production") {
    return "";
  }
  let _nonce = getCtxNonce(ctx);
  if (!_nonce) {
    _nonce = nonce();
    setCtxHeader(ctx, CSP_NONCE_HEADER, _nonce);
  }
  return _nonce;
};
