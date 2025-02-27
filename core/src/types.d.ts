export type Maybe<T> = T | undefined;
export type MaybePromise<T> = T | Promise<T>;

export type Transform = (
  options: { path: string; content: string },
) => MaybePromise<string>;
