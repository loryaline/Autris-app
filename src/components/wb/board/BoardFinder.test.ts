import { describe, expect, it } from "vitest";
import type { WbBoardNode, WbEntry } from "@/types/database";
import { EMPTY_FILTER, dimmedByFilter, filterIsActive } from "./BoardFinder";

/**
 * Filtres d'affichage du plateau.
 *
 * Règle de fond : filtrer ESTOMPE, ne retire jamais. Une vignette
 * escamotée couperait les flèches qui la traversent et donnerait un
 * plateau faux plutôt qu'un plateau filtré. Ces tests verrouillent aussi
 * le cas des objets sans fiche — post-its, cadres — qu'un filtre de
 * catégorie ne doit jamais faire disparaître : ce sont les repères.
 */

function node(id: string, over: Partial<WbBoardNode> = {}): WbBoardNode {
  return {
    id,
    board_id: "b",
    user_id: "u",
    kind: "fiche",
    entry_id: null,
    x: 0,
    y: 0,
    w: 200,
    h: 116,
    z: 0,
    content: {},
    style: {},
    created_at: "",
    updated_at: "",
    ...over,
  } as WbBoardNode;
}

function entry(id: string, category: string): WbEntry {
  return { id, category } as WbEntry;
}

const entries = new Map<string, WbEntry>([
  ["e-perso", entry("e-perso", "personnages")],
  ["e-lieu", entry("e-lieu", "univers_monde")],
]);

describe("filterIsActive", () => {
  it("est faux quand rien n'est retenu", () => {
    expect(filterIsActive(EMPTY_FILTER)).toBe(false);
  });

  it("est vrai dès qu'un critère est posé", () => {
    expect(
      filterIsActive({ categories: new Set(["personnages"]), colors: new Set() }),
    ).toBe(true);
    expect(
      filterIsActive({ categories: new Set(), colors: new Set(["#60A5FA"]) }),
    ).toBe(true);
  });
});

describe("dimmedByFilter", () => {
  const perso = node("n1", { entry_id: "e-perso" });
  const lieu = node("n2", { entry_id: "e-lieu" });
  const postit = node("n3", { kind: "postit" });

  it("n'estompe rien sans filtre", () => {
    expect(dimmedByFilter([perso, lieu, postit], entries, EMPTY_FILTER).size).toBe(0);
  });

  it("estompe les fiches d'une autre catégorie", () => {
    const out = dimmedByFilter([perso, lieu], entries, {
      categories: new Set(["personnages"]),
      colors: new Set(),
    });
    expect(out.has("n2")).toBe(true);
    expect(out.has("n1")).toBe(false);
  });

  it("ÉPARGNE les objets sans fiche à un filtre de catégorie", () => {
    // Un post-it n'a pas de catégorie : l'estomper viderait le plateau de
    // ses repères alors qu'on cherchait à isoler des fiches.
    const out = dimmedByFilter([perso, postit], entries, {
      categories: new Set(["univers_monde"]),
      colors: new Set(),
    });
    expect(out.has("n3")).toBe(false);
  });

  it("estompe sur la couleur, objets sans fiche compris", () => {
    const bleu = node("n4", { kind: "postit", style: { color: "#60A5FA" } });
    const out = dimmedByFilter([postit, bleu], entries, {
      categories: new Set(),
      colors: new Set(["#60A5FA"]),
    });
    expect(out.has("n4")).toBe(false);
    expect(out.has("n3")).toBe(true);
  });

  it("traite une vignette sans couleur comme dorée", () => {
    const out = dimmedByFilter([perso], entries, {
      categories: new Set(),
      colors: new Set(["var(--accent)"]),
    });
    expect(out.size).toBe(0);
  });

  it("combine catégorie et couleur : il faut satisfaire les deux", () => {
    const persoBleu = node("n5", {
      entry_id: "e-perso",
      style: { color: "#60A5FA" },
    });
    const out = dimmedByFilter([perso, persoBleu], entries, {
      categories: new Set(["personnages"]),
      colors: new Set(["#60A5FA"]),
    });
    // perso est de la bonne catégorie mais de la mauvaise couleur.
    expect(out.has("n1")).toBe(true);
    expect(out.has("n5")).toBe(false);
  });

  it("ne bronche pas sur une fiche introuvable", () => {
    const orphelin = node("n6", { entry_id: "disparue" });
    const out = dimmedByFilter([orphelin], entries, {
      categories: new Set(["personnages"]),
      colors: new Set(),
    });
    expect(out.has("n6")).toBe(false);
  });
});
