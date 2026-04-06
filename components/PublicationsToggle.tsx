"use client";

import { useState, useEffect } from "react";

const PUBLICATION_HASHES = new Set([
  "#journal-publications",
  "#conference-publications",
  "#books",
  "#other-publications",
  "#reviewer",
]);

export default function PublicationsToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const expand = () => {
      if (PUBLICATION_HASHES.has(window.location.hash)) setOpen(true);
    };
    window.addEventListener("hashchange", expand);
    return () => window.removeEventListener("hashchange", expand);
  }, []);

  return (
    <>
      <div className="-mt-10 flex items-center gap-3">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Collapse publications" : "Expand publications"}
          className="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold leading-none select-none hover:brightness-110 transition-all"
          style={{ backgroundColor: '#1c2d2d', fontSize: "1.4rem", lineHeight: 1 }}
        >
          {open ? "−" : "+"}
        </button>
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: '#1c2d2d' }}>
          Publications
        </h1>
      </div>

      {open && <div>{children}</div>}
    </>
  );
}
