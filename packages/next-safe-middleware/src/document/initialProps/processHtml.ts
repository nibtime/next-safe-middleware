import type { CheerioAPI } from "cheerio";
import type { ProcessHtmlOptions } from "./types";
import type { ExcludeList } from "../csp-trustify/types";
import cheerio from "cheerio";
import { map, mergeDeepWithKey } from "ramda";
import { hash, collectStyleAttr, collectStyleElem } from "../csp-trustify";

type WithoutBoolUnions<T extends object> = {
  [P in keyof T]: T[P] extends boolean
    ? T[P]
    : Exclude<T[P], boolean> extends Record<string, unknown>
    ? WithoutBoolUnions<Exclude<T[P], boolean>>
    : Exclude<T[P], boolean>;
};

type WithDefaultOptions = WithoutBoolUnions<ProcessHtmlOptions>;

const processStyles = (
  $: CheerioAPI,
  nonce: string,
  options?: WithDefaultOptions["styles"]
) => {
  if (options?.elements) {
    const styleElements = $("style").get();

    if (nonce) {
      styleElements.forEach((el) => {
        $(el).attr("nonce", nonce);
      });
    } else {
      const styleElemHashes = styleElements
        .map((el) => $.text(el.children))
        .filter(Boolean)
        .map(hash);
      collectStyleElem(...styleElemHashes);
    }
  }
  if (options?.attributes) {
    const styleAttrHashes = $("[style]")
      .get()
      .map((e) => hash(e.attribs["style"]));
    collectStyleAttr(...styleAttrHashes);
  }
};

const defaultOptions: WithDefaultOptions = {
  styles: {
    attributes: true,
    elements: true,
  },
};

const optionMerger = (k, l, r) =>
  typeof r === "boolean" ? map(() => r, l) : r;

export const processHtml = (
  html: string,
  nonce: string,
  options?: ProcessHtmlOptions,
  exclude: ExcludeList = []
) => {
  const mergedOptions: WithDefaultOptions = mergeDeepWithKey(
    optionMerger,
    defaultOptions,
    options ?? {}
  );
  const $ = cheerio.load(html, {}, false);
  if (!exclude.includes("styles")) {
    processStyles($, nonce, mergedOptions.styles);
  }
  return $.html();
};
