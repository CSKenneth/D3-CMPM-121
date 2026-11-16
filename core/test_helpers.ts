import { type Cell, type GameState, newGame, terrainAt } from "./mod.ts";
import type { Terrain } from "./mod.ts";

export function findCell(seed: number, terrain: Terrain): Cell {
  for (let y = 0; y < 200; y++) {
    for (let x = 0; x < 200; x++) {
      if (terrainAt(seed, x, y) === terrain) return { x, y };
    }
  }
  throw new Error(`Found no ${terrain} cell.`);
}

export function standingOn(seed: number, terrain: Terrain): GameState {
  const state = newGame(seed);
  state.player = findCell(seed, terrain);
  return state;
}
