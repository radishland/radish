/**
 * This module exports all the conventions used throughout the framework
 *
 * You can use this module to create plugins relying on the framework conventions
 *
 * @module
 */

import { join } from "@std/path";

/**
 * Path to the build folder
 */
export const buildFolder = "build";

/**
 * Path to the elements folder
 */
export const elementsFolder = "elements";

/**
 * Path to the routes folder
 */
export const routesFolder = "routes";

/**
 * Path to the lib folder
 */
export const libFolder = "lib";

/**
 * Path to the static files folder
 */
export const staticFolder = "static";

/**
 * Path to the generated content folder
 */
export const generatedFolder = "_generated";

/**
 * Path to the app skeleton
 */
export const appPath: string = join(routesFolder, "_app.html");

/**
 * Regex targeting the %radish.head% of the skeleton
 */
export const target_head = /^\s*%radish\.head%/m;
