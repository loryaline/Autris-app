"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/* ---- Icons ---- */
function IconHome({ active }: { active?: boolean }) {
  const c = active ? "var(--color-accent)" : "var(--color-text-tertiary)";
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path
        d="M2 6L7 2L12 6V11.5C12 11.78 11.78 12 11.5 12H8.5V8.5H5.5V12H2.5C2.22 12 2 11.78 2 11.5V6Z"
        stroke={c}
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      width="8"
      height="8"
      viewBox="0 0 9 9"
      fill="none"
      className={`transition-transform duration-150 ${open ? "" : "-rotate-90"}`}
    >
      <path d="M2 3.5L4.5 6 7 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function NavItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`relative flex items-center gap-2 pl-3 pr-3 py-[7px] text-[13px] cursor-pointer transition-colors duration-150 rounded-[var(--radius-sm)] ${
        active
          ? "text-[var(--color-accent)] bg-white/[0.03]"
          : "text-text-secondary hover:bg-white/[0.03]"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-[var(--color-accent)]" />
      )}
      {icon}
      <span>{label}</span>
    </Link>
  );
}

/* ---- Types ---- */
interface SidebarNovel {
  id: string;
  title: string;
}

interface SidebarProject {
  id: string;
  title: string;
  novels: SidebarNovel[];
}

/* ---- Sidebar ---- */
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
  const [openProjects, setOpenProjects] = useState<Record<string, boolean>>({});
  const [openNovels, setOpenNovels] = useState<Record<string, boolean>>({});

  function toggleProject(id: string) {
    setOpenProjects((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleNovel(id: string) {
    setOpenNovels((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // Default open for all projects/novels
  const isProjectOpen = (id: string) => openProjects[id] !== false;
  const isNovelOpen = (id: string) => openNovels[id] !== false;

  return (
    <aside className="w-[220px] shrink-0 bg-bg-secondary flex flex-col h-full overflow-y-auto">
      {/* Brand */}
      <div className="h-14 flex items-center px-5">
        <Link
          href="/"
          className="no-underline flex items-baseline gap-1.5"
        >
          <span
            className="font-serif italic text-[22px] text-[var(--color-accent)] leading-none"
            style={{ letterSpacing: "0.01em" }}
          >
            Autris
          </span>
          <span className="w-[5px] h-[5px] rounded-full bg-[var(--color-accent)] mb-1" />
        </Link>
      </div>

      {/* Navigation */}
      <div className="px-3 pt-3 pb-1.5">
        <div className="px-2 text-[9.5px] font-medium text-text-quaternary uppercase mb-1.5"
             style={{ letterSpacing: "0.18em" }}>
          Navigation
        </div>
        <NavItem
          href="/"
          icon={<IconHome active={pathname === "/"} />}
          label="Accueil"
          active={pathname === "/"}
        />
      </div>

      {/* Projects */}
      <div className="px-3 pt-3 flex-1">
        <div className="px-2 text-[9.5px] font-medium text-text-quaternary uppercase mb-1.5"
             style={{ letterSpacing: "0.18em" }}>
          Mes projets
        </div>

        {projects && projects.length > 0 ? (
          projects.map((project) => (
            <div key={project.id} className="mt-0.5">
              <div className="flex items-center gap-1.5 px-2 py-1">
                <button
                  onClick={() => toggleProject(project.id)}
                  className="cursor-pointer shrink-0 text-text-tertiary"
                >
                  <IconChevronDown open={isProjectOpen(project.id)} />
                </button>
                <Link
                  href={`/project/${project.id}`}
                  className="text-[13px] text-text-primary truncate no-underline hover:text-[var(--color-accent)] transition-colors"
                >
                  {project.title}
                </Link>
              </div>

              {isProjectOpen(project.id) && (
                <div className="ml-3 border-l border-white/5 pl-2">
                  <Link
                    href={`/wb/${project.id}`}
                    className={`flex items-center gap-1.5 px-2 py-[4px] text-[12px] rounded-[var(--radius-sm)] transition-colors duration-150 no-underline ${
                      pathname === `/wb/${project.id}`
                        ? "text-[var(--color-accent)]"
                        : "text-text-tertiary hover:text-text-secondary"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      pathname === `/wb/${project.id}` ? "bg-[var(--color-accent)]" : "bg-text-quaternary"
                    }`} />
                    World Building
                  </Link>
                  {project.novels.map((novel) => (
                    <div key={novel.id} className="mt-0.5">
                      <button
                        onClick={() => toggleNovel(novel.id)}
                        className="flex items-center gap-1.5 py-[3px] px-2 cursor-pointer w-full text-left text-text-tertiary"
                      >
                        <IconChevronDown open={isNovelOpen(novel.id)} />
                        <span className="text-[12.5px] text-text-secondary truncate">
                          {novel.title}
                        </span>
                      </button>

                      {isNovelOpen(novel.id) && (
                        <div className="ml-3 border-l border-white/5 pl-2">
                          {(() => {
                            const planActive = pathname === `/planning/${novel.id}`;
                            const edActive = pathname === `/editor/${novel.id}`;
                            return (
                              <>
                                <Link
                                  href={`/planning/${novel.id}`}
                                  className={`relative block px-2 py-[5px] text-[12px] rounded-[var(--radius-sm)] transition-colors duration-150 no-underline ${
                                    planActive
                                      ? "text-[var(--color-accent)] bg-white/[0.035] font-medium"
                                      : "text-text-tertiary hover:text-text-secondary hover:bg-white/[0.02]"
                                  }`}
                                >
                                  {planActive && (
                                    <span
                                      className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full"
                                      style={{ background: "var(--color-accent)" }}
                                    />
                                  )}
                                  Planification
                                </Link>
                                <Link
                                  href={`/editor/${novel.id}`}
                                  className={`relative block px-2 py-[5px] text-[12px] rounded-[var(--radius-sm)] transition-colors duration-150 no-underline ${
                                    edActive
                                      ? "text-[var(--color-accent)] bg-white/[0.035] font-medium"
                                      : "text-text-tertiary hover:text-text-secondary hover:bg-white/[0.02]"
                                  }`}
                                >
                                  {edActive && (
                                    <span
                                      className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full"
                                      style={{ background: "var(--color-accent)" }}
                                    />
                                  )}
                                  Rédaction
                                </Link>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-[12px] text-text-quaternary mt-2 italic px-2">
            Aucun projet
          </div>
        )}
      </div>

      {/* User footer */}
      <div className="mx-3 mb-3 mt-2 p-2 rounded-[var(--radius-md)] bg-white/[0.03] flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-[var(--color-accent-bg)] border border-[var(--color-accent-border)] flex items-center justify-center text-[12px] font-medium text-[var(--color-accent)]">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] text-text-primary truncate">{displayName}</div>
          <div className="flex items-center gap-1 text-[10.5px] text-text-tertiary">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-dark" />
            Sauvegardé
          </div>
        </div>
      </div>
    </aside>
  );
}
