import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

/**
 * Tests unitaires — la logique pure, celle qui se raisonne.
 *
 * On ne teste pas l'interface ici : pas de DOM, pas de rendu React. Ce
 * qui est couvert, c'est le raisonnement du World Building — réciprocité
 * des relations, générations, vocabulaire — parce que c'est exactement là
 * que les bugs se sont logés, et qu'une erreur y est invisible à l'œil.
 */
export default defineConfig({
  resolve: {
    alias: { "@": resolve(import.meta.dirname, "src") },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
