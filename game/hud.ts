import {
  cellKey,
  type GameEvent,
  type GameState,
  type Terrain,
  terrainAt,
} from "../core/mod.ts";

function element(id: string): HTMLElement {
  return document.getElementById(id)!;
}

function describe(event: GameEvent): string {
  switch (event.type) {
    case "moved":
      return `moved to ${event.to.x}, ${event.to.y}`;
    case "blocked":
      return `blocked by ${event.terrain} at ${event.toward.x}, ${event.toward.y}`;
    case "gathered":
      return `gathered ${event.item} at ${event.at.x}, ${event.at.y}`;
    case "nothing_to_gather":
      return `nothing to gather here`;
  }
}

function inventoryElement(): HTMLElement {
  const existing = document.getElementById("inventory");
  if (existing) return existing;
  const line = document.createElement("div");
  const value = document.createElement("span");
  value.id = "inventory";
  line.append("Inventory: ", value);
  element("terrain").insertAdjacentElement("afterend", line);
  return value;
}

// The readout, as ordinary page elements that CSS can style and that assistive
// tools can read. It changes only as events play.
export class Hud {
  private readonly seed: number;
  private readonly changed: Record<string, Terrain>;
  private readonly inventory: Record<string, number>;
  private position: { x: number; y: number };

  constructor(state: GameState) {
    this.seed = state.seed;
    this.changed = { ...state.changed };
    this.inventory = { ...state.inventory };
    this.position = { ...state.player };
    this.showPosition();
    this.showInventory();
  }

  show(event: GameEvent) {
    element("live").textContent = describe(event);
    if (event.type === "moved") {
      this.position = { ...event.to };
      this.showPosition();
    }
    if (event.type === "gathered") {
      this.changed[cellKey(event.at.x, event.at.y)] = event.now;
      this.inventory[event.item] = (this.inventory[event.item] ?? 0) + 1;
      this.showPosition();
      this.showInventory();
    }
  }

  private showPosition() {
    const { x, y } = this.position;
    element("position").textContent = `${x}, ${y}`;
    element("terrain").textContent = this.changed[cellKey(x, y)] ??
      terrainAt(this.seed, x, y);
  }

  private showInventory() {
    const entries = Object.entries(this.inventory);
    inventoryElement().textContent = entries.length === 0
      ? "empty"
      : entries.map(([item, count]) => `${item}: ${count}`).join(", ");
  }
}
