import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { ThemeBar } from "@/components/theme/ThemeBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let username: string | null = null;
  let sidebarProjects: {
    id: string;
    title: string;
    novels: { id: string; title: string; status: string | null; is_active: boolean | null }[];
  }[] = [];

  if (user) {
    // Profil + sidebar projects en parallèle (avant : 2 awaits séquentiels)
    const [profileRes, projectsRes] = await Promise.all([
      supabase.from("profiles").select("username").eq("id", user.id).single(),
      supabase
        .from("projects")
        .select("id, title, novels(id, title, status, is_active, created_at)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        // Ordre stable des romans dans la sidebar
        .order("created_at", { referencedTable: "novels", ascending: true }),
    ]);

    username = profileRes.data?.username ?? null;
    sidebarProjects = (projectsRes.data ?? []).map(p => ({
      id: p.id,
      title: p.title,
      novels: (p.novels ?? []).map((n) => ({
        id: n.id,
        title: n.title,
        status: n.status ?? null,
        is_active: n.is_active ?? null,
      })),
    }));
  }

  return (
    <div className="flex h-full">
      <Sidebar projects={sidebarProjects} username={username} />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar username={username} />
        <main className="flex-1 overflow-y-auto bg-bg-primary">{children}</main>
      </div>
      {/* Bouton flottant de retour bêta — toutes pages app */}
      <FeedbackButton userEmail={user?.email ?? null} />
      {/* Sélecteur de thème flottant — redesign phase 1 */}
      <ThemeBar />
    </div>
  );
}
