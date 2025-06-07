## Mental model

The design of Radish is heavily inspired by algebraic effects[^alg-effects].
You've probably heard of "effects" before, but the word is overloaded, so let's
clarify what we mean here

### Effects as in algebraic effects

In modern JS we're used to talking about effects in the context of a reactivity
systems like signals. That's not the kind of effects we're talking about here,
though signals do play a role in Radish as the
[reactivity primitive](#reactivity).

Algebraic effects[^alg-effects] are a more general concept from functional
programming allowing to structure a program in a modular and composable way.

A good mental model is the handling of exceptions in JS: we can _perform_ a
`throw` operation to create an exception which then bubbles up the stack until
it finds a handler. And in JS we can add an exception handler with the try-catch
construct.

```ts
try {
  f(() => {
    ...
    // You can throw several layers deep...
    throw new Error("Oops");
  })
} catch (error) {
  // ...and the nearest handler (the try-catch construct) will catch it
  console.log(error);
}
```

Similarly, an effect consists of an operation that you _perform_ and a handler
that _interprets_ it. HTML events and listeners are another good analogy, with
the DOM event bubbling.

<details>
  <summary>Advanced note</summary>
  <hr>
  <p>
    In algebraic effects systems like those in OCaml and <a href="https://koka-lang.github.io/koka/doc/index.html">Koka</a>, when an effect is performed, the current continuation (the rest of the computation) is captured and passed as a first-class value to the handler. The handler can then store it, discard it, resume it once or multiple times.
  </p>
  <p>
    In contrast in JavaScript we don't have first-class continuations, so we can't cleanly model the multi-shot capability. Instead we can model effects using one-shot delimited continuations, matching the intuition given above with the try-catch construct and event and listeners. It turns out that this approach is easier to reason about and fits well with how JavaScript works.
  </p>
  <hr>
</details>

### A unified approach

Traditionally, UI is described as a pure function of state and
data[^ui-overreacted], a pattern popularized by frameworks like Elm or React
around 2015[^ui-react]:

$$\mathrm{UI} = f(\mathrm{state}, \mathrm{data})$$

The problem is that it overlooks all the interactions and side effects. For
example, what happens when a user clicks a button that logs a message?

Interactions are **effects**, and side-effects are interactions with the
environment. By contrast, Radish embraces effects and models fullstack
applications as the handling of various effects:

$$\mathrm{Fullstack} = \mathrm{handle\ effects}$$

This formula contains the traditional one: state management is an effect (`get`
and `set` operations), and data loading also is an effect (`load` operation).
And this formula extends the traditional approach as it also captures server
operations like validation, request handling, DB queries etc. as well as build
operations, IO handling etc; all of which are effects.

Radish is built around this idea, and provides a model for effects and handlers
on the backend with a complete [effect system](#effect-system), and on the
frontend with [scoped handler registries](#scoped-handler-registry).

### Modeling effects for the web

The $\mathrm{Fullstack} = \mathrm{handle\ effects}$ formula can be modelled in
the different environments where our applications run

#### Effects on the server

Radish provides a full-featured [effect system](#effect-system) on the backend.

This has many advantages for our apps in particular in terms of extendability
which, as a bonus, yields us a powerful [plugin API](#plugin-api). In fact, all
built-in effect handlers are implemented as plugins.

<details>
  <summary>Note</summary>
  <hr>
  <p>
    Event bubbling is a concept specific to the DOM. There is no bubbling in environments like Deno, so the event/listeners model is not helpful on the server.
  </p>
  <hr>
</details>

#### Effects in the browser

In the browser, Radish leverages the DOM event bubbling to model effects, and
introduces [scoped handler registries](#scoped-handler-registry): custom
elements that can handle effects like declarative directives.

This is isomorphic to try-catch: a handler wraps a subtree and intercepts
effects inside it

```ts
import { HandlerRegistry, signal } from "radish";

// We extend the `HandlerRegistry` class to give our component the ability to interpret declarative directives...
class HandleInputDemo extends HandlerRegistry {
  content = signal("I'm a reactive value");
}

customElements.define("handle-input-demo", HandleInputDemo);
```

```html
<!-- ...The handler can handle effects in the subtree of elements it wraps -->
<handle-input-demo>
  <input type="text" bind:value="content">
  <span text="content"></span>
  <!-- This span contains our (SSRd) reactive input content -->
</handle-input-demo>
```

Handlers can be nested. The closest one handles the effects it can interpret.

```ts
import { HandlerRegistry, signal } from "radish";

class OtherHandler extends HandlerRegistry {
  content = signal("I'm shadowed");

  log = () => {
    console.log("hi");
  };
}

customElements.define("other-handler", OtherHandler);
```

```html
<!-- the `content` property of `other-handler` is shadowed by the one provided by  `handle-input-demo`. This offers patterns like having common hooks, or overridable defaults -->
<other-handler>
  ...
  <!-- `handle-input-demo` doesn't handle the declarative click  -->
  <handle-input-demo>
    ...
    <input type="text" bind:value="content" on="click:log">
  </handle-input-demo>
</other-handler>
```

Notice there is no props drilling here: we have automatic context.

#### Effects & CSS

Styling in CSS also fits into this mental model, and exhibits all the key
characteristics of effects:

- **External impact**: Styling changes the visual appearance of elements
- **Contextual**: Behavior varies depending on the environment (browser, device,
  viewport size)
- **Declarative separation**: CSS declares _what_ should happen rather than
  _how_, separating the _effect_ from its _handling_ by the browser rendering
  engine
- **Compositional behavior**: Cascading styles can be combined, overridden, and
  inherited like effect handling hierarchies.

Thinking of CSS styling in terms of effects provides an insightful perspective
on design, encouraging a mindset that embraces the cascade, style delegation and
layered handling.
