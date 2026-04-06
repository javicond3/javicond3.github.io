"use client";

import { useState } from "react";
import { navigateToHash } from "@/utils/navScroll";
import NavAuthButton from "@/components/NavAuthButton";


const sections = [
  {
    label: "About",
    href: "#about",
    items: [],
  },
  {
    label: "Publications",
    href: null,
    items: [
      { label: "Journal", href: "#journal-publications" },
      { label: "Conference", href: "#conference-publications" },
      { label: "Books", href: "#books" },
      { label: "Other", href: "#other-publications" },
    ],
  },
  {
    label: "Projects",
    href: null,
    items: [
      { label: "Competitive Projects", href: "#competitive-projects" },
      { label: "Private Contracts", href: "#private-contracts" },
      { label: "Software", href: "#software" },
    ],
  },
  {
    label: "Teaching",
    href: null,
    items: [
      { label: "Courses", href: "#courses" },
      { label: "Innovation Projects", href: "#teaching-innovation-projects" },
      { label: "Supervision", href: "#supervision" },
      { label: "External Courses", href: "#external-courses" },
    ],
  },
  {
    label: "International",
    href: null,
    items: [
      { label: "Research Visits", href: "#research-visits" },
      { label: "Awards", href: "#awards" },
      { label: "Invited Lectures", href: "#invited-lectures" },
      { label: "Events", href: "#events" },
    ],
  }
];

export default function NavMobile() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const close = () => { setOpen(false); setExpanded(null); };

  const handleNav = (href: string) => {
    close();
    navigateToHash(href);
  };

  return (
    <div className="md:hidden">
      {/* Hamburger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle menu"
        className="text-gray-300 hover:text-white p-1"
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute top-14 left-0 right-0 z-50 shadow-lg text-sm"
          style={{ backgroundColor: "#1c2d2d" }}
        >
          {sections.map((section) => (
            <div key={section.label} style={{ borderBottom: "1px solid #2ecfba22" }}>
              {section.items.length === 0 ? (
                <a
                  href={section.href!}
                  onClick={(e) => { e.preventDefault(); handleNav(section.href!); }}
                  className="block px-5 py-3 text-gray-300 hover:text-white font-medium"
                >
                  {section.label}
                </a>
              ) : (
                <>
                  <button
                    onClick={() => setExpanded(expanded === section.label ? null : section.label)}
                    className="w-full flex items-center justify-between px-5 py-3 text-gray-300 hover:text-white font-medium text-left"
                  >
                    {section.label}
                    <svg
                      className={`w-3 h-3 transition-transform ${expanded === section.label ? "rotate-180" : ""}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expanded === section.label && (
                    <div style={{ backgroundColor: "#162525" }}>
                      {section.items.map((item) => (
                        <a
                          key={item.href}
                          href={item.href}
                          onClick={(e) => { e.preventDefault(); handleNav(item.href); }}
                          className="block px-8 py-2.5 text-gray-400 hover:text-white"
                          style={{ borderTop: "1px solid #2ecfba11" }}
                        >
                          {item.label}
                        </a>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
           <NavAuthButton isIcon={false} />
        </div>
      )}
    </div>
  );
}
