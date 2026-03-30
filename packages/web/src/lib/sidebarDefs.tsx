/**
 * Declarative sidebar section definitions.
 *
 * Each section renders a part of the PR detail sidebar.
 * Adding a new section (e.g. Buildkite pipeline details) = adding an entry.
 */

import React from "react";
import { BuildkiteSection } from "../components/BuildkiteSection.js";
import { getReviewLabel, type PR } from "./types.js";
import { timeAgo, truncate } from "./format.js";

export interface SidebarSectionDef {
  readonly id: string;
  readonly label: string;
  /** Return null to hide the section for this PR */
  readonly render: (pr: PR) => React.ReactNode | null;
}

export const SIDEBAR_SECTIONS: ReadonlyArray<SidebarSectionDef> = [
  {
    id: "meta",
    label: "Meta",
    render: (pr) => {
      const reviewLabel = getReviewLabel(pr);
      const mergeLabel = pr.mergeable === "CONFLICTING" ? "Conflict"
        : pr.mergeable === "MERGEABLE" ? "Clear" : "Unknown";

      return (
        <>
          <div className="sidebar-field">
            <span className="muted">Branch</span>
            <span>{pr.headRefName}</span>
          </div>
          <div className="sidebar-field">
            <span className="muted">Base</span>
            <span>{pr.baseRefName}</span>
          </div>
          <div className="sidebar-field">
            <span className="muted">Updated</span>
            <span>{timeAgo(pr.updatedAt)}</span>
          </div>
          <div className="sidebar-field">
            <span className="muted">Review</span>
            <span>{reviewLabel}</span>
          </div>
          <div className="sidebar-field">
            <span className="muted">Conflicts</span>
            <span>{mergeLabel}</span>
          </div>
        </>
      );
    },
  },
  {
    id: "pipeline",
    label: "Pipeline",
    render: (pr) => {
      const pipelineLabel = pr.pipelineState === "FAILURE" ? "Failing"
        : pr.pipelineState === "SUCCESS" ? "Passing"
        : pr.pipelineState === "PENDING" ? "Pending"
        : "None";

      return (
        <>
          <div className="sidebar-field">
            <span className="muted">Status</span>
            <span>
              {pr.pipelineUrl
                ? <a href={pr.pipelineUrl} target="_blank" rel="noreferrer">{pipelineLabel}</a>
                : pipelineLabel}
            </span>
          </div>
          {pr.jiraTicket && (
            <div className="sidebar-field">
              <span className="muted">Ticket</span>
              <a href={`https://ailo.atlassian.net/browse/${pr.jiraTicket}`} target="_blank" rel="noreferrer">
                {pr.jiraTicket}
              </a>
            </div>
          )}
        </>
      );
    },
  },
  {
    id: "buildkite",
    label: "Build",
    render: (pr) => {
      if (!pr.buildkite) return null;
      return <BuildkiteSection build={pr.buildkite} />;
    },
  },
  {
    id: "comments",
    label: "Unresolved Comments",
    render: (pr) => {
      if (pr.unresolvedThreads.length === 0) return null;

      return (
        <>
          <div className="sidebar-section-title">
            Unresolved Comments ({pr.unresolvedThreads.length})
          </div>
          {pr.unresolvedThreads.map((t) => (
            <div key={t.id} className="sidebar-comment">
              <div>
                <strong>{t.authorLogin}</strong>
                <span className="muted"> · {timeAgo(t.createdAt)}</span>
                {t.replied && <span className="muted"> · replied</span>}
              </div>
              <div>{truncate(t.bodyText, 200)}</div>
              <a href={t.url} target="_blank" rel="noreferrer" className="muted">
                view on GitHub →
              </a>
            </div>
          ))}
        </>
      );
    },
  },
];
