const is_upper = /[A-Z]/;
export const spaces_sep_by_comma = /\s*,\s*/;

/**
 * Idempotent string conversion to kebab-case
 * @param {string} str
 */
export const toKebabCase = (str) => {
  let kebab = "";
  for (let index = 0; index < str.length; index++) {
    const char = str[index];

    if (index !== 0 && is_upper.test(char)) {
      kebab += `-${char.toLowerCase()}`;
    } else {
      kebab += char.toLowerCase();
    }
  }
  return kebab;
};

/**
 * Idempotent string conversion to PascalCase
 * @param {string} str
 */
export const toPascalCase = (str) => {
  let pascal = "";
  let toUpper = true;

  for (let index = 0; index < str.length; index++) {
    const char = str[index];

    if (char === "-") {
      toUpper = true;
      continue;
    }

    if (toUpper) {
      pascal += char.toUpperCase();
      toUpper = false;
    } else {
      pascal += char.toLowerCase();
    }
  }
  return pascal;
};

export const booleanAttributes = [
  "allowfullscreen", // on <iframe>
  "async", // on <script>
  "autofocus", // on <button>, <input>, <select>, <textarea>
  "autoplay", // on <audio>, <video>
  "checked", // on <input type="checkbox">, <input type="radio">
  "controls", // on <audio>, <video>
  "default", // on <track>
  "defer", // on <script>
  "disabled", // on form elements like <button>, <fieldset>, <input>, <optgroup>, <option>,<select>, <textarea>
  "formnovalidate", // on <button>, <input type="submit">
  "hidden", // global
  "inert", // global
  "ismap", // on <img>
  "itemscope", // global; part of microdata
  "loop", // on <audio>, <video>
  "multiple", // on <input type="file">, <select>
  "muted", // on <audio>, <video>
  "nomodule", // on <script>
  "novalidate", // on <form>
  "open", // on <details>
  "readonly", // on <input>, <textarea>
  "required", // on <input>, <select>, <textarea>
  "reversed", // on <ol>
  "selected", // on <option>
];
