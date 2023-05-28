import Layout from 'components/Layout';
import { gsspWithNonce } from '@komw/next-safe-middleware/dist/document';

export const getServerSideProps = gsspWithNonce(async (ctx) => {
  return {
    redirect: {
      destination: '/gssp-redirect/redirected',
      permanent: false,
    },
  };
});

const Page = () => {
  return (
    <Layout>
      Page should redirect to /gssp-redirected
    </Layout>
  );
};

export default Page;
