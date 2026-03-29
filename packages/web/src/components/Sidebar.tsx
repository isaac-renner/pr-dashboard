import { useAtomValue } from "@effect/atom-react";
import React from "react";
import { lastSelectedPRAtom, sidebarOpenAtom } from "../atoms/selection.js";
import { SIDEBAR_SECTIONS } from "../lib/sidebarDefs.js";

export function Sidebar() {
  const open = useAtomValue(sidebarOpenAtom);
  const pr = useAtomValue(lastSelectedPRAtom);

  if (!open || !pr) return null;

  return (
    <div className="sidebar">
      <div className="sidebar-content">
        <div className="sidebar-header">
          <a href={pr.url} target="_blank" rel="noreferrer">
            <strong>#{pr.number}</strong> {pr.title}
          </a>
        </div>

        {SIDEBAR_SECTIONS.map((section) => {
          const content = section.render(pr);
          if (!content) return null;
          return (
            <div key={section.id} className="sidebar-section">
              {section.id !== "comments" && (
                <div className="sidebar-section-title">{section.label}</div>
              )}
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
