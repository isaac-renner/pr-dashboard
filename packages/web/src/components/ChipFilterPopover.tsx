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
    <div className="popover-anchor" ref={containerRef}>
      <button
        ref={triggerRef}
        className={selected.length > 0 ? "inverted" : undefined}
        onClick={() => setOpen((o) => !o)}
        type="button"
        style={{ width: "auto", minWidth: "12ch" }}
      >
        {displayLabel}
      </button>

      {open && (
        <div className="popover">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`filter ${label.toLowerCase()}...`}
          />
          <div className="flex-wrap gap-0">
            {filtered.map((option) => (
              <button
                key={option}
                className={`chip${selected.includes(option) ? " active" : ""}`}
                onClick={() => onToggle(option)}
                type="button"
              >
                {option}
              </button>
            ))}
            {filtered.length === 0 && <span className="muted">No matches</span>}
          </div>
          {selected.length > 0 && (
            <button
              className="chip muted"
              onClick={onClear}
              type="button"
            >
              clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
