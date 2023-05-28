import Layout from 'components/Layout';
import { gsspWithNonce } from '@komw/next-safe-middleware/dist/document';

export const getServerSideProps = gsspWithNonce(async (ctx) => {
  return {
    notFound: true,
  };
});

const Page = () => {
  return (
    <Layout>
      Page should show 404 error
    </Layout>
  );
};

export default Page;
