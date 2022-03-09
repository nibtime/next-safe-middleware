import Prose from "components/Prose";
import Container from "components/Container";
import Hydrated from "components/Hydrated";
import Link from "next/link";

// pages without a data fetching function are static pages and must use a Hash-based CSP.
const Page = () => {
  return (
    <Container isCentered>
      <Prose>
        <h1>@next-safe/middleware e2e test app</h1>
        <Hydrated />
        <p>
          An app to e2e test the strict CSP capabilities of the
          <a href="https://www.npmjs.com/package/@next-safe/middleware">
            @next-safe/middleware
          </a>{" "}
          package.
        </p>
        <h2>Prerendering strategies:</h2>
        <ul>
          <li>
            <a href="/static-page">Page with getStaticProps</a> (Hash-based)
          </li>
          <li>
            <a href="/dynamic-page">Page with getServerSideProps</a>{" "}
            (Nonce-based)
          </li>
          <li>
            <a href="/isr/lazy-slug">
              Page with getStaticProps + <code>revalidate</code> (ISR)
            </a>{" "}
            (Hash-based)
          </li>
        </ul>
      </Prose>
    </Container>
  );
};

export default Page;
