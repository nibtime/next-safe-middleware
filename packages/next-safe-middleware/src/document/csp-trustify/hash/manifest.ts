import type { HashWithAlgorithm } from "@strict-csp/builder";
import type { CspManifest } from "../../../types";
import type { Nullable, IterableScript } from "./types";

import { difference } from "ramda";

import {
  getScriptValue,
  iterableScriptFromProps,
  sortIterableScriptByAttr,
} from "./script-inlining";

export let iterableScripts: IterableScript[] = [];

export const collectIterableScript = (
  ...scripts: Nullable<IterableScript>[]
) => {
  iterableScripts.push(...scripts.filter(Boolean));
};

export const collectScriptElement = (...scripts: Nullable<JSX.Element>[]) => {
  collectIterableScript(
    ...scripts
      .map(iterableScriptFromProps)
      .filter(Boolean)
      .map(sortIterableScriptByAttr)
  );
};

export const pullManifestScripts = () => {
  return iterableScripts
    .map((s) => {
      const src = getScriptValue("src", s);
      const integrity = getScriptValue("integrity", s);
      if (src && integrity) {
        return { src: src as string, hash: integrity as HashWithAlgorithm };
      }
      if (integrity) {
        return { hash: integrity as HashWithAlgorithm };
      }
      return null;
    })
    .filter(Boolean);
};

const styleElem: HashWithAlgorithm[] = [];
export const collectStyleElem = (...hashes: HashWithAlgorithm[]) => {
  styleElem.push(...difference(hashes.filter(Boolean), styleElem));
};
export const pullStyleElem = (): HashWithAlgorithm[] => styleElem;

const styleAttr: HashWithAlgorithm[] = [];
export const collectStyleAttr = (...hashes: HashWithAlgorithm[]) => {
  styleAttr.push(...difference(hashes.filter(Boolean), styleAttr));
};
export const pullStyleAttr = () => styleAttr;

export const pullManifest = (): CspManifest => {
  const scripts = pullManifestScripts();
  const styleElem = pullStyleElem();
  const styleAttr = pullStyleAttr();

  return {
    scripts,
    styles: {
      elem: styleElem,
      attr: styleAttr,
    },
  };
};
