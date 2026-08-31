import { describe, expect, it } from "vitest";
import {
  LINK_TYPES,
  areReciprocal,
  categoriesForGenre,
  customLinkTypes,
  generationGap,
  getCategoryDef,
  isFamilyType,
} from "./wb-constants";

/**
 * Le vocabulaire des relations.
 *
 * Ces règles ne se voient pas à l'écran : une réciprocité manquée crée un
 * doublon silencieux, une symétrie de trop invente un sentiment que
 * l'autrice n'a pas écrit. C'est le cœur de ce qui a cassé pendant le
 * développement du plateau, d'où la couverture serrée.
 */

describe("areReciprocal — le même fait, énoncé de l'autre bord", () => {
  it("relie la filiation dans les deux sens", () => {
    expect(areReciprocal("parent", "enfant")).toBe(true);
    expect(areReciprocal("enfant", "parent")).toBe(true);
  });

  it("accepte l'ancien vocabulaire genré", () => {
    // Ces mots ne sont plus proposés, mais peuplent les univers déjà
    // écrits : les oublier dédoublerait toutes les fratries existantes.
    expect(areReciprocal("sœur", "frère")).toBe(true);
    expect(areReciprocal("père", "fils")).toBe(true);
    expect(areReciprocal("mère", "fille")).toBe(true);
    expect(areReciprocal("cousin", "cousine")).toBe(true);
    expect(areReciprocal("époux", "épouse")).toBe(true);
  });

  it("fait dialoguer ancien et nouveau vocabulaire", () => {
    expect(areReciprocal("adelphe", "sœur")).toBe(true);
    expect(areReciprocal("parent", "fils")).toBe(true);
    expect(areReciprocal("mariés", "époux")).toBe(true);
  });

  it("tient un type symétrique face à lui-même", () => {
    expect(areReciprocal("adelphe", "adelphe")).toBe(true);
    expect(areReciprocal("ami", "ami")).toBe(true);
    expect(areReciprocal("mariés", "mariés")).toBe(true);
  });

  it("REFUSE la symétrie à un type asymétrique", () => {
    // « A est le parent de B » ne fait pas de B le parent de A.
    expect(areReciprocal("parent", "parent")).toBe(false);
    expect(areReciprocal("mentor", "mentor")).toBe(false);
    expect(areReciprocal("possède", "possède")).toBe(false);
  });

  it("REFUSE la symétrie à un type inventé", () => {
    // Le cas qui a valu une reprise : l'amour n'est pas toujours partagé.
    // Présumer la symétrie inventerait un sentiment jamais écrit.
    expect(areReciprocal("amoureux", "amoureux")).toBe(false);
    expect(areReciprocal("suzerain", "suzerain")).toBe(false);
  });

  it("ne relie pas deux relations étrangères", () => {
    expect(areReciprocal("parent", "ami")).toBe(false);
    expect(areReciprocal("adelphe", "mentor")).toBe(false);
  });

  it("ignore la casse et les espaces", () => {
    expect(areReciprocal("  Adelphe ", "ADELPHE")).toBe(true);
    expect(areReciprocal("Père", "fils")).toBe(true);
  });

  it("ne dit rien d'un type absent", () => {
    expect(areReciprocal(null, "parent")).toBe(false);
    expect(areReciprocal("parent", null)).toBe(false);
    expect(areReciprocal("", "")).toBe(false);
  });
});

describe("generationGap — qui est au-dessus de qui", () => {
  it("place les aînés au-dessus", () => {
    expect(generationGap("parent")).toBe(1);
    expect(generationGap("grand-père")).toBe(2);
    expect(generationGap("oncle")).toBe(1);
  });

  it("place la descendance en dessous", () => {
    expect(generationGap("enfant")).toBe(-1);
    expect(generationGap("neveu")).toBe(-1);
  });

  it("garde la fratrie et l'union au même niveau", () => {
    expect(generationGap("adelphe")).toBe(0);
    expect(generationGap("mariés")).toBe(0);
    expect(generationGap("conjoint")).toBe(0);
  });

  it("conserve les décalages de l'ancien vocabulaire", () => {
    // Sans ça, un arbre déjà écrit s'aplatirait d'un coup.
    expect(generationGap("père")).toBe(1);
    expect(generationGap("fille")).toBe(-1);
    expect(generationGap("grand-mère")).toBe(2);
  });

  it("reste neutre sur l'inconnu", () => {
    expect(generationGap("amoureux")).toBe(0);
    expect(generationGap(null)).toBe(0);
  });
});

describe("isFamilyType — ce que déplie « la famille »", () => {
  it("reconnaît le vocabulaire courant", () => {
    expect(isFamilyType("parent")).toBe(true);
    expect(isFamilyType("adelphe")).toBe(true);
    expect(isFamilyType("famille (autre)")).toBe(true);
  });

  it("reconnaît encore le vocabulaire retiré", () => {
    for (const t of ["sœur", "père", "cousin", "oncle", "belle-fille"]) {
      expect(isFamilyType(t), t).toBe(true);
    }
  });

  it("laisse le social dehors", () => {
    expect(isFamilyType("ami")).toBe(false);
    expect(isFamilyType("mentor")).toBe(false);
    expect(isFamilyType(null)).toBe(false);
  });
});

describe("customLinkTypes — se souvenir des mots de l'autrice", () => {
  it("relève ce qui n'est pas dans la liste fournie", () => {
    expect(
      customLinkTypes([
        { link_type: "amoureux" },
        { link_type: "parent" },
        { link_type: "suzerain" },
      ]),
    ).toEqual(["amoureux", "suzerain"]);
  });

  it("ne propose jamais le vocabulaire retiré", () => {
    // Le reproposer réintroduirait par la bande les mots genrés.
    expect(
      customLinkTypes([{ link_type: "sœur" }, { link_type: "cousine" }]),
    ).toEqual([]);
  });

  it("dédoublonne sans tenir compte de la casse", () => {
    expect(
      customLinkTypes([
        { link_type: "Amoureux" },
        { link_type: "amoureux" },
        { link_type: " AMOUREUX " },
      ]),
    ).toEqual(["Amoureux"]);
  });

  it("écarte le vide", () => {
    expect(
      customLinkTypes([{ link_type: null }, { link_type: "   " }]),
    ).toEqual([]);
  });

  it("classe par ordre alphabétique français", () => {
    expect(
      customLinkTypes([
        { link_type: "élu" },
        { link_type: "banni" },
        { link_type: "zélote" },
      ]),
    ).toEqual(["banni", "élu", "zélote"]);
  });
});

describe("Le sélecteur de liens", () => {
  it("ne propose plus aucun mot genré pour la famille", () => {
    const bannis = [
      "père", "mère", "fils", "fille",
      "frère", "sœur", "demi-frère", "demi-sœur",
      "époux", "épouse", "cousin", "cousine",
      "oncle", "tante", "neveu", "nièce",
      "grand-père", "grand-mère",
      "beau-parent", "beau-fils", "belle-fille",
    ];
    for (const t of bannis) {
      expect(LINK_TYPES, t).not.toContain(t);
    }
  });

  it("propose les sept liens familiaux neutres", () => {
    for (const t of [
      "parent", "enfant", "adelphe", "demi-adelphe",
      "mariés", "conjoint", "famille (autre)",
    ]) {
      expect(LINK_TYPES, t).toContain(t);
    }
  });
});

describe("Catégories", () => {
  it("réserve le bestiaire aux genres qui en ont un", () => {
    const fantasy = categoriesForGenre("fantasy").map((c) => c.key);
    const contemporain = categoriesForGenre("contemporain").map((c) => c.key);
    expect(fantasy).toContain("bestiaire");
    expect(contemporain).not.toContain("bestiaire");
  });

  it("garde les catégories universelles pour tous", () => {
    for (const genre of ["fantasy", "contemporain", "polar"] as const) {
      const keys = categoriesForGenre(genre).map((c) => c.key);
      expect(keys, genre).toContain("personnages");
      expect(keys, genre).toContain("univers_monde");
    }
  });

  it("retrouve une catégorie par sa clé", () => {
    expect(getCategoryDef("personnages")?.label).toBe("Personnages");
    expect(getCategoryDef("inexistante")).toBeUndefined();
  });
});
