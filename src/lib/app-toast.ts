/**
 * Message éphémère en bas de l'écran.
 *
 * Pourquoi : jusqu'ici, un enregistrement raté écrivait dans la console
 * et s'arrêtait là. À l'écran, rien — l'image ne s'affichait pas, le lien
 * n'apparaissait pas, et l'autrice ne pouvait pas distinguer une panne
 * réseau d'un refus délibéré. Une panne muette est pire qu'une erreur :
 * elle fait douter de ce qu'on vient de faire.
 *
 * Rendu en DOM pur, comme `appConfirm` : appelable depuis n'importe quel
 * composant, un `catch`, ou du code hors React.
 *
 * Usage :
 *   appToast("Le lien n'a pas pu être enregistré.", { danger: true });
 *   appToast("Image enregistrée.");
 */

const STACK_ID = "autris-toasts";
const LIFETIME_MS = 5200;

function stack(): HTMLElement {
  let el = document.getElementById(STACK_ID);
  if (el) return el;
  el = document.createElement("div");
  el.id = STACK_ID;
  el.style.cssText = [
    "position:fixed",
    "z-index:9997",
    "left:50%",
    "bottom:24px",
    "transform:translateX(-50%)",
    "display:flex",
    "flex-direction:column",
    "align-items:center",
    "gap:8px",
    // La pile ne doit pas intercepter les clics : seules les pastilles le font.
    "pointer-events:none",
    "width:min(520px,92vw)",
  ].join(";");
  document.body.append(el);
  return el;
}

export function appToast(
  message: string,
  opts?: { danger?: boolean; duration?: number },
): void {
  if (typeof document === "undefined" || !message) return;

  const danger = opts?.danger ?? false;
  const box = document.createElement("div");
  box.setAttribute("role", danger ? "alert" : "status");
  box.setAttribute("aria-live", danger ? "assertive" : "polite");
  box.style.cssText = [
    "pointer-events:auto",
    "display:flex",
    "align-items:flex-start",
    "gap:10px",
    "width:100%",
    "padding:11px 13px",
    "border-radius:var(--r-md, 8px)",
    "background:var(--bg-3, #232937)",
    `border:1px solid ${danger ? "var(--danger, #e05555)" : "rgba(255,255,255,.12)"}`,
    "box-shadow:0 12px 40px rgba(0,0,0,.45)",
    "font-family:inherit",
    "font-size:12.5px",
    "line-height:1.55",
    "color:var(--text-1, #e8e6e3)",
    "opacity:0",
    "transform:translateY(6px)",
    "transition:opacity 160ms ease, transform 160ms ease",
  ].join(";");

  const text = document.createElement("div");
  text.textContent = message;
  text.style.cssText = "flex:1;white-space:pre-wrap";

  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "✕";
  close.setAttribute("aria-label", "Fermer ce message");
  close.style.cssText = [
    "flex:none",
    "background:none",
    "border:none",
    "padding:0 2px",
    "cursor:pointer",
    "font-family:inherit",
    "font-size:12px",
    "line-height:1.4",
    "color:var(--text-3, #8a8681)",
  ].join(";");

  let timer: ReturnType<typeof setTimeout> | null = null;
  const dismiss = () => {
    if (timer) clearTimeout(timer);
    box.style.opacity = "0";
    box.style.transform = "translateY(6px)";
    setTimeout(() => box.remove(), 180);
  };

  close.addEventListener("click", dismiss);
  // Le temps de lire : survoler suspend le compte à rebours.
  box.addEventListener("mouseenter", () => {
    if (timer) clearTimeout(timer);
  });
  box.addEventListener("mouseleave", () => {
    timer = setTimeout(dismiss, 1600);
  });

  box.append(text, close);
  stack().append(box);

  requestAnimationFrame(() => {
    box.style.opacity = "1";
    box.style.transform = "translateY(0)";
  });

  timer = setTimeout(dismiss, opts?.duration ?? LIFETIME_MS);
}
