import {
  alt,
  between,
  createParser,
  fail,
  many,
  type Parser,
  result,
  sepBy,
  seq,
} from "@fcrozatier/monarch";
import {
  literal,
  regex,
  whitespaces,
  whitespaces1,
} from "@fcrozatier/monarch/common";
import { assertExists } from "@std/assert";

/**
 * The different types of HTML elements
 */
export const ElementKind = {
  VOID: "VOID",
  RAW_TEXT: "RAW_TEXT",
  ESCAPABLE_RAW_TEXT: "ESCAPABLE_RAW_TEXT",
  CUSTOM: "CUSTOM",
  NORMAL: "NORMAL",
} as const;

/**
 * The different types HTML elements
 */
type ElementKind = keyof typeof ElementKind;

const NodeKind = {
  COMMENT: "COMMENT",
  TEXT: "TEXT",
  ...ElementKind,
} as const;

/**
 * A comment node
 */
export type MCommentNode = {
  kind: "COMMENT";
  text: string;
  parent?: MElement | undefined;
  children?: never;
};

/**
 * A text node
 */
export type MTextNode = {
  kind: "TEXT";
  text: string;
  parent?: MElement | undefined;
  children?: never;
};

/**
 * An alternation of comments and whitespaces text nodes
 */
export type MSpacesAndComments = (MTextNode | MCommentNode)[];

/**
 * Element node
 */
export type MElement = {
  tagName: string;
  kind: ElementKind;
  attributes: [string, string][];
  parent?: MElement | undefined;
  children?: MFragment;
};

/**
 * A node
 */
export type MNode = MCommentNode | MTextNode | MElement;

/**
 * Fragment node
 */
export type MFragment = MNode[];

/**
 * Helper function to create a text node
 */
export const textNode = (text: string): MTextNode => ({ kind: "TEXT", text });

const whitespaceOnlyText = whitespaces.map(textNode);

/**
 * Helper function to create a comment node
 */
export const commentNode = (text: string): MCommentNode => ({
  kind: "COMMENT",
  text,
});

/**
 * Parses an HTML comment
 *
 * https://html.spec.whatwg.org/#comments
 */
export const comment: Parser<MCommentNode> = between(
  literal("<!--"),
  regex(/^(?!>|->)(?:.|\n)*?(?=(?:<\!--|-->|--!>|<!-)|$)/),
  literal("-->"),
).map(commentNode);

/**
 * Parses a sequence of comments maybe surrounded by whitespace
 */
export const spacesAndComments: Parser<MSpacesAndComments> = seq(
  whitespaceOnlyText,
  sepBy(comment, whitespaces),
  whitespaceOnlyText,
).map((res) => res.flat());

/**
 * Parses a modern HTML doctype
 *
 * https://html.spec.whatwg.org/#syntax-doctype
 */
export const doctype: Parser<MTextNode> = regex(/^<!DOCTYPE\s+html\s*>/i)
  .map(() => textNode("<!DOCTYPE html>"))
  .error("Expected a valid doctype");

const singleQuote = literal("'");
const doubleQuote = literal('"');

/**
 * Parses HTML raw text
 */
const rawText: Parser<string> = regex(/^[^<]+/);

/**
 * Parses an HTML attribute name
 *
 * https://html.spec.whatwg.org/#attributes-2
 */
const attributeName = regex(/^[^\s="'>\/\p{Noncharacter_Code_Point}]+/u)
  .skipTrailing(whitespaces)
  .error("Expected a valid attribute name");

const attributeValue = alt(
  between(singleQuote, regex(/^[^']*/), singleQuote),
  between(doubleQuote, regex(/^[^"]*/), doubleQuote),
  regex(/^[^\s='"<>`]+/),
);

/**
 * Parsers an HTML attribute
 */
export const attribute: Parser<[string, string]> = alt<[string, string]>(
  seq(
    attributeName,
    literal("=").skipTrailing(whitespaces),
    attributeValue,
  ).map(([name, _, value]) => [name, value]),
  attributeName.map((name) => [name, ""]),
).skipTrailing(whitespaces);

const FORBIDDEN_CUSTOM_ELEMENT_NAMES = [
  "annotation-xml",
  "color-profile",
  "font-face",
  "font-face-src",
  "font-face-uri",
  "font-face-format",
  "font-face-name",
  "missing-glyph",
];

/**
 * https://html.spec.whatwg.org/multipage/custom-elements.html#prod-pcenchar
 */
const potentialCustomElementNameChars = regex(
  /^(?:[-._]|[0-9]|[a-z]|\xB7|[\xC0-\xD6]|[\xD8-\xF6]|[\xF8-\u037D]|[\u037F-\u1FFF]|[\u200C-\u200D]|[\u203F-\u2040]|[\u2070-\u218F]|[\u2C00-\u2FEF]|[\u3001-\uD7FF]|[\uF900-\uFDCF]|[\uFDF0-\uFFFD]|[\u{10000}-\u{EFFFF}])*/ui,
);

const potentialCustomElementName = seq(
  regex(/^[a-z]/i),
  potentialCustomElementNameChars,
).map((value) => value.join("").toLowerCase())
  .error("Invalid custom element name");

/**
 * Valid Custom Element names are potential custom element names that are not forbidden
 * https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name
 */
export const customElementName: Parser<string> = potentialCustomElementName
  .chain((name) => {
    if (FORBIDDEN_CUSTOM_ELEMENT_NAMES.includes(name)) {
      return fail.error("Forbidden custom element name");
    }
    if (!name.includes("-")) {
      return fail.error("Invalid custom element name (should include a dash)");
    }
    return result(name);
  });

/**
 * HTML tag names are ASCII alphanumeric only
 * https://html.spec.whatwg.org/#syntax-tag-name
 */
const htmlTagName = regex(/^[a-z][a-z0-9]*/i)
  .map((name) => name.toLowerCase())
  .error("Invalid html tag name");

/**
 * HTML tag-name state
 * https://html.spec.whatwg.org/#tag-name-state
 *
 * More generally XML names can have colons, dashes etc.
 * https://www.w3.org/TR/REC-xml/#NT-NameStartChar
 */
export const tagName: Parser<string> = alt(customElementName, htmlTagName);

// https://html.spec.whatwg.org/#start-tags
const startTag: Parser<MElement> = seq(
  literal("<"),
  tagName,
  alt(
    whitespaces1.chain(() => many(attribute)),
    result([]),
  ),
  regex(/\/?>/),
).error("Invalid start tag")
  .chain(([_, tagName, attributes, end]) => {
    const selfClosing = end === "/>";
    const kind = elementKind(tagName);

    if (selfClosing && kind !== ElementKind.VOID) {
      return fail.error("Unexpected self-closing tag on a non-void element");
    }

    return result({ tagName, kind, attributes });
  });

/**
 * The element parser
 */
export const element: Parser<MElement> = createParser((input, position) => {
  const openTag = startTag.parse(input, position);

  if (!openTag.success) return openTag;

  const [openTagResult] = openTag.results;
  assertExists(openTagResult);

  const {
    value: { tagName, kind, attributes },
    remaining,
    position: openTagPosition,
  } = openTagResult;

  if (kind === ElementKind.VOID || !remaining) {
    return openTag;
  }

  let childrenElementsParser: Parser<MFragment>;
  const endTagParser = regex(new RegExp(`^</${tagName}>`))
    .error(`Expected a '</${tagName}>' end tag`);

  if (
    kind === ElementKind.RAW_TEXT ||
    kind === ElementKind.ESCAPABLE_RAW_TEXT
  ) {
    // https://html.spec.whatwg.org/#cdata-rcdata-restrictions
    const rawText = regex(
      new RegExp(`^(?:(?!<\/${tagName}(?:>|\n|\/)).|\n)*`),
    ).map((t) => t.length > 0 ? [textNode(t)] : []);

    childrenElementsParser = rawText;
  } else {
    childrenElementsParser = fragments;
  }

  const childrenElements = childrenElementsParser.parse(
    remaining,
    openTagPosition,
  );

  if (!childrenElements.success) {
    return childrenElements;
  }

  const [childrenElementsResult] = childrenElements.results;
  assertExists(childrenElementsResult);

  const {
    value: children,
    remaining: childrenRemaining,
    position: childrenPosition,
  } = childrenElementsResult;

  const res = endTagParser.parse(childrenRemaining, childrenPosition);

  // End tag omission would be managed here
  if (!res.success) return res;

  const [result] = res.results;
  assertExists(result);

  const elementNode: MElement = {
    tagName,
    kind,
    attributes,
    children,
  };

  for (const child of children) {
    child.parent = elementNode;
  }

  return {
    success: true,
    results: [{
      value: elementNode,
      remaining: result.remaining,
      position: result.position,
    }],
  };
});

/**
 * The fragments parser
 */
export const fragments: Parser<MFragment> = many(
  alt<MNode>(rawText.map(textNode), element, comment),
);

/**
 * Parses a template element with declarative shadow root and returns a fragment
 */
export const shadowRoot: Parser<MFragment> = createParser(
  (input, position) => {
    const result = seq(
      spacesAndComments,
      element,
    ).map((res) => res.flat()).parse(input, position);

    if (!result.success) return result;

    const maybeTemplate = result.results[0]?.value.at(-1) as MElement;

    if (maybeTemplate.tagName !== "template") {
      return {
        success: false,
        message: "Expected a template element",
        position,
      };
    }

    if (
      !maybeTemplate.attributes.find(([k, v]) =>
        k === "shadowrootmode" && v === "open"
      )
    ) {
      return {
        success: false,
        message: "Expected a declarative shadow root",
        position,
      };
    }

    return result;
  },
);

/**
 * Parses an html document: a doctype and an html element maybe surrounded by whitespace and comments
 *
 * https://html.spec.whatwg.org/#writing
 */
export const html: Parser<MFragment> = seq(
  spacesAndComments,
  doctype,
  spacesAndComments,
  element,
  spacesAndComments,
).map((fragments) => fragments.flat());

/**
 * The monarch serialization options
 */
export type SerializationOptions = {
  /**
   * Whether comments should be included in the serialization
   */
  removeComments?: boolean;
};

/**
 * Serializes a single node
 */
export const serializeNode = (
  node: MNode,
  options?: SerializationOptions,
): string => {
  const { removeComments } = Object.assign(
    {},
    { removeComments: false },
    options,
  );

  if (node.kind === "TEXT") return node.text;
  if (node.kind === "COMMENT") {
    return removeComments ? "" : `<!--${node.text}-->`;
  }

  const attributes = node.attributes.map(([k, v]) => {
    const quotes = v.includes('"') ? "'" : '"';
    return booleanAttributes.includes(k) ? k : `${k}=${quotes}${v}${quotes}`;
  });

  const attributesString = attributes.length > 0
    ? ` ${attributes.join(" ")}`
    : "";
  const startTag = `<${node.tagName}${attributesString}>`;

  if (node.kind === ElementKind.VOID) return startTag;

  const content = node.children
    ? node.children.map((node) => serializeNode(node, options))
      .join("")
    : "";
  return `${startTag}${content}</${node.tagName}>`;
};

/**
 * Serializes a fragment
 */
export const serializeFragments = (
  fragment: MFragment,
  options?: SerializationOptions,
): string => {
  return fragment.map((node) => serializeNode(node, options)).join("");
};

/**
 * Associate a tag name to its corresponding element kind
 */
const elementKind = (tag: string): ElementKind => {
  if (voidElements.includes(tag)) return ElementKind.VOID;
  if (rawTextElements.includes(tag)) return ElementKind.RAW_TEXT;
  if (escapableRawTextElements.includes(tag)) {
    return ElementKind.ESCAPABLE_RAW_TEXT;
  }
  if (tag.includes("-")) return ElementKind.CUSTOM;
  return ElementKind.NORMAL;
};

/**
 * Checks whether a {@linkcode MNode} is an {@linkcode MTextNode}
 */
export const isCommentNode = (node: unknown): node is MCommentNode => {
  return isMNode(node) && node.kind === "COMMENT";
};

/**
 * Checks whether a {@linkcode MNode} is an {@linkcode MTextNode}
 */
export const isTextNode = (node: unknown): node is MTextNode => {
  return isMNode(node) && node.kind === "TEXT";
};

/**
 * Checks whether a {@linkcode MNode} is an {@linkcode MElement}
 */
export const isElementNode = (node: unknown): node is MElement => {
  return isMNode(node) && Object.keys(ElementKind).includes(node.kind);
};

/**
 * An {@linkcode MNode} guard
 */
export const isMNode = (node: unknown): node is MNode => {
  if (node === null) return false;
  if (typeof node !== "object") return false;

  if (
    ("kind" in node) && typeof (node.kind) === "string" &&
    Object.keys(NodeKind).includes(node.kind)
  ) {
    if (node.kind === NodeKind.COMMENT || node.kind === NodeKind.TEXT) {
      return "text" in node;
    }

    return "tagName" in node && "attributes" in node;
  }

  return false;
};

const voidElements = [
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
];

const rawTextElements = ["script", "style"];
const escapableRawTextElements = ["textarea", "title"];

/**
 * All the HTML boolean attributes
 */
export const booleanAttributes = [
  "allowfullscreen", // on <iframe>
  "async", // on <script>
  "autofocus", // on <button>, <input>, <select>, <textarea>
  "autoplay", // on <audio>, <video>
  "checked", // on <input type="checkbox">, <input type="radio">
  "controls", // on <audio>, <video>
  "default", // on <track>
  "defer", // on <script>
  "disabled", // on form elements like <button>, <fieldset>, <input>, <optgroup>, <option>,<select>, <textarea>
  "formnovalidate", // on <button>, <input type="submit">
  "hidden", // global
  "inert", // global
  "ismap", // on <img>
  "itemscope", // global; part of microdata
  "loop", // on <audio>, <video>
  "multiple", // on <input type="file">, <select>
  "muted", // on <audio>, <video>
  "nomodule", // on <script>
  "novalidate", // on <form>
  "open", // on <details>
  "readonly", // on <input>, <textarea>
  "required", // on <input>, <select>, <textarea>
  "reversed", // on <ol>
  "selected", // on <option>
];
