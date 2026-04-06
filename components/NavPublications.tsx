"use client";

import { useState, useRef, useEffect } from "react";
import { navigateToHash } from "@/utils/navScroll";

const items = [
  { label: "Journal", href: "#journal-publications" },
  { label: "Conference", href: "#conference-publications" },
  { label: "Books", href: "#books" },
  { label: "Other", href: "#other-publications" },
  { label: "Reviewer", href: "#reviewer" },
];

export default function NavPublications() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-gray-300 transition-colors hover:text-accent flex items-center gap-1 text-sm font-medium"
      >
        Publications
        <svg className="w-3 h-3 mt-px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-40 rounded shadow-lg py-1 text-sm"
          style={{ backgroundColor: "#1c2d2d", border: "1px solid #2ecfba33" }}
        >
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => { e.preventDefault(); setOpen(false); navigateToHash(item.href); }}
              className="block px-4 py-2 text-gray-300 hover:text-white transition-colors"
              style={{ borderBottom: "1px solid #2ecfba22" }}
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
