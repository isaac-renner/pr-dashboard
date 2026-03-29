import { useAtomValue } from "@effect/atom-react";
import React from "react";
import { reviewRequestedAtom } from "../atoms/prs.js";
import { timeAgo } from "../lib/format.js";
import type { PR } from "../lib/types.js";

export function ReviewQueue() {
  const reviewRequested = useAtomValue(reviewRequestedAtom);

  if (reviewRequested.length === 0) return null;

  return (
    <div className="panel">
      <div className="group-header" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Review Requested ({reviewRequested.length})
      </div>
      {reviewRequested.map((pr) => (
        <ReviewQueueRow key={pr.url} pr={pr} />
      ))}
    </div>
  );
}

function ReviewQueueRow({ pr }: { pr: PR }) {
  const pipelineLabel = pr.pipelineState === "FAILURE" ? "Failing"
    : pr.pipelineState === "SUCCESS" ? "Passing"
    : pr.pipelineState === "PENDING" ? "Pending"
    : "--";

  return (
    <div className="review-queue-row">
      <div>
        <a href={pr.url} target="_blank" rel="noreferrer">
          #{pr.number} {pr.title}
        </a>
        <div className="muted">
          {pr.repository.name} · {pr.headRefName} · {timeAgo(pr.updatedAt)}
        </div>
      </div>
      <div className="muted">{pipelineLabel}</div>
    </div>
  );
}
