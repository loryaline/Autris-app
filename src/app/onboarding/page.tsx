import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingClient } from "./onboarding-client";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ redo?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { redo } = await searchParams;
  // Mode « refaire la configuration » : accessible depuis les Paramètres,
  // même si l'onboarding a déjà été complété. Ne crée pas de projet.
  const redoMode = redo === "1";

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_done, persona, pomo_duration")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_done && !redoMode) redirect("/");

  return (
    <OnboardingClient
      redo={redoMode}
      initialPersona={(profile?.persona as string | null) ?? null}
      initialPomo={profile?.pomo_duration ?? 25}
    />
  );
}
