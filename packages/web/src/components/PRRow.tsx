import { useAtomValue } from "@effect/atom-react";
import React, { useEffect, useRef, useState } from "react";
import { selectedIndexAtom } from "../atoms/selection.js";
import { timeAgo, truncate } from "../lib/format.js";
import { getReviewLabel, type PR } from "../lib/types.js";

interface PRRowProps {
  pr: PR;
  index: number;
}

export function PRRow({ pr, index }: PRRowProps) {
  const selectedIndex = useAtomValue(selectedIndexAtom);
  const isSelected = index === selectedIndex;
  const rowRef = useRef<HTMLDivElement>(null);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const commentsRef = useRef<HTMLDivElement>(null);

  // Scroll selected row into view
  useEffect(() => {
    if (isSelected && rowRef.current) {
      rowRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [isSelected]);

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

  const pipelineLabel = pr.pipelineState === "FAILURE" ? "Failing"
    : pr.pipelineState === "SUCCESS" ? "Passing"
    : pr.pipelineState === "PENDING" ? "Pending"
    : "--";

  const reviewLabel = getReviewLabel(pr);

  const mergeLabel = pr.mergeable === "CONFLICTING" ? "Conflict"
    : pr.mergeable === "MERGEABLE" ? "Clear"
    : "Unknown";

  return (
    <div ref={rowRef} className={`pr-row${isSelected ? " selected" : ""}`}>
      <div>
        <a href={pr.url} target="_blank" rel="noreferrer">
          #{pr.number} {pr.title}
        </a>
        <div className="muted">
          {pr.headRefName} · {pr.isDraft ? "Draft" : "Open"} · {timeAgo(pr.updatedAt)}
        </div>
      </div>

      <div>{reviewLabel}</div>

      <div>
        {pr.pipelineUrl
          ? <a href={pr.pipelineUrl} target="_blank" rel="noreferrer">{pipelineLabel}</a>
          : pipelineLabel}
      </div>

      <div>{mergeLabel}</div>

      <div>
        {pr.unresolvedThreads.length > 0
          ? (
            <div className="popover-anchor" ref={commentsRef}>
              <button
                className="chip"
                onClick={(e) => { e.stopPropagation(); setCommentsOpen((o) => !o); }}
                type="button"
              >
                {pr.unresolvedThreads.length}
              </button>
              {commentsOpen && (
                <div className="popover">
                  {pr.unresolvedThreads.slice(0, 8).map((t) => (
                    <div key={t.id} style={{ borderBottom: "1px dotted var(--border-color)", padding: "calc(var(--line-height) / 2) 0" }}>
                      <a href={t.url} target="_blank" rel="noreferrer">
                        {t.authorLogin}: {truncate(t.bodyText, 60)}
                      </a>
                      <div className="muted">
                        {timeAgo(t.createdAt)} · {t.replied ? "replied" : "unaddressed"}
                      </div>
                    </div>
                  ))}
                  {pr.unresolvedThreads.length > 8 && (
                    <div className="muted">+{pr.unresolvedThreads.length - 8} more</div>
                  )}
                </div>
              )}
            </div>
          )
          : <span className="muted">--</span>}
      </div>
    </div>
  );
}
