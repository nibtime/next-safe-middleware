import type { ICspCryptoConfig, HashAlgorithm, ICspCrypto } from "../types";
import crypto from "crypto";
import { mergeRight } from "ramda";

const hash = (text: string, algorithm: HashAlgorithm) => {
  const hash = crypto.createHash(algorithm);
  hash.update(text);
  return hash.digest("base64");
};

const nonce = (bits: number) => {
  return crypto.randomBytes(Math.floor(bits / 8)).toString("base64");
};

const withDefaultConfig = mergeRight<Required<ICspCryptoConfig>>({
  hashAlgorithm: "sha256",
  nonceBits: 128,
});

export class CspCryptoNode implements ICspCrypto {
  private cfg: Required<ICspCryptoConfig>;
  public constructor(cfg?: ICspCryptoConfig) {
    this.cfg = withDefaultConfig(cfg ?? {});
  }
  public withConfig(cfg: ICspCryptoConfig) {
    this.cfg = withDefaultConfig(cfg);
    return this;
  }
  public nonce() {
    return nonce(this.cfg.nonceBits);
  }
  public nonceWithPrefix() {
    return `nonce-${this.nonce()}` as const;
  }
  public hash(text: string) {
    return hash(text, this.cfg.hashAlgorithm);
  }
  public hashWithAlgorithm(text: string) {
    return `${this.cfg.hashAlgorithm}-${this.hash(text)}` as const;
  }
}
