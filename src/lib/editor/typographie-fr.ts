import { Extension, InputRule, textInputRule } from "@tiptap/core";

/**
 * La typographie française, au fil de la frappe.
 *
 * Un clavier ne porte ni guillemets français, ni cadratin, ni
 * demi-cadratin — les trois signes dont un roman français a le plus
 * besoin. Il fallait les aller chercher dans une table de caractères, ou
 * renoncer et laisser des guillemets droits et des traits d'union.
 *
 * Trois raccourcis, et rien d'autre :
 *
 *   ""   → « ou » selon qu'un guillemet est ouvert ou non
 *   --   → – demi-cadratin (intervalles, incises)
 *   ---  → — cadratin (tirets de dialogue)
 *
 * Pourquoi une extension maison plutôt que `Typography`, le paquet
 * officiel : celui-ci avait été retiré du projet parce que ses règles
 * remplaçaient aussi les apostrophes et les guillemets anglais pendant la
 * composition, ce qui désorganisait la saisie sur Safari iOS. On ne
 * reprend donc que les trois transformations demandées, et on laisse
 * tranquilles l'apostrophe, les points de suspension et le reste.
 */

/* L'espace fine insécable, U+202F. C'est elle que la typographie
   française place à l'intérieur des guillemets : « comme ceci ». Une
   espace ordinaire laisserait le guillemet passer à la ligne tout seul,
   orphelin de ce qu'il ouvre. */
const ESPACE_FINE = " ";

export const TypographieFr = Extension.create({
  name: "typographieFr",

  addInputRules() {
    return [
      /* Les guillemets, en bascule.
         Le même geste — deux guillemets droits — ouvre ou ferme, selon ce
         qui précède dans le paragraphe : si un chevron ouvrant y attend
         encore sa fermeture, on ferme ; sinon on ouvre. C'est ce qu'on
         attend d'une touche unique, et ça évite d'avoir à se souvenir
         d'un second raccourci au moment de refermer. */
      new InputRule({
        /* Deux guillemets doubles, quelle qu'en soit la forme.
           Sur iPad, la ponctuation intelligente d'iOS remplace le
           guillemet droit par un guillemet courbe avant même que l'éditeur
           le voie : une règle qui n'attendrait que `"` ne se déclencherait
           jamais au doigt. On accepte donc les trois formes, droite et
           courbes, dans n'importe quelle combinaison. */
        find: /["“”]["“”]$/,
        handler: ({ state, range, chain }) => {
          const depuis = state.doc.resolve(range.from);
          const avant = state.doc.textBetween(
            depuis.start(),
            range.from,
            "\n",
            "\n",
          );
          const ouvrant = avant.lastIndexOf("«");
          const fermant = avant.lastIndexOf("»");
          // Un chevron ouvrant sans son pendant fermant : on ferme.
          const enAttenteDeFermeture = ouvrant > fermant;
          chain()
            .insertContentAt(
              range,
              enAttenteDeFermeture ? `${ESPACE_FINE}»` : `«${ESPACE_FINE}`,
            )
            .run();
        },
      }),

      /* Le cadratin arrive en deux temps : les deux premiers traits ont
         déjà donné un demi-cadratin, le troisième l'allonge. La règle
         cherche donc un tiret long suivi d'un trait d'union, pas trois
         traits d'affilée.

         Les deux premières formes couvrent iOS, dont la ponctuation
         intelligente peut avoir déjà converti `--` en cadratin ou en
         demi-cadratin de son côté ; la troisième couvre le cas où les
         trois traits arrivent ensemble, d'un copier-coller ou d'une
         saisie que les règles n'ont pas vue caractère par caractère. */
      textInputRule({ find: /[–—]-$/, replace: "—" }),
      textInputRule({ find: /-{3}$/, replace: "—" }),
      textInputRule({ find: /-{2}$/, replace: "–" }),
    ];
  },
});
