import type { HashWithAlgorithm } from "@komw/next-safe-builder";
import type { ExcludeList } from "../csp-trustify/types";
import type {
  CspDocumentInitialProps,
  CspDocumentInitialPropsOptions,
} from "./types";
import Document from "next/document";
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
import { getCtxCsp, getCtxNonce, setCtxCsp } from "../NextPageContext";
import { processHtml } from "./processHtml";
import { setExcludeList, setIsHashProxy } from "../csp-trustify/cfg";

const collectCustomRawCss = (
  initialProps?: CspDocumentInitialPropsOptions["passInitialProps"],
  hashRawCss?: CspDocumentInitialPropsOptions["hashRawCss"],
  exclude: ExcludeList = []
) => {
  if (!exclude.includes("styles") && initialProps && hashRawCss) {
    const customElemHashes: HashWithAlgorithm[] = hashRawCss.flatMap((el) => {
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
    if (!exclude.includes("scripts")) {
      deepEnsureScriptElementsInManifest(initialProps.head);
    }
    if (!exclude.includes("styles")) {
      collectStyleElem(
        ...deepExtractStyleElemHashes(initialProps.head, exclude)
      );
      collectStyleElem(
        ...deepExtractStyleElemHashes(initialProps.styles, exclude)
      );
      collectStyleElem(hash(""));
      collectStyleAttr(
        // partytown iframe style
        hash("display:block;width:0;height:0;border:0;visibility:hidden")
      );
    }
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
}: CspDocumentInitialPropsOptions): Promise<CspDocumentInitialProps> => {
  const initialProps =
    passInitialProps || (await Document.getInitialProps(ctx));
  if (process.env.NODE_ENV !== "production") {
    return { ...initialProps, nonce: undefined };
  }
  const excludeList = [
    ...(!trustifyScripts ? ["scripts"] : []),
    ...(!trustifyStyles ? ["styles"] : []),
  ] as ExcludeList;

  setExcludeList(excludeList);
  setIsHashProxy(hashBasedByProxy);

  const nonce = getCtxNonce(ctx);

  trustifyInitialPropsSafeParts(initialProps, nonce, hashRawCss, excludeList);

  initialProps.html = processHtml(
    initialProps.html,
    nonce,
    processHtmlOptions,
    excludeList
  );

  if (!nonce) {
    return {
      ...initialProps,
      nonce: undefined,
    };
  }
  // for pages with getServerSideProps/getInitialProps that injected a nonce
  const builder = getCtxCsp(ctx);
  if (!builder.isEmpty()) {
    // this will apply inline styles in dynamic page collected during SSR
    if (!excludeList.includes("styles")) {
      builder.withStyleHashes(pullStyleElem(), pullStyleAttr());
    }
    // this will consistently apply the nonce to all set directives in CSP that need it
    builder.withNonceApplied(nonce);
    // set updated CSP back to req/res of context
    setCtxCsp(ctx, builder);
  }
  return {
    ...initialProps,
    nonce,
  };
};

export * from "./types";
