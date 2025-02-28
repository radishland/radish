# Radish!

A full-stack framework built around Web Components and Web Standards:
- No custom DSL, just vanilla Web Components
- Simple, type-safe authoring
- Server-Side rendered templates with declarative shadow root
- Minimal, declarative API with signals and reactive directives
- Ship readable, debuggable code with a near-no-build step
- Escape the js toolchain entropy
- Less migration hell: platform API change slowly
- Powered by Deno, secure by default
- A disappearing framework that fades away as the platform evolves

> Web Components are here to stay, you should get on board now!

- [Radish!](#radish)
  - [Try out the alpha](#try-out-the-alpha)
  - [Project structure](#project-structure)
  - [Routing](#routing)
    - [Dynamic routes](#dynamic-routes)
    - [Non-capturing groups](#non-capturing-groups)
    - [Regex matchers](#regex-matchers)
  - [Elements](#elements)
  - [Type-safety](#type-safety)
  - [Scoped Handler Registry](#scoped-handler-registry)
  - [Reactivity](#reactivity)
  - [Directives](#directives)
    - [@attr directive](#attr-directive)
    - [@bind directive: declarative two-way bindings](#bind-directive-declarative-two-way-bindings)
    - [@class directive](#class-directive)
    - [@html directive](#html-directive)
    - [@text directive](#text-directive)
    - [@on directive: declarative event handlers](#on-directive-declarative-event-handlers)
    - [@prop directive](#prop-directive)
    - [@use directive: declarative hooks](#use-directive-declarative-hooks)

## Try out the alpha

- Create a new project:

```sh
deno run -A jsr:@radish/init@1.0.0-alpha-13 my-rad-project
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
├ scripts/
├ static/
├ start.ts
└ deno.json
```

Where:
- `elements` contains your reusable custom elements, web components and unknown elements
- `routes` contains your routes with optionally colocated custom elements
- `scripts` contains your app scripts like `start` and `build`.
- `static` contains the static assets that should be served as-is
- the `start.ts` script calls the `start` function and passes it your config.

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

## Type-safety

You can write your modules in Typescript and type annotations will be removed with [type-strip](https://github.com/fcrozatier/type-strip).

Only *modern TypeScript* is supported, equivalent to setting [`--erasableSyntaxOnly`](https://devblogs.microsoft.com/typescript/announcing-typescript-5-8-beta/#the---erasablesyntaxonly-option). See the `type-strip` [unsupported features](https://github.com/fcrozatier/type-strip?tab=readme-ov-file#unsupported-features) for more.

This limitation is on purpose so that your code is not [incompatible](https://github.com/tc39/proposal-type-annotations) with the TC39 type annotations proposal.

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
- @class
- @html
- @on
- @prop
- @text
- @use

@on, @prop and @use only have client-only semantics while the other directives are universal: they have both server and client semantics and can be restricted with |server and |client.

### @attr directive

The @attr directive allow to set attributes on an element to the value of a given identifier. If the identifier is a signal, then the assignment is reactive

```html
<input type="checkbox" @attr="disabled:isDisabled" />
```

If the attribute and the identifier have the same name we can use a shorthand notation:

```html
<!-- these are equivalent -->
<input type="text" @attr="value" />
<input type="text" @attr="value:value" />
```

The `value` attribute of the input is bound to the `value` property of its handling registry

### @bind directive: declarative two-way bindings

The `@bind` directive allows to declare a two-way binding between a reactive js value and a stateful HTML property.

For example to bind the `checked` property to the `isChecked` signal:

```html
<input type="checkbox" @bind:checked="isChecked" />
```

If the property and the value have the same name you can use the shorthand syntax:

```html
<!-- these are equivalent -->
<input type="checkbox" @bind:checked="checked" />
<input type="checkbox" @bind:checked />
```

The `@bind` directive is a universal directive: it has both server and client semantics:

- On the server, it is equivalent to an `@attr|server` effect: it sets the attribute to the given value on the server.
- On the client, the js state is first resumed to the value of the HTML state, in case the user interacted before js was ready. Then an event listener manages the html -> js state updates and a `@prop` effect handles the remaining js -> html state sync.

The resumability of the state on the client prevents janky hydration and provides instant interactivity in the case of slow networks. And focus is not lost.

The `@bind` directive allow cross-component bindings at any filiation level: parents, grand-parents, grand-grand-parents etc.

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
