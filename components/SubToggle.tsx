"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Small +/− button placed inside a subsection heading (h2 / h3). It collapses everything
 * that follows the heading inside the same container (see .sub-collapsed in globals.css).
 * The subsection re-opens when a search starts or when the nav bar jumps to it.
 */
export default function SubToggle() {
  const [open, setOpen] = useState(true);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const box = ref.current?.closest("h2, h3")?.parentElement;
    box?.classList.toggle("sub-collapsed", !open);
  }, [open]);

  useEffect(() => {
    const expand = () => setOpen(true);
    const onHash = () => {
      const box = ref.current?.closest("h2, h3")?.parentElement;
      const hash = window.location.hash;
      if (!box || hash.length < 2) return;
      try {
        if (`#${box.id}` === hash || box.querySelector(hash)) setOpen(true);
      } catch {
        /* hash is not a valid selector */
      }
    };
    window.addEventListener("app-search-start", expand);
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("app-search-start", expand);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => setOpen((v) => !v)}
      aria-label={open ? "Collapse subsection" : "Expand subsection"}
      aria-expanded={open}
      className="inline-flex items-center justify-center w-5 h-5 mr-2 rounded-full text-white font-bold leading-none select-none align-middle hover:brightness-110 transition-all"
      style={{ backgroundColor: "#2ecfba", fontSize: "1rem", lineHeight: 1, verticalAlign: "0.12em" }}
    >
      {open ? "−" : "+"}
    </button>
  );
}
