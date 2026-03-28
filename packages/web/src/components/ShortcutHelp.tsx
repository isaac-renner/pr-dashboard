import React from "react";
import { formatKeys, type ShortcutDef } from "../lib/shortcuts.js";

interface ShortcutHelpProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly shortcuts: ReadonlyArray<ShortcutDef>;
}

export function ShortcutHelp({ open, onClose, shortcuts }: ShortcutHelpProps) {
  if (!open) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="overlay-modal" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <span>Keyboard Shortcuts</span>
          <kbd>Esc</kbd>
        </div>
        <div className="panel-body">
          {shortcuts.map((s) => (
            <div key={s.keys} className="flex-between" style={{ padding: "calc(var(--line-height) / 2) 0", borderBottom: "1px dotted var(--border-color)" }}>
              <span>
                {formatKeys(s.keys).split(" ").map((k, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="muted"> then </span>}
                    <kbd>{k}</kbd>
                  </React.Fragment>
                ))}
              </span>
              <span className="muted">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
