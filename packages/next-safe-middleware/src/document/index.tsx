/* eslint-disable @next/next/no-document-import-in-page */
import type {
  DocumentContext,
  DocumentInitialProps,
  DocumentProps,
} from "next/document";
import type { GetServerSideProps, PreviewData, NextPageContext } from "next";
import type { ParsedUrlQuery } from "querystring";
import Document, { Head, NextScript } from "next/document";
import React from "react";
import cheerio from "cheerio";
import { extendCsp } from "../utils";
import {
  setCsp,
  integritySha256,
  getCsp,
  applyNonceToCsp,
  getCtxHeader,
} from "./utils";
import {
  Head as NoncingHead,
  noncifyScriptChildren,
  noncifyStyleChildren,
} from "./NoncingHead";
import { NextScript as NoncingScript } from "./NoncingScript";
import {
  Head as HashingHead,
  collectStyleElemHashes,
  collectStyleAttrHashes,
  hashifyScriptChildren,
  collectStyleHashesFromChildren,
  pullStyleElemHashes,
  pullStyleAttrHashes,
} from "./HashingHead";
import { NextScript as HashingScript } from "./HashingScript";
import { CSP_NONCE_HEADER } from "../constants";

export type {
  CspDirectives,
  CspDirectivesLenient,
  CspFilter,
  Source as CspSource,
  Sources as CspSources,
} from "../types";
export {
  getCsp,
  setCsp,
  cspNonce,
  applyNonceToCsp,
  logCtxHeaders,
} from "./utils";
export {
  extendCsp,
  filterCsp,
  cspDirectiveHas,
  fromCspContent,
  toCspContent,
} from "../utils";

type ProvidedProps = {
  trustifyStyles?: boolean;
  trustifyScripts?: boolean;
  children?: any;
};
type Provided = {
  Head: (props: ProvidedProps) => any;
  NextScript: (props: ProvidedProps) => any;
};

/**
 * Provides replacement components for `<Head>` and `<NextScript>` from `next/document`.
 * They do all kinds of different stuff so strict CSPs work with Next.js.
 *
 * `getCspInitialProps` must be called in `getInitialProps` of your custom `_document.js` for them to work.
 *
 * @requires `getCspInitialProps`
 *
 * @example
 * export default class MyDocument extends Document {
 *   static async getInitialProps(ctx) {
 *     const initialProps = await getCspInitialProps({
 *       ctx,
 *       trustifyStyles: true,
 *     });
 *     return initialProps;
 *   ...
 *
 *   render() {
 *     const { Head, NextScript } = provideComponents(this.props)
 *     ...
 *   }
 */
export const provideComponents = (props: DocumentProps): Provided => {
  const NEXT_DATA = props.__NEXT_DATA__;
  // gip = getInitialProps, gssp = getServerSideProps
  const isDynamic = NEXT_DATA.gip || NEXT_DATA.gssp;
  // gsp = getStaticProps
  const isStatic = !isDynamic;
  const isProd = process.env.NODE_ENV === "production";
  const anyProps = props as any;
  const trustifyStyles = anyProps.trustifyStyles;
  const trustifyScripts = anyProps.trustifyScripts;
  if (isProd && isDynamic) {
    return {
      Head: ({ children }) => (
        <NoncingHead
          nonce={anyProps.nonce}
          {...({
            trustifyStyles,
            trustifyScripts,
          } as any)}
        >
          {children}
        </NoncingHead>
      ),
      NextScript: () => (
        <NoncingScript
          {...({
            trustifyStyles,
            trustifyScripts,
          } as any)}
          nonce={anyProps.nonce}
        />
      ),
    };
  }

  if (isProd && isStatic) {
    return {
      Head: ({ children }) => (
        <HashingHead
          {...({
            trustifyStyles,
            trustifyScripts,
          } as any)}
        >
          {children}
        </HashingHead>
      ),
      NextScript: () => (
        <HashingScript
          {...({
            trustifyStyles,
            trustifyScripts,
          } as any)}
        />
      ),
    };
  }
  return {
    Head: ({ children }) => <Head>{children}</Head>,
    NextScript: () => <NextScript />,
  };
};

const hashStylesInHtml = (html: string, attributesOnly: boolean) => {
  const $ = cheerio.load(html, {}, false);
  let styleElemHashes = [];
  if (!attributesOnly) {
    const styleElements = $("style").get();
    styleElemHashes = styleElements
      .map((el) => $.text(el.children))
      .filter(Boolean)
      .map(integritySha256);
  }
  const styleAttrHashes = $("[style]")
    .get()
    .map((e) => integritySha256(e.attribs["style"]));
  return {
    html: $.html(),
    styleElemHashes,
    styleAttrHashes,
  };
};

export type CspDocumentInitialPropsOptions = {
  /** the context of the document, same as passed to `Document.getInitialProps` */
  ctx: DocumentContext;
  /**
   * if you call `Document.getInitialProps` yourself and want to do more customizations
   * on initialProps before, do them and pass the result here  */
  passInitialProps?: DocumentInitialProps;
  /**
   * You need to set this to `true`, if you want strict inline styles and use the `strictInlineStyles` middleware.
   * If you do so, styles (tags and attributes) of prerendered HTML
   * will be visited and nonced/hashed for CSP.
   *
   * @default false
   *
   * @see https://github.com/nibtime/next-safe-middleware/issues/31
   */
  trustifyStyles?: boolean;
  /**
   * This needs to be `true` if you use a strict CSP with `strictDynamic` middleware.
   * This will ensure that all your scripts that need to load before your app
   * is interactive (including Next itself) get nonced/hashed and included in your CSP.
   *
   * @default true
   */
  trustifyScripts?: boolean;
  /**
   * you can pass raw css of style tags here to be hashed. This is necessary if a framework adds
   * style tags in an opaque way with a React component, like Mantine. In such cases you can pass
   * the raw css text of the underlying CSS-in-JS framework here.
   *
   * values can be a string with raw css text
   * or a function that pull a string with css text from `initialProps`
   * (if you want an enhanced <App> with nonce, you can't call Document.getInitialProps before);
   *
   * @see https://github.com/nibtime/next-safe-middleware/issues/34
   *
   * @example
   * const initialProps = await getCspInitialProps({
   *   ctx,
   *   trustifyStyles: true,
   *   hashStyleElements: [
   *     (initialProps) =>
   *       stylesServer
   *         .extractCriticalToChunks(initialProps.html)
   *         .styles.map((s) => s.css),
   *   ],
   * });
   * ...
   *
   * return initialProps
   */
  hashRawCss?: (
    | string
    | ((initialProps: DocumentInitialProps) => string | string[])
  )[];
  /**
   * To control whether to trustify stuff in initialProps.html
   *
   * This can be potentially dangerous if you server-render dynamic user data from `getStaticProps` or `getServerSideProps`
   * in HTML. However if you turn it off, every inline style of every 3rd party lib (including even default Next.js 404) will
   * be blocked by CSP with the only alternative being `style-src unsafe-inline`.
   *
   * Can be turned completely on/off with a boolean flag or with a config object for more granular control.
   *
   * @default true
   */
  htmlProcessing?:
    | {
        styles?: { attributesOnly?: boolean };
      }
    | boolean;
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
  trustifyStyles = false,
  trustifyScripts = true,
  hashRawCss = [],
  htmlProcessing = true,
}: CspDocumentInitialPropsOptions) => {
  const initialProps =
    passInitialProps || (await Document.getInitialProps(ctx));
  const isProd = process.env.NODE_ENV === "production";
  const nonce = getCtxHeader(ctx, CSP_NONCE_HEADER);
  if (isProd && trustifyScripts) {
    if (nonce) {
      noncifyScriptChildren(nonce, initialProps.head);
    } else {
      hashifyScriptChildren(initialProps.head);
    }
  }

  if (isProd && trustifyStyles) {
    noncifyStyleChildren(nonce, initialProps.head);
    if (htmlProcessing) {
      const { html, styleElemHashes, styleAttrHashes } = hashStylesInHtml(
        initialProps.html,
        typeof htmlProcessing === "boolean"
          ? false
          : htmlProcessing.styles.attributesOnly
      );
      collectStyleElemHashes(...styleElemHashes);
      collectStyleAttrHashes(...styleAttrHashes);
      initialProps.html = html;
    }
    const customElemHashes = hashRawCss.flatMap((el) => {
      if (typeof el === "string") {
        return [integritySha256(el)];
      }
      const styleOrStyles = el(initialProps);
      return typeof styleOrStyles === "string"
        ? [integritySha256(styleOrStyles)]
        : styleOrStyles.map(integritySha256);
    });
    collectStyleElemHashes(
      ...collectStyleHashesFromChildren(initialProps.head)
    );
    collectStyleElemHashes(...customElemHashes);

    if (nonce) {
      const styleHashes = [...pullStyleElemHashes(), ...pullStyleAttrHashes()];
      let { directives, reportOnly } = getCsp(ctx);
      if (directives) {
        if (directives["style-src"] && styleHashes.length) {
          directives = extendCsp(
            directives,
            {
              "style-src": [...styleHashes, "unsafe-hashes"],
            },
            "append"
          );
        }
        setCsp(ctx, directives, reportOnly);
      }
    }
  }
  return {
    ...initialProps,
    nonce,
    trustifyStyles,
    trustifyScripts,
  };
};

export function gsspWithNonceAppliedToCsp<
  P extends { [key: string]: any } = { [key: string]: any },
  Q extends ParsedUrlQuery = ParsedUrlQuery,
  D extends PreviewData = PreviewData
>(
  getServerSideProps: GetServerSideProps<P, Q, D>
): GetServerSideProps<P & { nonce: string }, Q, D> {
  return async (ctx) => {
    const nonce = applyNonceToCsp(ctx);
    const gsspResult = await getServerSideProps(ctx);
    if ("props" in gsspResult) {
      const props = await gsspResult.props;
      return { props: { ...props, nonce } };
    }
    return gsspResult;
  };
}

export function gipWithNonceAppliedToCsp<
  Props extends Record<string, any> = Record<string, any>
>(
  getInitialProps: (ctx: NextPageContext) => Promise<Props>
): (ctx: NextPageContext) => Promise<Props & { nonce: string }> {
  return async (ctx) => {
    const nonce = applyNonceToCsp(ctx);
    const props = await getInitialProps(ctx);
    return { ...props, nonce };
  };
}
