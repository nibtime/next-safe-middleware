import Link from "next/link";
import Prose from "components/Prose";
import Layout from "components/Layout";
import Hydrated from "components/Hydrated";
import StyleElem from "components/StyleElem";
import StyleAttr from "components/StyleAttr";
import { gsspWithNonce } from "@next-safe/middleware/dist/document";

export const getServerSideProps = gsspWithNonce(async (ctx) => {
  return {
    props: {},
  };
});

const Page = () => {
  return (
    <Layout>
      <Prose>
        <h1>A Page with getServerSideProps</h1>
        <Hydrated />
        <p>
          It get's prerendered per request and has access to request and
          response data
        </p>
        <p>
          That's why it can use Nonce-based CSP, it has the chance to set a
          fresh nonce as attribute to scripts on each request.
        </p>
        <h2>Inline Styles</h2>
        <StyleElem Tag="p">
          Hi, i am styled with by an inline style tag. If I am <b>teal</b>, I am
          trusted by CSP
        </StyleElem>
        <StyleAttr Tag="p" color="blue">
          Hi, i am styled with by an inline style attribute, If I am <b>blue</b>
          , I am trusted by CSP
        </StyleAttr>
        <h2>Internal navigation to other pages</h2>
        <ul>
          <li>
            <Link href="/gsp">Page with getStaticProps</Link>
          </li>
          <li>
            <Link href="/isr/gsp">
              <a>
                Page with getStaticProps + <code>revalidate</code> (ISR)
              </a>
            </Link>
          </li>
        </ul>
      </Prose>
    </Layout>
  );
};

export default Page;
