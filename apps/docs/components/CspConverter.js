import { useState, useMemo } from "react";
import { CspBuilder } from "@komw/next-safe-middleware";
import tw, { styled } from "twin.macro";

const StyledForm = styled("form", tw`my-6`);

export const StyledInput = styled(
  "textarea",
  tw`p-6 block w-full rounded-md sm:text-sm border-opacity-100! border-2 border-sky-300 dark:(border-2 border-sky-700 bg-slate-900) focus:(outline-none ring-2) focus:(ring-sky-500 border-sky-500) focus:dark:(ring-sky-500 border-sky-500)`
);

const defaultCsp = new CspBuilder({
  directives: {
    "default-src": ["self"],
    "object-src": ["none"],
    "base-uri": ["none"],
  },
}).toString();

const CspConverter = () => {
  const [input, setInput] = useState(defaultCsp);
  const output = useMemo(
    () => JSON.stringify(new CspBuilder(input).csp(), undefined, 2),
    [input]
  );
  return (
    <StyledForm>
      <div className="not-prose">
        <StyledInput
          rows={4}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </div>
      <pre>
        <code>{output}</code>
      </pre>
    </StyledForm>
  );
};

export default CspConverter;
