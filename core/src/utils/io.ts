export function throwUnlessNotFound(error: unknown) {
  if (!(error instanceof Deno.errors.NotFound)) {
    throw error;
  }
}
