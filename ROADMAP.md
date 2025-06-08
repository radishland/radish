# Roadmap

- [x] Inline declarative shadow root templates on the server
- [x] JIT CSS variables: fluid scale and typography
- [x] Scoped Handler Registries
- [x] Directives: on, use, attr, classList, prop, text, html, bind
- [x] Importmap
- [x] Hydration
- [x] auto imports
- [x] HMR
- [x] Init script

- [ ] set directive: html -> set:innerHTML, text -> set:textContent, classList
      -> set:classList
- [ ] Load effect (code & data)
- [ ] Lazy load islands
- [ ] Option to prerender a component
- [ ] Handle client errors and try-catch components
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

## Upstream

### Declarative Shadow DOM Slot Projection

Demo: https://output.jsbin.com/huquloz

Issues:

- Add an attribute for declarative slots (Assigned)
  https://issues.chromium.org/issues/40123185
- Support for `:has-slotted` (Assigned)
  https://issues.chromium.org/issues/369883705 (In Progress)
