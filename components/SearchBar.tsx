"use client";

import { useEffect, useRef, useState } from "react";
import { normalizeSearchText } from "@/utils/normalizeSearch";
import { yearRangeMatchesSelection } from "@/utils/yearOverlap";
import { papersFilterMatch } from "@/utils/papersFilter";
import { projectsFilterMatch } from "@/utils/projectsFilter";
import { useSearch } from "./SearchContext";

export default function SearchBar() {
  const { query, setQuery, selectedYears, papersFilters, projectsFilters, ipOnly } = useSearch();
  const [isOpen, setIsOpen] = useState(false);
  const wasActiveRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasActiveFilter =
    query.trim() !== "" || selectedYears.length > 0 || papersFilters.length > 0 || projectsFilters.length > 0 || ipOnly;

  useEffect(() => {
    const root = document.getElementById("main-content");
    if (!root) return;

    const normalized = normalizeSearchText(query);
    const isActive =
      normalized !== "" || selectedYears.length > 0 || papersFilters.length > 0 || projectsFilters.length > 0 || ipOnly;

    if (isActive && !wasActiveRef.current) {
      window.dispatchEvent(new Event("app-search-start"));
    }
    wasActiveRef.current = isActive;

    const items = root.querySelectorAll<HTMLElement>("[data-search]");
    items.forEach((el) => {
      const text = el.getAttribute("data-search") || "";
      const textMatch = normalized === "" || text.includes(normalized);

      let yearMatch = true;
      const yearStartAttr = el.getAttribute("data-year-start");
      const yearEndAttr = el.getAttribute("data-year-end");
      if (selectedYears.length > 0 && yearStartAttr != null && yearEndAttr != null) {
        yearMatch = yearRangeMatchesSelection(Number(yearStartAttr), Number(yearEndAttr), selectedYears);
      }

      let papersMatch = true;
      const pubType = el.getAttribute("data-pub-type");
      if (papersFilters.length > 0 && pubType != null) {
        papersMatch = papersFilterMatch(pubType, el.getAttribute("data-pub-jcr") || "", papersFilters);
      }

      let projectsMatch = true;
      const projectTipo = el.getAttribute("data-project-tipo");
      if (projectTipo != null) {
        if (ipOnly && el.getAttribute("data-project-ip") !== "yes") projectsMatch = false;
        if (projectsMatch && projectsFilters.length > 0) {
          projectsMatch = projectsFilterMatch(projectTipo, el.getAttribute("data-project-scope") || "", projectsFilters);
        }
      }

      el.classList.toggle("search-hidden", !(textMatch && yearMatch && papersMatch && projectsMatch));
    });

    const groups = root.querySelectorAll<HTMLElement>("[data-search-group]");
    groups.forEach((group) => {
      if (!isActive) {
        group.classList.remove("search-hidden");
        return;
      }
      const hasVisibleItem = !!group.querySelector("[data-search]:not(.search-hidden)");
      group.classList.toggle("search-hidden", !hasVisibleItem);
    });

    const counts = root.querySelectorAll<HTMLElement>(".search-count");
    counts.forEach((span) => {
      const total = span.getAttribute("data-total") || "0";
      if (!isActive) {
        span.textContent = `(${total})`;
        return;
      }
      const scopeId = span.getAttribute("data-count-scope");
      const scope = scopeId ? document.getElementById(scopeId) : span.closest<HTMLElement>("[data-search-group]");
      const visible = scope ? scope.querySelectorAll("[data-search]:not(.search-hidden)").length : Number(total);
      span.textContent = `(${visible})`;
    });

    document.documentElement.classList.toggle("search-active", isActive);
  }, [query, selectedYears, papersFilters, projectsFilters, ipOnly]);

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
  }, [isOpen]);

  const close = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Search"
        title="Search"
        className={`transition-colors hover:text-[#2ecfba] flex items-center ${hasActiveFilter ? "text-[#2ecfba]" : "text-gray-300"}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center pt-24 px-4 bg-black/40"
          onClick={close}
        >
          <div className="w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white rounded-lg shadow-xl p-3 space-y-2">
              <div className="relative">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                >
                  <path
                    fillRule="evenodd"
                    d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                    clipRule="evenodd"
                  />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search everything…"
                  className="w-full pl-9 pr-9 py-3 rounded-lg border border-gray-200 text-base text-gray-800 bg-white focus:outline-none focus:ring-2 transition-shadow"
                  style={{ boxShadow: query ? "0 0 0 2px #2ecfba" : undefined }}
                />
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
