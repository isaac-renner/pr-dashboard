/**
 * Keyboard shortcut engine.
 *
 * Supports:
 * - Single keys: "r", "?", "Escape"
 * - Chords: "g n", "g t" (press g, release, press n within timeout)
 * - Modifiers: "$mod+k" ($mod = Meta on Mac, Ctrl elsewhere)
 * - Input filtering: bare keys ignored when typing, modifiers still fire
 *
 * Framework-agnostic — the React hook is in useShortcuts.ts.
 */

const IS_MAC = typeof navigator !== "undefined"
  && (navigator.platform.includes("Mac") || navigator.platform.includes("iPhone"));

const CHORD_TIMEOUT_MS = 800;

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ShortcutDef {
  /** Key sequence: "r", "g n", "$mod+k" */
  readonly keys: string;
  /** Human-readable label for help overlay */
  readonly label: string;
  /** Handler */
  readonly action: () => void;
  /** Fire even when focus is in an input/textarea/select */
  readonly enableInInputs?: boolean;
  /** Category for grouping in help overlay */
  readonly group?: string | undefined;
}

interface ParsedPress {
  readonly key: string;
  readonly meta: boolean;
  readonly ctrl: boolean;
  readonly shift: boolean;
  readonly alt: boolean;
}

// -----------------------------------------------------------------------------
// Parsing
// -----------------------------------------------------------------------------

function parsePress(raw: string): ParsedPress {
  const parts = raw.split("+");
  const key = parts.pop()!.toLowerCase();
  const mods = new Set(parts.map((m) => m.toLowerCase()));

  return {
    key,
    meta: mods.has("meta") || (mods.has("$mod") && IS_MAC),
    ctrl: mods.has("ctrl") || mods.has("control") || (mods.has("$mod") && !IS_MAC),
    shift: mods.has("shift"),
    alt: mods.has("alt"),
  };
}

function matchesEvent(event: KeyboardEvent, press: ParsedPress): boolean {
  if (event.key.toLowerCase() !== press.key) return false;
  if (event.metaKey !== press.meta) return false;
  if (event.ctrlKey !== press.ctrl) return false;
  if (event.altKey !== press.alt) return false;
  // Only check shiftKey if the shortcut explicitly requires a modifier.
  // For printable characters like "?" that inherently need shift to type,
  // we skip the shift check — otherwise "?" would never match since
  // parsePress("?") has shift:false but the event always has shiftKey:true.
  if (press.shift || press.meta || press.ctrl || press.alt) {
    if (event.shiftKey !== press.shift) return false;
  }
  return true;
}

function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
}

function hasModifier(press: ParsedPress): boolean {
  return press.meta || press.ctrl || press.alt;
}

// -----------------------------------------------------------------------------
// Engine
// -----------------------------------------------------------------------------

export interface ShortcutEngine {
  /** Call this to tear down listeners */
  readonly destroy: () => void;
  /** Current pending chord prefix, if any (for UI display) */
  readonly getPending: () => string | null;
  /** Register a callback for when pending state changes */
  readonly onPendingChange: (fn: (pending: string | null) => void) => void;
}

export function createShortcutEngine(
  target: EventTarget,
  shortcuts: ReadonlyArray<ShortcutDef>,
): ShortcutEngine {
  let pending: { key: string; raw: string; time: number } | null = null;
  let pendingTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingListener: ((pending: string | null) => void) | null = null;

  function setPending(next: { key: string; raw: string; time: number } | null) {
    pending = next;
    if (pendingTimer) clearTimeout(pendingTimer);
    if (next) {
      pendingTimer = setTimeout(() => {
        pending = null;
        pendingTimer = null;
        pendingListener?.(null);
      }, CHORD_TIMEOUT_MS);
    }
    pendingListener?.(next?.raw ?? null);
  }

  // Pre-parse all shortcuts
  const parsed = shortcuts.map((def) => {
    const presses = def.keys.split(" ").map(parsePress);
    return { def, presses };
  });

  // Which keys can start a chord?
  const chordStarters = new Set<string>();
  for (const { presses } of parsed) {
    if (presses.length >= 2) {
      chordStarters.add(presses[0]!.key);
    }
  }

  function handler(event: KeyboardEvent) {
    const inInput = isEditableTarget(event.target);

    // Try to match chords first (if we have a pending key)
    if (pending) {
      for (const { def, presses } of parsed) {
        if (presses.length !== 2) continue;
        if (inInput && !def.enableInInputs) continue;
        if (pending.key !== presses[0]!.key) continue;
        if (Date.now() - pending.time > CHORD_TIMEOUT_MS) continue;
        if (matchesEvent(event, presses[1]!)) {
          event.preventDefault();
          setPending(null);
          def.action();
          return;
        }
      }
      // Chord didn't match — clear pending and fall through to single-key
      setPending(null);
    }

    // Check if this key starts a chord
    if (chordStarters.has(event.key.toLowerCase()) && !inInput) {
      const raw = event.key.toLowerCase();
      setPending({ key: raw, raw, time: Date.now() });
      return; // Don't fire single-key shortcuts that share a chord starter
    }

    // Single-key and modifier shortcuts
    for (const { def, presses } of parsed) {
      if (presses.length !== 1) continue;
      if (inInput && !def.enableInInputs && !hasModifier(presses[0]!)) continue;
      if (matchesEvent(event, presses[0]!)) {
        event.preventDefault();
        def.action();
        return;
      }
    }
  }

  target.addEventListener("keydown", handler as EventListener);

  return {
    destroy: () => {
      target.removeEventListener("keydown", handler as EventListener);
      if (pendingTimer) clearTimeout(pendingTimer);
    },
    getPending: () => pending?.raw ?? null,
    onPendingChange: (fn) => {
      pendingListener = fn;
    },
  };
}

// -----------------------------------------------------------------------------
// Display helpers
// -----------------------------------------------------------------------------

/** Format a key string for display: "$mod+k" → "⌘K" (Mac) or "Ctrl+K" */
export function formatKeys(keys: string): string {
  return keys.split(" ").map((press) =>
    press
      .replace("$mod", IS_MAC ? "⌘" : "Ctrl")
      .replace("Shift", IS_MAC ? "⇧" : "Shift")
      .replace("Alt", IS_MAC ? "⌥" : "Alt")
      .split("+")
      .map((part) => part.length === 1 ? part.toUpperCase() : part)
      .join(IS_MAC ? "" : "+")
  ).join(" ");
}
