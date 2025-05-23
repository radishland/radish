export const setTimeoutWithAbort = (
  handler: () => void,
  timeout?: number,
  signal?: AbortSignal,
) => {
  if (signal?.aborted) return;

  const id = setTimeout(() => {
    if (!signal?.aborted) {
      handler();
    }
  }, timeout);

  signal?.addEventListener("abort", () => {
    clearTimeout(id);
  });
};

/**
 * Applies an async callback to every entry of an array and returns the new array
 */
export const asyncMap = async <T, U>(arr: T[], fn: (el: T) => Promise<U>) => {
  const newArr = [];
  for (const el of arr) {
    const res = await fn(el);
    newArr.push(res);
  }
  return newArr;
};
