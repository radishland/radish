# Radish!

Radish is a standards-first framework with a unified approach to building
fullstack web apps.

- **[Unified Approach](#mental-model)**: A cohesive and simple mental model
- **Standards-first**: Embraces Web Components by focusing on the good parts
- **Server-Side rendering**: Supports declarative shadow root templates with SSR
- **Declarative API**: [Declarative directives](#directives) and
  [signals](#reactivity) for reactivity
- **Readable code**: Near-zero [build](#build) step and
  [no bundling](#no-bundle), making code readable and debuggable
- **[Type Safety](#type-safety)**: Type-safe authoring
- **Powerful [Effect System](#effect-system)**
- **Extensible [Plugin API](#plugin-api)**
- **Secure by Default**: Powered by Deno

## Introduction

The web platform is rapidly maturing, with features arriving at an unprecedented
pace: HTML declarative shadow root, CSS functions, JS Signals, Navigation API,
and more. Relying on the platform means less churn: web APIs evolve slowly,
reducing migration overhead.

Today we can manage frontend dependencies with importmaps and create modular
code with native ES modules. The future is moving beyond traditional bundlers,
freeing us from JavaScript toolchain sprawl.

Radish is designed to offer top-tier features, DX, maintainability and
future-proofing, while minimizing abstraction, bundling, and deviation from web
standards.

Try it out, and you'll discover how refreshing it is to have readable and
debuggable code in the browser at every stage (we just strip types). Radish
deepens your understanding of platform technologies and helps you build more
robust, future-proof applications. Its clear and coherent
[mental model](#overview) helps everything click into place.

## Try-out the alpha

**Create a new project:**

```sh
deno run -A jsr:@radish/init@1.0.0-alpha.31 my-rad-project
```

**Build your project:**

```sh
deno task build
```

**Start your project:**

```sh
deno task start --dev
```

### Examples

Have a look at the [`/app`](https://github.com/radishland/radish/tree/main/app)
folder of the repo for some syntax examples

Here's how simple it is to declaratively bind a checkbox to an element property:

```ts
import { HandlerRegistry, signal } from "radish";

// demo-bind.ts
class DemoBind extends HandlerRegistry {
  isChecked = signal(true);
}

customElements.define("handle-input-demo", HandleInputDemo);
```

```html
<demo-bind>
  <input type="checkbox" bind:checked="isChecked" />
</demo-bind>
```

### Project structure

A Radish project looks like this:

```
my-rad-project/
├ elements/ <-- your custom elements, web components and unknown elements
├ lib/      <-- reusable ts modules
├ routes/   <-- routes and one-off colocated custom elements
├ static/   <-- static assets that should be served as-is
├ start.ts  <-- start script and project config
└ deno.json
```

- [Radish!](#radish)
  - [Introduction](#introduction)
  - [Try-out the alpha](#try-out-the-alpha)
    - [Examples](#examples)
    - [Project structure](#project-structure)
  - [Mental model](#mental-model)
  - [Effect system](#effect-system)
  - [Plugin API](#plugin-api)
  - [Routing](#routing)
    - [Dynamic routes](#dynamic-routes)
    - [Non-capturing groups](#non-capturing-groups)
    - [Regex matchers](#regex-matchers)
  - [Navigation](#navigation)
    - [Speculation Rules](#speculation-rules)
  - [Elements](#elements)
  - [Authoring](#authoring)
    - [Type-safety](#type-safety)
    - [Auto-imports](#auto-imports)
    - [Debugging](#debugging)
  - [Scoped Handler Registry](#scoped-handler-registry)
  - [Reactivity](#reactivity)
  - [Directives](#directives)
    - [attr directive](#attr-directive)
    - [bind directive: declarative two-way bindings](#bind-directive-declarative-two-way-bindings)
    - [bool directive](#bool-directive)
    - [classList directive](#classlist-directive)
    - [html directive](#html-directive)
    - [text directive](#text-directive)
    - [on directive: declarative event handlers](#on-directive-declarative-event-handlers)
    - [prop directive](#prop-directive)
    - [use directive: declarative hooks](#use-directive-declarative-hooks)
  - [Special elements](#special-elements)
    - [head](#head)
  - [Build](#build)
    - [Importmap](#importmap)
    - [No bundle](#no-bundle)
  - [Resources](#resources)

## [Mental model](/guides/MENTAL_MODEL.md)

Radish simple mental model helps you make sense of all the moving parts in a
fullstack app, binging them into a cohesive picture, and giving you a glimpse of
the framework's modularity.

## [Effect system](https://jsr.io/@radish/effect-system)

The effect-system is built around effects you perform, and handlers to interpret
them, usually via [plugins](#plugin-api).

<details>
  <summary>Note: awaiting effects</summary>
  <hr>
  <p>
    Effects are often sequenced in pipelines like read -> transform -> write, hinting at their <a href="https://www.sciencedirect.com/science/article/pii/0890540191900524">monadic</a> nature.
  </p>
  <p>
   In Radish, handlers interpret the `Effect&ltT&gt` monad into the `Promise&ltT&gt` monad letting us <code>await</code> them for clean, direct sequencing.
  </p>
  <p>
    <code>await</code> is just syntax sugar offered by the `PromiseLike` interface. It's the JS equivalent of Haskell's <a href="https://en.wikibooks.org/wiki/Haskell/do_notation">do-notation</a>
  </p>
  <hr>
</details>

<details>
  <summary>Note: JS async marker and handler types</summary>
  <hr>
  <p>
    In JavaScript/TypeScript, asynchrony is the only effect we have markers for, with the `async` keyword and the `Promise` return type. Other effects (throwing, logging) have no markers.
  </p>
  <p>
    One approach would be to encode all effects in types. This is the approach taken by the <a href="https://effect.website/">Effect framework</a>.
  </p>
  <p>
    Instead, Radish is a lightweight approach that embraces the JavaScript/TypeScript languages, with no need to wrap all your libraries and with no interop concerns: it's all standard JavaScript.
  </p>
  <p>
    In operations signatures (see <code><a href="https://jsr.io/@radish/effect-system/doc/~/createEffect">createEffect</a></code>), asynchrony is treated like any other JS effect: it's swallowed and we don't mark it in the operation signature. This provides a uniform treatment of effects in operation signatures as well as flexibility in how handlers are implemented: an operation signature corresponds to an effect-free signature, and being async becomes an implementation detail. This also lets handlers perform other effects (by awaiting them) and, by the current note, this is an implementation detail too.
  </p>
  <hr>
</details>

The full documentation of the effect-system is available
[here](https://jsr.io/@radish/effect-system)

## Plugin API

A plugin is just an object with a name and an array of handlers

```ts
import type { Plugin } from "radish/types";

export const myIOPlugin: Plugin = {
  name: "my-io-plugin",
  handlers: [
    IOCountTXTReads,
    IODecorateTXT,
    IOHandleTXTOnly,
    IOReadHandler,
    IOWriteHandler,
  ],
};
```

When handlers rely on delegation (`Handler.continue(...)`), the **order
matters**. Handlers are evaluated in sequence with the first handler of the list
being executed first.

All built-in plugin handlers in Radish are total, so you can safely build
specialized handlers that delegate or decorate them.

Once your plugin is ready, extend Radish's behavior by prepending it to the
`plugins` array of your config file.

All core framework features, like declarative shadow root inlining, server
directives, type stripping etc., are implemented as built-in plugins. You can
extend, override, or layer on top of them with the plugin API.

The provided plugins can be imported from `radish/plugins`, see the
[core/src/plugins](https://github.com/radishland/radish/tree/main/core/src/plugins)
folder. Here's an overview

## Routing

Radish uses a file-based router based on the
[`URLPattern`](https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API)
Web Standard. Routes correspond to subfolders of the `routes` folder with an
`index.html` file inside

Example: The folder structure

```
routes/
└ user/
  └ profile/
    └ index.html
```

corresponds to the route `/user/profile`.

### Dynamic routes

A dynamic segment can be provided with square brackets:

Example:

```
routes/
└ user/
  └ [id]/
    └ index.html
```

This folder structure corresponds to the named group `/user/:id` and will match
against `/user/123` for example

### Non-capturing groups

A non-captured group is delimited by curly braces `{}`, and can be made optional
with the `?` group modifier.

Example: The pattern `book{s}?` matches both `/book` and `/books`

```
routes/
└ books{s}?/
  └ index.html
```

### Regex matchers

To ensure a parameter is valid you can provide named Regex matchers to the
router.

Example. To make sure a user id is a number, add the
`router: { matchers: { number: /\d+/ } }` option to the config and update the
route:

```
routes/
└ user/
  └ [id=number]/
    └ index.html
```

Only non-empty numeric ids will match against this route, like `/user/123` but
not `/user/abc`.

## Navigation

### Speculation Rules

The
[Speculation Rules API](https://developer.chrome.com/docs/web-platform/prerender-pages)
is supported with the generation of a `speculationrules` script at build time
for instant page navigation. You can configure the ruleset in the `generate.ts`
script build options.

## Elements

The `elements` folder contains all three sorts of elements:

- custom elements, with no template and a only a class export
- unknown elements, with only an html template and no associated custom element
- web components, with both an html template and a custom element

The convention is that an element's folder and files are named after the
element's tag name:

- `app/elements/my-element/my-element.html` contains the declarative shadow root
  template for `my-element`.
- `app/elements/my-element/my-element.ts` contains the `MyElement` class
  defining the custom element `my-element`.

Declarative shadowroot templates are inlined at build time

1. Custom element templates inside `app/elements/` must have the
   `shadowrootmode="open"` attribute to allow SSR.

<!-- ## Styles

- the provided `reset.css`
- the `generated_variables.css` for just-in-time CSS variable definitions, fluid sizes and typography, and a flexible, customizable and intuitive scale -->

## Authoring

### Type-safety

You can write your modules in Typescript and type annotations will be removed
with [type-strip](https://github.com/fcrozatier/type-strip).

Only _modern TypeScript_ is supported, equivalent to setting
[`--erasableSyntaxOnly`](https://devblogs.microsoft.com/typescript/announcing-typescript-5-8-beta/#the---erasablesyntaxonly-option).
See the `type-strip`
[unsupported features](https://github.com/fcrozatier/type-strip?tab=readme-ov-file#unsupported-features)
for more.

This limitation is on purpose so that your code is not
[incompatible](https://github.com/tc39/proposal-type-annotations) with the TC39
type annotations proposal.

### Auto-imports

Your custom elements are automatically imported by Radish where you use them.

For example if you have defined a `my-button` web-component, then you can use it
directly in any page, and Radish will add the required import in the head of the
page:

```html
<!-- This is automatically inserted in the head -->
<script type="module">
  import "/elements/my-button/my-button.js";
</script>
```

### Debugging

Debugging your app is quite simple - and it's rather fun! - as Deno runs
TypeScript source directly, so you can easily step through Radish very readable
ts source code and not be confused by compiled/minified js.

A VS-Code `launch.json` file is provided in the `.vscode` folder of your app to
help in the process. Just pass it the args array of the script you want to debug
(`"--importmap"`, `"--build"` etc) and launch the debug session!

In the browser debugging also works out of the box, and you can easily step
through your code to understand what's going on, since the code running in the
browser is just your TypeScript code with the types stripped out, which should
be easy to read and a seamless experience.

## Scoped Handler Registry

A scoped handler registry is a custom element extending the `HandlerRegistry`
class. This is where you can define handlers for various directives listed
below.

Once in your markup, a handler registry handles all the interaction requests
from its subtree of elements if it implements the requested handler. Handler
registries are scoped: only the closest parent of a given element will handle
its interactions if it can.

In this example, the `handle-hover` custom element implements the `showTooltip`
event handler and the `handle-click` implements `handleClick`.

```html
<handle-hover>
  ...
  <handle-click>
    ...
    <button on:click="handleClick" on:mouseover="showTooltip">click or hover me</button>
  <handle-click>
<handle-hover>
```

This allows you to have a top-level registry implementing common handlers or
hooks and removes the need for props drilling

## Reactivity

The reactivity module is built around `@preact/signals-core` and provides the
following helpers:

- the `signal<T>(value: T)` helper function creates a signal whose value can be
  accessed and modified in the code with the `.value` property. Inside templates
  signals are coerced to their value and can be referenced directly without
  `.value`

Example: given the field `name = signal("Radish")` in a parent handler, we can
reference it directly:

```html
<parent-handler>
  <span text="name"></span>
</parent-handler>
```

- the `computed(computation: () => void)` helper creates a read-only computed
  signal based on the values of other signals and is used similarly to a
  `signal`

- the `reactive<T>(value: T)` helper creates a deeply reactive object or array.
  A reactive object or array is proxied and its properties can be accessed
  directly without `.value`

```ts
const obj = reactive({ a: { b: 1 } }); // A reactive object
const a = computed(() => obj.a.b); // A reactive object is proxied and its properties can be accessed directly without `.value`

obj.a.b = 2; // Deep reactivity
console.log(a); // 2
```

- Handler Registries have a `this.effect(() => void)` method to create an effect
  which is automatically cleaned up when the element is disconnected. For
  advanced use cases an unowned effect can be created directly with the `effect`
  helper and accepts an `AbortSignal`

## Directives

- [`attr`](#attr-directive)
- [`bind`](#bind-directive-declarative-two-way-bindings)
- [`bool`](#bool-directive)
- [`classList`](#classList-directive)
- [`html`](#html-directive)
- [`on`](#on-directive-declarative-event-handlers)
- [`prop`](#prop-directive)
- [`text`](#text-directive)
- [`use`](#use-directive-declarative-hooks)

`on`, `prop` and `use` only have client semantics while the other directives are
universal: they have both client and server semantics

### attr directive

The `attr` directive sets an attribute on an element to the value referenced by
a given identifier. If the identifier is a signal, then the assignment is
reactive

```html
<input type="checkbox" attr:disabled="isDisabled" />
```

If the attribute and the identifier have the same name we can use a shorthand
notation:

```html
<!-- these are equivalent -->
<input type="checkbox" attr:id />
<input type="checkbox" attr:id="id" />
```

In the previous example, the `id` attribute of the input is bound to the `id`
property of its surrounding handler.

### bind directive: declarative two-way bindings

The `bind` directive declares a two-way binding between an element stateful
property and a reactive signal.

For example to bind the `checked` property of an `input` to the `isChecked`
signal of a surrounding handler:

```html
<demo-bind>
  <input type="checkbox" bind:checked="isChecked" />
</demo-bind>
```

```ts
// demo-bind.ts
class DemoBind extends HandlerRegistry {
  isChecked = signal(true);
}
```

If the property and the value have the same name you can use the following
shorthand syntax:

```html
<!-- these are equivalent -->
<input type="checkbox" bind:checked="checked" />
<input type="checkbox" bind:checked />
```

The `bind` directive is a universal directive, with both client and server
semantics:

- On the server, it is equivalent to `attr` and sets the attribute to the given
  value.
- On the client, `bind` is similar to `prop`, with the signal value first
  resumed to the value of the HTML state, in case the user interacted before js
  was ready. Then the prop and state are kept in sync.

The resumability of the state on the client prevents janky hydration with slow
networks. And focus is not lost in the process.

Also, the `bind` directive allows cross-component bindings at any filiation
level: parents, grand-parents, grand-grand-parents etc.

You can use this directive on web components too. For example the following
`my-rating` element and the `input` are correlated via the `value` signal of
their common handler:

```html
<bind-custom-element>
  <input type="number" bind:value>
  <my-rating label="Rating" bind:value></my-rating>
<bind-custom-element>
```

```ts
class BindCustomElement extends HandlerRegistry {
  value = signal(3);
}
```

### bool directive

The `bool` directive handles custom boolean attribute bindings.

```html
<demo-bool>
  <label>
    loading <input type="checkbox" name="circle" bind:checked="loading">
  </label>

  <sl-button size="medium" bool:loading>
    <sl-icon name="gear" label="Settings"></sl-icon>
  </sl-button>
</demo-bool>
```

```ts
class DemoBool extends HandlerRegistry {
  loading = signal(true);
}
```

Toggling the checkbox will add or remove the <code>loading</code> boolean
attribute on the <code>sl-button</code> web component.

Global boolean attributes like <code>disabled</code>, <code>checked</code> etc.
can also be handled by the `attr` and `prop` directives.

### classList directive

The `classList` directive accepts a reactive object where keys are strings of
space separated class names and values are boolean values or signals.

Example:

```ts
export class HandleClass extends HandlerRegistry {
  outline = signal(false);
  classes = reactive({
    "red": false,
    "outline": this.outline,
  });

  toggleColor() {
    this.object.red = !this.object.red;
  }

  toggleOutline() {
    this.outline.value = !this.outline.value;
  }
}
```

```html
<handle-class>
  <p classList="classes">I have reactive classes</p>

  <button on:click="toggleColor">toggle color</button>
  <button on:click="toggleOutline">toggle outline</button>
</handle-class>
```

In this example clicking the buttons toggles the `.red` and `.outline` classes
on the paragraph element

### html directive

The `html` directive sets the `innerHTML` property of an element. On the server
it parses the provided html string and inserts the resulting nodes as children
of the element.

### text directive

The `text` directive sets the `textContent` property of an element. On the
server it creates a child text node inside on the element.

### on directive: declarative event handlers

The `on` directive allows to declaratively add event-handlers to any element:

```html
<button on:click="handleClick" on:mouseover="handleMouseOver">
  click or hover me
</button>
```

You can add multiple event handlers, even with the same event type, as `on` is a
declarative way to `addEventListener`. For example, this button has two click
event handlers:

```html
<button on:click="handleClick" on:click="log">click me</button>
```

### prop directive

The `prop` directive sets an element properties on the client.

It also gives fine grained control when you want to make sure js is available
like when toggling an aria property. In case js is not available the `prop`
effect doesn't run, so the property is not set and the element doesn't end-up
stuck in the wrong accessibility state.

### use directive: declarative hooks

The `use` directive runs a lifecycle hook on an element.

```html
<handle-hook>
  <span use:hook>I'm hooked</span>
</handle-hook>
```

The closest handlers registry implementing the `hook` method will handle it

```ts
export class HandleHook extends HandlerRegistry {
  hook(element: Element) {
    element.style.color = "red";

    element.addEventListener("pointerover", () => {
      element.style.color = "green";
    });
  }
}
```

You can use a hook defined in a parent handler registry, similar to if it were
automatically passed via a context API

## Special elements

### head

Use the `head` element at the top level of pages to declaratively add content to
the document's head, like providing a title, description etc.

```html
<head>
  <title>The page title</title>
</head>
```

## Build

Building your projects mainly consists of stripping types, generating an
importmap and applying server effects like declarative shadow root inlining.

### Importmap

When building your project, an
[importmap](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap)
of your runtime dependencies is automatically generated and inserted in the
`<head>`.

<!-- In dev mode the importmap resolves modules from the node_modules folder by default and allows off-line development, and in production it resolves modules from the [esm.sh](https://esm.sh/) CDN. -->

The importmap resolves modules from the [esm.sh](https://esm.sh/) CDN:

- both [npm](https://www.npmjs.com/) and [jsr](https://jsr.io/) modules are
  handled,
- the build target is automatically determined by checking the `User-Agent`
  header. So users of your site get precisely what they need

The importmap can be generated with the following command:

```sh
deno task generate --importmap
```

You have full control over the importmap in your config file, with options for
manually including packages.

### No bundle

The [importmap](#importmap) lets the browser resolve dependencies (and
higher-order dependencies) from the [esm.sh](https://esm.sh/) CDN. This means
your code and its dependencies are not bundled together, and instead there is a
clean separation between the code that you author and everything else. This
allows them to move on asynchronously at their own pace and has several
benefits:

- Better caching. Dependencies can be cached by the browser separately from your
  modules, _e.g._ updating a typo in your code only invalidates that file.
- Smaller downloads. Since dependencies are not inlined with your code, they're
  only downloaded on first load or whenever you update their version — not with
  every bundle.
- Less bandwidth usage. Resolving dependencies client-side and downloading them
  from CDNs means that much less traffic on your infrastructure. This can make a
  difference in terms of cost and usage.

## Resources

- The
  [importmap spec](https://html.spec.whatwg.org/multipage/webappapis.html#import-maps)
- [Declarative Shadow DOM](https://web.dev/articles/declarative-shadow-dom)
- [Custom Element Best Practices](https://web.dev/articles/custom-elements-best-practices)
- MDN 3 parts guide:
  - [Using custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)
  - [Using Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)
  - [Using templates and slots](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_templates_and_slots)

[^alg-effects]: What is algebraic about algebraic effects and handlers? — ANDREJ
    BAUER. https://arxiv.org/pdf/1807.05923

[^ui-react]: 2015 blog post describing
    [UI as a function of state](https://www.kn8.lt/blog/ui-is-a-function-of-data/)

[^ui-overreacted]: Overreacted blog post describing the UI=f(state, data)
    formula. https://overreacted.io/the-two-reacts/
