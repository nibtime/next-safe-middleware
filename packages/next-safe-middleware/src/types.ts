import type { HashWithAlgorithm } from "@strict-csp/builder";
export type CspManifest = {
  scripts: { src?: string; hash: HashWithAlgorithm }[];
  styles: {
    elem: HashWithAlgorithm[];
    attr: HashWithAlgorithm[];
  };
};
