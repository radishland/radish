/**
 * Indicates whether the app is running in dev mode
 */
export const dev = (): boolean => {
  return Deno.args.includes("--dev");
};
