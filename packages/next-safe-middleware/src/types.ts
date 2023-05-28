import type { HashWithAlgorithm } from "@komw/next-safe-builder";
export type CspManifest = {
  scripts: { src?: string; hash: HashWithAlgorithm }[];
  styles: {
    elem: HashWithAlgorithm[];
    attr: HashWithAlgorithm[];
  };
};
