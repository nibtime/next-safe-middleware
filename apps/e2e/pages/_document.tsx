import {
  getCspInitialProps,
  provideComponents,
} from "@next-safe/middleware/dist/document";
import Document, { Html, Main } from "next/document";
import React from "react";
import { createStylesServer, ServerStyles } from "@mantine/next";
import { lazyGetCssText } from "stitches.config";

const InterVar = `@font-face {
  font-family: 'Inter var';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url('/fonts/Inter-roman.var.3.18.woff2') format('woff2');
  font-named-instance: 'Regular';
}
@font-face {
  font-family: 'Inter var';
  font-style: italic;
  font-weight: 100 900;
  font-display: swap;
  src: url('/fonts/Inter-italic.var.3.18.woff2') format('woff2');
  font-named-instance: 'Italic';
}`;

// Output of Next.js font optimization for Rubik from Google Fonts
// the generated inline style isn't captured by this lib.
// Can be copied from output and added to CSP manually
// by passing it to `hashRawCss` of `getCspInitialProps`
// URLs seem to be stable: https://stackoverflow.com/questions/47638772/do-google-gstatic-font-urls-change 
const InlinedGoogleFontRubik = `@font-face{font-family:'Rubik';font-style:italic;font-weight:300;font-display:swap;src:url(https://fonts.gstatic.com/s/rubik/v20/iJWbBXyIfDnIV7nEt3KSJbVDV49rz8sDE0Uz.woff) format('woff')}@font-face{font-family:'Rubik';font-style:italic;font-weight:400;font-display:swap;src:url(https://fonts.gstatic.com/s/rubik/v20/iJWbBXyIfDnIV7nEt3KSJbVDV49rz8tdE0Uz.woff) format('woff')}@font-face{font-family:'Rubik';font-style:italic;font-weight:500;font-display:swap;src:url(https://fonts.gstatic.com/s/rubik/v20/iJWbBXyIfDnIV7nEt3KSJbVDV49rz8tvE0Uz.woff) format('woff')}@font-face{font-family:'Rubik';font-style:italic;font-weight:600;font-display:swap;src:url(https://fonts.gstatic.com/s/rubik/v20/iJWbBXyIfDnIV7nEt3KSJbVDV49rz8uDFEUz.woff) format('woff')}@font-face{font-family:'Rubik';font-style:italic;font-weight:700;font-display:swap;src:url(https://fonts.gstatic.com/s/rubik/v20/iJWbBXyIfDnIV7nEt3KSJbVDV49rz8u6FEUz.woff) format('woff')}@font-face{font-family:'Rubik';font-style:italic;font-weight:800;font-display:swap;src:url(https://fonts.gstatic.com/s/rubik/v20/iJWbBXyIfDnIV7nEt3KSJbVDV49rz8vdFEUz.woff) format('woff')}@font-face{font-family:'Rubik';font-style:normal;font-weight:300;font-display:swap;src:url(https://fonts.gstatic.com/s/rubik/v20/iJWZBXyIfDnIV5PNhY1KTN7Z-Yh-WYi1Uw.woff) format('woff')}@font-face{font-family:'Rubik';font-style:normal;font-weight:400;font-display:swap;src:url(https://fonts.gstatic.com/s/rubik/v20/iJWZBXyIfDnIV5PNhY1KTN7Z-Yh-B4i1Uw.woff) format('woff')}@font-face{font-family:'Rubik';font-style:normal;font-weight:500;font-display:swap;src:url(https://fonts.gstatic.com/s/rubik/v20/iJWZBXyIfDnIV5PNhY1KTN7Z-Yh-NYi1Uw.woff) format('woff')}@font-face{font-family:'Rubik';font-style:normal;font-weight:600;font-display:swap;src:url(https://fonts.gstatic.com/s/rubik/v20/iJWZBXyIfDnIV5PNhY1KTN7Z-Yh-2Y-1Uw.woff) format('woff')}@font-face{font-family:'Rubik';font-style:normal;font-weight:700;font-display:swap;src:url(https://fonts.gstatic.com/s/rubik/v20/iJWZBXyIfDnIV5PNhY1KTN7Z-Yh-4I-1Uw.woff) format('woff')}@font-face{font-family:'Rubik';font-style:normal;font-weight:800;font-display:swap;src:url(https://fonts.gstatic.com/s/rubik/v20/iJWZBXyIfDnIV5PNhY1KTN7Z-Yh-h4-1Uw.woff) format('woff')}@font-face{font-family:'Rubik';font-style:italic;font-weight:300 800;font-display:swap;src:url(https://fonts.gstatic.com/s/rubik/v20/iJWEBXyIfDnIV7nEnXO61E_c5IhGzg.woff2) format('woff2');unicode-range:U+0460-052F,U+1C80-1C88,U+20B4,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F}@font-face{font-family:'Rubik';font-style:italic;font-weight:300 800;font-display:swap;src:url(https://fonts.gstatic.com/s/rubik/v20/iJWEBXyIfDnIV7nEnXq61E_c5IhGzg.woff2) format('woff2');unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}@font-face{font-family:'Rubik';font-style:italic;font-weight:300 800;font-display:swap;src:url(https://fonts.gstatic.com/s/rubik/v20/iJWEBXyIfDnIV7nEnXy61E_c5IhGzg.woff2) format('woff2');unicode-range:U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F}@font-face{font-family:'Rubik';font-style:italic;font-weight:300 800;font-display:swap;src:url(https://fonts.gstatic.com/s/rubik/v20/iJWEBXyIfDnIV7nEnXC61E_c5IhGzg.woff2) format('woff2');unicode-range:U+0100-024F,U+0259,U+1E00-1EFF,U+2020,U+20A0-20AB,U+20AD-20CF,U+2113,U+2C60-2C7F,U+A720-A7FF}@font-face{font-family:'Rubik';font-style:italic;font-weight:300 800;font-display:swap;src:url(https://fonts.gstatic.com/s/rubik/v20/iJWEBXyIfDnIV7nEnX661E_c5Ig.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}@font-face{font-family:'Rubik';font-style:normal;font-weight:300 800;font-display:swap;src:url(https://fonts.gstatic.com/s/rubik/v20/iJWKBXyIfDnIV7nMrXyw023e1Ik.woff2) format('woff2');unicode-range:U+0460-052F,U+1C80-1C88,U+20B4,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F}@font-face{font-family:'Rubik';font-style:normal;font-weight:300 800;font-display:swap;src:url(https://fonts.gstatic.com/s/rubik/v20/iJWKBXyIfDnIV7nFrXyw023e1Ik.woff2) format('woff2');unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}@font-face{font-family:'Rubik';font-style:normal;font-weight:300 800;font-display:swap;src:url(https://fonts.gstatic.com/s/rubik/v20/iJWKBXyIfDnIV7nDrXyw023e1Ik.woff2) format('woff2');unicode-range:U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F}@font-face{font-family:'Rubik';font-style:normal;font-weight:300 800;font-display:swap;src:url(https://fonts.gstatic.com/s/rubik/v20/iJWKBXyIfDnIV7nPrXyw023e1Ik.woff2) format('woff2');unicode-range:U+0100-024F,U+0259,U+1E00-1EFF,U+2020,U+20A0-20AB,U+20AD-20CF,U+2113,U+2C60-2C7F,U+A720-A7FF}@font-face{font-family:'Rubik';font-style:normal;font-weight:300 800;font-display:swap;src:url(https://fonts.gstatic.com/s/rubik/v20/iJWKBXyIfDnIV7nBrXyw023e.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}`;

const stylesServer = createStylesServer();

export default class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await getCspInitialProps({
      ctx,
      trustifyStyles: true,
      enhanceAppWithNonce: true,
      hashRawCss: [
        InlinedGoogleFontRubik,
        (initialProps) => [
          stylesServer.extractCritical(initialProps.html).css,
          ...stylesServer
            .extractCriticalToChunks(initialProps.html)
            .styles.map((s) => s.css),
        ],
      ],
    });
    initialProps.styles = (
      <>
        {initialProps.styles}
        {/* Mantine CSS-in-JS SSR (Emotion) */}
        <ServerStyles html={initialProps.html} server={stylesServer} />
      </>
    );
    return initialProps;
  }
  render() {
    // those components get automagically wired with strictDynamic/strictInlineStyles middleware
    const { Head, NextScript } = provideComponents(this.props);
    return (
      <Html>
        <Head>
          <script>{`console.log('Hello from _document/Head, I get nonced/hashed there')`}</script>
          <style dangerouslySetInnerHTML={{ __html: InterVar }} />
          {/* Stitches CSS-in-JS SSR */}
          <style
            id="stitches"
            dangerouslySetInnerHTML={{
              __html: lazyGetCssText(this.props.__NEXT_DATA__.page),
            }}
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Rubik:ital,wght@0,300..800;1,300..800&display=swap"
            rel="stylesheet"
          />
        </Head>
        <body>
          <Main />
          <NextScript />
          {/* do this with <Script strategy="afterInteractive"> from next/script in _app.js*/}
          <script
            dangerouslySetInnerHTML={{
              __html: `console.log('I will always be blocked by a strict CSP')`,
            }}
          />
        </body>
      </Html>
    );
  }
}
