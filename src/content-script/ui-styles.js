/** Styles for the in-page UI. Scoped to a closed shadow root, so nothing leaks either way. */
export const UI_STYLES = `
:host {
  --font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --bg: rgba(255, 255, 255, 0.86);
  --bg-solid: #ffffff;
  --text: #18181b;
  --muted: #71717a;
  --faint: #a1a1aa;
  --hover: rgba(24, 24, 27, 0.06);
  --line: rgba(24, 24, 27, 0.08);
  --check: rgba(24, 24, 27, 0.05);
  --accent: #5e5ce6;
  --success: #1f9d55;
  --danger: #e5484d;
  --shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.06),
    0 12px 32px -6px rgba(0, 0, 0, 0.18);
  color-scheme: light;
}
:host([data-scheme="dark"]) {
  --bg: rgba(30, 30, 33, 0.82);
  --bg-solid: #1e1e21;
  --text: #f4f4f5;
  --muted: #a1a1aa;
  --faint: #71717a;
  --hover: rgba(255, 255, 255, 0.08);
  --line: rgba(255, 255, 255, 0.08);
  --check: rgba(255, 255, 255, 0.05);
  --accent: #7d7aff;
  --success: #3dd68c;
  --danger: #ff6369;
  --shadow: 0 0 0 0.5px rgba(255, 255, 255, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.3),
    0 16px 40px -8px rgba(0, 0, 0, 0.55);
  color-scheme: dark;
}

* { box-sizing: border-box; }

.surface {
  position: fixed;
  pointer-events: auto;
  font: 13px/18px var(--font);
  letter-spacing: -0.005em;
  color: var(--text);
  background: var(--bg);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  box-shadow: var(--shadow);
  -webkit-font-smoothing: antialiased;
}

/* ——— Menu ——— */
.menu {
  top: 0;
  left: 0;
  width: 248px;
  padding: 5px;
  border-radius: 12px;
  outline: none;
  opacity: 0;
  transform: scale(0.97);
  transition: opacity 100ms ease, transform 150ms var(--ease-out);
}
.menu[data-open] { opacity: 1; transform: none; }
/* Exits are simpler than entries: the choice is made, just get out of the way. */
.menu[data-closing] { opacity: 0; transform: none; transition: opacity 80ms ease; }

.head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 5px 7px;
}
.thumb {
  flex: none;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  padding: 6px;
  border-radius: 8px;
  background: conic-gradient(var(--check) 25%, transparent 0 50%, var(--check) 0 75%, transparent 0) 0 0 / 8px 8px;
  box-shadow: inset 0 0 0 0.5px var(--line);
  overflow: hidden;
}
.thumb > img, .thumb > svg { width: 100%; height: 100%; display: block; object-fit: contain; }
.thumb[data-loading]::after {
  content: "";
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1.5px solid var(--line);
  border-top-color: var(--muted);
  animation: spin 700ms linear infinite;
}
.meta { min-width: 0; flex: 1; }
.name {
  font-weight: 560;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sub {
  margin-top: 1px;
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-variant-numeric: tabular-nums;
}
.badge {
  display: inline-block;
  margin-right: 6px;
  padding: 0 5px;
  border-radius: 4px;
  font-size: 10px;
  line-height: 15px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  vertical-align: 1px;
}
.sep { height: 1px; margin: 4px 6px; background: var(--line); }

.item {
  all: unset;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 30px;
  padding: 0 8px;
  border-radius: 7px;
  cursor: default;
  color: var(--text);
  font: inherit;
}
.item svg { flex: none; color: var(--muted); }
.item span { flex: 1; }
.item[data-active] { background: var(--hover); }
.item[data-active] svg { color: var(--text); }
.menu[data-error] .item { color: var(--faint); }
.menu[data-error] .thumb { color: var(--danger); }
.item:focus-visible { box-shadow: inset 0 0 0 1.5px var(--accent); }
kbd {
  font: 500 11px/16px var(--font);
  color: var(--faint);
  min-width: 18px;
  text-align: center;
}
.foot {
  padding: 6px 8px 3px;
  font-size: 11px;
  line-height: 15px;
  color: var(--faint);
}

/* ——— Highlight ——— */
.ring {
  position: fixed;
  pointer-events: none;
  border-radius: 6px;
  box-shadow: 0 0 0 1.5px var(--accent), 0 0 0 5px color-mix(in srgb, var(--accent) 22%, transparent);
  background: color-mix(in srgb, var(--accent) 7%, transparent);
  opacity: 0;
  transition: opacity 100ms ease;
}
.ring[data-open] { opacity: 1; transition-duration: 120ms; }
.ring-label {
  position: absolute;
  left: -1.5px;
  bottom: calc(100% + 8px);
  max-width: 240px;
  padding: 2px 7px;
  border-radius: 5px;
  font: 500 11px/16px var(--font);
  color: #fff;
  background: var(--accent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ring-label:empty { display: none; }
.ring[data-below] .ring-label { bottom: auto; top: calc(100% + 8px); }

/* ——— Toast ——— */
.toast {
  left: 50%;
  bottom: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: min(420px, calc(100vw - 32px));
  padding: 8px 14px 8px 8px;
  border-radius: 999px;
  font-weight: 500;
  opacity: 0;
  transform: translate(-50%, 8px) scale(0.97);
  transition: opacity 120ms ease, transform 150ms ease;
}
.toast[data-open] {
  opacity: 1;
  transform: translate(-50%, 0);
  transition: opacity 160ms ease, transform 300ms var(--ease-out);
}
.toast-icon[data-pop] { animation: icon-pop 300ms var(--ease-out) both; }
.toast-icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: #fff;
  background: var(--success);
}
.toast-icon svg { width: 14px; height: 14px; stroke-width: 2.5; }
.toast[data-tone="error"] .toast-icon { background: var(--danger); }
.toast[data-tone="pending"] .toast-icon { background: var(--hover); }
.toast[data-tone="pending"] .toast-icon::after {
  content: "";
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1.5px solid var(--line);
  border-top-color: var(--text);
  animation: spin 700ms linear infinite;
}
.toast-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.toast[data-tone="error"] { border-radius: 14px; }
.toast[data-tone="error"] .toast-text { white-space: normal; }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes icon-pop { from { transform: scale(0.6); opacity: 0; } }
@keyframes fade-in { from { opacity: 0; } }

/* Reduced motion: gentler, not zero. Fades stay; scaling and sliding go. */
@media (prefers-reduced-motion: reduce) {
  .menu, .menu[data-closing] { transform: none; }
  .toast, .toast[data-open] { transform: translate(-50%, 0); }
  .toast-icon[data-pop] { animation-name: fade-in; }
}
`;
