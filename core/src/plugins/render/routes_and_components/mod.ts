import { handleComponent } from "./component.ts";
import { handleAutoImportComponents } from "./route_auto_import_components.ts";
import { handleRouteBase } from "./route_base.ts";
import { handleRouteLayoutsAndHeadElements } from "./route_layouts_and_head.ts";
import { handleSpeculationRules } from "./route_speculation_rules.ts";
import { handleInsertWebSocketScript } from "./route_web_sockets.ts";

export const handleComponentsAndRoutes = [
  handleComponent,
  handleSpeculationRules,
  handleAutoImportComponents,
  handleInsertWebSocketScript,
  handleRouteLayoutsAndHeadElements,
  handleRouteBase,
];
