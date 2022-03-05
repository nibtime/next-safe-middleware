/* eslint-disable @next/next/no-document-import-in-page */
import type { DocumentContext, DocumentProps } from 'next/document';
import Document, { Head, NextScript } from 'next/document';
import React from 'react';
import { Head as NoncingHead } from './NoncingHead';
import { Head as HashingHead } from './HashingHead';
import { CSP_NONCE_HEADER } from '../constants';

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

  if ((isStatic || isPure) && process.env.NODE_ENV === 'production') {
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

export default class NextSafeDocument extends Document<{ nonce?: string }> {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    // weirdness: when running on Vercel, the response header set by middleware
    // will be found in req, when serving a prod build with next start, it will be in res
    const cspNonceHeader =
      ctx.res?.getHeader(CSP_NONCE_HEADER) ||
      ctx.req?.headers?.[CSP_NONCE_HEADER];
    const nonce = cspNonceHeader?.toString();
    return { ...initialProps, nonce };
  }
}
