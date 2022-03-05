import Document, {
  provideComponents,
} from "@next-safe/middleware/dist/document";
import { Html, Main } from "next/document";
import React from "react";
import { getCssText } from "stitches.config";

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

export default class MyDocument extends Document {
  static async getInitialProps(ctx) {
    try {
      const initialProps = await Document.getInitialProps(ctx);
      return {
        ...initialProps,
        styles: (
          <>
            {initialProps.styles}
            {/* Stitches CSS for SSR */}
            <style
              id="stitches"
              dangerouslySetInnerHTML={{ __html: getCssText() }}
            />
          </>
        ),
      };
    } finally {
    }
  }
  render() {
    // those components are automagically wired with provideHashesOrNonce
    const { Head, NextScript } = provideComponents(this.props);
    return (
      <Html>
        <Head>
          <script>{`console.log('Hello from _document/Head, I get nonced/hashed there')`}</script>
          <style dangerouslySetInnerHTML={{ __html: InterVar }} />
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
