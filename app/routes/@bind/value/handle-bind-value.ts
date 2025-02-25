import { HandlerRegistry } from "@radish/core/runtime";
import { $state } from "@radish/core/runtime";

export class HandleBindValue extends HandlerRegistry {
  // Value: text
  text = $state("hi");
  inspectText() {
    console.log("text", this.text.value);
  }
  clearText() {
    this.text.value = "";
  }
  fillText() {
    this.text.value = "hello";
  }

  // Value: number
  number = $state(0);
  inspectNumber() {
    console.log("number", this.number.value);
  }
  incrementNumber() {
    this.number.value++;
  }
  decrementNumber() {
    this.number.value--;
  }

  // Value: range
  range = $state(3);
  inspectRange() {
    console.log("range", this.range.value);
  }
  incrementRange() {
    this.range.value++;
  }
  decrementRange() {
    this.range.value--;
  }

  // Value: date
  date = $state("2025-02-28");
  inspectDate() {
    console.log("date", this.date.value);
  }

  // Value: color
  color = $state("#aaee00");
  inspectColor() {
    console.log("color", this.color.value);
  }

  // Textarea
  textarea = $state("");
  inspectTextarea() {
    console.log("color", this.textarea.value);
  }
}

if (window && !customElements.get("handle-bind-value")) {
  customElements.define("handle-bind-value", HandleBindValue);
}
