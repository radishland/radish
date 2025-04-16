import { join } from "@std/path";

export const buildFolder = "build";
export const elementsFolder = "elements";
export const routesFolder = "routes";
export const libFolder = "lib";
export const staticFolder = "static";
export const generatedFolder = "_generated";

/**
 * The path to the manifest file
 */
export const manifestPath: string = join(generatedFolder, "manifest.ts");

/**
 * Extracts import specifiers from import declarations or dynamic imports
 */
export const import_regex =
  /from\s["']([^'"]+)["']|import\(["']([^"']+)["']\)/g;
export const ts_extension_regex = /\.ts$/;

/**
 * Sets the following browser globals to no-op on the server: `window`, `customElements`,
 * `document`, `HTMLElement`
 */
export function globals() {
  // @ts-ignore mock HTMLElement methods on the server to be noop
  globalThis.HTMLElement = class HTMLElement {
    // Event Target
    addEventListener() {}
    dispatchEvent() {}
    removeEventListener() {}
    // Node
    appendChild() {}
    cloneNode() {}
    compareDocumentPosition() {}
    contains() {}
    getRootNode() {}
    hasChildNodes() {}
    insertBefore() {}
    isDefaultNamespace() {}
    isEqualNode() {}
    isSameNode() {}
    lookupNamespaceURI() {}
    lookupPrefix() {}
    normalize() {}
    removeChild() {}
    replaceChild() {}
    // Element
    after() {}
    animate() {}
    append() {}
    attachShadow() {}
    before() {}
    checkVisibility() {}
    closest() {}
    computedStyleMap() {}
    getAnimations() {}
    getAttribute() {}
    getAttributeNames() {}
    getAttributeNode() {}
    getAttributeNodeNS() {}
    getAttributeNS() {}
    getBoundingClientRect() {}
    getClientRects() {}
    getElementsByClassName() {}
    getElementsByTagName() {}
    getElementsByTagNameNS() {}
    getHTML() {}
    hasAttribute() {}
    hasAttributeNS() {}
    hasAttributes() {}
    hasPointerCapture() {}
    insertAdjacentElement() {}
    insertAdjacentHTML() {}
    insertAdjacentText() {}
    matches() {}
    prepend() {}
    querySelector() {}
    querySelectorAll() {}
    releasePointerCapture() {}
    remove() {}
    removeAttribute() {}
    removeAttributeNode() {}
    removeAttributeNS() {}
    replaceChildren() {}
    replaceWith() {}
    requestFullscreen() {}
    requestPointerLock() {}
    scroll() {}
    scrollBy() {}
    scrollIntoView() {}
    scrollTo() {}
    setAttribute() {}
    setAttributeNode() {}
    setAttributeNodeNS() {}
    setAttributeNS() {}
    setHTMLUnsafe() {}
    setPointerCapture() {}
    toggleAttribute() {}
    // HTML Element
    attachInternals() {}
    blur() {}
    click() {}
    focus() {}
    hidePopover() {}
    showPopover() {}
    togglePopover() {}
  };
  // @ts-ignore no op document methods on the server
  globalThis.document = {
    querySelector() {},
  };
  // @ts-ignore no window on the server
  globalThis.window = undefined;
  // @ts-ignore no customElements on the server
  globalThis.customElements = undefined;
}
