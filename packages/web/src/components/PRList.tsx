import { useAtomSet, useAtomValue } from "@effect/atom-react";
import React from "react";
import { filteredPrsAtom, groupedPrsAtom } from "../atoms/derived.js";
import { filtersAtom } from "../atoms/filters.js";
import { closedGroupsAtom, toggleGroup } from "../atoms/groups.js";
import { selectedUrlAtom } from "../atoms/selection.js";
import { timeAgo } from "../lib/format.js";
import type { PR } from "../lib/types.js";
import { PRRow } from "./PRRow.js";

const JIRA_BASE = "https://ailo.atlassian.net/browse";

function GroupSection({
  name,
  prs,
  isTicketGroup,
  hasSelectedRow,
  isClosed,
  onToggle,
}: {
  name: string;
  prs: PR[];
  isTicketGroup: boolean;
  hasSelectedRow: boolean;
  isClosed: boolean;
  onToggle: () => void;
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
    <div className={`group-fold${hasSelectedRow ? " group-active" : ""}`}>
      <div className="group-header" onClick={onToggle}>
        {isClosed ? "[+] " : "[-] "}
        <strong>{titleContent}</strong>
        {" "}
        <span className="muted">
          {prs.length} PR{prs.length === 1 ? "" : "s"}
          {isClosed && latest ? ` · latest ${timeAgo(latest.updatedAt)}` : ""}
        </span>
      </div>
      {!isClosed && sorted.map((pr) => <PRRow key={pr.url} pr={pr} />)}
    </div>
  );
}

export function PRList() {
  const filtered = useAtomValue(filteredPrsAtom);
  const filters = useAtomValue(filtersAtom);
  const grouped = useAtomValue(groupedPrsAtom);
  const closedGroups = useAtomValue(closedGroupsAtom);
  const setClosedGroups = useAtomSet(closedGroupsAtom);
  const selectedUrl = useAtomValue(selectedUrlAtom);

  if (filtered.length === 0) {
    return <div className="muted">No PRs match filters</div>;
  }

  const isNone = filters.group === "none";

  return (
    <div className="panel pr-columns">
      <div className="pr-grid-header">
        <div>PR</div>
        <div>Review</div>
        <div>Pipeline</div>
        <div>Conflicts</div>
      </div>
      {Array.from(grouped.entries()).map(([groupName, groupPrs]) => {
        if (isNone) {
          // No grouping — render rows directly
          const sorted = [...groupPrs].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          );
          return sorted.map((pr) => <PRRow key={pr.url} pr={pr} />);
        }
        return (
          <GroupSection
            key={groupName}
            name={groupName}
            prs={groupPrs}
            isTicketGroup={filters.group === "ticket"}
            hasSelectedRow={selectedUrl !== null && groupPrs.some((pr) => pr.url === selectedUrl)}
            isClosed={closedGroups.has(groupName)}
            onToggle={() => toggleGroup(setClosedGroups, groupName)}
          />
        );
      })}
    </div>
  );
}
