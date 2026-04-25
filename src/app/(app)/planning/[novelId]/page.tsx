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

  // Fetch novel with project
  const { data: novel } = await supabase
    .from("novels")
    .select("id, title, project_id, column_order, column_colors, projects(title)")
    .eq("id", novelId)
    .eq("user_id", user.id)
    .single();

  if (!novel) {
    return (
      <div className="flex items-center justify-center h-full text-text-tertiary">
        Roman introuvable
      </div>
    );
  }

  // Fetch chapters with planning fields
  const { data: chapters } = await supabase
    .from("chapters")
    .select("id, title, position, status, synopsis, word_count, themes, plot_elements, minor_elements, observations, tension_indices, pivot, narrative_knot, row_color, cell_colors")
    .eq("novel_id", novelId)
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  // Fetch custom columns
  const { data: customColumns } = await supabase
    .from("planning_columns")
    .select("*")
    .eq("novel_id", novelId)
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  // Fetch cell values for custom columns
  const columnIds = (customColumns ?? []).map((c) => c.id);
  const { data: cellValues } = columnIds.length > 0
    ? await supabase
        .from("planning_cell_values")
        .select("*")
        .in("column_id", columnIds)
        .eq("user_id", user.id)
    : { data: [] };

  // Fetch scenes for all chapters
  const chapterIds = (chapters ?? []).map((c) => c.id);
  const { data: scenes } = chapterIds.length > 0
    ? await supabase
        .from("scenes")
        .select("id, chapter_id, title, position, status")
        .in("chapter_id", chapterIds)
        .eq("user_id", user.id)
        .order("position", { ascending: true })
    : { data: [] };

  // Fetch milestones
  const { data: milestones } = await supabase
    .from("planning_milestones")
    .select("*")
    .eq("novel_id", novelId)
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  const projectTitle = (novel as unknown as { projects: { title: string } }).projects?.title ?? "";
  const columnOrder = (novel as unknown as { column_order: string[] | null }).column_order;
  const columnColors = (novel as unknown as { column_colors: Record<string, string> | null }).column_colors ?? {};

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
    />
  );
}
