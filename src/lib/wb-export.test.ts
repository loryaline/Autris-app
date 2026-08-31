import { describe, expect, it } from "vitest";
import { safeName, slugify } from "./wb-export";

/**
 * Noms de fichiers et de dossiers des exports.
 *
 * Un titre de fiche est écrit par l'autrice : il contient des accents, des
 * espaces, parfois « : » ou « / ». Ces caractères font échouer une
 * décompression sous Windows, ou produisent une arborescence fantôme.
 * L'échec arrive alors chez elle, à l'ouverture de l'archive — loin d'ici.
 */

describe("safeName — un nom de fichier qui survit à Windows", () => {
  it("remplace les caractères interdits", () => {
    expect(safeName('Le Roi : sa chute')).toBe("Le Roi - sa chute");
    expect(safeName("Nord/Sud")).toBe("Nord-Sud");
    expect(safeName('Il dit "non"')).toBe("Il dit -non-");
    expect(safeName("Qui ? Où ? *")).toBe("Qui - Où - -");
  });

  it("normalise les espaces", () => {
    expect(safeName("Trop   d'espaces")).toBe("Trop d'espaces");
    expect(safeName("  Cybèle  ")).toBe("Cybèle");
  });

  it("refuse un nom commençant par un point", () => {
    // « .htaccess » et compagnie : fichier caché, invisible à l'ouverture.
    expect(safeName(".caché")).toBe("caché");
    expect(safeName("...")).toBe("Sans titre");
  });

  it("garde les accents, qui eux passent très bien", () => {
    expect(safeName("Évras Yorgstar")).toBe("Évras Yorgstar");
  });

  it("borne la longueur", () => {
    expect(safeName("a".repeat(200))).toHaveLength(80);
  });

  it("donne toujours un nom, même vide", () => {
    expect(safeName("")).toBe("Sans titre");
    expect(safeName("   ")).toBe("Sans titre");
  });
});

describe("slugify — un identifiant d'URL", () => {
  it("déshabille les accents", () => {
    expect(slugify("Cybèle")).toBe("cybele");
    expect(slugify("Évras")).toBe("evras");
  });

  it("réduit tout le reste à des tirets", () => {
    expect(slugify("Le Roi : sa chute")).toBe("le-roi-sa-chute");
    expect(slugify("a__b--c")).toBe("a-b-c");
  });

  it("ne laisse pas de tiret aux extrémités", () => {
    expect(slugify("  Bordé  ")).toBe("borde");
    expect(slugify("---x---")).toBe("x");
  });

  it("borne la longueur", () => {
    expect(slugify("a".repeat(200))).toHaveLength(60);
  });

  it("retombe sur un défaut lisible", () => {
    expect(slugify("")).toBe("univers");
    expect(slugify("···")).toBe("univers");
  });
});
