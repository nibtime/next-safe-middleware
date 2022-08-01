import { difference } from "ramda";
import type { CspManifest } from "../../../types";
import type { Nullable, IterableScript } from "./types";
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
        return { src: src as string, hash: integrity as string };
      }
      if (integrity) {
        return { hash: integrity as string };
      }
      return null;
    })
    .filter(Boolean);
};

const styleElem: string[] = [];
export const collectStyleElem = (...hashes: string[]) => {
  styleElem.push(...difference(hashes.filter(Boolean), styleElem));
};
export const pullStyleElem = () => styleElem;

const styleAttr: string[] = [];
export const collectStyleAttr = (...hashes: string[]) => {
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
