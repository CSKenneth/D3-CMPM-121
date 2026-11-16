import { assertEquals } from "@std/assert";
import { apply, cellNow, terrainAt } from "./mod.ts";
import { standingOn } from "./test_helpers.ts";

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
