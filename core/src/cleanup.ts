const resources = new AsyncDisposableStack();

/**
 * Registers an app-level resource cleanup hook to be called when the app is shutdown
 *
 * @example Cleanup the db connection
 *
 * ```ts
 * export const db = await connectDB();
 *
 * onDispose(async () => {
 *   await db.close();
 *   console.log("DB connection closed");
 * })
 * ```
 */
export const onDispose = (callback: () => PromiseLike<void> | void) => {
  resources.defer(callback);
};

/**
 * @internal
 */
export const dispose = async () => {
  await resources.disposeAsync();
};
