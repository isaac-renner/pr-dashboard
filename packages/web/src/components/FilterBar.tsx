import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import React from "react";
import { RESOLVED_FILTERS, type ResolvedFilter } from "../atoms/filterRegistry.js";
import { searchAtom } from "../atoms/filters.js";
import { ChipFilterPopover } from "./ChipFilterPopover.js";

interface FilterBarProps {
  readonly filterInputRef?: React.RefObject<HTMLInputElement | null>;
  readonly filterRefs?: Record<string, React.RefObject<HTMLButtonElement | null>>;
}

function FilterChip({ filter, triggerRef }: { filter: ResolvedFilter; triggerRef?: React.RefObject<HTMLButtonElement | null> | undefined }) {
  const options = useAtomValue(filter.optionsAtom);
  const selected = useAtomValue(filter.selectedAtom);
  const setSelected = useAtomSet(filter.selectedAtom);

  function toggle(value: string) {
    setSelected((current) =>
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    );
  }

  return (
    <ChipFilterPopover
      label={filter.def.label}
      options={[...options]}
      selected={[...selected]}
      onToggle={toggle}
      onClear={() => setSelected([])}
      triggerRef={triggerRef}
    />
  );
}

function ActiveChips() {
  return (
    <>
      {RESOLVED_FILTERS.map((filter) => (
        <ActiveChipsForFilter key={filter.def.id} filter={filter} />
      ))}
    </>
  );
}

function ActiveChipsForFilter({ filter }: { filter: ResolvedFilter }) {
  const selected = useAtomValue(filter.selectedAtom);
  const setSelected = useAtomSet(filter.selectedAtom);

  if (selected.length === 0) return null;

  return (
    <>
      {selected.map((value) => (
        <button
          key={`${filter.def.id}:${value}`}
          className="chip"
          onClick={() => setSelected((current) => current.filter((v) => v !== value))}
          type="button"
        >
          {value} ×
        </button>
      ))}
    </>
  );
}

export function FilterBar({ filterInputRef, filterRefs }: FilterBarProps) {
  const search = useAtomValue(searchAtom);
  const setSearch = useAtomSet(searchAtom);
  const searchVal = search._tag === "Some" ? search.value : "";

  const hasActive = RESOLVED_FILTERS.some(() => true);

  return (
    <>
      <div className="filter-bar">
        <input
          ref={filterInputRef}
          type="text"
          value={searchVal}
          onChange={(e) => setSearch(Option.some(e.target.value))}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          placeholder="search"
        />
        {RESOLVED_FILTERS.map((filter) => (
          <FilterChip
            key={filter.def.id}
            filter={filter}
            triggerRef={filterRefs?.[filter.def.id]}
          />
        ))}
      </div>
      <div className="flex-wrap gap-0" style={{ marginTop: "calc(var(--line-height) / 2)" }}>
        <ActiveChips />
      </div>
    </>
  );
}
