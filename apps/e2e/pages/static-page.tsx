import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useState } from "react";
import fetch from "ky-universal";
import Prose from "components/Prose";
import Layout from "components/Layout";
import Hydrated from "components/Hydrated";
import Button from "components/Button";
import StyleElem from "components/StyleElem";
import StyleAttr from "components/StyleAttr";

// required for Hash-based CSP to work with ISR on Vercel
export const config = {
  unstable_includeFiles: [".next/static/chunks/**/*.js"],
};

export const getStaticProps = async () => {
  const random = Math.random() * 100;
  return { props: { random } };
};

const RevalidateButton = () => {
  const { pathname } = useRouter();
  const [revalidated, setRevalidated] = useState(false);
  const onClick = useCallback(async () => {
    if (!revalidated) {
      const res = await fetch(`/api/revalidate`, {
        searchParams: {
          pathname,
          secret: "this should be a real secret",
        },
        method: "get",
      });
      if (res.ok) {
        const { revalidated } = await res.json();
        setRevalidated(revalidated || false);
      } else {
        setRevalidated(false);
      }
    } else {
      window.location.reload();
    }
  }, [pathname, revalidated]);

  return (
    <Button type="button" variant="primary" onClick={onClick}>
      {!revalidated
        ? "Change it / revalidate!"
        : "Revalidated! Click to Reload the page"}
    </Button>
  );
};
const Page = ({ random }) => {
  return (
    <Layout>
      <Prose>
        <h1>A Page with getStaticProps</h1>
        <Hydrated />
        <p>
          A random number generated at build-time that doesn't change: {random}.
          Don't like that number? Then try the new Next 12.1 on-demand ISR
          feature:
        </p>
        <p>
          <RevalidateButton />
        </p>
        <p>
          It get's prerendered at build-time and has no access to request and
          response data. Can't use a Nonce-based CSP here, because it doesn't
          rerender per request. Must use a Hash-based CSP.
        </p>
        <h2>Inline Styles</h2>
        <StyleElem Tag="p">
          Hi, i am styled with by an inline style tag. If I am <b>teal</b>, I am
          trusted by CSP
        </StyleElem>
        <StyleAttr Tag="p">
          Hi, i am styled with by an inline style attribute, If I am{" "}
          <b>fuchsia</b>, I am trusted by CSP
        </StyleAttr>

        <h2>Internal navigation to other pages</h2>
        <ul>
          <li>
            <Link href="/isr/lazy-slug">
              <a>
                Page with getStaticProps + <code>revalidate</code> (ISR)
              </a>
            </Link>
          </li>
          <li>
            <Link href="/dynamic-page">Page with getServerSideProps</Link>
          </li>
        </ul>
      </Prose>
    </Layout>
  );
};

export default Page;
