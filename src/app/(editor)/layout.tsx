import { createClient } from "@/lib/supabase/server";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { ThemeBar } from "@/components/theme/ThemeBar";

export default async function EditorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="h-full">
      {children}
      <FeedbackButton userEmail={user?.email ?? null} />
      <ThemeBar />
    </div>
  );
}
