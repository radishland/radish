export const spaces_sep_by_comma = /\s*,\s*/;

type LooseAutocomplete<T extends string> = T | Omit<string, T>;

type Types = LooseAutocomplete<
  | "null"
  | "undefined"
  | "boolean"
  | "number"
  | "bigint"
  | "string"
  | "symbol"
  | "function"
  | "AsyncFunction"
  | "class"
  | "array"
  | "date"
  | "error"
  | "regexp"
  | "object"
>;

/**
 * A more reliable `typeof` function
 */
export function type(value: unknown): Types {
  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "undefined";
  }

  const baseType = typeof value;
  // Primitive types
  if (!["object", "function"].includes(baseType)) {
    return baseType;
  }

  // Symbol.toStringTag often specifies the "display name" of the
  // object's class. It's used in Object.prototype.toString().
  // @ts-expect-error it's fine if there is no `Symbol.toStringTag`
  const tag = value[Symbol.toStringTag];
  if (typeof tag === "string") {
    return tag;
  }

  // If it's a function whose source code starts with the "class" keyword
  if (
    baseType === "function" &&
    Function.prototype.toString.call(value).startsWith("class")
  ) {
    return "class";
  }

  // The name of the constructor; for example `Array`, `GeneratorFunction`,
  // `Number`, `String`, `Boolean` or `MyCustomClass`
  const className = value.constructor.name;
  if (typeof className === "string" && className !== "") {
    return className.toLowerCase();
  }

  // At this point there's no robust way to get the type of value,
  // so we use the base implementation.
  return baseType;
}

export const booleanAttributes = [
  "allowfullscreen", // on <iframe>
  "async", // on <script>
  "autofocus", // on <button>, <input>, <select>, <textarea>
  "autoplay", // on <audio>, <video>
  "checked", // on <input type="checkbox">, <input type="radio">
  "controls", // on <audio>, <video>
  "default", // on <track>
  "defer", // on <script>
  "disabled", // on form elements like <button>, <fieldset>, <input>, <optgroup>, <option>,<select>, <textarea>
  "formnovalidate", // on <button>, <input type="submit">
  "hidden", // global
  "inert", // global
  "ismap", // on <img>
  "itemscope", // global; part of microdata
  "loop", // on <audio>, <video>
  "multiple", // on <input type="file">, <select>
  "muted", // on <audio>, <video>
  "nomodule", // on <script>
  "novalidate", // on <form>
  "open", // on <details>
  "readonly", // on <input>, <textarea>
  "required", // on <input>, <select>, <textarea>
  "reversed", // on <ol>
  "selected", // on <option>
];

export const bindingConfig = {
  "checked": {
    type: ["boolean"],
    event: "change",
  },
  "value": {
    type: ["string", "number"],
    event: "input",
  },
};
