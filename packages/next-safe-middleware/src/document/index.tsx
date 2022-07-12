/* eslint-disable @next/next/no-document-import-in-page */
import type {
  DocumentContext,
  DocumentInitialProps,
  DocumentProps,
} from "next/document";
import Document, { Head, NextScript } from "next/document";
import React from "react";
import cheerio from "cheerio";
import { extendCsp } from "../utils";
import {
  setCsp,
  integritySha256,
  getCsp,
  cspNonce,
  applyNonceToCsp,
} from "./utils";
import { Head as NoncingHead, noncifyChildren } from "./NoncingHead";
import {
  Head as HashingHead,
  collectStyleElemHashes,
  collectStyleAttrHashes,
  trustifyScriptChildren,
  collectStyleHashesFromChildren,
  pullStyleElemHashes,
  pullStyleAttrHashes,
} from "./HashingHead";

export type {
  CspDirectives,
  CspDirectivesLenient,
  CspFilter,
  Source as CspSource,
  Sources as CspSources,
} from "../types";
export { getCsp, setCsp, cspNonce } from "./utils";
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
};
type Provided = {
  Head: React.FC<ProvidedProps>;
  NextScript: React.FC<ProvidedProps>;
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
 *       enhanceAppWithNonce: true
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
  const isStatic = NEXT_DATA.gsp;

  const isPure = !isDynamic && !isStatic;
  const isProd = process.env.NODE_ENV === "production";
  const nonce = (props as any).nonce;
  const trustifyStyles = (props as any).trustifyStyles;
  const trustifyScripts = (props as any).trustifyScripts;
  if (isProd && isDynamic && nonce) {
    return {
      Head: ({ children }) => (
        <NoncingHead
          nonce={nonce}
          {...{
            trustifyStyles,
            trustifyScripts,
          }}
        >
          {children}
        </NoncingHead>
      ),
      NextScript: () => <NextScript nonce={nonce} />,
    };
  }

  if (isProd && (isStatic || isPure)) {
    return {
      Head: ({ children }) => (
        <HashingHead
          {...{
            trustifyStyles,
            trustifyScripts,
          }}
        >
          {children}
        </HashingHead>
      ),
      NextScript: () => <NextScript />,
    };
  }
  return {
    Head: ({ children }) => <Head>{children}</Head>,
    NextScript: () => <NextScript />,
  };
};

const trustifyStylesInHtml = (html: string, nonce?: string) => {
  const $ = cheerio.load(html, {}, false);
  const styleElements = $("style").get();

  if (nonce) {
    styleElements.forEach((s) => {
      s.attribs["nonce"] = nonce;
    });
  }

  const styleElemHashes = styleElements
    .map((el) => $.text(el.children))
    .filter(Boolean)
    .map(integritySha256);

  const styleAttrHashes = $("[style]")
    .get()
    .map((e) => integritySha256(e.attribs["style"]));
  return {
    html: $.html(),
    styleElemHashes,
    styleAttrHashes,
  };
};

/**
 *
 * @param ctx the DocumentContext, as expected by Document.getInitialProps
 *
 * If you need to access the nonce in `pages/_app.js` for a React Provider,
 * call this just before you call `getCspInitialProps`
 *
 */
export const enhanceAppWithNonce = (ctx: DocumentContext) => {
  const nonce = cspNonce(ctx);
  if (nonce) {
    const originalRenderPage = ctx.renderPage;
    ctx.renderPage = () =>
      originalRenderPage({
        enhanceApp:
          (App) =>
          ({ pageProps, ...props }) => {
            return <App pageProps={{ ...pageProps, nonce }} {...props} />;
          },
      });
  }
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
}: CspDocumentInitialPropsOptions) => {
  const nonce = applyNonceToCsp(ctx);
  const initialProps =
    passInitialProps || (await Document.getInitialProps(ctx));

  if (trustifyScripts) {
    trustifyScriptChildren(initialProps.head);
  }

  if (nonce) {
    noncifyChildren(nonce, initialProps.head, {
      trustifyStyles,
      trustifyScripts,
    });
  }

  if (trustifyStyles) {
    const { html, styleElemHashes, styleAttrHashes } = trustifyStylesInHtml(
      initialProps.html,
      nonce
    );

    initialProps.html = html;
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
    collectStyleElemHashes(...styleElemHashes);
    collectStyleAttrHashes(...styleAttrHashes);
    if (nonce) {
      const styleHashes = [
        ...pullStyleElemHashes(),
        ...pullStyleAttrHashes(),
      ];
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
  return { ...initialProps, nonce, trustifyStyles, trustifyScripts };
};

/**
 * @deprecated use the configurable `getCspInitialProps`
 *
 * uses `getCspInitialProps` under the hood with `trustifyStyles` set to `true`,
 * as this was the old behavior
 */
export default class NextSafeDocument extends Document<{ nonce?: string }> {
  static async getInitialProps(ctx: DocumentContext) {
    return getCspInitialProps({ ctx, trustifyStyles: true });
  }
}
