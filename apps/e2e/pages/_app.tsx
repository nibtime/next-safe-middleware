import {
  ColorScheme,
  ColorSchemeProvider,
  MantineProvider,
} from "@mantine/core";
import { useHotkeys, useLocalStorage } from "@mantine/hooks";
import Script from "next/script";
// import '../styles/globals.css';
import globalStyles from "../styles/globalStyles";

const customInlineScriptWorker = `console.log('Hi I am inline-script running with strategy webworker and partytown')`;

const customInlineScriptAfter = `console.log('Hi I am an inline-script running with strategy afterInteractive')`;

function MyApp({ Component, pageProps }) {
  const [colorScheme, setColorScheme] = useLocalStorage<ColorScheme>({
    key: "mantine-color-scheme",
    defaultValue: "light",
    getInitialValueInEffect: true,
  });

  console.log("Nonce from _document", { nonce: pageProps.nonce });
  
  const toggleColorScheme = (value?: ColorScheme) =>
    setColorScheme(value || (colorScheme === "dark" ? "light" : "dark"));

  useHotkeys([["mod+J", () => toggleColorScheme()]]);
  globalStyles()
  return (
    <>
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
        id="inline-after-test-script"
        // in most cases use your inline scripts with afterInteractive.
        // That way they will be inserted by Next and don't need to be nonced or hashed.
        // Also, the whole DOM will be available at this point.
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
          emotionOptions={{ key: "mantine", nonce: pageProps.nonce }}
        >
          <Component {...pageProps} />
        </MantineProvider>
      </ColorSchemeProvider>
    </>
  );
}

export default MyApp;
