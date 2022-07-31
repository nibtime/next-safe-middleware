import type { ExcludeList } from "../csp-trustify/types";
import type { CspDocumentInitialPropsOptions } from "./types";
import Document from "next/document";
import { CspBuilder } from "../../utils";
import {
  hash,
  deepEnsureNonceInChildren,
  deepEnsureScriptElementsInManifest,
  deepExtractStyleElemHashes,
  collectStyleElem,
  pullStyleElem,
  pullStyleAttr,
  collectStyleAttr,
} from "../csp-trustify";
import { getCtxCsp, getCtxNonce } from "../NextPageContext";
import { processHtml } from "./processHtml";
import { setCtxHeader } from "../NextPageContext/headers";
import { setExcludeList, setIsHashProxy } from "../csp-trustify/cfg";

const collectCustomRawCss = (
  initialProps?: CspDocumentInitialPropsOptions["passInitialProps"],
  hashRawCss?: CspDocumentInitialPropsOptions["hashRawCss"],
  exclude: ExcludeList = []
) => {
  if (!exclude.includes("styles") && initialProps && hashRawCss) {
    const customElemHashes = hashRawCss.flatMap((el) => {
      if (typeof el === "string") {
        return [hash(el)];
      }
      const styleOrStyles = el(initialProps);
      return typeof styleOrStyles === "string"
        ? [hash(styleOrStyles)]
        : styleOrStyles.map(hash);
    });
    collectStyleElem(...customElemHashes);
  }
};

const trustifyInitialPropsSafeParts = (
  initialProps?: CspDocumentInitialPropsOptions["passInitialProps"],
  nonce?: string,
  hashRawCss?: CspDocumentInitialPropsOptions["hashRawCss"],
  exclude: ExcludeList = []
) => {
  collectCustomRawCss(initialProps, hashRawCss, exclude);
  if (nonce) {
    deepEnsureNonceInChildren(nonce, initialProps.head, exclude);
    deepEnsureNonceInChildren(nonce, initialProps.styles, exclude);
  } else {
    deepEnsureScriptElementsInManifest(initialProps.head, exclude);
    collectStyleElem(...deepExtractStyleElemHashes(initialProps.head, exclude));
    collectStyleElem(
      ...deepExtractStyleElemHashes(initialProps.styles, exclude)
    );
  }
  if (!exclude.includes("styles")) {
    collectStyleElem(hash(""));
    collectStyleAttr(
      // partytown iframe style
      hash("display:block;width:0;height:0;border:0;visibility:hidden")
    );
  }
};

/**
 * A replacement for `Document.getInitialProps`to use in `getInitialProps` of your custom `_document.js` .
 * It sets up all different kinds of stuff so strict CSPs work with Next.js.
 *
 * Must be used together with components returned from `provideComponents` to be in effect.
 * @requires `provideComponents`
 *
 * @example
 * export default class MyDocument extends Document {
 *   static async getInitialProps(ctx) {
 *     const initialProps = await getCspInitialProps({
 *       ctx,
 *       trustifyStyles: true,
 *       enhanceAppWithNonce: true
 *     });
 *     return initialProps;
 * ...
 */
export const getCspInitialProps = async ({
  ctx,
  passInitialProps,
  trustifyScripts = true,
  trustifyStyles = false,
  hashRawCss = [],
  processHtmlOptions,
  hashBasedByProxy = true,
}: CspDocumentInitialPropsOptions) => {
  const initialProps =
    passInitialProps || (await Document.getInitialProps(ctx));
  if (process.env.NODE_ENV !== "production") {
    return initialProps;
  }
  const excludeList = [
    ...(!trustifyScripts ? ["scripts"] : []),
    ...(!trustifyStyles ? ["styles"] : []),
  ] as ExcludeList;

  const nonce = getCtxNonce(ctx);

  trustifyInitialPropsSafeParts(initialProps, nonce, hashRawCss, excludeList);

  initialProps.html = processHtml(
    initialProps.html,
    nonce,
    processHtmlOptions,
    excludeList
  );

  const builder = new CspBuilder(getCtxCsp(ctx));

  if (!excludeList.includes("styles")) {
    builder
      .withStyleHashes(pullStyleElem(), pullStyleAttr())
      .toHeaderKeyValue();
  }
  if (nonce) {
    builder.withNonceApplied(nonce);
  }
  setCtxHeader(ctx, ...builder.toHeaderKeyValue());
  setExcludeList(excludeList);
  setIsHashProxy(hashBasedByProxy);
  return {
    ...initialProps,
    nonce,
  };
};

type PromiseInnerType<T> = T extends Promise<infer U> ? U : never;
export type CspInitialProps = PromiseInnerType<
  ReturnType<typeof getCspInitialProps>
>;
