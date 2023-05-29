import Image from "next/image";
import "twin.macro";

export const packageName = '@komw/next-safe-middleware'

// theme.config.js
export default {
  github: "https://github.com/komw/next-safe-middleware", // GitHub link in the navbar
  floatTOC: true,
  docsRepositoryBase:
    "https://github.com/komw/next-safe-middleware/blob/main/apps/docs/pages", // base URL for the docs repository
  titleSuffix: ` – ${packageName}`,
  nextLinks: true,
  prevLinks: true,
  darkMode: true,
  footer: true,
  search: false,
  footerText: `MIT ${new Date().getFullYear()} © nibtime.`,
  footerEditLink: `Edit this page on GitHub`,
  unstable_faviconGlyph: "🔒",
  logo: (
    <div tw="flex space-x-2">
      <Image
        tw="flex-none"
        width={32}
        height={32}
        src="https://user-images.githubusercontent.com/52962482/177227813-b15198ca-2c36-4ba3-afec-efeb581a19a1.png"
      />
      <strong tw="text-lg align-self[center]">
        <code>@komw/next-safe-middleware/docs</code>
      </strong>
    </div>
  ),
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta httpEquiv="Content-Language" content="en" />
      <meta
        name="description"
        content="@komw/next-safe-middleware: Strict Content-Security-Policy (CSP) for Next.js"
      />
      <meta
        name="og:title"
        content="@komw/next-safe-middleware: Strict Content-Security-Policy (CSP) for Next.js"
      />
      <meta
        name="og:description"
        content="@komw/next-safe-middleware: Strict Content-Security-Policy (CSP) for Next.js"
      />
    </>
  ),
};
