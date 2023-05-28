import {
  getCspInitialProps,
  provideComponents,
} from "@komw/next-safe-middleware/dist/document";
import Document, { Html, Main } from "next/document";
import React from "react";
import { lazyGetCssText } from "stitches.config";

// import Script from "next/script";

const googleSearchSiteId = process.env.GOOGLE_SEARCH_SITE_ID;

export default class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await getCspInitialProps({
      ctx,
      trustifyStyles: true,
    });
    return initialProps;
  }
  render() {
    const { Head, NextScript } = provideComponents(this.props);
    return (
      <Html>
        <Head>
          {googleSearchSiteId && (
            <meta
              name="google-site-verification"
              content={googleSearchSiteId}
            />
          )}
          <style
            id="stitches"
            dangerouslySetInnerHTML={{
              __html: lazyGetCssText(this.props.__NEXT_DATA__.page),
            }}
          />
          <script>{`console.log('Hello from _document/Head, I get nonced/hashed there')`}</script>
        </Head>
        <body>
          <Main />
          <NextScript />
          {/* do this with <Script strategy="afterInteractive"> from next/script in _app.js*/}
          {/* <script
            dangerouslySetInnerHTML={{
              __html: `console.log('I will always be blocked by a strict CSP')`,
            }}
          /> */}
          {/* this will work with strict CSP*/}
          {/* <Script
            id="sentry-script"
            strategy="beforeInteractive"
            src="https://browser.sentry-cdn.com/6.16.1/bundle.min.js"
            // the script will get assigned a nonce for Nonce-based CSP routes
            // the integrity attribute will be picked up for Hash-based CSP routes
            // set crossOrigin: "anonymous" in next.config.js so SRI check works
            integrity="sha384-WkFzsrcXKeJ3KlWNXojDiim8rplIj1RPsCbuv7dsLECoXY8C6Cx158CMgl+O+QKW"
          /> */}
        </body>
      </Html>
    );
  }
}
