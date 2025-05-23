import { join } from "@std/path";
import { generatedFolder } from "../constants.ts";
import { createEffect, type Effect } from "@radish/effect-system";

export interface ImportMap {
  imports?: Record<string, string>;
  scopes?: {
    [scope: string]: Record<string, string>;
  };
  integrity?: {
    [url: string]: string;
  };
}

interface ImportmapOps {
  get: () => ImportMap;
  write: () => void;
}

export const importmap: {
  get: () => Effect<ImportMap>;
  write: () => Effect<void>;
} = {
  get: createEffect<ImportmapOps["get"]>("importmap/get"),
  write: createEffect<ImportmapOps["write"]>("importmap/write"),
};

export const importmapPath: string = join(generatedFolder, "importmap.json");
