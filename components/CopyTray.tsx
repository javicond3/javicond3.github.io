"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { copySelection, refSelection, refLabels, getServerSelection } from "@/utils/copySelection";

/**
 * Bottom bar for the items picked with "Add" and the links picked with "Ref": copy each set at
 * once, or empty them. Clicking the bar opens the list of everything picked: entries can be
 * removed one by one, and a link jumps to its item (on this page or on the other one) without
 * losing the selection.
 */
export default function CopyTray() {
  const items = useSyncExternalStore(copySelection.subscribe, copySelection.get, getServerSelection);
  const refs = useSyncExternalStore(refSelection.subscribe, refSelection.get, getServerSelection);
  const [copied, setCopied] = useState<"items" | "refs" | null>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  if (items.length === 0 && refs.length === 0) return null;

  const copy = async (kind: "items" | "refs") => {
    try {
      await navigator.clipboard.writeText((kind === "items" ? items : refs).join("\n"));
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  };
  const jump = (link: string) => {
    try {
      const url = new URL(link);
      if (url.origin !== window.location.origin) return window.open(link, "_blank");
      const announce = () => window.dispatchEvent(new Event("app-ref-nav"));
      if (url.pathname === window.location.pathname) {
        // same page: just move the hash (the page reacts to it)
        if (window.location.hash === url.hash) announce();
        else window.location.hash = url.hash;
        return;
      }
      // other page: client-side navigation (a full page load would empty the selection),
      // then tell the page once it is really there
      router.push(url.pathname + url.hash);
      let tries = 0;
      const timer = setInterval(() => {
        const arrived = window.location.pathname === url.pathname && window.location.hash === url.hash;
        if (arrived || ++tries > 60) clearInterval(timer);
        if (arrived) {
          announce();
          setTimeout(announce, 500);
        }
      }, 100);
    } catch {
      /* not a link */
    }
  };
  const pill = "px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap";
  const remove = "flex-shrink-0 w-5 h-5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 leading-none";
  const short = (s: string) => (s.length > 140 ? s.slice(0, 140) + "…" : s);

  return (
    <div className="copy-tray fixed bottom-4 left-1/2 -translate-x-1/2 z-[55] w-max max-w-[calc(100vw-2rem)] text-sm" style={{ color: "#fff" }}>
      {open && (
        <div
          className="mb-2 rounded-2xl shadow-lg p-3 overflow-y-auto"
          style={{ backgroundColor: "#1c2d2d", maxHeight: "50vh", width: "min(560px, calc(100vw - 2rem))" }}
        >
          {items.length > 0 && (
            <>
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">Selected ({items.length})</p>
              <ul className="mb-2">
                {items.map((t) => (
                  <li key={t} className="flex items-start gap-2 py-1 border-b border-white/10 text-xs leading-snug">
                    <span className="flex-1 min-w-0 break-words">{short(t)}</span>
                    <button onClick={() => copySelection.toggle(t)} aria-label="Remove from the selection" className={remove}>
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {refs.length > 0 && (
            <>
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">Refs ({refs.length})</p>
              <ul>
                {refs.map((link) => (
                  <li key={link} className="flex items-start gap-2 py-1 border-b border-white/10 text-xs leading-snug">
                    <a
                      href={link}
                      onClick={(e) => {
                        e.preventDefault();
                        jump(link);
                      }}
                      className="flex-1 min-w-0 break-words hover:underline"
                      style={{ color: "#2ecfba" }}
                      title={link}
                    >
                      {short(refLabels.get(link) || link)}
                      <span className="text-gray-400"> · {new URL(link).pathname.includes("network") ? "network" : "main page"} ↗</span>
                    </a>
                    <button onClick={() => refSelection.toggle(link)} aria-label="Remove the link from the selection" className={remove}>
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      <div
        className="flex items-center gap-3 rounded-full shadow-lg px-4 py-2 mx-auto w-max max-w-full overflow-x-auto cursor-pointer"
        style={{ backgroundColor: "#1c2d2d" }}
        role="status"
        onClick={() => setOpen((v) => !v)}
        title={open ? "Hide the list" : "Show everything selected"}
      >
        <span className="text-gray-300 text-xs" aria-hidden="true">
          {open ? "▾" : "▴"}
        </span>
        {items.length > 0 && (
          <>
            <span className="font-semibold whitespace-nowrap">{items.length} selected</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                copy("items");
              }}
              className={pill}
              style={{ backgroundColor: "#2ecfba", color: "#1c2d2d" }}
            >
              {copied === "items" ? "Copied!" : "Copy all"}
            </button>
          </>
        )}
        {refs.length > 0 && (
          <>
            <span className="font-semibold whitespace-nowrap">
              {refs.length} ref{refs.length === 1 ? "" : "s"}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                copy("refs");
              }}
              className={pill}
              style={{ backgroundColor: "#2ecfba", color: "#1c2d2d" }}
            >
              {copied === "refs" ? "Copied!" : "Copy refs"}
            </button>
          </>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            copySelection.clear();
            refSelection.clear();
            setOpen(false);
          }}
          className="text-xs text-gray-300 hover:text-white whitespace-nowrap"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
