import { assertEquals } from "@std/assert";
import { apply, cellNow, isPassable, terrainAt } from "./mod.ts";
import type { GameState } from "./mod.ts";
import { standingOn } from "./test_helpers.ts";
import { newGame } from "./mod.ts";

const SEED = 121;

Deno.test("gathering a forest yields wood and leaves grass", () => {
  const state = standingOn(SEED, "forest");
  const { x, y } = state.player;

  const events = apply(state, { type: "gather" });

  assertEquals(events, [{
    type: "gathered",
    at: { x, y },
    item: "wood",
    was: "forest",
    now: "grass",
  }]);
  assertEquals(state.inventory, { wood: 1 });
});

Deno.test("a gathered cell reads as changed while the seed stays the same", () => {
  const state = standingOn(SEED, "forest");
  const { x, y } = state.player;

  apply(state, { type: "gather" });

  assertEquals(cellNow(state, x, y), "grass");
  assertEquals(terrainAt(SEED, x, y), "forest");
  assertEquals(state.changed, { [`${x},${y}`]: "grass" });
});

Deno.test("gathering grass yields grass and leaves dirt", () => {
  const state = standingOn(SEED, "grass");
  const { x, y } = state.player;

  const events = apply(state, { type: "gather" });

  assertEquals(events, [{
    type: "gathered",
    at: { x, y },
    item: "grass",
    was: "grass",
    now: "dirt",
  }]);
  assertEquals(state.inventory, { grass: 1 });
});

Deno.test("a cell runs dry: forest, then grass, then nothing", () => {
  const state = standingOn(SEED, "forest");
  const { x, y } = state.player;

  apply(state, { type: "gather" });
  apply(state, { type: "gather" });
  const before = JSON.parse(JSON.stringify(state));
  const events = apply(state, { type: "gather" });

  assertEquals(events, [{
    type: "nothing_to_gather",
    at: { x, y },
    terrain: "dirt",
  }]);
  assertEquals(state, before);
  assertEquals(state.inventory, { wood: 1, grass: 1 });
});

Deno.test("gathering where nothing yields changes nothing", () => {
  const state = standingOn(SEED, "water");
  const before = JSON.parse(JSON.stringify(state));
  const { x, y } = state.player;

  const events = apply(state, { type: "gather" });

  assertEquals(events, [{
    type: "nothing_to_gather",
    at: { x, y },
    terrain: "water",
  }]);
  assertEquals(state, before);
});

Deno.test("gathered state survives a trip through JSON", () => {
  const state = standingOn(SEED, "forest");
  const { x, y } = state.player;
  apply(state, { type: "gather" });

  const copy = JSON.parse(JSON.stringify(state));

  assertEquals(copy, state);
  assertEquals(cellNow(copy, x, y), "grass");
});

Deno.test("a gather event keeps its cell while state moves on", () => {
  const state = standingOn(SEED, "forest");
  const { x, y } = state.player;

  const events = apply(state, { type: "gather" });
  state.player.x += 5;
  state.player.y += 5;

  assertEquals(events[0].type, "gathered");
  assertEquals(
    (events[0] as { at: { x: number; y: number } }).at,
    { x, y },
  );
});

// A state with the player just west of a rock cell, on open ground.
function besideRock(): GameState {
  for (let y = 0; y < 200; y++) {
    for (let x = 1; x < 200; x++) {
      if (
        terrainAt(SEED, x, y) === "rock" &&
        isPassable(terrainAt(SEED, x - 1, y))
      ) {
        return { ...newGame(SEED), player: { x: x - 1, y } };
      }
    }
  }
  throw new Error("Found no rock with open ground to its west.");
}

Deno.test("rock blocks a player without a pickaxe", () => {
  const state = besideRock();
  const before = JSON.parse(JSON.stringify(state));

  const events = apply(state, { type: "move", direction: "east" });

  assertEquals(events[0].type, "blocked");
  assertEquals(state, before);
});

Deno.test("a pickaxe lets the player walk onto rock", () => {
  const state = besideRock();
  state.inventory.pickaxe = 1;
  const { x, y } = state.player;

  const events = apply(state, { type: "move", direction: "east" });

  assertEquals(events[0].type, "moved");
  assertEquals(state.player, { x: x + 1, y });
});

Deno.test("with a pickaxe, gathering rock yields stone and leaves dirt", () => {
  const state = standingOn(SEED, "rock");
  state.inventory.pickaxe = 1;
  const { x, y } = state.player;

  const events = apply(state, { type: "gather" });

  assertEquals(events, [{
    type: "gathered",
    at: { x, y },
    item: "stone",
    was: "rock",
    now: "dirt",
  }]);
  assertEquals(state.inventory, { pickaxe: 1, stone: 1 });
  assertEquals(cellNow(state, x, y), "dirt");
});

Deno.test("without a pickaxe, rock yields nothing and changes nothing", () => {
  const state = standingOn(SEED, "rock");
  const before = JSON.parse(JSON.stringify(state));

  const events = apply(state, { type: "gather" });

  assertEquals(events[0].type, "nothing_to_gather");
  assertEquals(state, before);
});
