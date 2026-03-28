import { useAtomValue } from "@effect/atom-react";
import React from "react";
import { filteredPrsAtom } from "../atoms/derived.js";
import { filtersAtom } from "../atoms/filters.js";
import { selectedUrlAtom } from "../atoms/selection.js";
import { groupByRepo, groupByStack, groupByTicket } from "../lib/filters.js";
import { timeAgo } from "../lib/format.js";
import type { PR } from "../lib/types.js";
import { PRRow } from "./PRRow.js";

const JIRA_BASE = "https://ailo.atlassian.net/browse";

function GroupSection({
  name,
  prs,
  isTicketGroup,
  hasSelectedRow,
}: {
  name: string;
  prs: PR[];
  isTicketGroup: boolean;
  hasSelectedRow: boolean;
}) {
  const sorted = [...prs].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  const latest = sorted[0];

  const isNoTicket = name === "No ticket";
  const titleContent = isTicketGroup && !isNoTicket
    ? <a href={`${JIRA_BASE}/${name}`} target="_blank" rel="noreferrer">{name}</a>
    : name;

  return (
    <details open className={`group-fold${hasSelectedRow ? " group-active" : ""}`}>
      <summary>
        <strong>{titleContent}</strong>
        {" "}
        <span className="muted">
          {prs.length} PR{prs.length === 1 ? "" : "s"}
          {latest && ` · latest ${timeAgo(latest.updatedAt)}`}
        </span>
      </summary>
      {sorted.map((pr) => <PRRow key={pr.url} pr={pr} />)}
    </details>
  );
}

export function PRList() {
  const filtered = useAtomValue(filteredPrsAtom);
  const filters = useAtomValue(filtersAtom);
  const selectedUrl = useAtomValue(selectedUrlAtom);

  if (filtered.length === 0) {
    return <div className="muted">No PRs match filters</div>;
  }

  // No grouping mode — just flat list sorted by updatedAt
  if (filters.group === "none") {
    const sorted = [...filtered].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    return (
      <div className="panel pr-columns">
        <div className="pr-grid-header">
          <div>PR</div>
          <div>Review</div>
          <div>Pipeline</div>
          <div>Conflicts</div>
          <div>Comments</div>
        </div>
        {sorted.map((pr) => <PRRow key={pr.url} pr={pr} />)}
      </div>
    );
  }

  const grouped = filters.group === "stack"
    ? groupByStack(filtered)
    : filters.group === "ticket"
    ? groupByTicket(filtered)
    : groupByRepo(filtered);

  return (
    <div className="panel pr-columns">
      <div className="pr-grid-header">
        <div>PR</div>
        <div>Review</div>
        <div>Pipeline</div>
        <div>Conflicts</div>
        <div>Comments</div>
      </div>
      {Array.from(grouped.entries()).map(([groupName, groupPrs]) => (
        <GroupSection
          key={groupName}
          name={groupName}
          prs={groupPrs}
          isTicketGroup={filters.group === "ticket"}
          hasSelectedRow={selectedUrl !== null && groupPrs.some((pr) => pr.url === selectedUrl)}
        />
      ))}
    </div>
  );
}
