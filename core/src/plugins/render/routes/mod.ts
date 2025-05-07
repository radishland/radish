import { handleAutoImportComponents } from "./auto-import-components.ts";
import { handleRouteBase } from "./base.ts";
import { handleRouteLayoutsAndHeadElements } from "./layouts-and-head.ts";
import { handleSpeculationRules } from "./speculation-rules.ts";
import { handleInsertWebSocketScript } from "./web-sockets.ts";

export const handleRoutes = [
  handleSpeculationRules,
  handleAutoImportComponents,
  handleInsertWebSocketScript,
  handleRouteLayoutsAndHeadElements,
  handleRouteBase,
];
