import { useAtomSet, useAtomValue } from "@effect/atom-react";
import React, { useEffect, useRef } from "react";
import { selectedUrlAtom } from "../atoms/selection.js";
import { timeAgo } from "../lib/format.js";
import { getReviewLabel, type PR } from "../lib/types.js";

interface PRRowProps {
  pr: PR;
}

export function PRRow({ pr }: PRRowProps) {
  const selectedUrl = useAtomValue(selectedUrlAtom);
  const setSelectedUrl = useAtomSet(selectedUrlAtom);
  const isSelected = pr.url === selectedUrl;
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected && rowRef.current) {
      if ("scrollIntoViewIfNeeded" in rowRef.current) {
        (rowRef.current as any).scrollIntoViewIfNeeded(false);
      } else {
        rowRef.current.scrollIntoView({ block: "nearest" });
      }
    }
  }, [isSelected]);

  const reviewLabel = getReviewLabel(pr);

  const pipelineLabel = pr.pipelineState === "FAILURE" ? "Failing"
    : pr.pipelineState === "SUCCESS" ? "Passing"
    : pr.pipelineState === "PENDING" ? "Pending"
    : "--";

  const mergeLabel = pr.mergeable === "CONFLICTING" ? "Conflict"
    : pr.mergeable === "MERGEABLE" ? "Clear"
    : "Unknown";

  return (
    <div ref={rowRef} className={`pr-row${isSelected ? " selected" : ""}`} onClick={() => setSelectedUrl(pr.url)}>
      <div>
        <a href={pr.url} target="_blank" rel="noreferrer">
          #{pr.number} {pr.title}
        </a>
        <div className="muted">
          {pr.headRefName} · {timeAgo(pr.updatedAt)}
        </div>
      </div>

      <div>{reviewLabel}</div>

      <div>
        {pr.pipelineUrl
          ? <a href={pr.pipelineUrl} target="_blank" rel="noreferrer">{pipelineLabel}</a>
          : pipelineLabel}
      </div>

      <div>{mergeLabel}</div>
    </div>
  );
}
