import Link from "next/link";
import Prose from "components/Prose";
import Layout from "components/Layout";
import Hydrated from "components/Hydrated";
import StyleElem from "components/StyleElem";
import StyleAttr from "components/StyleAttr";

// required for Hash-based CSP to work with ISR on Vercel
export const config = {
  unstable_includeFiles: [".next/static/chunks/**/*.js"],
};

export const getStaticPaths = async () => {
  // as long as we build-time prerender at least one path, it will work with Hash-based strict CSP.
  const path = "gsp";
  return {
    paths: [{ params: { slug: path } }],
    fallback: "blocking",
  };
};
export const getStaticProps = async () => {
  const random = Math.random() * 100;
  const revalidate = 10;
  return { props: { random, revalidate }, revalidate };
};

const Page = ({ random, revalidate }) => {
  return (
    <Layout>
      <Prose>
        <h1>A Page with getStaticProps + revalidate (ISR)</h1>
        <Hydrated />
        <p>
          It get's prerendered at ... it's too complicated, see at{" "}
          <a href="https://vercel.com/docs/concepts/next.js/incremental-static-regeneration">
            the concept guide of Vercel
          </a>
        </p>
        <p>
          Random number from <code>getStaticProps</code>: {random}. Will change
          every
          <code>revalidate</code> interval of {revalidate} seconds on the first
          visitor and then be the same static page for subsequent visitors
          within {revalidate} seconds.
        </p>
        <p>
          Will it work with Hash-based strict-dynamic? Yes! As long as least 1
          page get's prerendered at build time.
        </p>
        <p>
          E.g. if you had 1 million product pages in an e-commerce app, as long
          as you prerender at least 1 product page at build-time by returning a
          page path from id in <code>getStaticPaths</code> and set{" "}
          <code>{`{ fallback: true | "blocking" }`}</code>. Then you can
          prerender the remaining 999999 products lazy on demand.
        </p>
        <p>
          Even though its seems dynamic, it doesn't prerender per request. It is
          "static for a while" for everybody, so it cannot use a Nonce-based
          CSP. Must use Hash-based CSP like a regular static page.
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
        <h2>Internal navigation to other pages:</h2>
        <ul>
          <li>
            <Link href="/gsp">Page with getStaticProps</Link>
          </li>
          <li>
            <Link href="/gssp">Page with getServerSideProps</Link>
          </li>
        </ul>
      </Prose>
    </Layout>
  );
};

export default Page;
