import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PlanningClient } from "./planning-client";
import { getNarrativeMethod } from "@/lib/narrative-methods";
import { personaPrefs } from "@/lib/persona";

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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Phase 1 : tout ce qui ne dépend pas de chapters/customColumns en parallèle.
  // Avant : 6 awaits séquentiels, ~600 ms-1.5 s sur Supabase. Maintenant
  // 2 phases parallèles → ~250-500 ms.
  const [novelRes, chaptersRes, customColumnsRes, milestonesRes, beatsRes, profileRes, synopsesRes] = await Promise.all([
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

  // Phase 2 : cellValues + scenes (dépendent des IDs de phase 1)
  const columnIds = (customColumns ?? []).map((c) => c.id);
  const chapterIds = (chapters ?? []).map((c) => c.id);

  const [cellValuesRes, scenesRes] = await Promise.all([
    columnIds.length > 0
      ? supabase
          .from("planning_cell_values")
          .select("*")
          .in("column_id", columnIds)
          .eq("user_id", user.id)
      : Promise.resolve({ data: [] }),
    chapterIds.length > 0
      ? supabase
          .from("scenes")
          .select("id, chapter_id, title, position, status")
          .in("chapter_id", chapterIds)
          .eq("user_id", user.id)
          .order("position", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const cellValues = cellValuesRes.data;
  const scenes = scenesRes.data;

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
