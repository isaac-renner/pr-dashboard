import { useAtomSet, useAtomValue } from "@effect/atom-react";
import React, { useEffect, useRef } from "react";
import { filteredPrsAtom, groupedPrsAtom, navItemsAtom } from "../atoms/derived.js";
import { filtersAtom } from "../atoms/filters.js";
import { closedGroupsAtom, toggleGroup } from "../atoms/groups.js";
import { selectedNavIndexAtom } from "../atoms/selection.js";
import { viewModeAtom } from "../atoms/view.js";
import { timeAgo } from "../lib/format.js";
import type { PR } from "../lib/types.js";
import { PRRow } from "./PRRow.js";

const JIRA_BASE = "https://ailo.atlassian.net/browse";

function GroupHeader({
  name,
  prs,
  isTicketGroup,
  isClosed,
  isSelected,
  hasSelectedChild,
  onToggle,
  onClick,
}: {
  name: string;
  prs: PR[];
  isTicketGroup: boolean;
  isClosed: boolean;
  isSelected: boolean;
  hasSelectedChild: boolean;
  onToggle: () => void;
  onClick: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const latest = prs.reduce((best, pr) =>
    !best || new Date(pr.updatedAt) > new Date(best.updatedAt) ? pr : best, null as PR | null);

  const isNoTicket = name === "No ticket";
  const titleContent = isTicketGroup && !isNoTicket
    ? <a href={`${JIRA_BASE}/${name}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>{name}</a>
    : name;

  useEffect(() => {
    if (isSelected && ref.current) {
      if ("scrollIntoViewIfNeeded" in ref.current) {
        (ref.current as any).scrollIntoViewIfNeeded(false);
      } else {
        ref.current.scrollIntoView({ block: "nearest" });
      }
    }
  }, [isSelected]);

  return (
    <div
      ref={ref}
      className={`group-header${isSelected ? " selected" : ""}${hasSelectedChild ? " group-active-header" : ""}`}
      onClick={() => { onClick(); onToggle(); }}
    >
      {isClosed ? "[+] " : "[-] "}
      <strong>{titleContent}</strong>
      {" "}
      <span className={isSelected ? "" : "muted"}>
        {prs.length} PR{prs.length === 1 ? "" : "s"}
        {isClosed && latest ? ` · latest ${timeAgo(latest.updatedAt)}` : ""}
      </span>
    </div>
  );
}

export function PRList() {
  const filtered = useAtomValue(filteredPrsAtom);
  const filters = useAtomValue(filtersAtom);
  const grouped = useAtomValue(groupedPrsAtom);
  const closedGroups = useAtomValue(closedGroupsAtom);
  const setClosedGroups = useAtomSet(closedGroupsAtom);
  const navItems = useAtomValue(navItemsAtom);
  const selectedNavIndex = useAtomValue(selectedNavIndexAtom);
  const setSelectedNavIndex = useAtomSet(selectedNavIndexAtom);
  const viewMode = useAtomValue(viewModeAtom);
  const showAuthor = viewMode === "reviews";

  if (filtered.length === 0) {
    return <div className="muted">No PRs match filters</div>;
  }

  const isNone = filters.group === "none";

  // Build a lookup: for each group/pr, what's its nav index?
  const navIndexByKey = new Map<string, number>();
  navItems.forEach((item, i) => {
    if (item._tag === "group") navIndexByKey.set(`group:${item.name}`, i);
    else navIndexByKey.set(`pr:${item.pr.url}`, i);
  });

  // Which group has a selected child PR?
  const selectedItem = selectedNavIndex >= 0 ? navItems[selectedNavIndex] ?? null : null;
  let activeGroupName: string | null = null;
  if (selectedItem?._tag === "pr") {
    for (const [name, prs] of grouped) {
      if (prs.some((pr) => pr.url === selectedItem.pr.url)) {
        activeGroupName = name;
        break;
      }
    }
  }

  return (
    <div className={showAuthor ? "pr-columns-author" : "pr-columns"}>
      <div className="pr-grid-header">
        <div>PR</div>
        {showAuthor && <div>Author</div>}
        <div>Review</div>
        <div>Pipeline</div>
        <div>Conflicts</div>
      </div>
      {Array.from(grouped.entries()).map(([groupName, groupPrs]) => {
        if (isNone) {
          const sorted = [...groupPrs].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          );
          return sorted.map((pr) => (
            <PRRow
              key={pr.url}
              pr={pr}
              showAuthor={showAuthor}
              onClick={() => setSelectedNavIndex(navIndexByKey.get(`pr:${pr.url}`) ?? -1)}
            />
          ));
        }

        const isClosed = closedGroups.has(groupName);
        const groupNavIndex = navIndexByKey.get(`group:${groupName}`) ?? -1;
        const isGroupSelected = selectedNavIndex === groupNavIndex;
        const sorted = [...groupPrs].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );

        return (
          <div key={groupName} className={`group-fold${activeGroupName === groupName ? " group-active" : ""}`}>
            <GroupHeader
              name={groupName}
              prs={groupPrs}
              isTicketGroup={filters.group === "ticket"}
              isClosed={isClosed}
              isSelected={isGroupSelected}
              hasSelectedChild={activeGroupName === groupName}
              onToggle={() => toggleGroup(setClosedGroups, groupName)}
              onClick={() => setSelectedNavIndex(groupNavIndex)}
            />
            {!isClosed && sorted.map((pr) => (
              <PRRow
                key={pr.url}
                pr={pr}
                showAuthor={showAuthor}
                onClick={() => setSelectedNavIndex(navIndexByKey.get(`pr:${pr.url}`) ?? -1)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
