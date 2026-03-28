import { useAtomValue } from "@effect/atom-react";
import React from "react";
import { displayOrderAtom } from "../atoms/derived.js";
import { filtersAtom } from "../atoms/filters.js";
import { selectedIndexAtom } from "../atoms/selection.js";
import type { ShortcutDef } from "../lib/shortcuts.js";

interface FloatingBarProps {
  readonly pending: string | null;
  readonly shortcuts: ReadonlyArray<ShortcutDef>;
}

export function FloatingBar({ pending, shortcuts }: FloatingBarProps) {
  const filters = useAtomValue(filtersAtom);
  const selectedIndex = useAtomValue(selectedIndexAtom);
  const displayOrder = useAtomValue(displayOrderAtom);

  const groupLabel = filters.group === "stack" ? "STACK"
    : filters.group === "repo" ? "REPO"
    : "TICKET";

  // Chord mode: show completions
  if (pending) {
    const completions = shortcuts.filter((s) => {
      const parts = s.keys.split(" ");
      return parts.length === 2 && parts[0] === pending;
    });

    return (
      <div className="floating-bar">
        <div className="flex" style={{ flex: 1 }}>
          <span>{pending} →</span>
          {completions.map((s) => {
            const secondKey = s.keys.split(" ")[1]!;
            return (
              <span key={s.keys}>
                <kbd>{secondKey}</kbd> <span className="muted">{s.label.replace(/^.*?by |^.*?to |^Open |^Focus |^Clear |^Toggle |^Close |^Move |^Group /, "")}</span>
              </span>
            );
          })}
        </div>
        <span>{groupLabel}</span>
      </div>
    );
  }

  // Default: show common shortcuts + mode
  const position = selectedIndex >= 0
    ? `${selectedIndex + 1}/${displayOrder.length}`
    : `${displayOrder.length} PRs`;

  return (
    <div className="floating-bar">
      <div className="flex muted" style={{ flex: 1 }}>
        <span><kbd>j</kbd><kbd>k</kbd> nav</span>
        <span><kbd>o</kbd> open</span>
        <span><kbd>/</kbd> search</span>
        <span><kbd>?</kbd> help</span>
      </div>
      <span className="muted">{position}</span>
      <span style={{ marginLeft: "1ch" }}>{groupLabel}</span>
    </div>
  );
}
