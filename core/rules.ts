// The rules of the game. There is no clock here: a command updates the state at
// once, and the events it returns are a record of what happened. Whoever called
// apply() decides how, or whether, to show them over time.

import { CAPSTONE_RECIPE_ID, type Recipe, recipeById } from "./recipes.ts";
import { GATHERS, isPassable, type Terrain, terrainAt } from "./terrain.ts";

export type Cell = { x: number; y: number };

export type Direction = "north" | "south" | "east" | "west";

// Plain data that survives JSON. Terrain is absent because the seed can recompute
// it: besides the seed, only what the player has caused belongs here.
export type GameState = {
  seed: number;
  player: Cell;
  inventory: Record<string, number>;
  changed: Record<string, Terrain>;
  ended: boolean;
};

// Command: https://gameprogrammingpatterns.com/command.html
export type Command =
  | { type: "move"; direction: Direction }
  | { type: "gather" }
  | { type: "craft"; recipe: string };

// Domain Event: https://martinfowler.com/eaaDev/DomainEvent.html
export type GameEvent =
  | { type: "moved"; from: Cell; to: Cell }
  | { type: "blocked"; at: Cell; toward: Cell; terrain: Terrain }
  | { type: "gathered"; at: Cell; item: string; was: Terrain; now: Terrain }
  | { type: "nothing_to_gather"; at: Cell; terrain: Terrain }
  // Both craft events carry copies, never objects that state still holds.
  | {
    type: "crafted";
    recipe: string;
    item: string;
    count: number;
    inventory: Record<string, number>;
  }
  | { type: "craft_failed"; recipe: string; missing: Record<string, number> }
  | { type: "ended" };

const STEPS: Record<Direction, Cell> = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  east: { x: 1, y: 0 },
  west: { x: -1, y: 0 },
};

// Singleton, avoided on purpose: tests make as many games as they need. https://gameprogrammingpatterns.com/singleton.html
export function newGame(seed: number): GameState {
  return {
    seed,
    player: { x: 0, y: 0 },
    inventory: {},
    changed: {},
    ended: false,
  };
}

export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function cellNow(state: GameState, x: number, y: number): Terrain {
  return state.changed[cellKey(x, y)] ?? terrainAt(state.seed, x, y);
}

// What the inventory lacks for a recipe, as data: item to how many more are
// needed. Empty means ready. The rule, the page, and the tests all ask this.
export function missingFor(
  state: GameState,
  recipe: Recipe,
): Record<string, number> {
  const missing: Record<string, number> = {};
  for (const [item, needed] of Object.entries(recipe.inputs)) {
    const short = needed - (state.inventory[item] ?? 0);
    if (short > 0) missing[item] = short;
  }
  return missing;
}

// Open terrain, or terrain that the player's tools can get through.
function canEnter(state: GameState, terrain: Terrain): boolean {
  if (isPassable(terrain)) return true;
  const requires = GATHERS[terrain]?.requires;
  return requires !== undefined && (state.inventory[requires] ?? 0) > 0;
}

// The single way in. It updates the state it is given and returns the events.
export function apply(state: GameState, command: Command): GameEvent[] {
  if (state.ended) return [];

  switch (command.type) {
    case "move":
      return move(state, command.direction);
    case "gather":
      return gather(state);
    case "craft":
      return craft(state, command.recipe);
  }
}

function move(state: GameState, direction: Direction): GameEvent[] {
  const step = STEPS[direction];
  // Events are retained and played back later, while state keeps changing. So an
  // event gets cells of its own, never an object that state still holds.
  // Aliasing Bug: https://martinfowler.com/bliki/AliasingBug.html
  // Cells in events act as a Value Object: https://martinfowler.com/bliki/ValueObject.html
  const from = { ...state.player };
  const to = { x: from.x + step.x, y: from.y + step.y };
  const terrain = cellNow(state, to.x, to.y);
  if (!canEnter(state, terrain)) {
    return [{ type: "blocked", at: from, toward: to, terrain }];
  }
  state.player.x = to.x;
  state.player.y = to.y;
  return [{ type: "moved", from, to }];
}

function gather(state: GameState): GameEvent[] {
  const at = { ...state.player };
  const was = cellNow(state, at.x, at.y);
  const row = GATHERS[was];
  if (!row || (row.requires && !state.inventory[row.requires])) {
    return [{ type: "nothing_to_gather", at, terrain: was }];
  }
  state.inventory[row.item] = (state.inventory[row.item] ?? 0) + 1;
  state.changed[cellKey(at.x, at.y)] = row.leaves;
  return [{ type: "gathered", at, item: row.item, was, now: row.leaves }];
}

function craft(state: GameState, id: string): GameEvent[] {
  const recipe = recipeById(id);
  // The page only offers rows of the table, so an unknown id is a bug, not play.
  if (!recipe) throw new Error(`Unknown recipe: ${id}`);
  const missing = missingFor(state, recipe);
  if (Object.keys(missing).length > 0) {
    return [{ type: "craft_failed", recipe: id, missing }];
  }
  for (const [item, needed] of Object.entries(recipe.inputs)) {
    const left = (state.inventory[item] ?? 0) - needed;
    // Keep the saved state free of zero entries.
    if (left > 0) state.inventory[item] = left;
    else delete state.inventory[item];
  }
  const { item, count } = recipe.output;
  state.inventory[item] = (state.inventory[item] ?? 0) + count;
  const craftedEvent: GameEvent = {
    type: "crafted",
    recipe: id,
    item,
    count,
    inventory: { ...state.inventory },
  };

  if (id === CAPSTONE_RECIPE_ID) {
    state.ended = true;
    return [craftedEvent, { type: "ended" }];
  }

  return [craftedEvent];
}
