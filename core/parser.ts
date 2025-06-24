import { between, fail, type Parser, result, seq } from "@fcrozatier/monarch";
import { literal, regex, whitespaces } from "@fcrozatier/monarch/common";

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#reserved_words
const reservedWords = [
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "new",
  "null",
  "return",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  // Strict mode
  "let",
  "static",
  "yield",
  "implements",
  "interface",
  "package",
  "private",
  "protected",
  "public",
  //
  "await",
  //
  "enum",
  //
];

/**
 * Parses a JS identifier
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#identifiers
 */
export const identifier: Parser<string> = regex(
  // deno-lint-ignore no-control-regex
  /[\p{ID_Start}_$][\p{ID_Continue}\u{200C}\u{200D}\u{0000}$]*/u,
).chain((id) => {
  if (reservedWords.includes(id)) {
    return fail.error(`The "${id}" keyword is not allowed as an identifier`);
  }
  return result(id);
});

/**
 * Parses an HTML TextNode containing a mustache template
 */
export const identifierInsideMustaches: Parser<[string, string, string]> = seq(
  whitespaces,
  between(
    literal("{").skipTrailing(whitespaces),
    identifier,
    literal("}").skipLeading(whitespaces),
  ),
  whitespaces,
);

export { fragments, html, shadowRoot } from "@radish/htmlcrunch";
