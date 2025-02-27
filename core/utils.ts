const capitalize = (input: string) => {
  return input?.[0]?.toUpperCase() + input.slice(1);
};

export const kebabToPascal = (input: string): string => {
  return input.split("-").map(capitalize).join("");
};

/**
 * Generic memoize decorator for a function with no arguments
 */
export const memoize = <T>(fn: () => T): () => T => {
  let computed = false;
  let result: T;

  return () => {
    if (!computed) {
      computed = true;
      result = fn();
    }
    return result;
  };
};
