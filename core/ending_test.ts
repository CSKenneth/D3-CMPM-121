import { apply, newGame } from "./mod.ts";
import { CAPSTONE_RECIPE_ID } from "./recipes.ts";
import { assertEquals } from "@std/assert";

const SEED = 121;

Deno.test("crafting the capstone ends the game", () => {
  const state = newGame(SEED);
  state.inventory = {
    dense_core: 8,
    dense_fuel: 8,
    dense_biomass: 8,
  };

  const events = apply(state, { type: "craft", recipe: CAPSTONE_RECIPE_ID });
  assertEquals(state.ended, true);
  assertEquals(events.length, 2);
  assertEquals(events[0].type, "crafted");
  assertEquals(events[1].type, "ended");

  const endedState = JSON.parse(JSON.stringify(state));

  const commands = [
    { type: "move", direction: "north" },
    { type: "gather" },
    { type: "craft", recipe: "plank" },
  ] as const;

  for (const command of commands) {
    const events = apply(state, command);
    assertEquals(events, []);
    assertEquals(state, endedState);
  }
});
