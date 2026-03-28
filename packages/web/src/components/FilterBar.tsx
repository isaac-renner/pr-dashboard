import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import React from "react";
import { excludeAtom, groupAtom, pipelineAtom, repoAtom } from "../atoms/filters.js";
import type { Filters } from "../lib/types.js";

interface FilterBarProps {
  readonly filterInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function FilterBar({ filterInputRef }: FilterBarProps) {
  const exclude = useAtomValue(excludeAtom);
  const repo = useAtomValue(repoAtom);
  const pipeline = useAtomValue(pipelineAtom);
  const group = useAtomValue(groupAtom);
  const setExclude = useAtomSet(excludeAtom);
  const setRepo = useAtomSet(repoAtom);
  const setPipeline = useAtomSet(pipelineAtom);
  const setGroup = useAtomSet(groupAtom);

  const excludeVal = exclude._tag === "Some" ? exclude.value : "";
  const repoVal = repo._tag === "Some" ? repo.value : "";
  const pipelineVal = pipeline._tag === "Some" ? pipeline.value : "all";
  const groupVal = group._tag === "Some" ? group.value : "ticket";

  return (
    <div className="filters">
      <label>
        Exclude keywords (comma-separated)
        <input
          type="text"
          value={excludeVal}
          onChange={(e) => setExclude(Option.some(e.target.value))}
          placeholder="endpoint audit, loki"
        />
      </label>

      <label>
        Filter by repo
        <input
          ref={filterInputRef}
          type="text"
          value={repoVal}
          onChange={(e) => setRepo(Option.some(e.target.value))}
          placeholder="e.g. frontend"
        />
      </label>

      <label>
        Group by
        <select
          value={groupVal}
          onChange={(e) => setGroup(Option.some(e.target.value))}
        >
          <option value="ticket">Ticket</option>
          <option value="repo">Repo</option>
        </select>
      </label>

      <label>
        Pipeline
        <select
          value={pipelineVal}
          onChange={(e) => setPipeline(Option.some(e.target.value))}
        >
          <option value="all">Any</option>
          <option value="failing">Failing</option>
          <option value="pending">Pending</option>
          <option value="passing">Passing</option>
          <option value="none">No pipeline</option>
        </select>
      </label>
    </div>
  );
}
