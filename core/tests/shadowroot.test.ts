import { fragments, serializeFragments } from "@radish/htmlcrunch";
import { applyServerEffects } from "../src/walk.ts";
import { assertEquals } from "@std/assert/equals";

Deno.test("inline shadowroot", () => {
  const shadowRoot = serializeFragments(
    fragments.parseOrThrow(
      `<test-shadowroot></test-shadowroot>`,
    ).map(applyServerEffects),
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
