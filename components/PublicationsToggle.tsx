"use client";

import { useState, useEffect } from "react";

const PUBLICATION_HASHES = new Set([
  "#journal-publications",
  "#conference-publications",
  "#books",
  "#other-publications",
  "#reviewer",
]);

export default function PublicationsToggle({ children, count }: { children: React.ReactNode; count?: number }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const expand = () => {
      if (PUBLICATION_HASHES.has(window.location.hash)) setOpen(true);
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
      <div className="publications-heading-row -mt-10 flex items-center gap-3">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Collapse publications" : "Expand publications"}
          className="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold leading-none select-none hover:brightness-110 transition-all"
          style={{ backgroundColor: '#1c2d2d', fontSize: "1.4rem", lineHeight: 1 }}
        >
          {open ? "−" : "+"}
        </button>
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: '#1c2d2d' }}>
          Publications{" "}
          {count != null && (
            <span
              className="search-count text-gray-400 font-semibold text-base align-middle"
              data-total={count}
              data-count-scope="toggle-content-publications"
            >({count})</span>
          )}
        </h1>
      </div>

      <div id="toggle-content-publications" className={`toggle-content ${open ? "" : "hidden"}`}>{children}</div>
    </>
  );
}
