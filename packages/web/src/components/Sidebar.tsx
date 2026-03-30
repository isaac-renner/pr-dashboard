import { useAtomValue } from "@effect/atom-react";
import React from "react";
import { lastSelectedPRAtom, sidebarOpenAtom } from "../atoms/selection.js";
import { SIDEBAR_SECTIONS } from "../lib/sidebarDefs.js";
import { MergeButton } from "./MergeButton.js";

interface SidebarProps {
  style?: React.CSSProperties;
}

export function Sidebar({ style }: SidebarProps) {
  const open = useAtomValue(sidebarOpenAtom);
  const pr = useAtomValue(lastSelectedPRAtom);

  if (!open || !pr) return null;

  return (
    <div className="sidebar" style={style}>
      <div className="sidebar-content">
        <div className="sidebar-header">
          <a href={pr.url} target="_blank" rel="noreferrer">
            <strong>#{pr.number}</strong> {pr.title}
          </a>
        </div>

        {pr.mergeable === "CONFLICTING" && (
          <div className="sidebar-conflict-banner">
            Merge conflicts — resolve before merging
          </div>
        )}

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

        <MergeButton pr={pr} />
      </div>
    </div>
  );
}
