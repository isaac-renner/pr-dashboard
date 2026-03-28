import React, { useState } from "react"
import type { PR } from "../lib/types.js"
import { bucketize, groupByTicket, groupByRepo } from "../lib/filters.js"
import { timeAgo } from "../lib/format.js"
import { PRRow } from "./PRRow.js"

const JIRA_BASE = "https://ailo.atlassian.net/browse"

// -----------------------------------------------------------------------------
// Column headers (shared across all buckets)
// -----------------------------------------------------------------------------

function ColumnHeaders() {
  return (
    <div className="bucket-head">
      <div>PR</div>
      <div>Review</div>
      <div>Pipeline</div>
      <div className="hide-md">Deploy</div>
      <div>Conflicts</div>
      <div>Comments</div>
      <div className="hide-md">Ticket</div>
      <div>Sessions</div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Ticket/Repo group (collapsible)
// -----------------------------------------------------------------------------

interface GroupSectionProps {
  name: string
  prs: PR[]
  isTicketGroup: boolean
}

function GroupSection({ name, prs, isTicketGroup }: GroupSectionProps) {
  const [collapsed, setCollapsed] = useState(false)

  const sorted = [...prs].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
  const latest = sorted[0]

  const isNoTicket = name === "No ticket"
  const ticketLink = isTicketGroup && !isNoTicket ? (
    <span className="ticket-title">
      <a className="jira" href={`${JIRA_BASE}/${name}`} target="_blank" rel="noreferrer">
        {name}
      </a>
    </span>
  ) : (
    <span className="ticket-title">{name}</span>
  )

  return (
    <div className={`ticket${collapsed ? " collapsed" : ""}`}>
      <div
        className="ticket-header ticket-toggle"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="ticket-meta">
          {ticketLink}
          <span className="pill">
            {prs.length} PR{prs.length === 1 ? "" : "s"}
          </span>
          {latest && (
            <span className="pill">latest {timeAgo(latest.updatedAt)}</span>
          )}
          <span className="ticket-indicator" />
        </div>
        <div className="ticket-badges" />
      </div>
      <div className="ticket-body">
        {sorted.map((pr) => (
          <PRRow key={pr.url} pr={pr} />
        ))}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Bucket (collapsible)
// -----------------------------------------------------------------------------

interface BucketSectionProps {
  title: string
  prs: PR[]
  group: "ticket" | "repo"
}

function BucketSection({ title, prs, group }: BucketSectionProps) {
  const [collapsed, setCollapsed] = useState(false)

  const grouped = group === "ticket" ? groupByTicket(prs) : groupByRepo(prs)

  return (
    <div className={`bucket${collapsed ? " collapsed" : ""}`}>
      <div
        className="bucket-header bucket-toggle"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="bucket-title">{title}</div>
        <div className="bucket-meta">
          {prs.length} PR{prs.length === 1 ? "" : "s"}
          <span className="bucket-indicator" />
        </div>
      </div>
      <div className="bucket-body">
        <ColumnHeaders />
        {Array.from(grouped.entries()).map(([groupName, groupPrs]) => (
          <GroupSection
            key={groupName}
            name={groupName}
            prs={groupPrs}
            isTicketGroup={group === "ticket"}
          />
        ))}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// BucketList
// -----------------------------------------------------------------------------

interface BucketListProps {
  prs: PR[]
  group: "ticket" | "repo"
}

export function BucketList({ prs, group }: BucketListProps) {
  const buckets = bucketize(prs)

  const sections: Array<{ title: string; prs: PR[] }> = [
    { title: "Address Now", prs: buckets.now },
    { title: "Address Today", prs: buckets.today },
    { title: "Drafts / TODOs", prs: buckets.drafts },
  ]

  const nonEmpty = sections.filter((s) => s.prs.length > 0)

  if (nonEmpty.length === 0) {
    return <p className="count">No PRs match filters</p>
  }

  return (
    <>
      {nonEmpty.map((s) => (
        <BucketSection
          key={s.title}
          title={s.title}
          prs={s.prs}
          group={group}
        />
      ))}
    </>
  )
}
