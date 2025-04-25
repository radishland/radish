import { join } from "@std/path";
import { generatedFolder } from "../constants.ts";
import { createEffect, type EffectWithType } from "./effects.ts";

export interface ImportMap {
  imports?: Record<string, string>;
  scopes?: {
    [scope: string]: Record<string, string>;
  };
  integrity?: {
    [url: string]: string;
  };
}

interface ImportmapOperations {
  get: () => ImportMap;
  write: () => void;
}

export const importmap: {
  get: EffectWithType<[], ImportMap>;
  write: EffectWithType<[], void>;
} = {
  get: createEffect<ImportmapOperations["get"]>("importmap/get"),
  write: createEffect<ImportmapOperations["write"]>("importmap/write"),
};

export const importmapPath: string = join(generatedFolder, "importmap.json");
