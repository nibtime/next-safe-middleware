/* eslint-disable @next/next/no-document-import-in-page */
import type { DocumentContext, DocumentProps } from 'next/document';
import Document, { NextScript } from 'next/document';
import React from 'react';
import { Head as InliningHead } from './InliningHead';
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

  if (isDynamic) {
    const nonce = (props as any).nonce;
    return {
      Head: ({ children }) => (
        <InliningHead nonce={nonce}>{children}</InliningHead>
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
    Head: ({ children }) => <InliningHead>{children}</InliningHead>,
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
