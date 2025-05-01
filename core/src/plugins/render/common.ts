import { booleanAttributes } from "@radish/htmlcrunch";
import { assertArrayIncludes } from "@std/assert";

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
    value && attributes.push([attribute, ""]);
  } else {
    attributes.push([attribute, `${value}`]);
  }
};
