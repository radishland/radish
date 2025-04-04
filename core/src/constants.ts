export const buildFolder = "build";
export const elementsFolder = "elements";
export const routesFolder = "routes";
export const libFolder = "lib";
export const staticFolder = "static";
export const generatedFolder = "_generated";

export const ts_extension_regex = /\.ts$/;

/**
 * Sets the following browser globals `window`, `customElements`, `document`, `HTMLElement` for better behavior on the server out of the box.
 *
 * - `window`, and `customElements` are set to `undefined`
 * - methods of `HTMLElement` are no-op on the server
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
