import React, { useCallback, useEffect, useRef, useState } from "react";
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
  const [focusIndex, setFocusIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const matched = query
    ? options.filter((o) => fuzzyMatch(query, o))
    : options;

  // Selected items first, then unselected
  const filtered = [...matched].sort((a, b) => {
    const aSelected = selected.includes(a) ? 0 : 1;
    const bSelected = selected.includes(b) ? 0 : 1;
    return aSelected - bSelected;
  });

  // Reset focus index when filtered list changes
  useEffect(() => {
    setFocusIndex(-1);
  }, [query]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setFocusIndex(-1);
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
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIndex((i) => (i + 1) % filtered.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIndex((i) => (i - 1 + filtered.length) % filtered.length);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (focusIndex >= 0 && focusIndex < filtered.length) {
        onToggle(filtered[focusIndex]!);
      }
      setOpen(false);
      return;
    }
    if (e.key === " " && focusIndex >= 0 && focusIndex < filtered.length) {
      e.preventDefault();
      onToggle(filtered[focusIndex]!);
      return;
    }
  }, [filtered, focusIndex, onToggle]);

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
        <div className="popover" onKeyDown={handleKeyDown}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`filter ${label.toLowerCase()}...`}
          />
          <div className="flex-wrap gap-0">
            {filtered.map((option, i) => (
              <button
                key={option}
                className={[
                  "chip",
                  selected.includes(option) ? "active" : "",
                  i === focusIndex ? "focused" : "",
                ].filter(Boolean).join(" ")}
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
