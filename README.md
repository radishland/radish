# Radish!

A full-stack framework built around Web Components and Web Standards:
- No custom DSL, just vanilla Web Components
- Simple, type-safe authoring
- Server-Side rendered templates with declarative shadow root
- Minimal, declarative API with signals and reactive directives
- Ship readable, debuggable code with a near-zero build step and no bundle
- Escape the js toolchain entropy
- Less migration hell: platform API change slowly
- Powered by Deno, secure by default
- A disappearing framework that fades away as the platform evolves

> Web Components are here to stay, get on board now!

- [Radish!](#radish)
  - [Motivation \& philosophy](#motivation--philosophy)
  - [Try out the alpha](#try-out-the-alpha)
  - [Project structure](#project-structure)
  - [Plugin API](#plugin-api)
    - [Config phase](#config-phase)
    - [Manifest phase](#manifest-phase)
    - [Build phase](#build-phase)
    - [Hot reloading phase](#hot-reloading-phase)
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
    - [@attr directive](#attr-directive)
    - [@bind directive: declarative two-way bindings](#bind-directive-declarative-two-way-bindings)
    - [@bool directive](#bool-directive)
    - [@class directive](#class-directive)
    - [@html directive](#html-directive)
    - [@text directive](#text-directive)
    - [@on directive: declarative event handlers](#on-directive-declarative-event-handlers)
    - [@prop directive](#prop-directive)
    - [@use directive: declarative hooks](#use-directive-declarative-hooks)
  - [Special elements](#special-elements)
    - [radish:head](#radishhead)
  - [Build](#build)
    - [Importmap](#importmap)
    - [No bundle](#no-bundle)
  - [Resources](#resources)

## Motivation & philosophy

Do you ever wonder what it would look like to build a modern web site without relying on a ton of dependencies and an extremely complex build step? Do you sometimes feel like web development is piling up more and more technologies, raising the barrier to entry and making it more and more complex to maintain and debug your app?

Radish addresses these problems. It's like a framework for writing Vanilla apps. In other words it's as bare metal as possible, embraces the Standards, soften the edges here and there and disappears as the Standards evolve.

It promotes a **minimax** philosophy, seeking the best possible outcome (great DX, future-proofing, and maintainability) while enforcing the lowest possible cost in terms of abstraction, bundling, and deviation from web standards.

## Try out the alpha

- Create a new project:

```sh
deno run -A jsr:@radish/init@1.0.0-alpha-17 my-rad-project
```

or have a look at the /app folder of the repo for syntax examples

- Build your project:

```sh
deno task build
```

- Start your project:

```sh
deno task start
```

## Project structure

A Radish project structure looks like:

```
my-rad-project/
├ elements/
├ lib/
├ routes/
├ static/
├ start.ts
└ deno.json
```

Where:
- `elements` contains your reusable custom elements, web components and unknown elements
- `routes` contains your routes with optionally colocated custom elements
- `static` contains the static assets that should be served as-is
- the `start.ts` scripts starts the app and contains your config.

## Plugin API

The Radish core is a plugin runner modelled after the Vite/Rollup plugin system, with compatible signatures. The framework features themselves come in the form of built-in plugins which can be extended. For example custom-element transforms, declarative shadow root inlining, server effects, type stripping etc. are just plugins.

The pipeline is articulated around the following hooks and phases:

### Config phase

- The `config: (userConfig: Config, args: Args) => Config` hook can read and modify the user config and receives the arguments of the currently running command
- The `configResolved: (config: ResolvedConfig) => void` hooks is ran at the end of the config phase and allows plugin to read the resolved config.

### Manifest phase

The manifest holds information about the files of the project, their imports, dependencies etc. and can be extended with information about the elements, routes, layouts etc.

- The `manifestStart: (manifestController: ManifestController) => ManifestBase` hook runs before the manifest generation, and allows to give it the proper shape by adding required fields
- The `manifest: (entry: WalkEntry, context: ManifestContext) => void` hook is the main hook of this phase, visits entries one by one and is used to populate the manifest file
- The `manifestWrite: (content: string) => string` hook is a transform which runs when the manifest is written on disk, and allows to modify imports etc.

### Build phase

- The `buildStart: (entries: WalkEntry[],manifest: ManifestBase) => WalkEntry[]` hook runs at the beginning of a build or re-build, and allows plugins to modify the order in which the entries will be built
- The `transform: (code: string, path: string, context: TransformContext) => MaybePromise<TransformResult>` hook lets you modify the content of a file
- The `emit: (path: string) => string | null` hook is ran just before the content is written on disk and allows a plugin to modify the default destination

### Hot reloading phase

The dev server handles hot reloading and plugins can hook into this phase too with the `handleHotUpdate: (event: HmrEvent, context: HmrContext) => void` hook. It receives the event, holding information about what happened (creation, modification, path etc.) and the context, allowing to re-run plugins, updating the manifest etc.

## Routing

Radish uses a file-based router based on the [`URLPattern`](https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API) Web Standard. Routes correspond to subfolders of the `routes` folder with an `index.html` file inside

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

This folder structure corresponds to the named group `/user/:id` and will match against `/user/123` for example

### Non-capturing groups

A non-captured group is delimited by curly braces `{}`, and can be made optional with the `?` group modifier.

Example: The pattern `book{s}?` matches both `/book` and `/books`

```
routes/
└ books{s}?/
  └ index.html
```

### Regex matchers

To ensure a parameter is valid you can provide named Regex matchers to the router.

Example. To make sure a user id is a number, add the `router: { matchers: { number: /\d+/ } }` option to the config and update the route:

```
routes/
└ user/
  └ [id=number]/
    └ index.html
```

Only non-empty numeric ids will match against this route, like `/user/123` but not `/user/abc`.

## Navigation

### Speculation Rules

The [Speculation Rules API](https://developer.chrome.com/docs/web-platform/prerender-pages) is supported with the generation of a `speculationrules` script at build time for instant page navigation. You can configure the ruleset in the `generate.ts` script build options.

## Elements

The `elements` folder contains all three sorts of elements:
- custom elements, with no template and a only a class export
- unknown elements, with only an html template and no associated custom element
- web components, with both an html template and a custom element

The convention is that an element's folder and files are named after the element's tag name:

- `app/elements/my-element/my-element.html` contains the declarative shadow root template for the `<my-element>` element.
- `app/elements/my-element/my-element.ts` contains the `MyElement` class defining the `<my-element>` custom element.

Declarative shadowroot templates are inlined at build time

1. Custom element templates inside `app/elements/` must have the `shadowrootmode="open"` attribute to allow SSR.

<!-- ## Styles

- the provided `reset.css`
- the `generated_variables.css` for just-in-time CSS variable definitions, fluid sizes and typography, and a flexible, customizable and intuitive scale -->

## Authoring

### Type-safety

You can write your modules in Typescript and type annotations will be removed with [type-strip](https://github.com/fcrozatier/type-strip).

Only *modern TypeScript* is supported, equivalent to setting [`--erasableSyntaxOnly`](https://devblogs.microsoft.com/typescript/announcing-typescript-5-8-beta/#the---erasablesyntaxonly-option). See the `type-strip` [unsupported features](https://github.com/fcrozatier/type-strip?tab=readme-ov-file#unsupported-features) for more.

This limitation is on purpose so that your code is not [incompatible](https://github.com/tc39/proposal-type-annotations) with the TC39 type annotations proposal.

### Auto-imports

Your custom elements are automatically imported by Radish where you use them.

For example if you have defined a `my-button` web-component, then you can use it directly in any page, and Radish will add the required import in the head of the page:

```html
<!-- This is automatically inserted in the head -->
<script type="module">
  import "/elements/my-button/my-button.js";
</script>
```

### Debugging

Debugging your app is quite simple - and it's rather fun! - as Deno runs TypeScript source directly, so you can easily step through Radish very readable ts source code and not be confused by compiled/minified js.

A VS-Code `launch.json` file is provided in the `.vscode` folder of your app to help in the process. Just pass it the args array of the script you want to debug (`"--importmap"`, `"--build"` etc) and launch the debug session!

In the browser debugging also works out of the box, and you can easily step through your code to understand what's going on, since the code running in the browser is just your TypeScript code with the types stripped out, which should be easy to read and a seamless experience.

## Scoped Handler Registry

A scoped handler registry is a custom element extending the `HandlerRegistry` class. This is where you can define handlers for various directives listed below.

Once in your markup, a handler registry will handle all the interaction requests it receives from its subtree of elements if it implements the requested handler. Handler registries are scoped: only the closest parent of a given element will handle its interactions if it can.

In this example, the `handle-hover` custom element implements the `showTooltip` event handler and the `handle-click` implements `handleClick`.

```html
<handle-hover>
  ...
  <handle-click>
    ...
    <button @on="click:handleClick, mouseover:showTooltip">click or hover me</button>
  <handle-click>
<handle-hover>
```

This allows you to have a top-level registry implementing common handlers or hooks and removes the need for props drilling

## Reactivity

The reactivity module is built around `@preact/signals-core` and provides the following helpers:

- the `signal<T>(value: T)` helper function creates a signal whose value can be accessed and modified in the code with the `.value` property. Inside templates signals are coerced to their value and can be referenced directly without `.value`

Example: given the field `name = signal("Radish")` in a parent handler, we can reference it directly:
```html
<parent-handler>
  <span @text="name"></span>
</parent-handler>
```

- the `computed(computation: () => void)` helper creates a read-only computed signal based on the values of other signals and is used similarly to a `signal`

- the `reactive<T>(value: T)` helper creates a deeply reactive object or array. A reactive object or array is proxied and its properties can be accessed directly without `.value`

```ts
const obj = reactive({a: {b: 1}}) // A reactive object
const a = computed(() => obj.a.b) // A reactive object is proxied and its properties can be accessed directly without `.value`

obj.a.b = 2 // Deep reactivity
console.log(a) // 2
```

- Handler Registries have a `this.effect(() => void)` method to create an effect which is automatically cleaned up when the element is disconnected. For advanced use cases an unowned effect can be created directly with the `effect` helper an accepts an abortion signal

## Directives

The following directives are available:
- @attr
- @bind
- @bool
- @class
- @html
- @on
- @prop
- @text
- @use

@on, @prop and @use only have client-only semantics while the other directives are universal: they have both server and client semantics and can be restricted with |server and |client.

### @attr directive

The @attr directive allows to set attributes on an element to the value of a given identifier. If the identifier is a signal, then the assignment is reactive

```html
<input type="checkbox" @attr="disabled:isDisabled" />
```

If the attribute and the identifier have the same name we can use a shorthand notation:

```html
<!-- these are equivalent -->
<input type="checkbox" @attr="checked" />
<input type="checkbox" @attr="checked:checked" />
```

The `checked` attribute of the input is bound to the `value` property of its handling registry. Global boolean attributes are handled automatically by @attr. If you want to bind a custom boolean attribute on your custom element, you may want to reach for @bool.

### @bind directive: declarative two-way bindings

The `@bind` directive declares a two-way reactive binding between an element stateful property and a reactive signal.

For example to bind the `checked` property of an `input` to the `isChecked` signal of a surrounding handler:

```html
<demo-bind>
  <input type="checkbox" @bind:checked="isChecked" />
</demo-bind>
```

```ts
// demo-bind.ts
class DemoBind extends HandlerRegistry {
  isChecked = signal(true);
}
```

If the property and the value have the same name you can use the following shorthand syntax:

```html
<!-- these are equivalent -->
<input type="checkbox" @bind:checked="checked" />
<input type="checkbox" @bind:checked />
```

The `@bind` directive is a universal directive: it has both server and client semantics:

- On the server, it is equivalent to an `@attr|server` effect and sets the attribute to the given value.
- On the client, `@bind` performs an extended `@prop` effect with a twist: the signal value is first resumed to the value of the HTML state, in case the user interacted before js was ready. Then an event listener manages the html -> js updates and a `@prop` effect handles state synchronization.

The resumability of the state on the client prevents janky hydration and provides instant interactivity in the case of slow networks. And as a bonus, focus is not lost after the state is resumed.

Also, the `@bind` directive allows cross-component bindings at any filiation level: parents, grand-parents, grand-grand-parents etc.

You can use this directive on your web components too. For example the following `my-rating` element and the `input` are correlated via the `value` signal of their common handler:

```html
<bind-custom-element>
  <input type="number" @bind:value>
  <my-rating label="Rating" @bind:value></my-rating>
<bind-custom-element>
```

```ts
class BindCustomElement extends HandlerRegistry {
  value = signal(3)
}
```

### @bool directive

The @bool directive handles custom boolean attribute bindings.

```html
<demo-bool>
  <label>
    loading <input type="checkbox" name="circle" @bind:checked="loading">
  </label>

  <sl-button size="medium" @bool="loading">
    <sl-icon name="gear" label="Settings"></sl-icon>
  </sl-button>
</demo-bool>
```

```ts
class DemoBool extends HandlerRegistry {
  loading = signal(true);
}
```

Toggling the checkbox will add or remove the <code>loading</code> boolean attribute on the <code>sl-button</code> web component.

Global boolean attributes like <code>disabled</code>, <code>checked</code> etc. can also be handled by the @attr directive.

### @class directive

The @class directive accepts a reactive object where keys are strings of space separated class names and values are boolean values or signals.

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
  <p @class="classes">I have reactive classes</p>

  <button @on="click:toggleColor">toggle color</button>
  <button @on="click:toggleOutline">toggle outline</button>
</handle-class>
```

### @html directive

The @html directive sets the `innerHTML` property of an element, and runs on the server.

### @text directive

The @text directive sets the `textContent` property of an element, and runs on the server.

### @on directive: declarative event handlers

The `@on` directive allows to declaratively add event-handlers to any element in your markup. It accepts a comma separated list of `<event type>:<handler name>`:

```html
<button @on="click:handleClick, mouseover:handleMouseOver">click or hover me</button>
```

You can add multiple event handlers, even with the same event type, as under the hood `@on` is a declarative way to `addEventListener`. For example, this button has two click event handlers:

```html
<button @on="click:handleClick, click:log">click me</button>
```

### @prop directive

The @prop directive sets an element properties on the client.

It also gives fine grained control when you want to make sure js is available like when toggling an aria property. In case js is not available the `@prop` effect doesn't run, so the property is not set and the element doesn't end-up stuck in the wrong accessibility state.

### @use directive: declarative hooks

The `@use` directive lets you declare a lifecycle hook on any element.

```html
<span @use="hook">I'm hooked</span>
```

The closest handlers registry implementing the `hook` method will handle it

```js
hook(element: Element){
  element.style.color = "red";

  element.addEventListener("pointerover", ()=>{
    element.style.color = "green";
  })
}
```

You can use a hook defined in a parent handler registry, similar to if it were automatically passed via a context API

## Special elements

### <radish:head>

This component lets you declaratively add content to the document's head, and provide it with a title, description etc.

It must appear at the top-level of your component

```html
<radish:head>
  <title></title>
</radish:head>
```

## Build

### Importmap

When building your project, an importmap of the runtime dependencies is generated and inlined in the  `head` of the html. This relies on the [importmap](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap) Web Standard.

In dev mode the importmap resolves modules from the node_modules folder by default and allows off-line development, and in production it resolves modules from the jspm.io CDN by default. This is entirely configurable.

The importmap is generated in the `_generated` folder, and you can inspect it with the following commands:

- `deno task generate --importmap --dev` generated the dev importmap
- `deno task generate --importmap` generated the production importmap

You have full control over the importmap generation in the `scripts/generate.ts` file:

- a `transform(importmap: ImportMap): string` hook allows you to modify the generated importmap before the file is saved on disk.
- an `install` option lets you force install any package that can't be statically detected.
- further options (default registry, custom providers etc) can be passed to the jspm generator

### No bundle

The production importmap lets the browser resolve dependencies (and their dependencies) from standard CDNs. This means that your code and dependencies are not bundled together, and instead there is a clean separation between the code that you author and everything else. This has several benefits:

- Better caching. Dependencies can be cached by the browser separately from your modules, so that updating a typo in your code only invalidates that file.
- Smaller downloads. Since dependencies are not inlined with your code, they're only downloaded on first load or whenever you update their version; not with every bundle.
- Less bandwidth usage. Resolving dependencies client-side and downloading them from CDNs means that much less traffic on your infrastructure. This can make a difference in terms of cost and usage

## Resources

Here are a few resources to learn more about various aspects of Web Components:

- web.dev article on [Custom Element Best Practices](https://web.dev/articles/custom-elements-best-practices)
- [Declarative Shadow DOM](https://web.dev/articles/declarative-shadow-dom)
- MDN 3 parts guide:
  - [Using custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)
  - [Using Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)
  - [Using templates and slots](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_templates_and_slots)