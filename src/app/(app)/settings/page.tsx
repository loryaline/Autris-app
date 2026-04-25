import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, persona, plan, pomo_duration, trial_started_at, plan_expires_at, onboarding_done, created_at")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return <SettingsClient email={user.email ?? null} profile={profile} />;
}
