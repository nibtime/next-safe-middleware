import {
  ColorScheme,
  ColorSchemeProvider,
  MantineProvider,
} from "@mantine/core";
import { useHotkeys, useLocalStorage } from "@mantine/hooks";
import Script from "next/script";
import { useMemo } from "react";
// import '../styles/globals.css';
import globalStyles from "../styles/globalStyles";

const customInlineScriptBefore = `console.log('Hi I am inline-script running with strategy beforeInteractive')`;
const customInlineScriptWorker = `console.log('Hi I am inline-script running with strategy webworker and partytown')`;

const customInlineScriptAfter = `console.log('Hi I am an inline-script running with strategy afterInteractive')`;

function MyApp({ Component, pageProps, ssrNonce }) {
  const nonce = typeof window === 'undefined' ? ssrNonce : document.head.nonce

  const [colorScheme, setColorScheme] = useLocalStorage<ColorScheme>({
    key: "mantine-color-scheme",
    defaultValue: "light",
    getInitialValueInEffect: true,
  });

  const toggleColorScheme = (value?: ColorScheme) =>
    setColorScheme(value || (colorScheme === "dark" ? "light" : "dark"));

  useHotkeys([["mod+J", () => toggleColorScheme()]]);
  return (
    <>
      <Script
        id="inline-before-test-script"
        // if you for some reason must use a inline script with beforeInteractive
        // offically unsupported: https://nextjs.org/docs/basic-features/script#inline-scripts
        // this is mostly equivalent to putting it in the Head of _document.
        // However, this way your inline script code gets automatically hashed and picked up for
        // Hash-based CSP routes or gets assigned a nonce for Nonce-based CSP routes
        strategy="beforeInteractive"
      >
        {customInlineScriptBefore}
      </Script>
      <Script
        id="inline-worker-test-script"
        // https://nextjs.org/docs/basic-features/script#off-loading-scripts-to-a-web-worker-experimental
        // if you follow this instructions, the partytown inline scripts will be hashed and nonced
        // and they will load all webworker scripts which then are also trusted.
        strategy="worker"
      >
        {customInlineScriptWorker}
      </Script>
      <Script
        id="sentry-script"
        strategy="beforeInteractive"
        src="https://browser.sentry-cdn.com/6.16.1/bundle.min.js"
        // the script will get assigned a nonce for Nonce-based CSP routes
        // the integrity attribute will be picked up for Hash-based CSP routes
        integrity="sha384-WkFzsrcXKeJ3KlWNXojDiim8rplIj1RPsCbuv7dsLECoXY8C6Cx158CMgl+O+QKW"
        // crossOrigin attribute gets dropped by Next during prerendering which will lead to a CORS error when validating integrity that blocks the script. Add it with data-crossorigin
        data-crossorigin="anonymous"
      />
      <Script
        id="inline-after-test-script"
        // in most cases use your inline scripts with afterInteractive.
        // That way they will be inserted by Next and don't need to be nonced or hashed.
        // Also, the whole DOM will be available at this point, in beforeInteractive it is not.
        strategy="afterInteractive"
      >
        {customInlineScriptAfter}
      </Script>
      <ColorSchemeProvider
        colorScheme={colorScheme}
        toggleColorScheme={toggleColorScheme}
      >
        <MantineProvider
          theme={{ colorScheme }}
          emotionOptions={{
            key: "mantine",
            nonce,
          }}
        >
          <Component {...pageProps} />
        </MantineProvider>
      </ColorSchemeProvider>
    </>
  );
}

export default MyApp;
