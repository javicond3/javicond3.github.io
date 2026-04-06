"use client";

import { useState, useEffect } from "react";

const TEACHING_HASHES = new Set([
  "#courses",
  "#teaching-innovation-projects",
  "#supervision",
  "#phd-thesis",
  "#master-thesis",
  "#bachelor-thesis",
  "#student-supervision",
  "#external-courses",
]);

export default function TeachingToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const expand = () => {
      if (TEACHING_HASHES.has(window.location.hash)) setOpen(true);
    };
    window.addEventListener("hashchange", expand);
    return () => window.removeEventListener("hashchange", expand);
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
          Teaching
        </h1>
      </div>

      {open && <div>{children}</div>}
    </>
  );
}
