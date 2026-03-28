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
    <div className="shortcut-overlay" onClick={onClose}>
      <div className="shortcut-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shortcut-modal-header">
          <span>Keyboard Shortcuts</span>
          <button onClick={onClose} className="shortcut-close">Esc</button>
        </div>
        <div className="shortcut-list">
          {shortcuts.map((s) => (
            <div key={s.keys} className="shortcut-row">
              <span className="shortcut-keys">
                {formatKeys(s.keys).split(" ").map((k, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="shortcut-then"> then </span>}
                    <kbd>{k}</kbd>
                  </React.Fragment>
                ))}
              </span>
              <span className="shortcut-desc">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
