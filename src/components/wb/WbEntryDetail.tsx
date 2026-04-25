"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { WbEntry, WbLink, WbStatus } from "@/types/database";
import {
  WB_STATUSES,
  getCategoryDef,
  UNIVERS_SUBTYPES,
  BESTIAIRE_SUBCATEGORIES,
} from "@/lib/wb-constants";
import { getTemplate } from "@/lib/wb-templates";
import { toneFor } from "@/lib/wb-tones";
import { DynamicTemplate } from "./DynamicTemplate";
import { WbCustomBlocks, readCustomBlocks, writeCustomBlocks, type CustomBlock } from "./WbCustomBlocks";
import { WbMainImage } from "./WbMainImage";
import { WbGallery } from "./WbGallery";
import { WbTagsEditor } from "./WbTagsEditor";
import { WbGroupsEditor } from "./WbGroupsEditor";
import { WbLinksEditor } from "./WbLinksEditor";
import Image from "next/image";

export function WbEntryDetail({
  entry,
  projectId,
  allEntries,
  projectTags,
  projectGroups,
  novels,
  entryLinks,
  onSelectEntry,
  onLinkAdded,
  onLinkRemoved,
  onUpdate,
  onDelete,
  onClose,
}: {
  entry: WbEntry;
  projectId: string;
  allEntries: WbEntry[];
  projectTags: string[];
  projectGroups: string[];
  novels: { id: string; title: string }[];
  entryLinks: WbLink[];
  onSelectEntry: (id: string) => void;
  onLinkAdded: (link: WbLink) => void;
  onLinkRemoved: (id: string) => void;
  onUpdate: (entry: WbEntry) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<WbEntry>(entry);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">(
    entry.title?.trim() ? "view" : "edit"
  );
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // On ne réinitialise l'état local QUE lorsqu'on change de fiche (entry.id),
  // sinon chaque frappe (qui remonte via onUpdate au parent puis redescend
  // via la prop `entry`) re-déclencherait setMode("view") et sortirait
  // l'utilisateur du mode édition.
  useEffect(() => {
    setLocal(entry);
    setMode(entry.title?.trim() ? "view" : "edit");
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    if (!entry.title?.trim()) {
      requestAnimationFrame(() => titleInputRef.current?.focus());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.id]);

  function scheduleSave(next: WbEntry) {
    setLocal(next);
    onUpdate(next);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      setSaving(true);
      await supabase
        .from("wb_entries")
        .update({
          title: next.title,
          subtitle: next.subtitle,
          description: next.description,
          template_data: next.template_data,
          personal_notes: next.personal_notes,
          status: next.status,
          subcategory: next.subcategory,
        })
        .eq("id", next.id);
      setSaving(false);
    }, 800);
  }

  async function handleDelete() {
    if (!confirm(`Supprimer définitivement "${local.title}" ?`)) return;
    await supabase.from("wb_entries").delete().eq("id", local.id);
    onDelete(local.id);
  }

  const template = getTemplate(local.category, local.subcategory);
  const catDef = getCategoryDef(local.category);

  // Liste des sous-catégories disponibles pour rendre les chips "Catégorie".
  const subList = useMemo(() => {
    if (local.category === "univers_monde") {
      return UNIVERS_SUBTYPES.map((s) => ({
        key: s.key,
        label: s.label,
        icon: s.icon as string | undefined,
      }));
    }
    if (local.category === "bestiaire") {
      return BESTIAIRE_SUBCATEGORIES.map((s) => ({
        key: s.key,
        label: s.label,
        icon: undefined as string | undefined,
      }));
    }
    return [];
  }, [local.category]);

  // Navigation prev/next : fiches frères (même catégorie, non archivés).
  const siblings = useMemo(() => {
    return allEntries
      .filter((e) => e.category === local.category && e.status !== "archive")
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
  }, [allEntries, local.category]);

  const currentIdx = siblings.findIndex((e) => e.id === local.id);
  const prev = currentIdx > 0 ? siblings[currentIdx - 1] : null;
  const next = currentIdx >= 0 && currentIdx < siblings.length - 1
    ? siblings[currentIdx + 1]
    : null;

  const statusDef = WB_STATUSES.find((s) => s.key === local.status);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto bg-bg-primary">
      <div className="max-w-[1280px] mx-auto px-8 py-5">
        {/* === Action bar === */}
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-[var(--radius-md)] text-[12px] text-text-secondary hover:text-text-primary hover:bg-white/[0.04] cursor-pointer transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M8.5 3.5L5 7L8.5 10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Retour aux fiches
            </button>

            {mode === "edit" && (
              <span
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-[10.5px] font-medium uppercase"
                style={{
                  letterSpacing: "0.16em",
                  background: "var(--color-accent-bg)",
                  borderColor: "var(--color-accent-border)",
                  color: "var(--color-accent)",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
                Mode édition
              </span>
            )}

            {siblings.length > 1 && currentIdx >= 0 && (
              <>
                <span className="text-text-quaternary/40 text-[11px]">/</span>
                <div className="flex items-center gap-1 text-[11px] text-text-tertiary">
                  <span className="font-serif italic">Fiche {currentIdx + 1}</span>
                  <span className="opacity-40">/ {siblings.length}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    disabled={!prev}
                    onClick={() => prev && onSelectEntry(prev.id)}
                    className="w-7 h-7 rounded-[var(--radius-sm)] bg-bg-secondary border border-white/[0.06] text-text-tertiary hover:text-text-primary hover:border-white/[0.1] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                    title={prev?.title || "Fiche précédente"}
                  >
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                      <path d="M8.5 3.5L5 7L8.5 10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    disabled={!next}
                    onClick={() => next && onSelectEntry(next.id)}
                    className="w-7 h-7 rounded-[var(--radius-sm)] bg-bg-secondary border border-white/[0.06] text-text-tertiary hover:text-text-primary hover:border-white/[0.1] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                    title={next?.title || "Fiche suivante"}
                  >
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                      <path d="M5.5 3.5L9 7L5.5 10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Indicateur auto-save (édition uniquement) */}
            {mode === "edit" && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-text-quaternary">
                {saving ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
                    <span className="font-serif italic">Sauvegarde…</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-teal" />
                    <span className="font-serif italic">Auto · enregistré</span>
                  </>
                )}
              </span>
            )}
            {mode === "edit" ? (
              <div className="relative">
                <select
                  value={local.status}
                  onChange={(e) => scheduleSave({ ...local, status: e.target.value as WbStatus })}
                  className="h-8 pl-5 pr-6 rounded-[var(--radius-md)] bg-bg-secondary border border-white/[0.06] text-[11.5px] text-text-secondary cursor-pointer appearance-none hover:border-white/[0.1]"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23737687' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E\")",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 6px center",
                  }}
                >
                  {WB_STATUSES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <span
                  className={`pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${
                    local.status === "valide"
                      ? "bg-teal"
                      : local.status === "archive"
                        ? "bg-white/30"
                        : "bg-[var(--color-accent)]"
                  }`}
                />
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-bg-secondary border border-white/[0.06] text-[11.5px] text-text-secondary">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    local.status === "valide"
                      ? "bg-teal"
                      : local.status === "archive"
                        ? "bg-white/30"
                        : "bg-[var(--color-accent)]"
                  }`}
                />
                {statusDef?.label ?? local.status}
              </span>
            )}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="w-8 h-8 rounded-[var(--radius-md)] bg-bg-secondary border border-white/[0.06] text-text-tertiary hover:text-text-primary hover:border-white/[0.1] cursor-pointer flex items-center justify-center"
                title="Plus d'options"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor">
                  <circle cx="3" cy="7" r="1.2" />
                  <circle cx="7" cy="7" r="1.2" />
                  <circle cx="11" cy="7" r="1.2" />
                </svg>
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-[180px] bg-bg-tertiary border border-white/[0.08] rounded-[var(--radius-md)] shadow-xl z-20 py-1.5">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        handleDelete();
                      }}
                      className="w-full text-left px-3 py-2 text-[12px] text-text-secondary hover:bg-white/[0.04] hover:text-red-400 cursor-pointer flex items-center gap-2"
                    >
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                        <path d="M3 4H11M5 4V3C5 2.45 5.45 2 6 2H8C8.55 2 9 2.45 9 3V4M4.5 4L5 11.5C5 12.05 5.45 12.5 6 12.5H8C8.55 12.5 9 12.05 9 11.5L9.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Supprimer la fiche
                    </button>
                  </div>
                </>
              )}
            </div>
            {mode === "view" ? (
              <button
                onClick={() => setMode("edit")}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-[var(--radius-md)] text-[12px] font-medium cursor-pointer transition-colors"
                style={{
                  background: "var(--color-accent)",
                  color: "#1a1410",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path d="M9.5 2.5L11.5 4.5L5 11L2.5 11.5L3 9L9.5 2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Éditer
              </button>
            ) : (
              <button
                onClick={() => setMode("view")}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-[var(--radius-md)] text-[12px] font-medium cursor-pointer transition-colors bg-bg-secondary border border-white/[0.08] text-text-primary hover:border-white/[0.15]"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7L5.5 10.5L12 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Terminer
              </button>
            )}
          </div>
        </div>

        {mode === "view" ? (
          <ViewBody
            local={local}
            catDef={catDef}
            subList={subList}
            template={template}
            entryLinks={entryLinks}
            allEntries={allEntries}
            novels={novels}
            onSelectEntry={onSelectEntry}
          />
        ) : (
          <>
        {/* === Zone Identité : image carrée + titre / sous-titre / catégorie chips === */}
        <div className="grid grid-cols-12 gap-6 mb-6 pb-6 border-b border-white/[0.05]">
          {/* Image drop square */}
          <div className="col-span-12 md:col-span-4 lg:col-span-3">
            <WbMainImage
              entryId={local.id}
              projectId={projectId}
              value={local.main_image_url}
              variant="drop-square"
              onChange={(url) => {
                const n = { ...local, main_image_url: url };
                setLocal(n);
                onUpdate(n);
              }}
            />
          </div>

          {/* Titre + Sous-titre + Catégorie chips */}
          <div className="col-span-12 md:col-span-8 lg:col-span-9 flex flex-col gap-4">
            <div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span
                  className="text-[10px] font-medium text-text-quaternary uppercase"
                  style={{ letterSpacing: "0.16em" }}
                >
                  Nom de la fiche
                </span>
                <span className="font-serif italic text-[13px] text-[var(--color-accent)]">
                  *
                </span>
              </div>
              <input
                ref={titleInputRef}
                value={local.title}
                onChange={(e) => scheduleSave({ ...local, title: e.target.value })}
                placeholder="Nomme cette fiche…"
                className="w-full bg-transparent border-none focus:outline-none text-text-primary placeholder:text-text-quaternary placeholder:italic font-serif text-[38px] leading-[1.05] tracking-tight py-1 border-b border-white/[0.06] focus:border-[var(--color-accent-border)] transition-colors"
                style={{ borderBottomWidth: "1px" }}
              />
            </div>

            <div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span
                  className="text-[10px] font-medium text-text-quaternary uppercase"
                  style={{ letterSpacing: "0.16em" }}
                >
                  Sous-titre <span className="opacity-60">/ surnom</span>
                </span>
                <span className="font-serif italic text-[10px] text-text-quaternary/70">
                  — optionnel
                </span>
              </div>
              <input
                value={local.subtitle ?? ""}
                onChange={(e) => scheduleSave({ ...local, subtitle: e.target.value })}
                placeholder="Un surnom, une désignation poétique…"
                className="w-full bg-transparent border-none focus:outline-none font-serif italic text-[17px] text-[var(--color-accent)] placeholder:text-text-quaternary/70 py-0.5"
              />
            </div>

            {/* Chips Catégorie (pour univers_monde / bestiaire) */}
            {subList.length > 0 && (
              <div>
                <div
                  className="text-[10px] font-medium text-text-quaternary uppercase mb-2"
                  style={{ letterSpacing: "0.16em" }}
                >
                  Catégorie
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {subList.map((s) => {
                    const active = local.subcategory === s.key;
                    const tone = toneFor(local.category, s.key);
                    return (
                      <button
                        key={s.key}
                        onClick={() =>
                          scheduleSave({ ...local, subcategory: s.key })
                        }
                        className="h-7 inline-flex items-center gap-1.5 px-3 rounded-full text-[11.5px] cursor-pointer transition-colors border"
                        style={{
                          background: active ? tone.bg : "rgba(255,255,255,0.02)",
                          borderColor: active ? tone.border : "rgba(255,255,255,0.05)",
                          color: active ? tone.text : "var(--text-tertiary, #737687)",
                        }}
                      >
                        {s.icon && <span className="text-[12px] leading-none">{s.icon}</span>}
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cas fiche sans sous-catégorie : afficher la catégorie comme chip simple */}
            {subList.length === 0 && catDef && (
              <div>
                <div
                  className="text-[10px] font-medium text-text-quaternary uppercase mb-2"
                  style={{ letterSpacing: "0.16em" }}
                >
                  Catégorie
                </div>
                <span
                  className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[11.5px] border"
                  style={{
                    background: toneFor(local.category).bg,
                    borderColor: toneFor(local.category).border,
                    color: toneFor(local.category).text,
                  }}
                >
                  <span className="text-[12px] leading-none">{catDef.icon}</span>
                  {catDef.label}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* === 2-col content === */}
        <div className="grid grid-cols-12 gap-4">
          {/* Colonne principale */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
            {template ? (
              <DynamicTemplate
                template={template}
                data={local.template_data ?? {}}
                onChange={(data) => scheduleSave({ ...local, template_data: data })}
                renderAsCards
              />
            ) : (
              <Card icon="📝" title="Description">
                <textarea
                  value={local.description}
                  onChange={(e) => scheduleSave({ ...local, description: e.target.value })}
                  rows={10}
                  placeholder="Décris cette fiche…"
                  className="w-full text-[13px] leading-relaxed px-3 py-2 bg-white/[0.02] border border-white/[0.06] rounded-[var(--radius-md)] resize-none focus:outline-none focus:border-[var(--color-accent-border)] focus:bg-white/[0.03] text-text-primary placeholder:text-text-quaternary transition-colors"
                />
              </Card>
            )}

            {/* Blocs personnalisés (texte / notes / tableau) */}
            <WbCustomBlocks
              blocks={readCustomBlocks(local.template_data as Record<string, unknown> | null)}
              onChange={(next: CustomBlock[]) =>
                scheduleSave({
                  ...local,
                  template_data: writeCustomBlocks(
                    local.template_data as Record<string, unknown> | null,
                    next,
                  ),
                })
              }
            />

            <Card
              icon="💬"
              title={
                <span>
                  Notes <span className="font-serif italic text-[var(--color-accent)]">personnelles</span>
                  <span className="text-text-quaternary font-sans italic ml-2 text-[12px]">
                    — hors worldbuilding
                  </span>
                </span>
              }
              accent
            >
              <textarea
                value={local.personal_notes}
                onChange={(e) => scheduleSave({ ...local, personal_notes: e.target.value })}
                rows={5}
                placeholder="Idées narratives, scènes à écrire, intrigues potentielles…"
                className="w-full text-[13px] leading-relaxed px-3 py-2 bg-transparent border-none resize-none focus:outline-none text-text-secondary placeholder:text-text-quaternary/80 font-serif italic"
              />
            </Card>

            <Card
              icon="🖼"
              title="Galerie"
              titleAccent={`${local.gallery?.length ?? 0} / 10`}
            >
              <WbGallery
                entryId={local.id}
                projectId={projectId}
                value={local.gallery}
                onChange={(gallery) => {
                  const n = { ...local, gallery };
                  setLocal(n);
                  onUpdate(n);
                }}
                embedded
              />
            </Card>
          </div>

          {/* Colonne latérale */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
            <Card icon="ⓘ" title="Informations">
              <InfoList
                items={[
                  {
                    label: "Catégorie",
                    value: (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-[13px]">{catDef?.icon}</span>
                        <span>
                          {(subList.find((s) => s.key === local.subcategory)?.label) ??
                            catDef?.label}
                        </span>
                      </span>
                    ),
                  },
                  ...(novels.length > 0
                    ? [{
                        label: "Livre",
                        value: (
                          <select
                            value={local.novel_id ?? ""}
                            onChange={(e) => {
                              const v = e.target.value || null;
                              scheduleSave({ ...local, novel_id: v });
                            }}
                            className="w-full bg-transparent border border-white/[0.08] rounded px-1.5 py-0.5 text-[12px] text-text-primary cursor-pointer focus:outline-none focus:border-[var(--color-accent)]/40"
                          >
                            <option value="">— Tout le projet —</option>
                            {novels.map((n) => (
                              <option key={n.id} value={n.id}>
                                {n.title}
                              </option>
                            ))}
                          </select>
                        ),
                      }]
                    : []),
                  {
                    label: "Créée le",
                    value: formatDate(local.created_at),
                  },
                  {
                    label: "Modifiée",
                    value: relativeTime(local.updated_at),
                  },
                  {
                    label: "Statut",
                    value: (
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            local.status === "valide"
                              ? "bg-teal"
                              : local.status === "archive"
                                ? "bg-white/30"
                                : "bg-[var(--color-accent)]"
                          }`}
                        />
                        <span>{statusDef?.label ?? local.status}</span>
                      </span>
                    ),
                  },
                ]}
              />
            </Card>

            <Card icon="🏷" title="Tags">
              <WbTagsEditor
                entryId={local.id}
                value={local.tags}
                onChange={(tags) => {
                  const n = { ...local, tags };
                  setLocal(n);
                  onUpdate(n);
                }}
                projectTags={projectTags}
                embedded
              />
            </Card>

            {local.category === "personnages" && (
              <Card
                icon="👥"
                title="Groupes"
                titleAccent={(local.groups?.length ?? 0) > 0 ? `${local.groups.length}` : undefined}
              >
                <WbGroupsEditor
                  entryId={local.id}
                  value={local.groups ?? []}
                  onChange={(groups) => {
                    const n = { ...local, groups };
                    setLocal(n);
                    onUpdate(n);
                  }}
                  projectGroups={projectGroups}
                  embedded
                />
              </Card>
            )}

            <Card
              icon="🔗"
              title="Liens"
              titleAccent={entryLinks.length > 0 ? `${entryLinks.length}` : undefined}
            >
              <WbLinksEditor
                entry={local}
                allEntries={allEntries}
                links={entryLinks}
                onSelectEntry={onSelectEntry}
                onLinkAdded={onLinkAdded}
                onLinkRemoved={onLinkRemoved}
                embedded
              />
            </Card>

            {local.category === "personnages" && (
              <Card icon="💭" title="Qu'est-ce que tu ne m'as dit sur toi ?">
                <SecretsBubbles
                  value={
                    Array.isArray(
                      (local.template_data as Record<string, unknown> | null)?.secrets
                    )
                      ? (((local.template_data as Record<string, unknown>).secrets) as string[])
                      : []
                  }
                  onChange={(next) => {
                    const td = { ...(local.template_data ?? {}), secrets: next };
                    scheduleSave({ ...local, template_data: td });
                  }}
                />
              </Card>
            )}
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ========== View mode ========== */

function ViewBody({
  local,
  catDef,
  subList,
  template,
  entryLinks,
  allEntries,
  novels,
  onSelectEntry,
}: {
  local: WbEntry;
  catDef: ReturnType<typeof getCategoryDef>;
  subList: { key: string; label: string; icon?: string }[];
  template: ReturnType<typeof getTemplate>;
  entryLinks: WbLink[];
  allEntries: WbEntry[];
  novels: { id: string; title: string }[];
  onSelectEntry: (id: string) => void;
}) {
  const tone = toneFor(local.category, local.subcategory);
  const subLabel =
    subList.find((s) => s.key === local.subcategory)?.label ?? catDef?.label;
  const subIcon =
    subList.find((s) => s.key === local.subcategory)?.icon ?? catDef?.icon;

  return (
    <>
      {/* === Hero banner === */}
      <div
        className="relative rounded-[var(--radius-lg)] overflow-hidden border border-white/[0.06] mb-6"
        style={{ minHeight: local.main_image_url ? "280px" : "auto" }}
      >
        {local.main_image_url && (
          <>
            <Image
              src={local.main_image_url}
              alt={local.title}
              fill
              className="object-cover"
              unoptimized
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(15,15,22,0.35) 0%, rgba(15,15,22,0.55) 55%, rgba(15,15,22,0.92) 100%)",
              }}
            />
          </>
        )}
        {!local.main_image_url && (
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 70% 30%, ${tone.glow}, transparent 60%), linear-gradient(180deg, ${tone.bg}, rgba(15,15,22,0.85))`,
            }}
          />
        )}

        <div className="relative px-7 py-6 flex flex-col gap-2">
          {/* Badge sous-catégorie */}
          <span
            className="self-start inline-flex items-center gap-1.5 h-7 px-3 rounded-full border text-[11px] font-medium uppercase"
            style={{
              letterSpacing: "0.14em",
              background: "rgba(0,0,0,0.35)",
              borderColor: tone.border,
              color: tone.text,
              backdropFilter: "blur(4px)",
            }}
          >
            {subIcon && <span className="text-[12px] leading-none">{subIcon}</span>}
            {subLabel ?? "—"}
          </span>

          <h1 className="font-serif text-[44px] leading-[1.05] tracking-tight text-white mt-2">
            {splitLastWord(local.title ?? "Sans titre")}
          </h1>
          {local.subtitle && (
            <p className="font-serif italic text-[18px] text-[var(--color-accent)] -mt-1">
              {local.subtitle}
            </p>
          )}
          {local.description && (
            <p className="text-[13px] leading-relaxed text-white/75 max-w-[820px] mt-1 whitespace-pre-wrap">
              {local.description}
            </p>
          )}
        </div>
      </div>

      {/* === 2-col content === */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
          {template ? (
            <DynamicTemplate
              template={template}
              data={local.template_data ?? {}}
              onChange={() => {}}
              renderAsCards
              readOnly
            />
          ) : (
            <Card icon="📝" title="Description">
              {local.description?.trim() ? (
                <p className="text-[13px] leading-relaxed text-text-secondary whitespace-pre-wrap">
                  {local.description}
                </p>
              ) : (
                <p className="text-[12.5px] text-text-quaternary italic font-serif">
                  Aucune description.
                </p>
              )}
            </Card>
          )}

          {/* Blocs personnalisés (lecture seule) */}
          <WbCustomBlocks
            blocks={readCustomBlocks(local.template_data as Record<string, unknown> | null)}
            onChange={() => {}}
            readOnly
          />

          {local.personal_notes?.trim() && (
            <Card
              icon="💬"
              title={
                <span>
                  Notes <span className="font-serif italic text-[var(--color-accent)]">personnelles</span>
                  <span className="text-text-quaternary font-sans italic ml-2 text-[12px]">
                    — hors worldbuilding
                  </span>
                </span>
              }
              accent
            >
              <p className="text-[13px] leading-relaxed text-text-secondary whitespace-pre-wrap font-serif italic">
                {local.personal_notes}
              </p>
            </Card>
          )}

          {local.gallery && local.gallery.length > 0 && (
            <Card
              icon="🖼"
              title="Galerie"
              titleAccent={`${local.gallery.length} / 10`}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {local.gallery.map((url, idx) => (
                  <div
                    key={url}
                    className="relative aspect-[4/3] rounded-[var(--radius-md)] overflow-hidden border border-white/[0.06]"
                  >
                    <Image
                      src={url}
                      alt={`Image ${idx + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          <Card icon="ⓘ" title="Informations">
            <InfoList
              items={[
                {
                  label: "Catégorie",
                  value: (
                    <span className="inline-flex items-center gap-1.5">
                      {subIcon && <span className="text-[13px]">{subIcon}</span>}
                      <span>{subLabel ?? "—"}</span>
                    </span>
                  ),
                },
                ...(novels.length > 0
                  ? [{
                      label: "Livre",
                      value: (
                        <span className={local.novel_id ? "text-text-primary" : "italic text-text-quaternary"}>
                          {local.novel_id
                            ? (novels.find((n) => n.id === local.novel_id)?.title ?? "—")
                            : "Tout le projet"}
                        </span>
                      ),
                    }]
                  : []),
                { label: "Créée le", value: formatDate(local.created_at) },
                { label: "Modifiée", value: relativeTime(local.updated_at) },
                {
                  label: "Statut",
                  value: (
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          local.status === "valide"
                            ? "bg-teal"
                            : local.status === "archive"
                              ? "bg-white/30"
                              : "bg-[var(--color-accent)]"
                        }`}
                      />
                      <span>
                        {WB_STATUSES.find((s) => s.key === local.status)?.label ??
                          local.status}
                      </span>
                    </span>
                  ),
                },
              ]}
            />
          </Card>

          <Card icon="🏷" title="Tags">
            {local.tags && local.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {local.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px] bg-white/[0.03] border border-white/[0.06] text-text-tertiary"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-text-quaternary italic font-serif">
                Aucun tag.
              </p>
            )}
          </Card>

          {local.category === "personnages" && (local.groups?.length ?? 0) > 0 && (
            <Card
              icon="👥"
              title="Groupes"
              titleAccent={`${local.groups.length}`}
            >
              <div className="flex flex-wrap gap-1.5">
                {local.groups.map((g) => (
                  <span
                    key={g}
                    className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px]"
                    style={{
                      background: "rgba(239,159,39,0.10)",
                      color: "#f0b254",
                      border: "1px solid rgba(239,159,39,0.24)",
                    }}
                  >
                    {g}
                  </span>
                ))}
              </div>
            </Card>
          )}

          <Card
            icon="🔗"
            title="Liens"
            titleAccent={entryLinks.length > 0 ? `${entryLinks.length}` : undefined}
          >
            {entryLinks.length === 0 ? (
              <p className="text-[12px] text-text-quaternary italic font-serif">
                Aucun lien.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {entryLinks.map((link) => {
                  const otherId =
                    link.from_entry_id === local.id
                      ? link.to_entry_id
                      : link.from_entry_id;
                  const other = allEntries.find((e) => e.id === otherId);
                  if (!other) return null;
                  const otherCat = getCategoryDef(other.category);
                  return (
                    <li key={link.id}>
                      <button
                        onClick={() => onSelectEntry(other.id)}
                        className="w-full flex items-center gap-2.5 p-2 rounded-[var(--radius-md)] hover:bg-white/[0.03] cursor-pointer text-left transition-colors"
                      >
                        <span
                          className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)] bg-white/[0.04] border border-white/[0.05] text-[12px] flex-shrink-0"
                          aria-hidden
                        >
                          {otherCat?.icon ?? "✦"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[12.5px] text-text-primary truncate">
                            {other.title || "Sans titre"}
                          </div>
                          {other.subtitle && (
                            <div className="text-[11px] text-text-quaternary truncate font-serif italic">
                              {other.subtitle}
                            </div>
                          )}
                        </div>
                        <span
                          className="text-[9.5px] font-medium uppercase text-text-quaternary flex-shrink-0"
                          style={{ letterSpacing: "0.16em" }}
                        >
                          {link.link_type}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {local.category === "personnages" && (() => {
            const td = local.template_data as Record<string, unknown> | null;
            const secrets = Array.isArray(td?.secrets) ? (td?.secrets as string[]) : [];
            const filled = secrets.filter((s) => (s ?? "").trim().length > 0);
            if (filled.length === 0) return null;
            return (
              <Card icon="💭" title="Qu'est-ce que tu ne m'as dit sur toi ?">
                <ul className="flex flex-col gap-2">
                  {filled.map((s, i) => (
                    <li
                      key={i}
                      className="text-[12px] text-text-secondary italic font-serif leading-snug px-3 py-2 rounded-[var(--radius-md)] bg-white/[0.03] border border-white/[0.05] relative"
                      style={{ borderBottomLeftRadius: i % 2 === 0 ? 4 : undefined, borderBottomRightRadius: i % 2 === 1 ? 4 : undefined }}
                    >
                      « {s} »
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })()}
        </div>
      </div>
    </>
  );
}

/** Rend le titre avec son dernier mot en serif italique accent (style mockup). */
function splitLastWord(title: string): React.ReactNode {
  const parts = title.trim().split(/\s+/);
  if (parts.length <= 1) return title;
  const last = parts.pop();
  return (
    <>
      {parts.join(" ")}{" "}
      <span className="italic text-[var(--color-accent)]/95">{last}</span>
    </>
  );
}

/* ========== Sub-components ========== */

/** Trois bulles éditables : réponses du personnage à la question « qu'est-ce que tu ne m'as dit sur toi ? ». */
function SecretsBubbles({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  // Toujours 3 positions (remplies ou vides)
  const bubbles: string[] = [0, 1, 2].map((i) => value[i] ?? "");
  const filledCount = bubbles.filter((b) => b.trim().length > 0).length;

  const update = (i: number, v: string) => {
    const next = [...bubbles];
    next[i] = v;
    // Trim trailing empties pour garder l'array propre en BDD
    while (next.length > 0 && (next[next.length - 1] ?? "").trim() === "") next.pop();
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[11.5px] text-text-quaternary italic font-serif leading-snug">
        Ton personnage a peut-être encore des secrets. Note ici ce qu'il hésite à t'avouer
        — trois voix, trois non-dits.
      </p>
      <ul className="flex flex-col gap-1.5">
        {bubbles.map((b, i) => {
          const isLeft = i % 2 === 0;
          return (
            <li key={i} className={`flex ${isLeft ? "justify-start" : "justify-end"}`}>
              <div
                className={`relative w-[92%] rounded-[var(--radius-md)] px-2.5 py-1.5 border ${
                  b.trim().length > 0
                    ? "bg-white/[0.04] border-white/[0.08]"
                    : "bg-transparent border-dashed border-white/[0.07]"
                }`}
                style={{
                  borderBottomLeftRadius: isLeft ? 4 : undefined,
                  borderBottomRightRadius: !isLeft ? 4 : undefined,
                }}
              >
                <textarea
                  value={b}
                  onChange={(e) => update(i, e.target.value)}
                  placeholder={
                    i === 0
                      ? "Un non-dit que je garde pour moi…"
                      : i === 1
                        ? "Un autre, que même toi ne sais pas…"
                        : "Et celui-là, je ne l'avouerai jamais."
                  }
                  rows={2}
                  className="w-full bg-transparent border-none outline-none resize-none text-[12px] italic font-serif text-text-secondary placeholder:text-text-quaternary/60 leading-snug"
                />
              </div>
            </li>
          );
        })}
      </ul>
      {filledCount === 0 && (
        <p className="text-[10.5px] text-text-quaternary/80 italic">
          Astuce : ces trois bulles sont un rappel que ton personnage te cache peut-être
          encore quelque chose.
        </p>
      )}
    </div>
  );
}

function Card({
  icon,
  title,
  titleAccent,
  accent,
  children,
}: {
  icon?: string;
  title: React.ReactNode;
  titleAccent?: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-[var(--radius-lg)] border p-4 ${
        accent
          ? "border-[var(--color-accent-border)]/50 bg-[var(--color-accent-bg)]/20"
          : "border-white/[0.06] bg-bg-tertiary/50"
      }`}
    >
      <header className="flex items-center gap-2 mb-3">
        {icon && (
          <span
            className="flex items-center justify-center w-6 h-6 rounded-[var(--radius-sm)] bg-white/[0.04] text-[12px]"
            aria-hidden
          >
            {icon}
          </span>
        )}
        <h3 className="text-[13.5px] text-text-primary font-medium">{title}</h3>
        {titleAccent && (
          <span className="text-[11px] text-text-quaternary ml-auto font-serif italic">
            {titleAccent}
          </span>
        )}
      </header>
      {children}
    </section>
  );
}

function InfoList({
  items,
}: {
  items: { label: string; value: React.ReactNode }[];
}) {
  return (
    <dl className="flex flex-col gap-2.5">
      {items.map((it) => (
        <div key={it.label} className="flex items-center justify-between gap-3 text-[12px]">
          <dt className="text-text-tertiary">{it.label}</dt>
          <dd className="text-text-primary text-right">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  return formatDate(iso);
}
