import crypto from "crypto";

let hashAlgorithm: Algorithm = "sha256";

type Algorithm = "sha256" | "sha384" | "sha512";

export const setHashAlgorithm = (algorithm: "sha256" | "sha384" | "sha512") =>
  (hashAlgorithm = algorithm);

export const hashWithAlgorithm = (
  text: string,
  algorithm: Algorithm = "sha256"
) => {
  const hash = crypto.createHash(algorithm);
  hash.update(text);
  return `${algorithm}-${hash.digest("base64")}`;
};

export const hash = (text: string) => hashWithAlgorithm(text, hashAlgorithm);
