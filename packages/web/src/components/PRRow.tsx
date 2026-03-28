import React, { useEffect, useRef, useState } from "react";
import { timeAgo, truncate } from "../lib/format.js";
import type { PR } from "../lib/types.js";

const JIRA_BASE = "https://ailo.atlassian.net/browse";

interface PRRowProps {
  pr: PR;
}

export function PRRow({ pr }: PRRowProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const commentsRef = useRef<HTMLDivElement>(null);
  const sessionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setCommentsOpen(false);
        setSessionsOpen(false);
      }
    }
    function onClick(e: MouseEvent) {
      if (commentsRef.current && !commentsRef.current.contains(e.target as Node)) {
        setCommentsOpen(false);
      }
      if (sessionsRef.current && !sessionsRef.current.contains(e.target as Node)) {
        setSessionsOpen(false);
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

  // --- Copy ---
  function copyUrl(url: string, btn: HTMLButtonElement) {
    navigator.clipboard.writeText(url).then(
      () => {
        btn.textContent = "copied";
        btn.classList.add("copied");
        setTimeout(() => {
          btn.textContent = "copy";
          btn.classList.remove("copied");
        }, 1500);
      },
      () => {
        btn.textContent = "failed";
        setTimeout(() => {
          btn.textContent = "copy";
        }, 1500);
      },
    );
  }

  return (
    <div className="pr-row">
      {/* PR title + meta */}
      <div className="pr-title">
        <a href={pr.url} target="_blank" rel="noreferrer">
          #{pr.number} {pr.title}
        </a>
        <div className="pr-meta">
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

      {/* Deploy */}
      <div className="mono hide-md">
        <span className="m-label">Deploy</span>
        <span>
          {pr.deployLink
            ? (
              <a className="deploy" href={pr.deployLink.url} target="_blank" rel="noreferrer">
                {truncate(pr.deployLink.label, 28)}
              </a>
            )
            : <span className="sessions-none">--</span>}
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

      {/* Ticket */}
      <div className="mono hide-md">
        <span className="m-label">Ticket</span>
        <span>
          {pr.jiraTicket
            ? (
              <a className="jira" href={`${JIRA_BASE}/${pr.jiraTicket}`} target="_blank" rel="noreferrer">
                {pr.jiraTicket}
              </a>
            )
            : (
              "--"
            )}
        </span>
      </div>

      {/* Sessions */}
      <div className="mono">
        <span className="m-label">Sessions</span>
        <span>
          {pr.sessions.length > 0
            ? (
              <div className={`sessions-cell${sessionsOpen ? " open" : ""}`} ref={sessionsRef}>
                <span
                  className="session-badge"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSessionsOpen((o) => !o);
                  }}
                >
                  {pr.sessions.length}
                </span>
                <div className="session-list">
                  {pr.sessions.slice(0, 8).map((s) => (
                    <div key={s.id} className="session-item">
                      <a href={s.url} target="_blank" rel="noreferrer" title={s.title}>
                        {truncate(s.title, 45)}
                      </a>
                      <span className="session-meta">
                        {timeAgo(new Date(s.time.updated).toISOString())}
                        {s.childCount > 0 && <span className="session-children">({s.childCount} sub)</span>}
                      </span>
                      <button
                        className="copy-btn"
                        onClick={(e) => copyUrl(s.url, e.currentTarget)}
                        title="Copy URL"
                      >
                        copy
                      </button>
                    </div>
                  ))}
                  {pr.sessions.length > 8 && (
                    <div className="session-meta" style={{ padding: "0.3rem 0" }}>
                      +{pr.sessions.length - 8} more
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
