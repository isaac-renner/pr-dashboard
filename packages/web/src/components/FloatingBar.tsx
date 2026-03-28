import React from "react";
import type { ShortcutDef } from "../lib/shortcuts.js";

interface FloatingBarProps {
  readonly pending: string | null;
  readonly shortcuts: ReadonlyArray<ShortcutDef>;
}

export function FloatingBar({ pending, shortcuts }: FloatingBarProps) {
  if (!pending) return null;

  // Find all shortcuts that start with the pending prefix
  const completions = shortcuts.filter((s) => {
    const parts = s.keys.split(" ");
    return parts.length === 2 && parts[0] === pending;
  });

  if (completions.length === 0) return null;

  return (
    <div className="floating-bar">
      <span className="muted">{pending} →</span>
      {completions.map((s) => {
        const secondKey = s.keys.split(" ")[1]!;
        return (
          <span key={s.keys}>
            <kbd>{secondKey}</kbd> <span className="muted">{s.label.replace(/^.*?by |^.*?to /, "")}</span>
          </span>
        );
      })}
    </div>
  );
}
