import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import React from "react";
import { searchAtom } from "../atoms/filters.js";
import { FILTER_DEFS, type FilterDef } from "../lib/filterDefs.js";
import { ChipFilterPopover } from "./ChipFilterPopover.js";

interface FilterBarProps {
  readonly filterInputRef?: React.RefObject<HTMLInputElement | null>;
  readonly filterRefs?: Record<string, React.RefObject<HTMLButtonElement | null>>;
}

function FilterChip({ def, triggerRef }: { def: FilterDef; triggerRef?: React.RefObject<HTMLButtonElement | null> | undefined }) {
  const options = useAtomValue(def.optionsAtom);
  const selected = useAtomValue(def.selectedAtom);
  const setSelected = useAtomSet(def.selectedAtom);

  function toggle(value: string) {
    setSelected((current) =>
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    );
  }

  return (
    <ChipFilterPopover
      label={def.label}
      options={[...options]}
      selected={[...selected]}
      onToggle={toggle}
      onClear={() => setSelected([])}
      triggerRef={triggerRef}
    />
  );
}

function ActiveChips() {
  const chips: React.ReactNode[] = [];

  for (const def of FILTER_DEFS) {
    chips.push(<ActiveChipsForDef key={def.id} def={def} />);
  }

  return chips.length > 0 ? <div className="flex-wrap gap-0" style={{ marginTop: "calc(var(--line-height) / 2)" }}>{chips}</div> : null;
}

function ActiveChipsForDef({ def }: { def: FilterDef }) {
  const selected = useAtomValue(def.selectedAtom);
  const setSelected = useAtomSet(def.selectedAtom);

  if (selected.length === 0) return null;

  function remove(value: string) {
    setSelected((current) => current.filter((v) => v !== value));
  }

  return (
    <>
      {selected.map((value) => (
        <button
          key={`${def.id}:${value}`}
          className="chip"
          onClick={() => remove(value)}
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

  // Check if any filter has active selections
  const hasActive = FILTER_DEFS.some(() => true); // ActiveChips handles visibility

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
        {FILTER_DEFS.map((def) => (
          <FilterChip
            key={def.id}
            def={def}
            triggerRef={filterRefs?.[def.id]}
          />
        ))}
      </div>
      <ActiveChips />
    </>
  );
}
