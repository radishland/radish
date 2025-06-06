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
