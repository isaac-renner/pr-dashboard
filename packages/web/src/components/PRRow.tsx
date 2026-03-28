import React, { useEffect, useRef, useState } from "react";
import { timeAgo, truncate } from "../lib/format.js";
import type { PR } from "../lib/types.js";

interface PRRowProps {
  pr: PR;
}

export function PRRow({ pr }: PRRowProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const commentsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setCommentsOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (commentsRef.current && !commentsRef.current.contains(e.target as Node)) {
        setCommentsOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  // --- Pipeline ---
  const pipelineLabel = pr.pipelineState === "FAILURE"
    ? "Failing"
    : pr.pipelineState === "SUCCESS"
    ? "Passing"
    : pr.pipelineState === "PENDING"
    ? "Pending"
    : "--";
  const pipelineCls = pr.pipelineState === "FAILURE"
    ? "checks-failure"
    : pr.pipelineState === "SUCCESS"
    ? "checks-success"
    : pr.pipelineState === "PENDING"
    ? "checks-pending"
    : "checks-none";

  // --- Review ---
  const reviewLabel = pr.reviewState === "CHANGES_REQUESTED"
    ? "Changes"
    : pr.reviewState === "APPROVED"
    ? "Approved"
    : "Pending";
  const reviewCls = pr.reviewState === "CHANGES_REQUESTED"
    ? "review-changes"
    : pr.reviewState === "APPROVED"
    ? "review-approved"
    : "review-pending";

  // --- Mergeable ---
  const mergeLabel = pr.mergeable === "CONFLICTING"
    ? "Conflict"
    : pr.mergeable === "MERGEABLE"
    ? "Clear"
    : "Unknown";
  const mergeCls = pr.mergeable === "CONFLICTING"
    ? "mergeable-conflict"
    : pr.mergeable === "MERGEABLE"
    ? "mergeable-clean"
    : "mergeable-unknown";

  return (
    <div className="pr-row">
      {/* PR title + meta */}
      <div className="pr-title">
        <a href={pr.url} target="_blank" rel="noreferrer">
          #{pr.number} {pr.title}
        </a>
        <div className="pr-meta">
          {pr.headRefName}
          {" • "}
          <span className={pr.isDraft ? "status-draft" : "status-open"}>
            {pr.isDraft ? "Draft" : "Open"}
          </span>
          {" • "}
          {timeAgo(pr.updatedAt)}
        </div>
      </div>

      {/* Review */}
      <div className="mono">
        <span className="m-label">Review</span>
        <span className={reviewCls}>{reviewLabel}</span>
      </div>

      {/* Pipeline */}
      <div className="mono">
        <span className="m-label">Pipeline</span>
        <span>
          {pr.pipelineUrl
            ? (
              <a className={`checks ${pipelineCls}`} href={pr.pipelineUrl} target="_blank" rel="noreferrer">
                {pipelineLabel}
              </a>
            )
            : <span className={`checks ${pipelineCls}`}>{pipelineLabel}</span>}
        </span>
      </div>

      {/* Conflicts */}
      <div className="mono">
        <span className="m-label">Conflicts</span>
        <span className={mergeCls}>{mergeLabel}</span>
      </div>

      {/* Comments */}
      <div className="mono">
        <span className="m-label">Comments</span>
        <span>
          {pr.unresolvedThreads.length > 0
            ? (
              <div className={`comment-cell${commentsOpen ? " open" : ""}`} ref={commentsRef}>
                <span
                  className="comment-badge"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCommentsOpen((o) => !o);
                  }}
                >
                  {pr.unresolvedThreads.length}
                </span>
                <div className="comment-list">
                  {pr.unresolvedThreads.slice(0, 8).map((t) => (
                    <div key={t.id} className="comment-item">
                      <a href={t.url} target="_blank" rel="noreferrer">
                        {t.authorLogin}: {truncate(t.bodyText, 60)}
                      </a>
                      <div className="comment-meta">
                        {timeAgo(t.createdAt)} • {t.replied ? "replied earlier" : "unaddressed"}
                      </div>
                    </div>
                  ))}
                  {pr.unresolvedThreads.length > 8 && (
                    <div className="comment-meta" style={{ padding: "0.3rem 0" }}>
                      +{pr.unresolvedThreads.length - 8} more
                    </div>
                  )}
                </div>
              </div>
            )
            : <span className="sessions-none">--</span>}
        </span>
      </div>
    </div>
  );
}
