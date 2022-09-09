import fs from "fs";
import type { HashWithAlgorithm, NonceWithPrefix } from "./types";
import { CSP_HEADER_REPORT_ONLY } from "./constants";
import { CspBuilder } from "./builder";

const fixtureCsp = fs.readFileSync(
  `${process.cwd()}/__fixtures__/csp.txt`,
  "utf-8"
);

describe("CSP Builder", () => {
  it("stringifies and parses a CSP back into the same CSP", () => {
    const fixtureBuilder = new CspBuilder(fixtureCsp);
    const expectBuilder = new CspBuilder(fixtureBuilder.toString());
    expect(expectBuilder.csp()).toEqual(fixtureBuilder.csp());
  });

  it("extends and filters a CSP back into the same CSP", () => {
    const fixtureBuilder = new CspBuilder(fixtureCsp);
    const expectBuilder = new CspBuilder(fixtureBuilder);
    expectBuilder
      .withDirectives({
        "script-src": "https://example.com",
      })
      .withoutDirectiveValues({
        "script-src": /example\.com/,
      });
    expect(expectBuilder.csp()).toEqual(fixtureBuilder.csp());
  });

  it("can handle boolean directives", () => {
    const fixtureBuilder = new CspBuilder(fixtureCsp);
    const expectBuilder = new CspBuilder(fixtureBuilder);

    expectBuilder.withDirectives({
      sandbox: true,
      "upgrade-insecure-requests": true,
      "block-all-mixed-content": true,
    });

    expect(expectBuilder.csp()).toEqual(
      new CspBuilder(fixtureBuilder)
        .withDirectives(
          `sandbox; upgrade-insecure-requests; block-all-mixed-content;`
        )
        .csp()
    );

    expectBuilder.withDirectives({
      "block-all-mixed-content": false,
    });

    expect(
      new CspBuilder(expectBuilder.toString()).csp().directives[
        "block-all-mixed-content"
      ]
    ).toBeUndefined();

    expect(
      new CspBuilder(expectBuilder.toString()).csp().directives[
        "block-all-mixed-content"
      ]
    ).toBeUndefined();
  });

  it("can handle header key value", () => {
    const fixtureBuilder = new CspBuilder([CSP_HEADER_REPORT_ONLY, fixtureCsp]);
    const expectBuilder = new CspBuilder(fixtureBuilder);
    expect(expectBuilder.toHeaderKeyValue()).toEqual(
      fixtureBuilder.toHeaderKeyValue()
    );
    expect(expectBuilder.withReportOnly(false).toHeaderKeyValue()).toEqual(
      fixtureBuilder.withReportOnly(false).toHeaderKeyValue()
    );
  });

  it("outputs an empty string for a builder with empty directives", () => {
    const expectBuilder = new CspBuilder();
    expect(expectBuilder.toHeaderValue()).toEqual("");
  });
  it("can apply nonce-based strict-dynamic", () => {
    const nonce = "123456";
    const nonceWithPrefix: NonceWithPrefix = `nonce-${nonce}`;
    const fixtureBuilder = new CspBuilder(
      `script-src 'strict-dynamic' https: 'unsafe-inline' '${nonceWithPrefix}';`
    );
    const expectBuilder = new CspBuilder().withStrictDynamic(nonce);
    expect(expectBuilder.csp()).toEqual(fixtureBuilder.csp());
  });
  it("can apply hash-based strict-dynamic", () => {
    const hashes: HashWithAlgorithm[] = [
      "sha256-abcdef",
      "sha256-ghijkl",
      "sha256-mnopqr",
    ];
    const fixtureBuilder = new CspBuilder(
      `script-src 'strict-dynamic' https: 'unsafe-inline' 'sha256-abcdef' 'sha256-ghijkl' 'sha256-mnopqr';`
    );
    const expectBuilder = new CspBuilder().withStrictDynamic(hashes);
    expect(expectBuilder.csp()).toEqual(fixtureBuilder.csp());
  });

  it("can quotes script in require-trusted-types-for correctly", () => {
    const fixtureBuilder = new CspBuilder(`require-trusted-types-for 'script';`);
    const expectBuilder = new CspBuilder().withDirectives({"require-trusted-types-for": ["script"]});
    expect(expectBuilder.toString()).toEqual(fixtureBuilder.toString());
  });
});
