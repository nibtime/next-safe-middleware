import Prose from 'components/Prose';
import Container from 'components/Container';
import Hydrated from 'components/Hydrated';
import InternalTestLinks from '../components/InternalTestLinks';

// pages without a data fetching function are static pages and must use a Hash-based CSP.
const Page = () => {
  return (
    <Container isCentered>
      <Prose>
        <h1>@komw/next-safe-middleware e2e app</h1>
        <Hydrated />
        <p>
          A Next.js app to test the strict CSP capabilities of the{" "}
          <a href="https://www.npmjs.com/package/@komw/next-safe-middleware">
            @komw/next-safe-middleware
          </a>{" "}
          package.
        </p>
        <h2>Prerendering strategies:</h2>
        <p>This page has no data fetching method</p>
        <InternalTestLinks />
        <h2>With Mantine:</h2>
        <ul>
          <li>
            <a href="/mantine">No data fetching method</a> (Hash-based)
          </li>
          <li>
            <a href="/mantine/gsp">
              With <code>getStaticProps</code>
            </a>{" "}
            (Hash-based)
          </li>
          <li>
            <a href="/mantine/gssp">
              With <code>getServerSideProps</code>
            </a>{" "}
            (Nonce-based)
          </li>
        </ul>
      </Prose>
    </Container>
  );
};

export default Page;
