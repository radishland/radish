import { between, fail, many1, type Parser, result } from "@fcrozatier/monarch";
import { literal, regex, whitespaces } from "@fcrozatier/monarch/common";

export { fragments, html, shadowRoot } from "@radish/htmlcrunch";

type Token<T, U> = {
  type: T;
  value: U;
};

/**
 * Parses a JS identifier
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#identifiers
 */
export const jsIdentifier: Parser<string> = regex(
  // deno-lint-ignore no-control-regex
  /[\p{ID_Start}_$][\p{ID_Continue}\u{200C}\u{200D}\u{0000}$]*/u,
).chain((id) => {
  if (reservedWords.includes(id)) {
    return fail.error(`The "${id}" keyword is not allowed as an identifier`);
  }
  return result(id);
});

const interpolated = <T>(parser: Parser<T>) =>
  between(
    literal("{").skipTrailing(whitespaces),
    parser,
    literal("}").skipLeading(whitespaces),
  );

/**
 * Parses an HTML TextNode containing a mustache template
 */
const interpolatedIdentifier = interpolated(jsIdentifier);

/**
 * Parses a sequence of alternating text and interpolated identifiers
 *
 * @returns An array of text and identifier tokens
 */
export const rawTextAndInterpolatedIdentifiers: Parser<
  Token<"text" | "identifier", string>[]
> = many1(
  regex(/^[^<{]*/)
    .chain((rawText) =>
      interpolatedIdentifier
        .chain((ident) =>
          result(
            [
              { type: "text", value: rawText },
              { type: "identifier", value: ident },
            ] as const,
          )
        )
    ),
).chain((arr) =>
  regex(/^[^<{]*/)
    .chain((rawText) =>
      result([...arr.flat(), { type: "text", value: rawText }])
    )
);

/**
 * JavaScript reserved words
 *
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#reserved_words
 */
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
