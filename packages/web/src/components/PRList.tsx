import { useAtomValue } from "@effect/atom-react";
import React, { useState } from "react";
import { filteredPrsAtom } from "../atoms/derived.js";
import { filtersAtom } from "../atoms/filters.js";
import { groupByRepo, groupByTicket } from "../lib/filters.js";
import { timeAgo } from "../lib/format.js";
import type { PR } from "../lib/types.js";
import { PRRow } from "./PRRow.js";

const JIRA_BASE = "https://ailo.atlassian.net/browse";

// --- Column headers ---

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
  );
}

// --- Group section (ticket or repo) ---

function GroupSection({
  name,
  prs,
  isTicketGroup,
}: {
  name: string;
  prs: PR[];
  isTicketGroup: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const sorted = [...prs].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  const latest = sorted[0];

  const isNoTicket = name === "No ticket";
  const ticketLink = isTicketGroup && !isNoTicket
    ? (
      <span className="ticket-title">
        <a className="jira" href={`${JIRA_BASE}/${name}`} target="_blank" rel="noreferrer">
          {name}
        </a>
      </span>
    )
    : <span className="ticket-title">{name}</span>;

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
          {latest && <span className="pill">latest {timeAgo(latest.updatedAt)}</span>}
          <span className="ticket-indicator" />
        </div>
        <div className="ticket-badges" />
      </div>
      <div className="ticket-body">
        {sorted.map((pr) => <PRRow key={pr.url} pr={pr} />)}
      </div>
    </div>
  );
}

// --- PR List (flat, grouped by ticket or repo) ---

export function PRList() {
  const filtered = useAtomValue(filteredPrsAtom);
  const filters = useAtomValue(filtersAtom);

  const grouped = filters.group === "ticket"
    ? groupByTicket(filtered)
    : groupByRepo(filtered);

  if (filtered.length === 0) {
    return <p className="count">No PRs match filters</p>;
  }

  return (
    <div className="bucket">
      <div className="bucket-body">
        <ColumnHeaders />
        {Array.from(grouped.entries()).map(([groupName, groupPrs]) => (
          <GroupSection
            key={groupName}
            name={groupName}
            prs={groupPrs}
            isTicketGroup={filters.group === "ticket"}
          />
        ))}
      </div>
    </div>
  );
}
