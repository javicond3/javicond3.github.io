"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { chipsFromQuery, setChips, ChipFamily } from "@/utils/searchQuery";
import { normalizeSearchText } from "@/utils/normalizeSearch";

// The search lives for the browser session, so it survives page reloads and moving between
// the main page and /network.
const STORAGE_KEY = "site_search";

interface SearchContextValue {
  query: string;
  setQuery: (q: string) => void;
  years: number[];
  selectedYears: number[];
  toggleYear: (y: number) => void;
  clearYears: () => void;
  papersFilters: string[];
  togglePapersFilter: (f: string) => void;
  clearPapersFilters: () => void;
  projectsFilters: string[];
  toggleProjectsFilter: (f: string) => void;
  clearProjectsFilters: () => void;
  ipOnly: boolean;
  toggleIpOnly: () => void;
  // topics / keywords of papers and projects (normalized names); several of one kind are OR-ed
  topicFilters: string[];
  toggleTopic: (name: string) => void;
  clearTopics: () => void;
  keywordFilters: string[];
  toggleKeyword: (name: string) => void;
  clearKeywords: () => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

/**
 * The query text is the only state. The filter chips (years, papers, projects, "PI") are read
 * out of it and, when clicked, written back into it, so the search box always shows every
 * filter that is applied.
 */
export function SearchProvider({ children, years }: { children: ReactNode; years: number[] }) {
  const [query, setQuery] = useState("");

  const loaded = useRef(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || "null");
      if (saved && typeof saved.query === "string") setQuery(saved.query);
    } catch {
      /* storage blocked or corrupt: start clean */
    }
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ query }));
    } catch {
      /* storage blocked */
    }
  }, [query]);

  const chips = useMemo(() => chipsFromQuery(query), [query]);
  const selectedYears = useMemo(() => chips.years.map(Number), [chips]);

  const toggle = (family: Exclude<ChipFamily, "pi">, value: string) =>
    setQuery((q) => {
      const cur = chipsFromQuery(q)[family];
      return setChips(q, family, cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value]);
    });
  const clear = (family: ChipFamily) => setQuery((q) => setChips(q, family, []));

  return (
    <SearchContext.Provider
      value={{
        query,
        setQuery,
        years,
        selectedYears,
        toggleYear: (y) => toggle("years", String(y)),
        clearYears: () => clear("years"),
        papersFilters: chips.papers,
        togglePapersFilter: (f) => toggle("papers", f),
        clearPapersFilters: () => clear("papers"),
        projectsFilters: chips.projects,
        // call types are kept normalized (lower case, no accents), as they are typed in the query
        toggleProjectsFilter: (f) => toggle("projects", f === "Competitive" || f === "Private" ? f : normalizeSearchText(f)),
        clearProjectsFilters: () => clear("projects"),
        ipOnly: chips.pi,
        toggleIpOnly: () => setQuery((q) => setChips(q, "pi", chipsFromQuery(q).pi ? [] : ["yes"])),
        topicFilters: chips.topics,
        toggleTopic: (name) => toggle("topics", normalizeSearchText(name)),
        clearTopics: () => clear("topics"),
        keywordFilters: chips.keywords,
        toggleKeyword: (name) => toggle("keywords", normalizeSearchText(name)),
        clearKeywords: () => clear("keywords"),
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch(): SearchContextValue {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used within a SearchProvider");
  return ctx;
}
