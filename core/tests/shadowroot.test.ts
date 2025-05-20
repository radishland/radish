import { fragments, serializeFragments } from "@radish/htmlcrunch";
import { assertEquals } from "@std/assert";

Deno.test("inline shadowroot", () => {
  const shadowRoot = serializeFragments(
    fragments.parseOrThrow(
      `<test-shadowroot></test-shadowroot>`,
    ),
  );

  assertEquals(
    shadowRoot,
    `<test-shadowroot>
<template shadowrootmode="open">
<p>
Hi
</p>
</template>
</test-shadowroot>\n`,
  );
});
