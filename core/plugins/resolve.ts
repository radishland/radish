import type { Plugin } from "@radish/effect-system";

export const pluginResolveModule: Plugin = {
  name: "plugin-resolve",
  handlers: [
    // handlerFor(resolve.id, async (specifier) => {
    //   const config = await denoConfig.read();
    //   const aliases = Object.keys(config?.imports ?? {});
    //   const resolved = findLongestMatchingPrefix(specifier, aliases);

    //   assertExists(resolved.prefix, `Unresolved module specifier ${specifier}`);

    //   return {
    //     ...resolved,
    //     type: "bare specifier",
    //     isExternal: false,
    //   };
    // }),
  ],
};

/**
 * Finds the longest matching prefix of an import specifier against a list of prefixes
 *
 * Returns the (first) longest prefix of the list such that either the specifier and the
 * prefix are equal or the specifier is a subpath of its prefix (proper prefix)
 *
 * In the case of a proper prefix, the nonempty subpath is returned as well
 *
 * If the specifier doesn't match against the list, the best match is `undefined`
 */
export const findLongestMatchingPrefix = (
  specifier: string,
  prefixes: string[],
) => {
  let bestMatch: string | undefined;
  let path = "";

  for (const prefix of prefixes) {
    if (!specifier.startsWith(prefix)) continue;

    /**
     * If the whole prefix does not match then either the prefix is a directory ('/' suffix) or the specifier is a subpath ('/' prefix on the remaining part)
     */
    const remaining = specifier.slice(prefix.length);
    if (
      remaining.length > 0 &&
      !remaining.startsWith("/") &&
      !prefix.endsWith("/")
    ) continue;

    if (!bestMatch || bestMatch.length < prefix.length) {
      bestMatch = prefix;
      path = remaining;
    }
  }
  return { prefix: bestMatch, path };
};
