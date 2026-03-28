import React, { useState } from "react"
import type { PR } from "../lib/types.js"
import { bucketize, groupByTicket, groupByRepo } from "../lib/filters.js"
import { timeAgo } from "../lib/format.js"
import { PRRow } from "./PRRow.js"

interface BucketListProps {
  prs: PR[]
  group: "ticket" | "repo"
}

interface BucketSectionProps {
  title: string
  prs: PR[]
  group: "ticket" | "repo"
}

function BucketSection({ title, prs, group }: BucketSectionProps) {
  const [collapsed, setCollapsed] = useState(false)

  const grouped =
    group === "ticket" ? groupByTicket(prs) : groupByRepo(prs)

  return (
    <div className="bucket">
      <div className="bucket-header" onClick={() => setCollapsed((c) => !c)}>
        <span className="bucket-title">
          {title} ({prs.length})
        </span>
        <span className="bucket-toggle">{collapsed ? "[+]" : "[-]"}</span>
      </div>

      {!collapsed && (
        <>
          <div className="pr-row column-headers">
            <div>PR</div>
            <div>Review</div>
            <div>Pipeline</div>
            <div className="hide-md">Deploy</div>
            <div>Conflicts</div>
            <div>Comments</div>
            <div className="hide-md">Ticket</div>
            <div>Sessions</div>
          </div>

          {Array.from(grouped.entries()).map(([groupName, groupPrs]) => (
            <GroupSection
              key={groupName}
              name={groupName}
              prs={groupPrs}
            />
          ))}
        </>
      )}
    </div>
  )
}

interface GroupSectionProps {
  name: string
  prs: PR[]
}

function GroupSection({ name, prs }: GroupSectionProps) {
  const [collapsed, setCollapsed] = useState(false)

  const latestUpdate = prs.reduce((latest, pr) => {
    return pr.updatedAt > latest ? pr.updatedAt : latest
  }, prs[0]?.updatedAt ?? "")

  return (
    <div className="group">
      <div className="group-header" onClick={() => setCollapsed((c) => !c)}>
        <span className="group-name">
          {name} ({prs.length})
        </span>
        <span className="group-meta">{timeAgo(latestUpdate)}</span>
        <span className="group-toggle">{collapsed ? "[+]" : "[-]"}</span>
      </div>

      {!collapsed &&
        prs.map((pr) => <PRRow key={pr.number} pr={pr} />)}
    </div>
  )
}

export function BucketList({ prs, group }: BucketListProps) {
  const buckets = bucketize(prs)

  const sections: { title: string; prs: PR[] }[] = [
    { title: "Address Now", prs: buckets.now },
    { title: "Address Today", prs: buckets.today },
    { title: "Drafts / TODOs", prs: buckets.drafts },
  ]

  return (
    <div className="bucket-list">
      {sections
        .filter((s) => s.prs.length > 0)
        .map((s) => (
          <BucketSection
            key={s.title}
            title={s.title}
            prs={s.prs}
            group={group}
          />
        ))}
    </div>
  )
}
