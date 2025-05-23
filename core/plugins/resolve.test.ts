import { assertObjectMatch } from "@std/assert";
import { findLongestMatchingPrefix } from "./resolve.ts";

Deno.test("findLongestMatchingPrefix", () => {
  const cases: {
    args: [specifier: string, prefixes: string[]];
    result: ReturnType<typeof findLongestMatchingPrefix>;
  }[] = [
    { args: ["a", []], result: { path: "", prefix: undefined } },
    // Equality
    { args: ["a", ["a"]], result: { path: "", prefix: "a" } },
    // Proper subpath prefix
    { args: ["a/b", ["a"]], result: { path: "/b", prefix: "a" } },
    { args: ["a/b", ["a/"]], result: { path: "b", prefix: "a/" } },
    // Longest match
    { args: ["a/b", ["a", "a/b"]], result: { path: "", prefix: "a/b" } },
    // Matches subpath prefixes only
    { args: ["ab", ["a"]], result: { path: "", prefix: undefined } },
  ];

  for (const values of cases) {
    const result = findLongestMatchingPrefix(...values.args);
    assertObjectMatch(result, values.result);
  }
});
