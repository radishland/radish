import { assertEquals } from "@std/assert/equals";
import { generateManifest } from "../src/generate/manifest.ts";
import { applyServerEffects } from "../src/walk.ts";
import { fragments, serializeFragments } from "@fcrozatier/monarch/html";

generateManifest();

Deno.test("bind attributes", () => {
  const attributes = serializeFragments(
    fragments.parseOrThrow(`
    <test-bind>
      <input @set="type, value, inert:undefined, inert:undefined_signal, inert:false, inert:signal_false">
    </test-bind>
    `.trim()).map(applyServerEffects),
  );

  assertEquals(
    attributes,
    `<test-bind>
<input @set="type, value, inert:undefined, inert:undefined_signal, inert:false, inert:signal_false" type="text" value="b">
</test-bind>\n`,
  );
});

Deno.test("bind boolean attributes", () => {
  const boolean_attributes = serializeFragments(
    fragments.parseOrThrow(`
    <test-bind>
      <input type="checkbox" @set="checked:true, disabled:signal_true">
    </test-bind>
    `.trim()).map(applyServerEffects),
  );

  assertEquals(
    boolean_attributes,
    `<test-bind>
<input type="checkbox" @set="checked:true, disabled:signal_true" checked disabled>
</test-bind>\n`,
  );
});

Deno.test("bind textContent", () => {
  const textContent = serializeFragments(
    fragments.parseOrThrow(`
    <test-bind>
      <span @set="textContent:content_signal">initial</span>
    </test-bind>
    `.trim()).map(applyServerEffects),
  );

  assertEquals(
    textContent,
    `<test-bind>
<span @set="textContent:content_signal">
0
</span>
</test-bind>\n`,
  );
});
