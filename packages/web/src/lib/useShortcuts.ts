/**
 * React hook for the keyboard shortcut engine.
 *
 * The engine reads shortcuts from a ref so it always has the latest
 * definitions without being destroyed/recreated on every render.
 * This prevents mid-chord state (e.g. pending "g") from being lost
 * when a React re-render changes the shortcuts array identity.
 */

import { useEffect, useRef, useState } from "react";
import { createShortcutEngine, type ShortcutDef } from "./shortcuts.js";

/**
 * Register keyboard shortcuts. Returns the current pending chord prefix
 * (e.g. "g" while waiting for the second key) for UI display.
 */
export function useShortcuts(shortcuts: ReadonlyArray<ShortcutDef>): string | null {
  const [pending, setPending] = useState<string | null>(null);
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    // Create engine once with a stable proxy that reads from the ref
    const engine = createShortcutEngine(window, shortcutsRef);
    engine.onPendingChange(setPending);
    return () => engine.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return pending;
}
