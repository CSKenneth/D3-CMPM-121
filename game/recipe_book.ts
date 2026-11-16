import {
  type Command,
  type GameState,
  missingFor,
  RECIPES,
} from "../core/mod.ts";

// The recipe list on the page. It knows the table and the state, and a function
// to call on a click: it never learns about the controller.
export class RecipeBook {
  private readonly state: GameState;
  // One button per row, in table order. Never rebuilt, so keyboard focus stays.
  private readonly buttons: HTMLButtonElement[] = [];

  constructor(
    list: HTMLElement,
    state: GameState,
    craft: (command: Command) => void,
  ) {
    this.state = state;
    for (const row of RECIPES) {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.addEventListener("click", (event) => {
        craft({ type: "craft", recipe: row.id });
        // After a mouse click, give keys back to the game. Keyboard users keep
        // focus, since a focused button keeps Space and Enter for itself.
        if (event.detail > 0) button.blur();
      });
      item.append(button);
      list.append(item);
      this.buttons.push(button);
    }
  }

  // Change the buttons, never rebuild them, and never disable them: a disabled
  // button cannot say why a craft failed.
  update() {
    RECIPES.forEach((row, index) => {
      const button = this.buttons[index];
      const missing = missingFor(this.state, row);
      const entries = Object.entries(missing);
      const ready = entries.length === 0;
      const cost = Object.entries(row.inputs)
        .map(([item, count]) => `${count} ${item}`)
        .join(" + ");
      button.textContent = ready
        ? `${row.name}: ${cost} -> ${row.output.count} ${row.output.item}`
        : `${row.name}: need ${
          entries.map(([item, count]) => `${count} more ${item}`).join(", ")
        }`;
      button.classList.toggle("ready", ready);
    });
  }
}
