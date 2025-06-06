import { assertArrayIncludes } from "@std/assert";
import { booleanAttributes } from "@radish/htmlcrunch";

export const setAttribute = (
  attributes: [string, string][],
  attribute: string,
  value: unknown,
) => {
  assertArrayIncludes(
    ["string", "number", "boolean"],
    [typeof value],
    "Can only set primitive values as attributes",
  );

  if (booleanAttributes.includes(attribute)) {
    if (value) {
      attributes.push([attribute, ""]);
    }
  } else {
    attributes.push([attribute, `${value}`]);
  }
};
