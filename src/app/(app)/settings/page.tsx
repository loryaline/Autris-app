import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";
import { utilisateurConnecte } from "@/lib/supabase/utilisateur";

export default async function SettingsPage() {
  const supabase = await createClient();
  // Vérification locale du jeton, sans aller-retour réseau — cf. utilisateurConnecte.
  const user = await utilisateurConnecte(supabase);
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, persona, pomo_duration")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return <SettingsClient email={user.email ?? null} profile={profile} />;
}
