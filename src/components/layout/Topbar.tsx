"use client";

import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

const IconCog = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2" />
    <path d="M7 1.5V3M7 11V12.5M11.5 7H13M1 7H2.5M10.5 3.5L9.5 4.5M4.5 9.5L3.5 10.5M10.5 10.5L9.5 9.5M4.5 4.5L3.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

/** Fil d'Ariane dérivé du pathname. Dernier segment = page courante. */
function crumbsFromPath(pathname: string): string[] {
  if (pathname === "/") return ["Accueil"];
  if (pathname.startsWith("/project/")) return ["Projet"];
  if (pathname.startsWith("/wb/")) return ["World Building"];
  if (pathname.startsWith("/planning/")) return ["Planification"];
  if (pathname.startsWith("/editor/")) return ["Rédaction"];
  if (pathname.startsWith("/settings")) return ["Paramètres"];
  return ["Accueil"];
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

  const crumbs = crumbsFromPath(pathname);

  return (
    <header className="rd-topbar shrink-0">
      {/* Fil d'Ariane */}
      <div className="rd-crumbs">
        <span className="serif italic">Autris</span>
        {crumbs.map((c, i) => (
          <span key={i} className="row gap-2" style={{ display: "contents" }}>
            <span className="sep">/</span>
            <span className={i === crumbs.length - 1 ? "current" : ""}>{c}</span>
          </span>
        ))}
      </div>

      {/* Menu utilisateur */}
      <div style={{ position: "relative" }}>
        <button
          className="rd-icon-btn"
          onClick={() => setMenuOpen((o) => !o)}
          title={username ?? "Compte"}
        >
          <IconCog />
        </button>
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            <div
              className="absolute right-0 top-10 z-20 py-1 min-w-[170px]"
              style={{
                background: "var(--bg-3)",
                border: "1px solid var(--border-soft)",
                borderRadius: "var(--r-md)",
                boxShadow: "var(--shadow-lg)",
              }}
            >
              {username && (
                <div
                  className="px-3 py-1.5 text-[12px]"
                  style={{
                    color: "var(--text-3)",
                    borderBottom: "1px solid var(--border-soft)",
                  }}
                >
                  {username}
                </div>
              )}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/settings");
                }}
                className="w-full text-left px-3 py-1.5 text-[13px] cursor-pointer"
                style={{ color: "var(--text-2)" }}
              >
                Paramètres
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-1.5 text-[13px] cursor-pointer"
                style={{ color: "var(--text-2)" }}
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
