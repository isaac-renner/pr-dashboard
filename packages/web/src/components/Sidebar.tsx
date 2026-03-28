import { useAtomValue } from "@effect/atom-react";
import React from "react";
import { selectedPRAtom, sidebarOpenAtom } from "../atoms/selection.js";
import { timeAgo, truncate } from "../lib/format.js";
import { getReviewLabel } from "../lib/types.js";

export function Sidebar() {
  const open = useAtomValue(sidebarOpenAtom);
  const pr = useAtomValue(selectedPRAtom);

  if (!open || !pr) return null;

  const reviewLabel = getReviewLabel(pr);
  const pipelineLabel = pr.pipelineState === "FAILURE" ? "Failing"
    : pr.pipelineState === "SUCCESS" ? "Passing"
    : pr.pipelineState === "PENDING" ? "Pending"
    : "None";
  const mergeLabel = pr.mergeable === "CONFLICTING" ? "Conflict"
    : pr.mergeable === "MERGEABLE" ? "Clear"
    : "Unknown";

  return (
    <div className="sidebar">
      <div className="sidebar-content">
        {/* Header */}
        <div className="sidebar-header">
          <a href={pr.url} target="_blank" rel="noreferrer">
            <strong>#{pr.number}</strong> {pr.title}
          </a>
        </div>

        {/* Meta */}
        <div className="sidebar-section">
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
        </div>

        {/* Pipeline */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Pipeline</div>
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
        </div>

        {/* Comments */}
        {pr.unresolvedThreads.length > 0 && (
          <div className="sidebar-section">
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
          </div>
        )}
      </div>
    </div>
  );
}
