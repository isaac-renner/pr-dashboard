import { useState, useCallback } from "react";
import type { Filters } from "../lib/types";

const DEFAULT_FILTERS: Filters = {
  exclude: "",
  repo: "",
  pipeline: "all",
  drafts: "exclude",
  group: "ticket",
};

const FILTER_KEYS: (keyof Filters)[] = [
  "exclude",
  "repo",
  "pipeline",
  "drafts",
  "group",
];

function readFiltersFromURL(): Filters {
  const params = new URLSearchParams(window.location.search);
  const filters = { ...DEFAULT_FILTERS };

  for (const key of FILTER_KEYS) {
    const value = params.get(key);
    if (value !== null) {
      (filters as Record<string, string>)[key] = value;
    }
  }

  return filters;
}

function writeFiltersToURL(filters: Filters): void {
  const params = new URLSearchParams();

  for (const key of FILTER_KEYS) {
    const value = filters[key];
    const defaultValue = DEFAULT_FILTERS[key];
    if (value !== defaultValue) {
      params.set(key, value);
    }
  }

  const search = params.toString();
  const url = search
    ? `${window.location.pathname}?${search}`
    : window.location.pathname;

  history.replaceState(null, "", url);
}

export function useFilters(): [Filters, (f: Filters) => void] {
  const [filters, setFiltersState] = useState<Filters>(readFiltersFromURL);

  const setFilters = useCallback((f: Filters) => {
    setFiltersState(f);
    writeFiltersToURL(f);
  }, []);

  return [filters, setFilters];
}
