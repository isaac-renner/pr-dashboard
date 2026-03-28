/**
 * React hook for the keyboard shortcut engine.
 */

import { useEffect, useState } from "react";
import { createShortcutEngine, type ShortcutDef } from "./shortcuts.js";

/**
 * Register keyboard shortcuts. Returns the current pending chord prefix
 * (e.g. "g" while waiting for the second key) for UI display.
 */
export function useShortcuts(shortcuts: ReadonlyArray<ShortcutDef>): string | null {
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    const engine = createShortcutEngine(window, shortcuts);
    engine.onPendingChange(setPending);
    return () => engine.destroy();
  }, [shortcuts]);

  return pending;
}
