import { createClient } from "@/lib/supabase/server";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { ThemeBar } from "@/components/theme/ThemeBar";
import { utilisateurConnecte } from "@/lib/supabase/utilisateur";

export default async function EditorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  // Vérification locale du jeton, sans aller-retour réseau — cf. utilisateurConnecte.
  const user = await utilisateurConnecte(supabase);

  return (
    <div className="h-full">
      {children}
      <FeedbackButton userEmail={user?.email ?? null} />
      <ThemeBar />
    </div>
  );
}
