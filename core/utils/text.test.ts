import { assertEquals } from "@std/assert";
import { describe, test } from "@std/testing/bdd";
import { indent } from "./text.ts";

describe("string indentation", () => {
  test("indents single line content", () => {
    assertEquals(indent("hello", 0), "hello");
    assertEquals(indent("hello", 2), "  hello");
  });

  test("indents multiline content", () => {
    const input = `
multi
line
content`;

    const output = `
      multi
      line
      content`;

    assertEquals(indent(input, 0), input);
    assertEquals(indent(input, 6), output);
  });
});
