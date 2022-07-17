import MantinePage from "./index";

export const getStaticProps = () => {
  return { props: { message: "Hi, from getStaticProps" } };
};

export default MantinePage;
