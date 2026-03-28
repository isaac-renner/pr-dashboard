import React, { useState, useEffect, useRef } from "react"
import type { PR } from "../lib/types.js"
import { timeAgo, truncate } from "../lib/format.js"

const JIRA_BASE = "https://ailo.atlassian.net/browse"

interface PRRowProps {
  pr: PR
}

export function PRRow({ pr }: PRRowProps) {
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [sessionsOpen, setSessionsOpen] = useState(false)
  const commentsRef = useRef<HTMLDivElement>(null)
  const sessionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setCommentsOpen(false)
        setSessionsOpen(false)
      }
    }
    function handleClickOutside(e: MouseEvent) {
      if (commentsRef.current && !commentsRef.current.contains(e.target as Node)) {
        setCommentsOpen(false)
      }
      if (sessionsRef.current && !sessionsRef.current.contains(e.target as Node)) {
        setSessionsOpen(false)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const statusClass = pr.isDraft ? "draft" : pr.state === "OPEN" ? "open" : "closed"

  const reviewLabel =
    pr.reviewState === "APPROVED"
      ? "Approved"
      : pr.reviewState === "CHANGES_REQUESTED"
        ? "Changes"
        : "Pending"
  const reviewClass =
    pr.reviewState === "APPROVED"
      ? "approved"
      : pr.reviewState === "CHANGES_REQUESTED"
        ? "changes-requested"
        : "pending"

  const pipelineLabel =
    pr.pipelineState === "SUCCESS"
      ? "Passing"
      : pr.pipelineState === "FAILURE"
        ? "Failing"
        : pr.pipelineState === "PENDING"
          ? "Pending"
          : "--"
  const pipelineClass =
    pr.pipelineState === "SUCCESS"
      ? "passing"
      : pr.pipelineState === "FAILURE"
        ? "failing"
        : pr.pipelineState === "PENDING"
          ? "pending"
          : ""

  const conflictsLabel =
    pr.mergeable === "CONFLICTING"
      ? "Conflict"
      : pr.mergeable === "MERGEABLE"
        ? "Clear"
        : "Unknown"
  const conflictsClass =
    pr.mergeable === "CONFLICTING"
      ? "conflict"
      : pr.mergeable === "MERGEABLE"
        ? "clear"
        : "unknown"

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch(() => {
      const ta = document.createElement("textarea")
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
    })
  }

  return (
    <div className="pr-row">
      <div className="pr-title">
        <a href={pr.url} target="_blank" rel="noopener noreferrer">
          {truncate(pr.title, 60)}
        </a>
        <span className="pr-meta">
          <span className={`status ${statusClass}`}>
            {pr.isDraft ? "Draft" : pr.state === "OPEN" ? "Open" : "Closed"}
          </span>
          <span className="time-ago">{timeAgo(pr.updatedAt)}</span>
        </span>
      </div>

      <div className={`review-state ${reviewClass}`}>{reviewLabel}</div>

      <div className={`pipeline ${pipelineClass}`}>
        {pr.pipelineUrl ? (
          <a href={pr.pipelineUrl} target="_blank" rel="noopener noreferrer">
            {pipelineLabel}
          </a>
        ) : (
          pipelineLabel
        )}
      </div>

      <div className="deploy hide-md">
        {pr.deployLink ? (
          <a href={pr.deployLink.url} target="_blank" rel="noopener noreferrer">
            {pr.deployLink.label}
          </a>
        ) : (
          "--"
        )}
      </div>

      <div className={`conflicts ${conflictsClass}`}>{conflictsLabel}</div>

      <div className="comments-cell" ref={commentsRef}>
        <button
          className={`badge ${pr.unresolvedCount > 0 ? "has-count" : ""}`}
          onClick={() => setCommentsOpen((o) => !o)}
        >
          {pr.unresolvedCount}
        </button>
        {commentsOpen && pr.unresolvedThreads.length > 0 && (
          <div className="popover comments-popover">
            <div className="popover-header">
              Unresolved Comments ({pr.unresolvedCount})
            </div>
            <div className="popover-body">
              {pr.unresolvedThreads.map((thread) => (
                <div key={thread.id} className="thread-item">
                  <div className="thread-meta">
                    <strong>{thread.authorLogin}</strong>
                    <span className="time-ago">{timeAgo(thread.createdAt)}</span>
                    {thread.replied && <span className="replied-tag">replied</span>}
                  </div>
                  <div className="thread-body">{truncate(thread.bodyText, 120)}</div>
                  <a
                    href={thread.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="thread-link"
                  >
                    View
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="ticket-cell hide-md">
        {pr.jiraTicket ? (
          <a
            href={`${JIRA_BASE}/${pr.jiraTicket}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {pr.jiraTicket}
          </a>
        ) : (
          "--"
        )}
      </div>

      <div className="sessions-cell" ref={sessionsRef}>
        <button
          className={`badge ${pr.sessions.length > 0 ? "has-count" : ""}`}
          onClick={() => setSessionsOpen((o) => !o)}
        >
          {pr.sessions.length}
        </button>
        {sessionsOpen && pr.sessions.length > 0 && (
          <div className="popover sessions-popover">
            <div className="popover-header">
              Sessions ({pr.sessions.length})
            </div>
            <div className="popover-body">
              {pr.sessions.map((session) => (
                <div key={session.id} className="session-item">
                  <a
                    href={session.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="session-link"
                  >
                    {truncate(session.title, 60)}
                  </a>
                  <span className="session-meta">
                    {session.childCount} messages
                  </span>
                  <button
                    className="copy-btn"
                    onClick={() => copyToClipboard(session.url)}
                    title="Copy session URL"
                  >
                    Copy
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
