import tw, { styled } from "twin.macro";

export default styled("article", {
  ...tw`prose prose-blue`,
  variants: {
    color: {
      indigo: tw`prose-indigo`,
    },
    size: { xl: tw`prose-xl`, lg: tw`prose-lg`, sm: tw`prose-sm` },
  },
});
