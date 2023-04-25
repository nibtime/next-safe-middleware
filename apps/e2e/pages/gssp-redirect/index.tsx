import Prose from 'components/Prose';
import Layout from 'components/Layout';
import Hydrated from 'components/Hydrated';
import StyleElem from 'components/StyleElem';
import StyleAttr from 'components/StyleAttr';
import { gsspWithNonce } from '@next-safe/middleware/dist/document';
import TestNavigation from '../../components/TestNavigation';

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
