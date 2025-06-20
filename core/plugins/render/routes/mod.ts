import { handleAutoImport } from "./auto-import/auto-import.ts";
import { handleRouteBase } from "./base.ts";
import { handleRouteLayoutsAndHeadElements } from "./layouts-and-head.ts";
import { handleSpeculationRules } from "./speculation-rules.ts";

/**
 * @performs
 * - `config/read`
 * - `build/dest`
 * - `fs/read`
 * - `manifest/get`
 */
export const handleRoutes = [
  handleSpeculationRules,
  handleAutoImport,
  handleRouteLayoutsAndHeadElements,
  handleRouteBase,
];
