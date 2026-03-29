import { useAtomValue } from "@effect/atom-react";
import React from "react";
import { navItemsAtom } from "../atoms/derived.js";
import { filtersAtom } from "../atoms/filters.js";
import { viewModeAtom } from "../atoms/view.js";
import { selectedNavIndexAtom } from "../atoms/selection.js";
import type { ShortcutDef } from "../lib/shortcuts.js";

interface FloatingBarProps {
  readonly pending: string | null;
  readonly shortcuts: ReadonlyArray<ShortcutDef>;
}

export function FloatingBar({ pending, shortcuts }: FloatingBarProps) {
  const filters = useAtomValue(filtersAtom);
  const viewMode = useAtomValue(viewModeAtom);
  const navItems = useAtomValue(navItemsAtom);
  const selectedNavIndex = useAtomValue(selectedNavIndexAtom);

  const groupLabel = filters.group === "stack" ? "STACK"
    : filters.group === "repo" ? "REPO"
    : filters.group === "review" ? "REVIEW"
    : filters.group === "pipeline" ? "PIPELINE"
    : filters.group === "none" ? "ALL"
    : "TICKET";

  const prCount = navItems.filter((i) => i._tag === "pr").length;
  const position = selectedNavIndex >= 0 ? `${selectedNavIndex + 1}/${navItems.length}` : `${prCount} PRs`;
  const viewLabel = viewMode === "reviews" ? "REVIEWS" : "MY PRS";

  if (pending) {
    const completions = shortcuts.filter((s) => {
      const parts = s.keys.split(" ");
      return parts.length === 2 && parts[0] === pending;
    });

    return (
      <div className="floating-bar">
        <div className="flex floating-bar-shortcuts" style={{ flex: 1 }}>
          <span>{pending} →</span>
          {completions.map((s) => {
            const secondKey = s.keys.split(" ")[1]!;
            return (
              <span key={s.keys}>
                <kbd>{secondKey}</kbd> <span className="muted">{s.label.replace(/^.*?by |^.*?to |^Open |^Focus |^Clear |^Toggle |^Close |^Move |^Group |^No /, "")}</span>
              </span>
            );
          })}
        </div>
        <span className="muted">{groupLabel}</span>
        <span className="status-bar-view">{viewLabel}</span>
      </div>
    );
  }

  return (
    <div className="floating-bar">
      <div className="flex muted floating-bar-shortcuts" style={{ flex: 1 }}>
        <span><kbd>j</kbd><kbd>k</kbd> nav</span>
        <span><kbd>o</kbd> open</span>
        <span><kbd>p</kbd> pipeline</span>
        <span><kbd>i</kbd> detail</span>
        <span><kbd>/</kbd> search</span>
        <span><kbd>?</kbd> help</span>
      </div>
      <span className="muted">{position}</span>
      <span className="muted" style={{ marginLeft: "1ch" }}>{groupLabel}</span>
      <span className="status-bar-view">{viewLabel}</span>
    </div>
  );
}
