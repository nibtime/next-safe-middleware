import type { DocumentProps } from "next/document";
import { Head, NextScript } from "next/document";
import React from "react";
import type { TrustifyComponents, ExcludeList } from "./types";
import { HashHead, HashNextScript } from "./hash";
import { NonceHead, NonceNextScript } from "./nonce";
import { setExcludeList, setIsHashProxy } from "./cfg";

export * from "./hash";
export * from "./nonce";

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
export const provideComponents = (props: DocumentProps): TrustifyComponents => {
  const isProd = process.env.NODE_ENV === "production";
  const anyProps = props as any;
  const isDynamic =
    props.__NEXT_DATA__.gssp ||
    props.__NEXT_DATA__.gip ||
    props.__NEXT_DATA__.appGip;
  const isStatic = !isDynamic;
  const nonce = anyProps.nonce;
  if (isProd && isDynamic && nonce) {
    return {
      Head: ({ children }) => <NonceHead nonce={nonce}>{children}</NonceHead>,
      NextScript: () => <NonceNextScript nonce={nonce} />,
    };
  }

  if (isProd && isStatic) {
    return {
      Head: ({ children }) => <HashHead>{children}</HashHead>,
      NextScript: () => <HashNextScript />,
    };
  }
  return {
    Head: ({ children }) => <Head>{children}</Head>,
    NextScript: () => <NextScript />,
  };
};
