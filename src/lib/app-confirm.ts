/**
 * Remplaçant de window.confirm : dialogue de confirmation maison.
 *
 * Pourquoi : le navigateur peut bloquer définitivement les dialogues
 * natifs (« Ne plus autoriser ce site à afficher des boîtes de
 * dialogue ») — confirm() renvoie alors false sans rien afficher et
 * toutes les suppressions deviennent silencieusement impossibles.
 *
 * Usage : `if (!(await appConfirm("Supprimer ?"))) return;`
 * Rendu en DOM pur (pas de React) pour être appelable de partout.
 */
export function appConfirm(
  message: string,
  opts?: { confirmLabel?: string; danger?: boolean },
): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(false);
      return;
    }

    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,.5)";

    const box = document.createElement("div");
    box.style.cssText = [
      "position:fixed",
      "z-index:9999",
      "top:28vh",
      "left:50%",
      "transform:translateX(-50%)",
      "width:min(420px,92vw)",
      "background:var(--bg-3, #232937)",
      "border:1px solid rgba(255,255,255,.12)",
      "border-radius:var(--r-lg, 12px)",
      "padding:20px",
      "box-shadow:0 20px 60px rgba(0,0,0,.55)",
      "font-family:inherit",
    ].join(";");

    const text = document.createElement("div");
    text.textContent = message;
    text.style.cssText =
      "font-size:13px;line-height:1.6;color:var(--text-1, #e8e6e3);white-space:pre-wrap;margin-bottom:16px";

    const row = document.createElement("div");
    row.style.cssText = "display:flex;justify-content:flex-end;gap:8px";

    const btnBase =
      "height:34px;padding:0 16px;border-radius:var(--r-md, 8px);font-size:12.5px;cursor:pointer;font-family:inherit";

    const cancel = document.createElement("button");
    cancel.textContent = "Annuler";
    cancel.style.cssText = `${btnBase};background:transparent;border:1px solid rgba(255,255,255,.12);color:var(--text-2, #b9b6b1)`;

    const ok = document.createElement("button");
    ok.textContent = opts?.confirmLabel ?? "Confirmer";
    ok.style.cssText =
      opts?.danger === false
        ? `${btnBase};background:var(--accent, #d9a25f);border:none;color:#1a1410;font-weight:600`
        : `${btnBase};background:var(--danger, #e05555);border:none;color:#fff;font-weight:600`;

    const cleanup = (result: boolean) => {
      document.removeEventListener("keydown", onKey, true);
      overlay.remove();
      box.remove();
      resolve(result);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        cleanup(false);
      }
      if (e.key === "Enter") {
        e.stopPropagation();
        cleanup(true);
      }
    };

    overlay.addEventListener("click", () => cleanup(false));
    cancel.addEventListener("click", () => cleanup(false));
    ok.addEventListener("click", () => cleanup(true));
    document.addEventListener("keydown", onKey, true);

    row.append(cancel, ok);
    box.append(text, row);
    document.body.append(overlay, box);
    ok.focus();
  });
}
