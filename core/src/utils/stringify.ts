import { type } from "@fcrozatier/ts-helpers";
import { assertExists, assertObjectMatch } from "@std/assert";

/**
 * The symbol used to attach a scope to a function in the `better-stringification` protocol
 */
export const SCOPE = Symbol.for("scope");

/**
 * Stringifies a function by inlining its scope
 *
 * This relies on the following convention: if the function has a scope object as its
 * {@linkcode SCOPE} property, then in the stringified function code the scope keys are
 * replaced by their values
 *
 * @example
 * const sayHi = () => console.log(`hi ${name}`);
 * Object.defineProperty(sayHi, SCOPE, { value: { name: "Bob" }});
 *
 * stringifyFunction(sayHi); // () => console.log(`hi ${"Bob"}`);
 */
export const stringifyFunction = (fn: (...args: unknown[]) => unknown) => {
  let serialized = fn.toString();

  if (!Object.hasOwn(fn, SCOPE)) return serialized;

  const scopeProperty = Object.getOwnPropertyDescriptor(fn, SCOPE);
  assertExists(scopeProperty);

  const scope = scopeProperty.value;
  assertObjectMatch(
    scope,
    {},
    "The SCOPE property for function stringification must be an object",
  );

  for (const key of Object.keys(scope)) {
    const value = JSON.stringify(scope[key]);
    serialized = serialized.replaceAll(
      new RegExp(`\\b${key}\\b`, "g"),
      value,
    );
  }

  return serialized;
};

/**
 * Better array stringification with function scope handling via {@linkcode stringifyFunction}
 */
export const stringifyArray = (arr: Array<any>) => {
  let str = "[";

  for (const v of arr) {
    if (["undefined", "boolean", "number"].includes(typeof v)) {
      str += `${v},`;
    } else if (typeof v === "string") {
      str += `${JSON.stringify(v)},`;
    } else if (v === null) {
      str += `null,`;
    } else if (typeof v === "object") {
      if (Array.isArray(v)) {
        str += `${stringifyArray(v)},`;
      } else {
        str += `${stringifyObject(v)},`;
      }
    } else if (typeof v === "function") {
      str += `${stringifyFunction(v)},`;
    }
  }

  str += "]";

  return str;
};

/**
 * Better object stringification with function scope handling via {@linkcode stringifyFunction}
 *
 * An object stringified with this function is equivalent to itself when loaded back in memory
 *
 * @example
 * const obj = { name: "Bob", age: 50 }
 * const stringified = `export const obj = ${stringifyObject(obj)};`
 * Deno.write("./obj.ts", stringified)
 *
 * const loaded = (await import("./obj.ts"))["obj"]
 * assertObjectMatch(obj, loaded);
 * assertObjectMatch(loaded, obj);
 */
export const stringifyObject = (obj: Record<string, any>) => {
  let str = "{";

  for (const [k, v] of Object.entries(obj)) {
    const key = /(^\d|\W)/.test(k) ? JSON.stringify(k) : k;
    switch (type(v)) {
      case "string":
        str += `${key}: ${JSON.stringify(v)},`;
        break;
      case "array":
        str += `${key}: ${stringifyArray(v)},`;
        break;
      case "function":
      case "AsyncFunction":
        str += `${key}: ${stringifyFunction(v)},`;
        break;
      case "object":
        str += `${key}: ${stringifyObject(v)},`;
        break;
      default:
        str += `${key}: ${v},`;
    }
  }

  str += "}";

  return str;
};
