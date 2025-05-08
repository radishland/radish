import { createEffect } from "@radish/effect-system";

type ResolvedSpecifier =
  | {
    id: string;
    /**
     * The corresponding alias in the deno.json config
     */
    alias?: string;
    /**
     * The imported subpath
     */
    path?: string;
    /**
     * Whether this is an external module
     */
    isExternal: false;
    type: "bare specifier";
    attributes?: { [key: string]: string };
  }
  | {
    id: string;
    alias?: never;
    path?: never;
    isExternal: false;
    type: "absolute" | "relative" | "url";
    attributes?: { [key: string]: string };
  }
  | {
    alias?: never;
    path?: never;
    isExternal: true;
    attributes?: { [key: string]: string };
  };

interface ResolveEffect {
  id: (specifier: string) => ResolvedSpecifier;
}

export const resolve = {
  /**
   * Returns the resolved id
   */
  id: createEffect<ResolveEffect["id"]>("resolve/import"),
};
