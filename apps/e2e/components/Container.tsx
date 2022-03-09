import tw, { styled } from "twin.macro";

export default styled("div", {
  ...tw`mx-auto p-12`,
  variants: {
    isInner: { true: tw`max-w-5xl`, false: tw`max-w-7xl` },
    isCentered: { true: tw`flex justify-center` },
  },
});
