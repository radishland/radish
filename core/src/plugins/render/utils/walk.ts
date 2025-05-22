import { Kind, type MFragment, type MNode } from "@radish/htmlcrunch";

/**
 * Recursively applies an effect function to all nodes of a component tree
 */
export const walkTree = (tree: MNode, fn: (value: MNode) => void) => {
  fn(tree);

  if ("children" in tree && tree.children?.length) {
    for (const child of tree.children) {
      walkTree(child, fn);
    }
  }
};

/**
 * Collects the custom tag name dependencies of a fragment
 */
export const dependencies = (fragment: MFragment) => {
  const dependencies = new Set<string>();
  for (const element of fragment) {
    walkTree(element, (node) => {
      if (node.kind === Kind.CUSTOM) {
        dependencies.add(node.tagName);
      }
    });
  }

  return Array.from(dependencies);
};
