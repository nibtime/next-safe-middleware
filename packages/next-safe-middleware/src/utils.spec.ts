import {
  fromCspContent,
  toCspContent,
  extendCsp,
  filterCsp,
} from "../src/utils";
import fs from "fs";

const cspContent = fs.readFileSync(
  `${process.cwd()}/__fixtures__/csp.txt`,
  "utf-8"
);
const parsedCsp = fromCspContent(cspContent);

describe("CSP utils", () => {

  it("stringifies and parses a CSP back into the same CSP", () => {
    expect(parsedCsp).toEqual(fromCspContent(toCspContent(parsedCsp)));
  });


  it("extends and filters a CSP back into the same CSP", () => {
    const extendedCSP = extendCsp(parsedCsp, {
      "script-src": "https://example.com",
    });
    const reducedCSP = filterCsp(extendedCSP, {
      "script-src": /example\.com/,
    });
    expect(parsedCsp).toEqual(reducedCSP);
  });


  it("can handle boolean directives", () => {
    const extendedCSP = extendCsp(parsedCsp, {
      sandbox: true,
      "upgrade-insecure-requests": true,
      "block-all-mixed-content": true,
    });
    
    const reducedCSP = extendCsp(extendedCSP, { "block-all-mixed-content": false });

    expect(extendedCSP).toEqual(
      fromCspContent(
        `${toCspContent(parsedCsp)}; sandbox; upgrade-insecure-requests; block-all-mixed-content;`
      )
    );
    expect(reducedCSP["block-all-mixed-content"]).toBeUndefined();
  });
});
