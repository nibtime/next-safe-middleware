import type { HashAlgorithm, HashWithAlgorithm } from "@komw/next-safe-builder";
import crypto from "crypto";

let hashAlgorithm: HashAlgorithm = "sha256";

export const setHashAlgorithm = (algorithm: HashAlgorithm) =>
  (hashAlgorithm = algorithm);

export const hashWithAlgorithm = (
  text: string,
  algorithm: HashAlgorithm = "sha256"
): HashWithAlgorithm => {
  const hash = crypto.createHash(algorithm);
  hash.update(text);
  return `${algorithm}-${hash.digest("base64")}` as const;
};

export const hash = (text: string) => hashWithAlgorithm(text, hashAlgorithm);
