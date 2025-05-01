import { config } from "../../../effects/config.ts";
import { handlerFor } from "../../../effects/effects.ts";
import { Handler } from "../../../effects/handlers.ts";
import { render } from "../../../effects/render.ts";

export const handleSpeculationRules = handlerFor(
  render.route,
  async (route, insertHead, insertBody) => {
    const { speculationRules } = await config.read();

    if (speculationRules) {
      insertHead += `
      <script type="speculationrules">
        ${JSON.stringify(speculationRules)}
      </script>`;
    }

    return Handler.continue(route, insertHead, insertBody);
  },
);
