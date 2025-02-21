export const bindingConfig = {
  "checked": {
    element: ["input"],
    type: ["boolean"],
    event: "change",
  },
  "value": {
    element: ["input", "select", "textarea"],
    type: ["string", "number"],
    event: "input",
  },
} as const;
