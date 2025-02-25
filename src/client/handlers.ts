import { bindingConfig } from "./config.ts";
import { spaces_sep_by_comma } from "./utils.ts";

const bindingsQueryString = Object.keys(bindingConfig).map((property) =>
  `[\\@bind\\:${property}]`
).join(",");

setTimeout(() => {
  customElements?.whenDefined("handler-registry").then(() => {
    document.querySelectorAll(
      `[\\@on],[\\@use],[\\@attr],[\\@attr\\|client],[\\@prop],${bindingsQueryString},[\\@text],[\\@html]`,
    )
      .forEach(
        (entry) => {
          const events = entry.getAttribute("@on")?.trim()
            ?.split(spaces_sep_by_comma);

          if (events) {
            for (const event of events) {
              const [type, handler] = event.split(":");

              const onRequest = new CustomEvent("@on-request", {
                bubbles: true,
                cancelable: true,
                composed: true,
                detail: {
                  type,
                  handler: handler || type,
                },
              });

              entry.dispatchEvent(onRequest);
            }
          }

          const hooks = entry.getAttribute("@use")?.trim()
            ?.split(spaces_sep_by_comma);

          if (hooks) {
            for (const hook of hooks) {
              const useRequest = new CustomEvent("@use-request", {
                bubbles: true,
                cancelable: true,
                composed: true,
                detail: {
                  hook,
                },
              });

              entry.dispatchEvent(useRequest);
            }
          }

          const props = (entry.getAttribute("@prop"))?.trim()
            .split(spaces_sep_by_comma);

          if (props) {
            for (const prop of props) {
              const [key, value] = prop.split(":");

              const propRequest = new CustomEvent("@prop-request", {
                bubbles: true,
                cancelable: true,
                composed: true,
                detail: {
                  property: key,
                  identifier: value || key,
                },
              });

              entry.dispatchEvent(propRequest);
            }
          }

          const text = entry.hasAttribute("@text");

          if (text) {
            const identifier = entry.getAttribute("@text") || "text";

            const textRequest = new CustomEvent("@text-request", {
              bubbles: true,
              cancelable: true,
              composed: true,
              detail: {
                identifier,
              },
            });

            entry.dispatchEvent(textRequest);
          }

          const html = entry.hasAttribute("@html");

          if (html) {
            const identifier = entry.getAttribute("@html") || "html";

            const htmlRequest = new CustomEvent("@html-request", {
              bubbles: true,
              cancelable: true,
              composed: true,
              detail: {
                identifier,
              },
            });

            entry.dispatchEvent(htmlRequest);
          }

          const classList = entry.hasAttribute("@class");

          if (classList) {
            const identifier = entry.getAttribute("@class") || "class";

            const classRequest = new CustomEvent("@class-request", {
              bubbles: true,
              cancelable: true,
              composed: true,
              detail: {
                identifier,
              },
            });

            entry.dispatchEvent(classRequest);
          }

          const attributes = [
            ...(entry.getAttribute("@attr"))?.trim()
              .split(spaces_sep_by_comma) ?? [],
            ...(entry.getAttribute("@attr|client"))?.trim()
              .split(spaces_sep_by_comma) ?? [],
          ];

          if (attributes.length > 0) {
            for (const attribute of attributes) {
              const [key, value] = attribute.split(":");

              const attrRequest = new CustomEvent("@attr-request", {
                bubbles: true,
                cancelable: true,
                composed: true,
                detail: {
                  attribute: key,
                  identifier: value || key,
                },
              });

              entry.dispatchEvent(attrRequest);
            }
          }

          for (const property of Object.keys(bindingConfig)) {
            if (entry.hasAttribute(`@bind:${property}`)) {
              const identifier =
                entry.getAttribute(`@bind:${property}`)?.trim() ||
                property;

              const bindRequest = new CustomEvent("@bind-request", {
                bubbles: true,
                cancelable: true,
                composed: true,
                detail: {
                  property,
                  identifier,
                  handled: false,
                },
              });

              entry.dispatchEvent(bindRequest);
            }
          }
        },
      );
  });
}, 100);
