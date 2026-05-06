import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PlanningClient } from "./planning-client";

export default async function PlanningPage({
  params,
}: {
  params: Promise<{ novelId: string }>;
}) {
  const { novelId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Phase 1 : tout ce qui ne dépend pas de chapters/customColumns en parallèle.
  // Avant : 6 awaits séquentiels, ~600 ms-1.5 s sur Supabase. Maintenant
  // 2 phases parallèles → ~250-500 ms.
  const [novelRes, chaptersRes, customColumnsRes, milestonesRes] = await Promise.all([
    supabase
      .from("novels")
      .select("id, title, project_id, column_order, column_colors, column_widths, projects(title)")
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
  ]);

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
      novelTitle={novel.title}
      projectTitle={projectTitle}
      chapters={chapters ?? []}
      customColumns={customColumns ?? []}
      cellValues={cellValues ?? []}
      scenes={scenes ?? []}
      milestones={milestones ?? []}
      columnOrder={columnOrder}
      columnColors={columnColors}
      columnWidths={columnWidths}
    />
  );
}
