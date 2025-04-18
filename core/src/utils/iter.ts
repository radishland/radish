import type { MaybePromise } from "../types.d.ts";

/**
 * Maps an AsyncIterator<T> to an AsyncIterator<U> via a mapper T -> MaybePromise<U>
 */
export async function* mapAsyncIterator<T, U>(
  iter: AsyncIterableIterator<T>,
  map: (item: T) => MaybePromise<U>,
): AsyncIterableIterator<U> {
  for await (const entry of iter) {
    yield await map(entry);
  }
}
