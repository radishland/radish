/**
 * Indents a string of content with the given amount of spacing
 *
 * When the text is on a single line this is like prepending spaces
 *
 * @param text The text string to indent
 * @param spaces The number of spaces to prepend to each line
 */
export const indent = (text: string, spaces: number) => {
  return text
    .split("\n")
    .map((line) => line.length ? " ".repeat(spaces) + line : line)
    .join("\n");
};
