import React from "react";
import { formatKeys, type ShortcutDef } from "../lib/shortcuts.js";

interface ShortcutHelpProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly shortcuts: ReadonlyArray<ShortcutDef>;
}

export function ShortcutHelp({ open, onClose, shortcuts }: ShortcutHelpProps) {
  if (!open) return null;

  // Group shortcuts by category
  const groups = new Map<string, ShortcutDef[]>();
  for (const s of shortcuts) {
    const group = s.group ?? "Other";
    const list = groups.get(group);
    if (list) list.push(s);
    else groups.set(group, [s]);
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="overlay-modal" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <span>Keyboard Shortcuts</span>
          <kbd>Esc</kbd>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 3ch", padding: "var(--line-height) 1ch" }}>
          {Array.from(groups.entries()).map(([groupName, items]) => (
            <div key={groupName} style={{ marginTop: 0 }}>
              <div style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "calc(var(--line-height) / 4)" }}>
                {groupName}
              </div>
              {items.map((s) => (
                <div key={s.keys} className="flex-between" style={{ padding: "calc(var(--line-height) / 4) 0" }}>
                  <span>
                    {formatKeys(s.keys).split(" ").map((k, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span className="muted"> </span>}
                        <kbd>{k}</kbd>
                      </React.Fragment>
                    ))}
                  </span>
                  <span className="muted">{s.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
