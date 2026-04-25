"use client";

import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

function crumbFromPath(pathname: string): { icon: React.ReactNode; label: string } {
  const home = (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
      <path
        d="M2 6L7 2L12 6V11.5C12 11.78 11.78 12 11.5 12H8.5V8.5H5.5V12H2.5C2.22 12 2 11.78 2 11.5V6Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  );
  if (pathname === "/") return { icon: home, label: "Accueil" };
  if (pathname.startsWith("/project/")) return { icon: home, label: "Projet" };
  if (pathname.startsWith("/wb/")) return { icon: home, label: "World Building" };
  if (pathname.startsWith("/planning/")) return { icon: home, label: "Planification" };
  if (pathname.startsWith("/editor/")) return { icon: home, label: "Rédaction" };
  return { icon: home, label: "Accueil" };
}

export function Topbar({ username }: { username?: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initial = username ? username[0].toUpperCase() : "A";
  const crumb = crumbFromPath(pathname);

  return (
    <header className="h-14 shrink-0 bg-bg-primary flex items-center px-6 gap-3">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-text-secondary">
        <span className="text-text-tertiary">{crumb.icon}</span>
        <span className="text-[13px]">{crumb.label}</span>
      </div>

      <div className="flex-1" />

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-8 h-8 rounded-full bg-[var(--color-accent-bg)] border border-[var(--color-accent-border)] flex items-center justify-center text-[13px] font-medium text-[var(--color-accent)] cursor-pointer"
        >
          {initial}
        </button>
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-10 z-20 bg-bg-tertiary border border-border rounded-[var(--radius-md)] shadow-lg py-1 min-w-[160px]">
              {username && (
                <div className="px-3 py-1.5 text-[12px] text-text-tertiary border-b border-border">
                  {username}
                </div>
              )}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/settings");
                }}
                className="w-full text-left px-3 py-1.5 text-[13px] text-text-secondary hover:bg-bg-hover cursor-pointer"
              >
                Paramètres
              </button>
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
