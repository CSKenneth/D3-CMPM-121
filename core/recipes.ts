// The recipe table: data, not code. Adding a recipe means adding a row. If a row
// ever needs new code to work, the design has a flaw, and this is the place to
// find it.

export type Recipe = {
  // Stable name used by the craft command and by tests.
  readonly id: string;
  // What the player sees.
  readonly name: string;
  // Item name to the amount spent.
  readonly inputs: Readonly<Record<string, number>>;
  readonly output: { readonly item: string; readonly count: number };
};

export const RECIPES: readonly Recipe[] = [
  {
    id: "plank",
    name: "Plank",
    inputs: { wood: 2 },
    output: { item: "plank", count: 1 },
  },
  {
    id: "stick",
    name: "Stick",
    inputs: { plank: 2, wood: 1 },
    output: { item: "stick", count: 1 },
  },
  {
    id: "pickaxe",
    name: "Pickaxe",
    inputs: { plank: 3, stick: 2 },
    output: { item: "pickaxe", count: 1 },
  },
];

export function recipeById(id: string): Recipe | undefined {
  return RECIPES.find((recipe) => recipe.id === id);
}
