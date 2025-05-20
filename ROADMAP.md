# Roadmap

- [x] Inline declarative shadow root templates on the server
- [x] JIT CSS variables: fluid scale and typography
- [x] Scoped Handler Registries
- [x] Directives: on, use, attr, class, prop, text, html, bind
- [x] Importmap
- [x] Hydration script
- [x] auto-import custom elements
- [x] HMR

- [ ] Scaffolding scripts for project & components
- [ ] Lazy load islands
- [ ] Handle client errors and try-catch components
- [ ] Load effect
- [ ] Option to prerender a component
- [ ] local first compatible data loading model with storage providers, diffing
      & merging and smart updates on navigation request
- [?] Convenience: use proxy for state?
- [ ] Distinguish between route level handler registries and others: a global
      handler throws if it sees an unhandled interaction request
- [ ] Stateful navigation

- [ ] Templating: loops

- [ ] Static files: cache headers
- [ ] Static files: content length headers

- [ ] Security: CSP
- [ ] Security: Rate Limiter
- [ ] Security: Handle 413 Content too large, 414 URI too large, 415 Unsupported
      media

---

Prevent FOUC in browsers that don't support declarative shadow DOM

```css
x-foo:not(:defined) > template[shadowrootmode] ~ * {
  display: none;
}
```

Find all custom elements

```js
const allCustomElements = [];

function isCustomElement(el) {
  const isAttr = el.getAttribute("is");
  // Check for <super-button> and <button is="super-button">.
  return el.localName.includes("-") || isAttr && isAttr.includes("-");
}

function findAllCustomElements(nodes) {
  for (let i = 0, el; el = nodes[i]; ++i) {
    if (isCustomElement(el)) {
      allCustomElements.push(el);
    }
    // If the element has shadow DOM, dig deeper.
    if (el.shadowRoot) {
      findAllCustomElements(el.shadowRoot.querySelectorAll("*"));
    }
  }
}
```

## Upstream

### Declarative Shadow DOM Slot Projection

Demo: https://output.jsbin.com/huquloz

Issues:

- Add an attribute for declarative slots (Assigned)
  https://issues.chromium.org/issues/40123185
- Support for `:has-slotted` (Assigned)
  https://issues.chromium.org/issues/369883705
- https://issues.chromium.org/issues/40114711
