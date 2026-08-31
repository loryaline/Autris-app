"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/* ---- Icônes (reprises du redesign) ---- */
const IconHome = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 6L7 2L12 6V11.5C12 11.78 11.78 12 11.5 12H8.5V8.5H5.5V12H2.5C2.22 12 2 11.78 2 11.5V6Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);
const IconGlobe = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M2 7H12M7 2C8.5 4 8.5 10 7 12M7 2C5.5 4 5.5 10 7 12" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);
const IconLayout = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="2" y="2" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M2 6H12M6 6V12" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);
const IconFeather = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M3 12L9 6M9 6L11.5 3.5C12.05 2.95 12.95 2.95 13.5 3.5C14.05 4.05 14.05 4.95 13.5 5.5L11 8M9 6L11 8M11 8L6 13H1V8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconChevron = () => (
  <svg className="rd-project-chevron" viewBox="0 0 9 9" fill="none">
    <path d="M2 3.5L4.5 6 7 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);
const IconPlus = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M6 2V10M2 6H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const IconSearch = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <circle cx="6.5" cy="6.5" r="3.5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

/* ---- Types ---- */
interface SidebarNovel {
  id: string;
  title: string;
  status?: string | null;
  is_active?: boolean | null;
}
interface SidebarProject {
  id: string;
  title: string;
  novels: SidebarNovel[];
}

/** Mappe le NovelStatus interne vers les 3 états visuels du marqueur. */
function markerClass(status?: string | null): string {
  if (status === "termine" || status === "publie") return "done";
  if (status === "a_ecrire" || !status) return "todo";
  return "writing"; // premier_jet / revision / reecriture / correction
}

export function Sidebar({
  projects,
  username,
}: {
  projects?: SidebarProject[];
  username?: string | null;
}) {
  const displayName = username ?? "Vous";
  const initial = (username ?? "A")[0].toUpperCase();
  const pathname = usePathname();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Repliage global de la sidebar. null = pas encore hydraté (on ne
  // rend rien pour éviter un mismatch SSR). Persistance localStorage,
  // repliage auto sous 900px de large si aucune préférence enregistrée.
  const [sidebarHidden, setSidebarHidden] = useState<boolean | null>(null);
  useEffect(() => {
    let init = false;
    try {
      const stored = localStorage.getItem("autris.sidebar.collapsed");
      if (stored === "1") init = true;
      else if (stored === "0") init = false;
      else if (typeof window !== "undefined" && window.innerWidth < 900) init = true;
    } catch {
      /* localStorage indisponible */
    }
    Promise.resolve().then(() => setSidebarHidden(init));

    const onToggle = () => {
      setSidebarHidden((prev) => {
        const next = !prev;
        try {
          localStorage.setItem("autris.sidebar.collapsed", next ? "1" : "0");
        } catch {
          /* idem */
        }
        return next;
      });
    };
    window.addEventListener("autris:sidebar-toggle", onToggle);
    return () => window.removeEventListener("autris:sidebar-toggle", onToggle);
  }, []);

  // Roman dont les feuilles Planif/Rédaction sont visibles : celui de la
  // route courante (/editor/X ou /planning/X), sinon le roman actif global.
  const routeNovelId = (() => {
    const m = pathname.match(/^\/(?:editor|planning)\/([^/]+)/);
    return m ? m[1] : null;
  })();
  const allNovels = (projects ?? []).flatMap((p) => p.novels);
  const activeNovelId =
    routeNovelId ?? allNovels.find((n) => n.is_active)?.id ?? null;

  function matchProject(p: SidebarProject): boolean {
    if (!q) return true;
    if (p.title.toLowerCase().includes(q)) return true;
    return p.novels.some((n) => n.title.toLowerCase().includes(q));
  }
  function matchNovel(n: SidebarNovel): boolean {
    return !q || n.title.toLowerCase().includes(q);
  }
  // Projet ouvert : si filtre actif → tous les matchés ; sinon ouvert sauf
  // si explicitement replié.
  const isOpen = (p: SidebarProject) =>
    q ? matchProject(p) : !collapsed[p.id];

  const filtered = (projects ?? []).filter(matchProject);

  // Pas d'affichage tant que l'état de repli n'est pas hydraté (pour
  // éviter un flash de sidebar visible avant de la replier).
  if (sidebarHidden === null || sidebarHidden) return null;

  return (
    <aside className="rd-sidebar w-[240px] shrink-0">
      {/* Brand + bouton pour replier la sidebar depuis l'intérieur */}
      <div className="rd-brand" style={{ position: "relative" }}>
        <Link href="/" className="rd-brand-mark" aria-label="Accueil Autris">
          A
        </Link>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span className="rd-brand-text">Autris</span>
          <span className="rd-brand-dot" />
        </div>
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("autris:sidebar-toggle"))
          }
          title="Masquer la sidebar"
          aria-label="Masquer la sidebar"
          className="rd-tree-add"
          style={{ marginLeft: "auto" }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M7.5 3L4.5 6L7.5 9"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <div className="rd-nav-section">
        <div className="rd-nav-title">Navigation</div>
        <Link href="/" className={`rd-nav-item${pathname === "/" ? " active" : ""}`}>
          <IconHome />
          <span>Accueil</span>
        </Link>
      </div>

      {/* Arbre projets */}
      <div className="rd-tree">
        <div className="rd-tree-head">
          <span className="rd-nav-title" style={{ padding: 0 }}>
            Mes projets
          </span>
          <button
            type="button"
            onClick={() => {
              // Si on est sur le dashboard, on émet un événement pour
              // ouvrir directement le modal (le composant ne se remonte
              // pas sur navigation vers la même route). Sinon on navigue
              // vers / avec ?new=project — le mount handler s'en charge.
              if (pathname === "/") {
                window.dispatchEvent(new CustomEvent("autris:new-project"));
              } else {
                router.push("/?new=project");
              }
            }}
            className="rd-tree-add"
            title="Nouveau projet"
            aria-label="Nouveau projet"
          >
            <IconPlus />
          </button>
        </div>

        <div className="rd-search">
          <IconSearch />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrer…"
          />
          {query && (
            <button
              className="rd-search-clear"
              onClick={() => setQuery("")}
              title="Effacer" aria-label="Effacer"
            >
              ×
            </button>
          )}
        </div>

        {filtered.length === 0 && (
          <div className="rd-empty">
            {q ? `Aucun résultat pour « ${query} »` : "Aucun projet. Créez-en un depuis le tableau de bord."}
          </div>
        )}

        {filtered.map((p) => {
          const opened = isOpen(p);
          const wbActive = pathname === `/wb/${p.id}`;
          const projectActive =
            wbActive || p.novels.some((n) => n.id === routeNovelId);
          return (
            <div
              key={p.id}
              className={`rd-project${projectActive ? " active" : ""}${opened ? " open" : ""}`}
            >
              <div
                className="rd-project-head"
                onClick={() =>
                  setCollapsed((s) => ({ ...s, [p.id]: !(!s[p.id]) }))
                }
              >
                <IconChevron />
                <span className="rd-project-title">{p.title}</span>
                <span className="rd-project-count">{p.novels.length}</span>
                <Link
                  href={`/wb/${p.id}`}
                  className={`rd-project-wb${wbActive ? " active" : ""}`}
                  title="World Building"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconGlobe />
                </Link>
              </div>

              {opened && (
                <div className="rd-novels">
                  {p.novels.filter(matchNovel).map((n) => {
                    const isSelected = n.id === activeNovelId;
                    const novelRowActive =
                      pathname === `/editor/${n.id}` ||
                      pathname === `/planning/${n.id}`;
                    return (
                      <div key={n.id} className="rd-novel">
                        <div className={`rd-novel-row${novelRowActive ? " active" : ""}`}>
                          <Link href={`/editor/${n.id}`} className="rd-novel-rowmain">
                            <span className={`rd-novel-marker ${markerClass(n.status)}`} />
                            <span className="rd-novel-title">{n.title}</span>
                            {n.is_active && <span className="rd-novel-mark">✦</span>}
                          </Link>
                          {/* Accès Planif / Rédaction au survol — vaut pour
                              tout roman, y compris inactif. */}
                          <span className="rd-novel-actions">
                            <Link
                              href={`/planning/${n.id}`}
                              className={`rd-novel-act${pathname === `/planning/${n.id}` ? " active" : ""}`}
                              title="Planification"
                            >
                              <IconLayout />
                            </Link>
                            <Link
                              href={`/editor/${n.id}`}
                              className={`rd-novel-act${pathname === `/editor/${n.id}` ? " active" : ""}`}
                              title="Rédaction"
                            >
                              <IconFeather />
                            </Link>
                          </span>
                        </div>

                        {isSelected && (
                          <div className="rd-novel-children">
                            <Link
                              href={`/planning/${n.id}`}
                              className={`rd-leaf${pathname === `/planning/${n.id}` ? " active" : ""}`}
                            >
                              <IconLayout /> Planif.
                            </Link>
                            <Link
                              href={`/editor/${n.id}`}
                              className={`rd-leaf${pathname === `/editor/${n.id}` ? " active" : ""}`}
                            >
                              <IconFeather /> Rédaction
                            </Link>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Carte utilisateur */}
      <Link href="/settings" className="rd-user">
        <div className="rd-user-avatar">{initial}</div>
        <div className="rd-user-meta">
          <div className="rd-user-name">{displayName}</div>
          <div className="rd-user-status">
            <span className="rd-pulse-dot" /> Connectée
          </div>
        </div>
      </Link>
    </aside>
  );
}
