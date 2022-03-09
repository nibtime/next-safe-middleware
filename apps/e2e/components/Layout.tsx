import "twin.macro";
import Container from "components/Container";
export default ({ children }) => {
  return (
    <>
      <Container isInner tw="pb-0">
        <a href="/" tw="font-bold text-blue-700 text-2xl">
          Home
        </a>
      </Container>
      <Container isCentered>{children}</Container>
    </>
  );
};
