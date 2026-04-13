"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export function Topbar({ username }: { username?: string | null }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initial = username ? username[0].toUpperCase() : "A";

  return (
    <header className="h-9 shrink-0 bg-bg-primary border-b border-border flex items-center px-3.5 gap-2.5">
      <div className="flex-1" />

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-[22px] h-[22px] rounded-full bg-primary-bg flex items-center justify-center text-[12px] font-medium text-primary cursor-pointer"
        >
          {initial}
        </button>
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-7 z-20 bg-bg-primary border border-border rounded-[var(--radius-md)] shadow-sm py-1 min-w-[140px]">
              {username && (
                <div className="px-3 py-1.5 text-[12px] text-text-tertiary border-b border-border">
                  {username}
                </div>
              )}
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-1.5 text-[13px] text-text-secondary hover:bg-bg-hover cursor-pointer"
              >
                Se déconnecter
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
