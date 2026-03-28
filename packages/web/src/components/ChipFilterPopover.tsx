import React, { useEffect, useRef, useState } from "react";
import { fuzzyMatch } from "../lib/filters.js";

interface ChipFilterPopoverProps {
  readonly label: string;
  readonly options: ReadonlyArray<string>;
  readonly selected: ReadonlyArray<string>;
  readonly onToggle: (value: string) => void;
  readonly onClear: () => void;
  readonly triggerRef?: React.RefObject<HTMLButtonElement | null> | undefined;
}

export function ChipFilterPopover({
  label,
  options,
  selected,
  onToggle,
  onClear,
  triggerRef,
}: ChipFilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filtered = query
    ? options.filter((o) => fuzzyMatch(query, o))
    : options;

  const displayLabel = selected.length > 0
    ? `${label} (${selected.length})`
    : label;

  return (
    <div className="repo-filter" ref={containerRef}>
      <button
        ref={triggerRef}
        className={`repo-filter-trigger${selected.length > 0 ? " active" : ""}`}
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        {displayLabel}
      </button>

      {open && (
        <div className="repo-filter-popover">
          <input
            ref={inputRef}
            type="text"
            className="repo-filter-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`filter ${label.toLowerCase()}...`}
          />
          <div className="repo-filter-list">
            {filtered.map((option) => (
              <button
                key={option}
                className={`repo-chip${selected.includes(option) ? " active" : ""}`}
                onClick={() => onToggle(option)}
                type="button"
              >
                {option}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="repo-filter-empty">No matches</div>
            )}
          </div>
          {selected.length > 0 && (
            <button
              className="repo-filter-clear"
              onClick={onClear}
              type="button"
            >
              Clear selection
            </button>
          )}
        </div>
      )}
    </div>
  );
}
