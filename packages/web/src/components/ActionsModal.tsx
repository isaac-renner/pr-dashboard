import React, { useCallback, useEffect, useState } from "react";
import type { PR } from "../lib/types.js";

interface Action {
  readonly key: string;
  readonly label: string;
  readonly url: string;
}

interface ActionsModalProps {
  readonly pr: PR | null;
  readonly open: boolean;
  readonly onClose: () => void;
}

function getActions(pr: PR): Action[] {
  const actions: Action[] = [
    { key: "o", label: "Open PR", url: pr.url },
    { key: "r", label: "Changed files", url: `${pr.url}/files` },
  ];
  if (pr.pipelineUrl) {
    actions.push({ key: "p", label: "Pipeline", url: pr.pipelineUrl });
  }
  if (pr.jiraTicket) {
    actions.push({ key: "t", label: `Ticket ${pr.jiraTicket}`, url: `https://ailo.atlassian.net/browse/${pr.jiraTicket}` });
  }
  return actions;
}

export function ActionsModal({ pr, open, onClose }: ActionsModalProps) {
  const [focusIndex, setFocusIndex] = useState(0);

  const actions = pr ? getActions(pr) : [];

  // Reset focus when opening
  useEffect(() => {
    if (open) setFocusIndex(0);
  }, [open]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (!open || !pr) return;

    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "j") {
      e.preventDefault();
      setFocusIndex((i) => (i + 1) % actions.length);
      return;
    }
    if (e.key === "ArrowUp" || e.key === "k") {
      e.preventDefault();
      setFocusIndex((i) => (i - 1 + actions.length) % actions.length);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      window.open(actions[focusIndex]!.url, "_blank");
      onClose();
      return;
    }

    // Direct key shortcut
    const match = actions.find((a) => a.key === e.key.toLowerCase());
    if (match) {
      e.preventDefault();
      window.open(match.url, "_blank");
      onClose();
    }
  }, [open, pr, actions, focusIndex, onClose]);

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, handleKey]);

  if (!open || !pr) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="overlay-modal" onClick={(e) => e.stopPropagation()} style={{ minWidth: "30ch", maxWidth: "50ch" }}>
        <div className="panel-header">
          <span>#{pr.number} Actions</span>
          <kbd>Esc</kbd>
        </div>
        <div style={{ padding: "var(--line-height) 1ch" }}>
          {actions.map((action, i) => (
            <div
              key={action.key}
              className={`flex-between${i === focusIndex ? " selected" : ""}`}
              style={{ padding: "calc(var(--line-height) / 2) 1ch", cursor: "pointer", margin: "0 -1ch" }}
              onClick={() => { window.open(action.url, "_blank"); onClose(); }}
              onMouseEnter={() => setFocusIndex(i)}
            >
              <span><kbd>{action.key}</kbd> {action.label}</span>
              <span className="muted">→</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
