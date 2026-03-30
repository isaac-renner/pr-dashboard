import React, { useCallback, useState } from "react";
import { useAtomValue } from "@effect/atom-react";
import { prsResponseAtom } from "../atoms/prs.js";
import type { PR } from "../lib/types.js";

type MergeState = "idle" | "confirm" | "merging" | "merged" | "error";

function getBlockingReasons(pr: PR): string[] {
  const reasons: string[] = [];
  if (pr.isDraft) reasons.push("PR is a draft");
  if (pr.mergeable === "CONFLICTING") reasons.push("Has merge conflicts");
  if (pr.mergeable === "UNKNOWN") reasons.push("Merge status unknown");
  if (pr.reviewState === "CHANGES_REQUESTED") reasons.push("Changes requested");
  if (pr.pipelineState === "FAILURE") reasons.push("Pipeline is failing");
  if (pr.pipelineState === "PENDING") reasons.push("Pipeline is pending");
  if (pr.unresolvedCount > 0) reasons.push(`${pr.unresolvedCount} unresolved comment${pr.unresolvedCount > 1 ? "s" : ""}`);
  return reasons;
}

export function MergeButton({ pr }: { pr: PR }) {
  const [state, setState] = useState<MergeState>("idle");
  const [error, setError] = useState<string | null>(null);

  // Re-read to force refresh after merge
  useAtomValue(prsResponseAtom);

  if (pr.state !== "OPEN") return null;

  const reasons = getBlockingReasons(pr);
  const canMerge = reasons.length === 0;

  const handleClick = useCallback(async () => {
    if (state === "idle") {
      setState("confirm");
      return;
    }

    if (state === "confirm") {
      setState("merging");
      setError(null);

      const [owner, repo] = pr.repository.nameWithOwner.split("/");

      try {
        const res = await fetch("/api/merge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner, repo, number: pr.number }),
        });

        const data = await res.json();

        if (!res.ok) {
          setState("error");
          setError(data.error ?? `Merge failed (${res.status})`);
          return;
        }

        setState("merged");
      } catch (err) {
        setState("error");
        setError(String(err));
      }
    }
  }, [state, pr]);

  const handleCancel = useCallback(() => {
    setState("idle");
    setError(null);
  }, []);

  return (
    <div className="sidebar-merge">
      {canMerge ? (
        <>
          {state === "idle" && (
            <button className="merge-btn" onClick={handleClick}>
              Squash and merge
            </button>
          )}

          {state === "confirm" && (
            <div className="merge-confirm">
              <span className="muted">Are you sure?</span>
              <div className="merge-confirm-actions">
                <button className="merge-btn" onClick={handleClick}>
                  Confirm merge
                </button>
                <button className="merge-btn-cancel" onClick={handleCancel}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {state === "merging" && (
            <button className="merge-btn" disabled>
              Merging...
            </button>
          )}

          {state === "merged" && (
            <span className="merge-success">Merged</span>
          )}

          {state === "error" && (
            <div className="merge-error-wrap">
              <span className="merge-error">{error}</span>
              <button className="merge-btn-cancel" onClick={handleCancel}>
                Dismiss
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <button className="merge-btn" disabled>
            Squash and merge
          </button>
          <ul className="merge-blocked-reasons">
            {reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
