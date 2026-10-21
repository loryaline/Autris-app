import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PlanningClient } from "./planning-client";
import { getNarrativeMethod } from "@/lib/narrative-methods";
import { personaPrefs } from "@/lib/persona";
import { utilisateurConnecte } from "@/lib/supabase/utilisateur";

// « postits » a été retiré : un lien enregistré vers cet onglet retombe
// donc sur le chapitrage plutôt que sur un écran vide.
const PLANNING_VIEWS = ["tableau", "outline", "synopsis", "gantt"];

export default async function PlanningPage({
  params,
  searchParams,
}: {
  params: Promise<{ novelId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { novelId } = await params;
  const { view } = await searchParams;
  // Onglet initial : depuis l'URL (?view=…) pour survivre à un refresh.
  const initialView =
    view && PLANNING_VIEWS.includes(view) ? view : "tableau";
  const supabase = await createClient();
  // Vérification locale du jeton, sans aller-retour réseau — cf. utilisateurConnecte.
  const user = await utilisateurConnecte(supabase);
  if (!user) redirect("/login");

  /* Tout en une seule vague.

     La page procédait en deux temps : sept requêtes en parallèle, puis
     une attente, puis deux autres qui réclamaient les identifiants des
     colonnes et des chapitres obtenus à la première. Elle payait donc
     DEUX fois le trajet jusqu'à la base, l'un après l'autre — et c'est
     ce trajet, pas le nombre de requêtes, qui coûte le plus cher.

     Ces deux retardataires n'avaient en réalité pas besoin d'attendre.
     Les valeurs de cellules comme les scènes se rattachent à un chapitre,
     et un chapitre connaît son roman : on peut donc les demander par le
     roman directement, en joignant la table des chapitres. Les neuf
     requêtes partent désormais ensemble. */
  const [
    novelRes,
    chaptersRes,
    customColumnsRes,
    milestonesRes,
    beatsRes,
    profileRes,
    synopsesRes,
    cellValuesRes,
    scenesRes,
  ] = await Promise.all([
    supabase
      .from("novels")
      .select("id, title, project_id, narrative_template, column_order, column_colors, column_widths, projects(title)")
      .eq("id", novelId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("chapters")
      .select(
        "id, title, position, status, synopsis, word_count, themes, plot_elements, minor_elements, observations, tension_indices, pivot, narrative_knot, row_color, cell_colors",
      )
      .eq("novel_id", novelId)
      .eq("user_id", user.id)
      .order("position", { ascending: true }),
    supabase
      .from("planning_columns")
      .select("*")
      .eq("novel_id", novelId)
      .eq("user_id", user.id)
      .order("position", { ascending: true }),
    supabase
      .from("planning_milestones")
      .select("*")
      .eq("novel_id", novelId)
      .eq("user_id", user.id)
      .order("position", { ascending: true }),
    supabase
      .from("planning_beats")
      .select("id, method, beat_key, label, description, act, position, chapter_id, done, note")
      .eq("novel_id", novelId)
      .eq("user_id", user.id)
      .order("position", { ascending: true }),
    supabase
      .from("profiles")
      .select("persona")
      .eq("id", user.id)
      .single(),
    supabase
      .from("synopses")
      .select("id, title, content, position")
      .eq("novel_id", novelId)
      .eq("user_id", user.id)
      .order("position", { ascending: true }),
    // Rattachées au roman par la table des chapitres, donc indépendantes.
    supabase
      .from("planning_cell_values")
      .select("id, column_id, chapter_id, value, color, chapters!inner(novel_id)")
      .eq("chapters.novel_id", novelId)
      .eq("user_id", user.id),
    supabase
      .from("scenes")
      .select("id, chapter_id, title, position, status, chapters!inner(novel_id)")
      .eq("chapters.novel_id", novelId)
      .eq("user_id", user.id)
      .order("position", { ascending: true }),
  ]);

  const showTips = personaPrefs(
    (profileRes.data as { persona: string | null } | null)?.persona,
  ).showTips;

  // Synopsis du roman. On garantit qu'il en existe toujours au moins un.
  let synopses = synopsesRes.data ?? [];
  if (synopses.length === 0) {
    const { data: seeded } = await supabase
      .from("synopses")
      .insert({ novel_id: novelId, user_id: user.id, title: "Synopsis", content: "", position: 0 })
      .select("id, title, content, position")
      .single();
    if (seeded) synopses = [seeded];
  }

  const novel = novelRes.data;
  if (!novel) {
    return (
      <div className="flex items-center justify-center h-full text-text-tertiary">
        Roman introuvable
      </div>
    );
  }

  const chapters = chaptersRes.data;
  const customColumns = customColumnsRes.data;
  const milestones = milestonesRes.data;

  // Méthode narrative + beats de structure. Si le roman a une méthode
  // (choisie à l'onboarding) mais aucun beat en base, on seede une fois.
  const narrativeTemplate =
    (novel as unknown as { narrative_template: string | null }).narrative_template ?? "libre";
  let beats = beatsRes.data ?? [];
  if (narrativeTemplate !== "libre" && beats.length === 0) {
    const method = getNarrativeMethod(narrativeTemplate);
    if (method.beats.length > 0) {
      const rows = method.beats.map((b, i) => ({
        novel_id: novelId,
        user_id: user.id,
        method: method.id,
        beat_key: b.key,
        label: b.label,
        description: b.description,
        act: b.act ?? null,
        position: i,
      }));
      const { data: inserted } = await supabase
        .from("planning_beats")
        .insert(rows)
        .select("id, method, beat_key, label, description, act, position, chapter_id, done, note");
      beats = inserted ?? [];
    }
  }

  /* La jointure ne sert qu'à filtrer : on retire la colonne qu'elle
     ajoute avant de passer les lignes à l'interface. */
  const sansJointure = <T extends Record<string, unknown>>(lignes: T[] | null) =>
    (lignes ?? []).map(({ chapters: _ignore, ...reste }) => reste);

  const cellValues = sansJointure(cellValuesRes.data);
  const scenes = sansJointure(scenesRes.data);

  const projectTitle = (novel as unknown as { projects: { title: string } }).projects?.title ?? "";
  const columnOrder = (novel as unknown as { column_order: string[] | null }).column_order;
  const columnColors = (novel as unknown as { column_colors: Record<string, string> | null }).column_colors ?? {};
  const columnWidths = (novel as unknown as { column_widths: Record<string, number> | null }).column_widths ?? {};

  return (
    <PlanningClient
      novelId={novelId}
      projectId={novel.project_id}
      novelTitle={novel.title}
      projectTitle={projectTitle}
      synopses={synopses}
      chapters={chapters ?? []}
      customColumns={customColumns ?? []}
      cellValues={cellValues ?? []}
      scenes={scenes ?? []}
      milestones={milestones ?? []}
      columnOrder={columnOrder}
      columnColors={columnColors}
      columnWidths={columnWidths}
      narrativeTemplate={narrativeTemplate}
      beats={beats}
      showTips={showTips}
      initialView={initialView}
    />
  );
}
