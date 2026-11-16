import { assert, assertEquals } from "@std/assert";
import {
  apply,
  GATHERS,
  missingFor,
  newGame,
  type Recipe,
  RECIPES,
} from "./mod.ts";

const SEED = 121;

// Every test reads its amounts from the table, so tuning a number breaks nothing.
const recipe: Recipe = RECIPES[0];
const [firstInput] = Object.keys(recipe.inputs);

Deno.test("crafting spends the inputs and adds the output", () => {
  const state = newGame(SEED);
  state.inventory = {
    ...recipe.inputs,
    [firstInput]: recipe.inputs[firstInput] + 1,
  };

  const events = apply(state, { type: "craft", recipe: recipe.id });

  assertEquals(events, [{
    type: "crafted",
    recipe: recipe.id,
    item: recipe.output.item,
    count: recipe.output.count,
    inventory: { [firstInput]: 1, [recipe.output.item]: recipe.output.count },
  }]);
  assertEquals(state.inventory, {
    [firstInput]: 1,
    [recipe.output.item]: recipe.output.count,
  });
});

Deno.test("a crafted event keeps its inventory while state moves on", () => {
  const state = newGame(SEED);
  state.inventory = { ...recipe.inputs };

  const events = apply(state, { type: "craft", recipe: recipe.id });
  state.inventory[recipe.output.item] += 100;

  assertEquals(events[0].type, "crafted");
  assertEquals(
    (events[0] as { inventory: Record<string, number> }).inventory,
    { [recipe.output.item]: recipe.output.count },
  );
});

Deno.test("a failed craft reports what is missing and changes nothing", () => {
  const state = newGame(SEED);
  const before = JSON.parse(JSON.stringify(state));

  const events = apply(state, { type: "craft", recipe: recipe.id });

  assertEquals(events, [{
    type: "craft_failed",
    recipe: recipe.id,
    missing: { ...recipe.inputs },
  }]);
  assertEquals(state, before);
});

Deno.test("missingFor counts only the shortfall, and is empty when ready", () => {
  const state = newGame(SEED);
  state.inventory = { [firstInput]: recipe.inputs[firstInput] - 1 };
  assertEquals(missingFor(state, recipe)[firstInput], 1);

  state.inventory = { ...recipe.inputs };
  assertEquals(missingFor(state, recipe), {});
});

Deno.test("crafted state survives a trip through JSON", () => {
  const state = newGame(SEED);
  state.inventory = { ...recipe.inputs };
  apply(state, { type: "craft", recipe: recipe.id });

  assertEquals(JSON.parse(JSON.stringify(state)), state);
});

// Content tests: they check the data, not the code.
function sources(): Set<string> {
  const found = new Set<string>();
  for (const gathering of Object.values(GATHERS)) {
    if (gathering) found.add(gathering.item);
  }
  for (const row of RECIPES) found.add(row.output.item);
  return found;
}

Deno.test("every recipe input can be gathered or made", () => {
  const available = sources();
  for (const row of RECIPES) {
    for (const item of Object.keys(row.inputs)) {
      assert(
        available.has(item),
        `Recipe "${row.id}" needs "${item}", which nothing gathers or makes.`,
      );
    }
  }
});

Deno.test("recipe ids are unique and amounts are positive integers", () => {
  const ids = RECIPES.map((row) => row.id);
  assertEquals(new Set(ids).size, ids.length);
  for (const row of RECIPES) {
    const amounts = [...Object.values(row.inputs), row.output.count];
    for (const amount of amounts) {
      assert(Number.isInteger(amount) && amount > 0, `Bad amount in ${row.id}`);
    }
  }
});

Deno.test("every tool a gathering requires can be gathered or made", () => {
  const available = sources();
  for (const [terrain, gathering] of Object.entries(GATHERS)) {
    if (gathering?.requires) {
      assert(
        available.has(gathering.requires),
        `Gathering ${terrain} needs "${gathering.requires}", which nothing gathers or makes.`,
      );
    }
  }
});
