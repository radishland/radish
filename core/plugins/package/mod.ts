import { build, manifest } from "$effects/mod.ts";
import type { Plugin } from "@radish/effect-system";
import { Handler, handlerFor } from "@radish/effect-system";
import { relative } from "@std/path";

/**
 * This plugin factory let's you distribute your UI library, elements etc.
 *
 * In particular you can share components that make use of directives or any other feature having server semantics.
 *
 * The folder structure of your library should follow the Radish convention
 *
 * ```
 * my-ui-lib/
 * ├ elements/ <-- elements (optional)
 * ├ routes/   <-- routes (optional)
 * └ mod.ts    <-- entry point
 * ```
 *
 * @example Packaging & using a UI library
 *
 * To create your plugin just call `createPackage` and pass it a name for the plugin and the path to the root folder
 *
 * ```ts
 * // my-ui-lib/mod.ts
 * import { createPackage } from "@radish/core/plugins";
 *
 * const root = import.meta.dirname!;
 * export const pluginStdElements = createPackage("my-ui-plugin", root);
 * ```
 *
 * @example Using it
 *
 * To use the library just add it at the top of the plugins list in your app's `start.ts` file. That's it!
 *
 * You can then use the elements in your markup; modules will be auto-imported, shadowroots will be Server-Side-Rendered etc.
 *
 * ```ts start.ts
 * import { HandlerScope } from "@radish/effect-system";
 * import { pluginStdElements } from "@radish/elements";
 *
 * const scope = new HandlerScope(
 *   pluginStdElements,
 *   //...
 * );
 * ```
 *
 * @param name The name of the returned plugin
 * @param root The path to the root folder
 * @return A {@linkcode Plugin} allowing people to import your elements
 */
export const createPackage = (name: string, root: string): Plugin => {
  const onManifestUpdate = handlerFor(
    manifest.updateEntries,
    async (glob, options) => {
      await manifest.updateEntries(glob, options);
      await manifest.updateEntries("+(elements|routes)/**", { root });
    },
    { once: true, reentrant: false },
  );

  const onBuildFiles = handlerFor(build.files, async (glob, options) => {
    await build.files(`+(elements|routes)/**`, { root });

    return Handler.continue(glob, options);
  }, { reentrant: false });

  const onBuildDest = handlerFor(build.dest, async (path) => {
    if (path.startsWith(relative(Deno.cwd(), root))) {
      return await build.dest(relative(root, path));
    }

    return Handler.continue(path);
  }, { reentrant: false });

  return {
    name,
    handlers: [
      onManifestUpdate,
      onBuildFiles,
      onBuildDest,
    ],
  };
};
