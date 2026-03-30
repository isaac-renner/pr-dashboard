/**
 * Declarative sidebar section definitions.
 *
 * Each section renders a part of the PR detail sidebar.
 * Adding a new section (e.g. Buildkite pipeline details) = adding an entry.
 */

import React from "react";
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
      const build = pr.buildkite;
      if (!build) return null;

      function jobStateLabel(state: string, softFailed: boolean): string {
        if (softFailed) return "soft failed";
        switch (state) {
          case "PASSED": return "passed";
          case "FAILED": return "failed";
          case "RUNNING": return "running";
          case "BLOCKED": return "blocked";
          case "WAITING": return "waiting";
          case "CANCELED": case "CANCELING": return "canceled";
          case "SKIPPED": case "NOT_RUN": return "skipped";
          case "ASSIGNED": case "ACCEPTED": case "SCHEDULED": return "pending";
          default: return state.toLowerCase();
        }
      }

      function jobStateClass(state: string, softFailed: boolean): string {
        if (softFailed) return "bk-soft-failed";
        switch (state) {
          case "PASSED": return "bk-passed";
          case "FAILED": return "bk-failed";
          case "RUNNING": return "bk-running";
          case "BLOCKED": return "bk-blocked";
          default: return "bk-pending";
        }
      }

      function formatDuration(start: string | null, end: string | null): string | null {
        if (!start) return null;
        const startMs = new Date(start).getTime();
        const endMs = end ? new Date(end).getTime() : Date.now();
        const diffMs = Math.max(0, endMs - startMs);
        const seconds = Math.floor(diffMs / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (minutes < 60) return `${minutes}m ${secs}s`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
      }

      const visibleJobs = build.jobs.filter((j) => j.type === "command" || j.type === "block");
      const duration = formatDuration(build.startedAt, build.finishedAt);

      return (
        <>
          <div className="sidebar-field">
            <span className="muted">Build</span>
            <span>
              <a href={build.url} target="_blank" rel="noreferrer">
                #{build.number}
              </a>
              {build.rebuiltFrom != null && (
                <span className="muted"> (retry of #{build.rebuiltFrom})</span>
              )}
            </span>
          </div>
          {duration && (
            <div className="sidebar-field">
              <span className="muted">Duration</span>
              <span>{duration}{!build.finishedAt ? " (running)" : ""}</span>
            </div>
          )}
          {build.failedCount > 0 && (
            <div className="sidebar-field">
              <span className="muted">Failed</span>
              <span>{build.failedCount} job{build.failedCount > 1 ? "s" : ""}</span>
            </div>
          )}
          {build.blockedCount > 0 && (
            <div className="sidebar-field">
              <span className="muted">Blocked</span>
              <span>{build.blockedCount} step{build.blockedCount > 1 ? "s" : ""}</span>
            </div>
          )}
          {visibleJobs.length > 0 && (
            <div className="bk-jobs">
              {visibleJobs.map((job) => (
                <div key={job.id} className={`bk-job ${jobStateClass(job.state, job.softFailed)}`}>
                  <span className="bk-job-state">{jobStateLabel(job.state, job.softFailed)}</span>
                  {job.url ? (
                    <a href={job.url} target="_blank" rel="noreferrer" className="bk-job-label">
                      {job.label || "step"}
                    </a>
                  ) : (
                    <span className="bk-job-label">{job.label || "step"}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      );
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
