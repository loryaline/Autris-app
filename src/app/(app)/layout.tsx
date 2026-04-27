import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let username: string | null = null;
  let sidebarProjects: { id: string; title: string; novels: { id: string; title: string }[] }[] = [];

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();
    username = profile?.username ?? null;

    const { data: projects } = await supabase
      .from("projects")
      .select("id, title, novels(id, title)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    sidebarProjects = (projects ?? []).map(p => ({
      id: p.id,
      title: p.title,
      novels: p.novels ?? [],
    }));
  }

  return (
    <div className="flex h-full">
      <Sidebar projects={sidebarProjects} username={username} />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar username={username} />
        <main className="flex-1 overflow-y-auto bg-bg-secondary">{children}</main>
      </div>
      {/* Bouton flottant de retour bêta — toutes pages app */}
      <FeedbackButton userEmail={user?.email ?? null} />
    </div>
  );
}
