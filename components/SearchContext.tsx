"use client";

import { createContext, useContext, useState, ReactNode } from "react";

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
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children, years }: { children: ReactNode; years: number[] }) {
  const [query, setQuery] = useState("");
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [papersFilters, setPapersFilters] = useState<string[]>([]);
  const [projectsFilters, setProjectsFilters] = useState<string[]>([]);
  const [ipOnly, setIpOnly] = useState(false);

  const toggleYear = (y: number) =>
    setSelectedYears((v) => (v.includes(y) ? v.filter((x) => x !== y) : [...v, y]));
  const clearYears = () => setSelectedYears([]);

  const togglePapersFilter = (f: string) =>
    setPapersFilters((v) => (v.includes(f) ? v.filter((x) => x !== f) : [...v, f]));
  const clearPapersFilters = () => setPapersFilters([]);

  const toggleProjectsFilter = (f: string) =>
    setProjectsFilters((v) => (v.includes(f) ? v.filter((x) => x !== f) : [...v, f]));
  const clearProjectsFilters = () => setProjectsFilters([]);

  const toggleIpOnly = () => setIpOnly((v) => !v);

  return (
    <SearchContext.Provider
      value={{
        query,
        setQuery,
        years,
        selectedYears,
        toggleYear,
        clearYears,
        papersFilters,
        togglePapersFilter,
        clearPapersFilters,
        projectsFilters,
        toggleProjectsFilter,
        clearProjectsFilters,
        ipOnly,
        toggleIpOnly,
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
