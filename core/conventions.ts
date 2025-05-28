import { join } from "@std/path";

export const buildFolder = "build";
export const elementsFolder = "elements";
export const routesFolder = "routes";
export const libFolder = "lib";
export const staticFolder = "static";
export const generatedFolder = "_generated";

export const appPath = join(routesFolder, "_app.html");

export const target_head = /^\s*%radish\.head%/m;
