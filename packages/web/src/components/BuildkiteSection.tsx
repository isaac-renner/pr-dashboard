/**
 * BuildkiteSection — sidebar component for Buildkite build details.
 *
 * Extracted as a proper React component (rather than a render function)
 * so it can read the showBlockedSteps atom.
 */

import { useAtomValue, useAtomSet } from "@effect/atom-react";
import { Option } from "effect";
import React from "react";
import { showBlockedStepsAtom } from "../atoms/buildkite.js";
import type { BuildkiteBuild, BuildkiteJob } from "../lib/types.js";

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
    case "PASSED": case "FINISHED": return "\u2713";
    case "FAILED": return "\u2717";
    case "RUNNING": return "\u25B6";
    case "BLOCKED": return "\u25A0";
    case "CANCELED": case "CANCELING": return "\u2013";
    case "SKIPPED": case "NOT_RUN": return "\u2013";
    default: return "\u00B7";
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

function isBlockedDownstream(job: BuildkiteJob): boolean {
  return job.type === "command"
    && (job.state === "BLOCKED" || job.state === "NOT_RUN" || job.state === "WAITING");
}

interface BuildkiteSectionProps {
  readonly build: BuildkiteBuild;
}

export function BuildkiteSection({ build }: BuildkiteSectionProps) {
  const showBlockedOpt = useAtomValue(showBlockedStepsAtom);
  const setShowBlocked = useAtomSet(showBlockedStepsAtom);

  const showBlocked = showBlockedOpt._tag === "Some" && showBlockedOpt.value === "1";
  const hasBlockedDownstream = build.jobs.some(isBlockedDownstream);

  const visibleJobs = build.jobs.filter((j) => {
    if (j.type === "block") return true;
    if (j.type !== "command") return false;
    if (!showBlocked && isBlockedDownstream(j)) return false;
    return true;
  });

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
      {hasBlockedDownstream && (
        <div className="bk-toggle">
          <button
            className="bk-toggle-btn"
            onClick={() => setShowBlocked(Option.some(showBlocked ? "0" : "1"))}
          >
            {showBlocked ? "hide" : "show"} blocked steps
          </button>
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
}
