/* eslint-disable @next/next/no-document-import-in-page */
import type { DocumentContext, DocumentProps } from "next/document";
import Document, { Head, NextScript } from "next/document";
import React from "react";
import cheerio from "cheerio";
import { CSP_NONCE_HEADER } from "../constants";
import { extendCsp, fromCspContent, toCspContent } from "../utils";
import {
  getCspHeader,
  getCtxHeader,
  integritySha256,
  setCspHeader,
} from "./utils";
import { Head as NoncingHead } from "./NoncingHead";
import {
  Head as HashingHead,
  collectStyleElemHashes,
  collectStyleAttrHashes,
  pullStyleAttrHashes,
  pullStyleElemHashes,
} from "./HashingHead";

type Provided = {
  Head: React.FC;
  NextScript: React.FC;
};

export const provideComponents = (props: DocumentProps): Provided => {
  const NEXT_DATA = props.__NEXT_DATA__;
  // gip = getInitialProps, gssp = getServerSideProps
  const isDynamic = NEXT_DATA.gip || NEXT_DATA.gssp;
  // gsp = getStaticProps
  const isStatic = NEXT_DATA.gsp;

  const isPure = !isDynamic && !isStatic;
  const nonce = (props as any).nonce;
  if (isDynamic && !!nonce) {
    return {
      Head: ({ children }) => (
        <NoncingHead nonce={nonce}>{children}</NoncingHead>
      ),
      NextScript: () => <NextScript nonce={nonce} />,
    };
  }

  if ((isStatic || isPure) && process.env.NODE_ENV === "production") {
    return {
      Head: ({ children }) => <HashingHead>{children}</HashingHead>,
      NextScript: () => <NextScript />,
    };
  }
  return {
    Head: ({ children }) => <Head>{children}</Head>,
    NextScript: () => <NextScript />,
  };
};

const trustifyHtml = (html: string, nonce?: string) => {
  const $ = cheerio.load(html);
  const scripts = $("script").get();
  const styleElements = $("style").get();

  if (nonce) {
    scripts.forEach((s) => {
      s.attribs["nonce"] = nonce;
    });
    styleElements.forEach((s) => {
      s.attribs["nonce"] = nonce;
    });
  }

  const styleElemHashes = styleElements
    .map((el) => $.text(el.children))
    .filter(Boolean)
    .map(integritySha256);

  const getStyleAttr = (e) => e?.attribs["style"] || false;

  const styleAttrHashes = $("*")
    .get()
    .filter(getStyleAttr)
    .map((e) => integritySha256(getStyleAttr(e)));

  collectStyleElemHashes(...styleElemHashes);
  collectStyleAttrHashes(...styleAttrHashes);
  return $.html();
};

export default class NextSafeDocument extends Document<{ nonce?: string }> {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    const nonce = getCtxHeader(ctx, CSP_NONCE_HEADER);
    initialProps.html = trustifyHtml(initialProps.html, nonce);
    const htmlStyleHashes = [
      ...pullStyleElemHashes(),
      ...pullStyleAttrHashes(),
    ];
    if (nonce) {
      const cspContent = getCspHeader(ctx);
      if (cspContent) {
        let csp = fromCspContent(cspContent);
        if (htmlStyleHashes.length) {
          csp = extendCsp(csp, {
            "style-src": [
              ...htmlStyleHashes.map((hash) => `'${hash}'`),
              `'unsafe-hashes'`,
            ],
          });
        }
        csp = extendCsp(csp, {
          "style-src": `'nonce-${nonce}'`,
        });
        setCspHeader(toCspContent(csp), ctx);
      }
      return { ...initialProps, nonce };
    }
    return initialProps;
  }
}
