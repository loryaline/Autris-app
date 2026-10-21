import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WbClient } from "./wb-client";
import { personaPrefs } from "@/lib/persona";
import type { Genre } from "@/types/database";
import { utilisateurConnecte } from "@/lib/supabase/utilisateur";

export default async function WorldBuildingPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  // Vérification locale du jeton, sans aller-retour réseau — cf. utilisateurConnecte.
  const user = await utilisateurConnecte(supabase);
  if (!user) redirect("/login");

  const [{ data: project }, { data: profile }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title, genre")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single(),
    supabase.from("profiles").select("persona").eq("id", user.id).single(),
  ]);
  const showTips = personaPrefs(
    (profile as { persona: string | null } | null)?.persona,
  ).showTips;

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-text-tertiary">
        Projet introuvable
      </div>
    );
  }

  /* Les trois dernières lectures partaient l'une après l'autre.

     Les fiches, puis les romans, puis les liens : trois allers-retours
     jusqu'à la base, chacun attendant la fin du précédent, alors que les
     deux premiers n'avaient besoin que de l'identifiant du projet — connu
     depuis l'adresse. Quant aux liens, ils réclamaient la liste des
     fiches ; mais un lien part d'une fiche, et une fiche connaît son
     projet : on les demande donc par le projet, en joignant la table des
     fiches. Les trois partent ensemble.

     C'est le trajet qui coûte, pas la requête : trois vagues successives
     coûtaient trois fois ce qu'une seule coûte. */
  const [entriesRes, novelsRes, linksRes] = await Promise.all([
    supabase
      .from("wb_entries")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),
    // Les romans du projet — pour rattacher une fiche à un livre.
    supabase
      .from("novels")
      .select("id, title")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("wb_links")
      .select("*, wb_entries!from_entry_id!inner(project_id)")
      .eq("wb_entries.project_id", projectId),
  ]);

  const entries = entriesRes.data;
  const novels = novelsRes.data;
  /* La jointure ne servait qu'à filtrer : on retire la colonne ajoutée. */
  const links = (linksRes.data ?? []).map(
    ({ wb_entries: _ignore, ...reste }) => reste,
  );

  return (
    <WbClient
      projectId={projectId}
      projectTitle={project.title}
      genre={project.genre as Genre}
      initialEntries={entries ?? []}
      initialLinks={links as never}
      novels={(novels ?? []) as { id: string; title: string }[]}
      showTips={showTips}
    />
  );
}
