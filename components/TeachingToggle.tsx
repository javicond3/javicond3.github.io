"use client";

import { useState, useEffect } from "react";

const TEACHING_HASHES = new Set([
  "#courses",
  "#teaching-innovation-projects",
  "#supervision",
  "#phd-thesis",
  "#master-thesis",
  "#bachelor-thesis",
  "#scholarships",
  "#external-courses",
]);

export default function TeachingToggle({ children, count }: { children: React.ReactNode; count?: number }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const expand = () => {
      if (TEACHING_HASHES.has(window.location.hash)) setOpen(true);
    };
    window.addEventListener("hashchange", expand);
    return () => window.removeEventListener("hashchange", expand);
  }, []);

  useEffect(() => {
    const openOnSearch = () => setOpen(true);
    window.addEventListener("app-search-start", openOnSearch);
    return () => window.removeEventListener("app-search-start", openOnSearch);
  }, []);

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Collapse teaching" : "Expand teaching"}
          className="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold leading-none select-none hover:brightness-110 transition-all"
          style={{ backgroundColor: '#1c2d2d', fontSize: "1.4rem", lineHeight: 1 }}
        >
          {open ? "−" : "+"}
        </button>
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: '#1c2d2d' }}>
          Teaching{" "}
          {count != null && (
            <span
              className="search-count text-gray-400 font-semibold text-base align-middle"
              data-total={count}
              data-count-scope="toggle-content-teaching"
            >({count})</span>
          )}
        </h1>
      </div>

      <div id="toggle-content-teaching" className={`toggle-content ${open ? "" : "hidden"}`}>{children}</div>
    </>
  );
}
