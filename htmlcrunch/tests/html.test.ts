import { assertEquals } from "@std/assert";
import {
  attribute,
  comment,
  commentNode,
  doctype,
  element,
  fragments,
  Kind,
  serializeFragments,
  spacesAndComments,
  textNode,
} from "../parser.ts";

Deno.test("comments_simple", () => {
  const singleline = comment.parseOrThrow("<!-- A simple comment -->");
  assertEquals(singleline, { kind: "COMMENT", text: " A simple comment " });

  const multiline = comment.parseOrThrow(`<!--
     A
     multiline
     comment
     -->`);
  assertEquals(multiline, {
    kind: "COMMENT",
    text: `
     A
     multiline
     comment
     `,
  });
});

Deno.test("comments_complex", () => {
  const consecutive_comments = spacesAndComments.parseOrThrow(`
    <!-- consecutive comments -->
    <!-- arrows ->-> -- > ->->->-- -> inside comments -->
  `);
  assertEquals(consecutive_comments, [
    textNode("\n    "),
    {
      kind: "COMMENT",
      text: " consecutive comments ",
    },
    {
      kind: "COMMENT",
      text: " arrows ->-> -- > ->->->-- -> inside comments ",
    },
    textNode("\n  "),
  ]);

  const html_inside_comment = element.parseOrThrow(`
    <div><!-- <span>html inside comment</span> --></div>
  `.trim());

  assertEquals(html_inside_comment, {
    kind: Kind.NORMAL,
    tagName: "div",
    attributes: [],
    children: [
      { kind: "COMMENT", text: " <span>html inside comment</span> " },
    ],
  });
});

Deno.test("comments_nested", () => {
  const nestedComments = fragments.parseOrThrow(`
    <!-- This is a div -->

    <div>

      <!-- This is a p -->
      <p>
        Some text
        <!-- This is a button -->
        <button>click</button>
        <!-- Now below the button -->
      </p>

      <!-- Another section -->

      <!-- Another p -->
      <p>
        <input type="checkbox"> <!-- An input -->
      </p>
    </div>
    `);

  assertEquals(nestedComments, [
    textNode("\n    "),
    commentNode(" This is a div "),
    textNode("\n\n    "),
    {
      tagName: "div",
      kind: Kind.NORMAL,
      attributes: [],
      children: [
        textNode("\n\n      "),
        commentNode(" This is a p "),
        textNode("\n      "),
        {
          tagName: "p",
          kind: Kind.NORMAL,
          attributes: [],
          children: [
            { kind: "TEXT", text: "\n        Some text\n        " },
            commentNode(" This is a button "),
            textNode("\n        "),
            {
              tagName: "button",
              kind: Kind.NORMAL,
              attributes: [],
              children: [{ kind: "TEXT", text: "click" }],
            },
            textNode("\n        "),
            commentNode(" Now below the button "),
            textNode("\n      "),
          ],
        },
        textNode("\n\n      "),
        commentNode(" Another section "),
        textNode("\n\n      "),
        commentNode(" Another p "),
        textNode("\n      "),
        {
          tagName: "p",
          kind: Kind.NORMAL,
          attributes: [],
          children: [
            textNode("\n        "),
            {
              tagName: "input",
              kind: Kind.VOID,
              attributes: [["type", "checkbox"]],
            },
            textNode(" "),
            commentNode(" An input "),
            textNode("\n      "),
          ],
        },
        textNode("\n    "),
      ],
    },
    textNode("\n    "),
  ]);
});

Deno.test("doctype", () => {
  const res = doctype.parseOrThrow("<!Doctype Html >");

  assertEquals(res, textNode("<!DOCTYPE html>"));
});

Deno.test("attributes", () => {
  const unquotedAttribute = attribute.parseOrThrow(`value=yes`);
  assertEquals(unquotedAttribute, ["value", "yes"]);

  const singleQuoteAttribute = attribute.parseOrThrow(`type='text'`);
  assertEquals(singleQuoteAttribute, ["type", "text"]);

  const doubleQuotesAttribute = attribute.parseOrThrow(`class="a b c"`);
  assertEquals(doubleQuotesAttribute, ["class", "a b c"]);

  const booleanAttribute = attribute.parseOrThrow(`checked`);
  assertEquals(booleanAttribute, ["checked", ""]);

  const nonAsciiAttribute = attribute.parseOrThrow(`xml:lang="us"`);
  assertEquals(nonAsciiAttribute, ["xml:lang", "us"]);

  const hangingBracket = element.parseOrThrow(
    `<input
    disabled
    >`,
  );
  assertEquals(hangingBracket, {
    tagName: "input",
    kind: Kind.VOID,
    attributes: [
      [
        "disabled",
        "",
      ],
    ],
  });

  const recoverFromMissingWhiteSpace = element.parseOrThrow(
    `<input value="yes"class="a b c">`,
  );
  assertEquals(recoverFromMissingWhiteSpace, {
    tagName: "input",
    kind: Kind.VOID,
    attributes: [
      ["value", "yes"],
      ["class", "a b c"],
    ],
  });

  const allowDuplicateAttributes = element.parseOrThrow(
    `<input @on="click:handleClick" @on="mouseenter:handleHover">`,
  );
  assertEquals(allowDuplicateAttributes, {
    tagName: "input",
    kind: Kind.VOID,
    attributes: [
      ["@on", "click:handleClick"],
      ["@on", "mouseenter:handleHover"],
    ],
  });
});

Deno.test("void_element", () => {
  const input = element.parseOrThrow('<input type="text">');
  assertEquals(input, {
    tagName: "input",
    kind: Kind.VOID,
    attributes: [["type", "text"]],
  });

  // The closing slash becomes part of the unquoted attribute value
  // https://html.spec.whatwg.org/#start-tags
  const unquoted_attr_then_slash = element.parseOrThrow("<input type=text/>");
  assertEquals(unquoted_attr_then_slash, {
    tagName: "input",
    kind: Kind.VOID,
    attributes: [["type", "text/"]],
  });
});

Deno.test("void_elements", () => {
  const content = fragments.parseOrThrow(
    '<img src="something.png"><br><input type=submit value=Ok />',
  );
  assertEquals(content, [
    {
      tagName: "img",
      kind: Kind.VOID,
      attributes: [["src", "something.png"]],
    },
    { tagName: "br", kind: Kind.VOID, attributes: [] },
    {
      tagName: "input",
      kind: Kind.VOID,
      attributes: [["type", "submit"], ["value", "Ok"]],
    },
  ]);
});

Deno.test("raw_text_elements", () => {
  const style = element.parseOrThrow(`
    <style>
      .box {
        color: blue;
      }
    </style>
    `.trim());

  assertEquals(style, {
    tagName: "style",
    kind: Kind.RAW_TEXT,
    attributes: [],
    children: [{
      kind: "TEXT",
      text: `
      .box {
        color: blue;
      }
    `,
    }],
  });

  const script = element.parseOrThrow(`
    <script>
      <
      </
      </s
      </sc
      </scr
      </scri
      </scrip
      console.log(1 < 2);
    </script>
    `.trim());

  assertEquals(script, {
    tagName: "script",
    kind: Kind.RAW_TEXT,
    attributes: [],
    children: [{
      kind: "TEXT",
      text: `
      <
      </
      </s
      </sc
      </scr
      </scri
      </scrip
      console.log(1 < 2);
    `,
    }],
  });
});

Deno.test("raw_text_empty", () => {
  const script = element.parseOrThrow(
    `<script type="module" src="/src/module.js"></script>`,
  );

  assertEquals(script, {
    tagName: "script",
    kind: Kind.RAW_TEXT,
    attributes: [["type", "module"], ["src", "/src/module.js"]],
    children: [],
  });
});

Deno.test("normal_element", () => {
  const empty_span = element.parseOrThrow(
    `<span class="icon"></span>`,
  );
  assertEquals(empty_span, {
    tagName: "span",
    kind: Kind.NORMAL,
    attributes: [["class", "icon"]],
    children: [],
  });

  const p = element.parseOrThrow(
    `<p>lorem</p>`,
  );
  assertEquals(p, {
    tagName: "p",
    kind: Kind.NORMAL,
    attributes: [],
    children: [{ kind: "TEXT", text: "lorem" }],
  });
});

Deno.test("custom_elements", () => {
  const res = fragments.parseOrThrow(`
    <something-different>
      <atom-text-editor mini>
        Hello
      </atom-text-editor>
    </something-different>
    `.trim());

  assertEquals(res, [{
    tagName: "something-different",
    kind: Kind.CUSTOM,
    attributes: [],
    children: [textNode("\n      "), {
      tagName: "atom-text-editor",
      kind: Kind.CUSTOM,
      attributes: [["mini", ""]],
      children: [textNode("\n        Hello\n      ")],
    }, textNode("\n    ")],
  }]);
});

Deno.test("entities", () => {
  const entities = fragments.parseOrThrow(`
    <p>Named entities: &nbsp; dolor sit &copy; amet.</p>
    <p>Numeric entities: &#160; dolor sit &#8212; amet.</p>
    <p>Misc entities: &#xA0; dolor &#xa0; sit &nbsp; amet.</p>
  `.trim());

  assertEquals(entities, [
    {
      tagName: "p",
      kind: Kind.NORMAL,
      attributes: [],
      children: [{
        kind: "TEXT",
        text: `Named entities: &nbsp; dolor sit &copy; amet.`,
      }],
    },
    textNode("\n    "),
    {
      tagName: "p",
      kind: Kind.NORMAL,
      attributes: [],
      children: [{
        kind: "TEXT",
        text: "Numeric entities: &#160; dolor sit &#8212; amet.",
      }],
    },
    textNode("\n    "),
    {
      tagName: "p",
      kind: Kind.NORMAL,
      attributes: [],
      children: [{
        kind: "TEXT",
        text: "Misc entities: &#xA0; dolor &#xa0; sit &nbsp; amet.",
      }],
    },
  ]);
});

Deno.test("serialize", () => {
  const samples = ["text", "<!-- comment -->", "<span>no whitespace</span>"];

  const indentation = `<span>
            <a href="#">First</a>
            <a href="#">Second</a>
  </span>`;

  const spaces = `Hello, <a href="#"> World </a>!`;

  const nested = `
    <div>
      <p>
        <button>click</button>
      </p>
      <p>
        Multi-line
        text
      </p>
      <p>
        <input type="checkbox">
      </p>
    </div>
    `.trim();

  for (const sample of [...samples, indentation, spaces, nested]) {
    assertEquals(serializeFragments(fragments.parseOrThrow(sample)), sample);
  }
});

// A single newline at the start or end of pre blocks is ignored by the HTML parser but a space followed by a newline is not
// https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inbody
Deno.test("serialize_preformatted", () => {
  const newlines = `<pre>

Two newlines, only the first one would be dropped

</pre>
`;
  const spaces = `<pre>
A single whitespace before the linebreak is not dropped
 </pre>
`;

  const indentation = `<pre>
    Indentation is kept
</pre>
`;

  const samples = [newlines, spaces, indentation];
  for (const sample of samples) {
    assertEquals(
      serializeFragments(fragments.parseOrThrow(sample)),
      sample,
    );
  }
});
