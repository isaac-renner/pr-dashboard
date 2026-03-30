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

      function stateClass(state: string, softFailed: boolean): string {
        if (softFailed) return "bk-soft-failed";
        switch (state) {
          case "PASSED": case "FINISHED": return "bk-passed";
          case "FAILED": return "bk-failed";
          case "RUNNING": return "bk-running";
          case "BLOCKED": return "bk-blocked";
          case "CANCELED": case "CANCELING": return "bk-canceled";
          case "SKIPPED": case "NOT_RUN": return "bk-skipped";
          default: return "bk-pending";
        }
      }

      function stateIcon(state: string, softFailed: boolean): string {
        if (softFailed) return "~";
        switch (state) {
          case "PASSED": case "FINISHED": return "\u2713";  // checkmark
          case "FAILED": return "\u2717";                    // cross
          case "RUNNING": return "\u25B6";                   // play
          case "BLOCKED": return "\u25A0";                   // filled square
          case "CANCELED": case "CANCELING": return "\u2013";// en-dash
          case "SKIPPED": case "NOT_RUN": return "\u2013";
          default: return "\u00B7";                          // middle dot
        }
      }

      /** Strip Buildkite emoji shortcodes like :nix: :github: */
      function cleanLabel(label: string | null): string {
        if (!label) return "step";
        return label.replace(/:[a-z0-9_+-]+:/gi, "").trim() || "step";
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
          <div className="bk-header">
            <a href={build.url} target="_blank" rel="noreferrer">
              #{build.number}
            </a>
            {build.rebuiltFrom != null && (
              <span className="muted"> retry</span>
            )}
            {duration && (
              <span className="muted"> · {duration}{!build.finishedAt ? "..." : ""}</span>
            )}
          </div>
          {visibleJobs.length > 0 && (
            <div className="bk-pipeline">
              {visibleJobs.map((job) => {
                const cls = stateClass(job.state, job.softFailed);
                const icon = stateIcon(job.state, job.softFailed);
                const label = cleanLabel(job.label);
                const content = (
                  <>
                    <span className="bk-step-icon">{icon}</span>
                    <span className="bk-step-label">{label}</span>
                  </>
                );
                return job.url ? (
                  <a key={job.id} href={job.url} target="_blank" rel="noreferrer" className={`bk-step ${cls}`}>
                    {content}
                  </a>
                ) : (
                  <div key={job.id} className={`bk-step ${cls}`}>
                    {content}
                  </div>
                );
              })}
            </div>
          )}
          {visibleJobs.some((j) => j.logSnippet) && (
            <div className="bk-logs">
              {visibleJobs.filter((j) => j.logSnippet).map((job) => (
                <React.Fragment key={job.id}>
                  <div className="bk-log-header bk-failed">
                    <span className="bk-step-icon">{"\u2717"}</span> {cleanLabel(job.label)}
                  </div>
                  <pre className="bk-log-snippet">{job.logSnippet}</pre>
                </React.Fragment>
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
