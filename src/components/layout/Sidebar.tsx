"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/* ---- Icons ---- */
function IconHome({ active }: { active?: boolean }) {
  const c = active ? "#3C3489" : "#888780";
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
      <rect x=".5" y=".5" width="4" height="4" rx="1" stroke={c} strokeWidth="1" />
      <rect x="6.5" y=".5" width="4" height="4" rx="1" stroke={c} strokeWidth="1" />
      <rect x=".5" y="6.5" width="4" height="4" rx="1" stroke={c} strokeWidth="1" />
      <rect x="6.5" y="6.5" width="4" height="4" rx="1" stroke={c} strokeWidth="1" />
    </svg>
  );
}

function IconChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 9 9"
      fill="none"
      className={`transition-transform duration-150 ${open ? "" : "-rotate-90"}`}
    >
      <path d="M2 3.5L4.5 6 7 3.5" stroke="#534AB7" strokeWidth="1.2" strokeLinecap="round" />
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
      className={`flex items-center gap-[5px] px-3 py-[5px] text-[13px] cursor-pointer transition-colors duration-150 ${
        active
          ? "bg-primary-bg text-primary-dark font-medium"
          : "text-text-secondary hover:bg-bg-hover"
      }`}
    >
      {icon}
      {label}
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
export function Sidebar({ projects }: { projects?: SidebarProject[] }) {
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
    <aside className="w-[200px] shrink-0 border-r border-border bg-bg-secondary flex flex-col h-full overflow-y-auto">
      {/* Brand */}
      <div className="h-9 flex items-center px-3.5 border-b border-border">
        <Link href="/" className="text-[15px] font-semibold text-primary no-underline">
          Autris
        </Link>
      </div>

      {/* Navigation */}
      <div className="px-3 pt-2 pb-1.5 border-b border-border">
        <div className="text-[12px] font-medium text-text-tertiary uppercase tracking-wider mb-1">
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
      <div className="px-3 pt-1.5 flex-1">
        <div className="text-[12px] font-medium text-text-tertiary uppercase tracking-wider mb-1">
          Mes projets
        </div>

        {projects && projects.length > 0 ? (
          projects.map((project) => (
            <div key={project.id} className="mt-1">
              <div className="flex items-center gap-[5px] py-1">
                <button
                  onClick={() => toggleProject(project.id)}
                  className="cursor-pointer shrink-0"
                >
                  <IconChevronDown open={isProjectOpen(project.id)} />
                </button>
                <Link
                  href={`/project/${project.id}`}
                  className="text-[13px] font-medium text-primary-dark truncate no-underline hover:underline"
                >
                  {project.title}
                </Link>
              </div>

              {isProjectOpen(project.id) && (
                <div className="ml-2">
                  <Link
                    href={`/wb/${project.id}`}
                    className={`block pl-4 py-[3px] text-[12px] rounded transition-colors duration-150 no-underline ${
                      pathname === `/wb/${project.id}`
                        ? "bg-primary-bg/20 text-primary font-medium"
                        : "text-text-tertiary hover:text-text-secondary"
                    }`}
                  >
                    🌍 World Building
                  </Link>
                  {project.novels.map((novel) => (
                    <div key={novel.id}>
                      <button
                        onClick={() => toggleNovel(novel.id)}
                        className="flex items-center gap-[5px] py-0.5 px-1 cursor-pointer w-full text-left mt-0.5"
                      >
                        <IconChevronDown open={isNovelOpen(novel.id)} />
                        <span className="text-[13px] font-medium text-text-primary truncate">
                          {novel.title}
                        </span>
                      </button>

                      {isNovelOpen(novel.id) && (
                        <div className="ml-3">
                          <Link
                            href={`/planning/${novel.id}`}
                            className={`block pl-2 py-[3px] text-[12px] rounded transition-colors duration-150 no-underline ${
                              pathname === `/planning/${novel.id}`
                                ? "bg-primary-bg/20 text-primary font-medium"
                                : "text-text-tertiary hover:text-text-secondary"
                            }`}
                          >
                            Planification
                          </Link>
                          <Link
                            href={`/editor/${novel.id}`}
                            className={`block pl-2 py-[3px] text-[12px] rounded transition-colors duration-150 no-underline ${
                              pathname === `/editor/${novel.id}`
                                ? "bg-primary-bg/20 text-primary font-medium"
                                : "text-text-tertiary hover:text-text-secondary"
                            }`}
                          >
                            Rédaction
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-[12px] text-text-quaternary mt-2 italic">
            Aucun projet
          </div>
        )}
      </div>

      {/* Sync indicator */}
      <div className="px-3 py-2 border-t border-border flex items-center gap-1.5 text-[12px] text-text-tertiary">
        <div className="w-1.5 h-1.5 rounded-full bg-teal-dark" />
        Sauvegardé
      </div>
    </aside>
  );
}
