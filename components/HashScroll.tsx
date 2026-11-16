"use client";

import { useEffect } from "react";

/**
 * Arriving at a #hash (page load, the nav bar of /network, a link picked with "Ref"): the page
 * keeps growing while client components render, so the browser's own anchor jump lands in the
 * wrong place. Scroll again once the layout has settled, and highlight "Ref" targets.
 */
export default function HashScroll() {
  useEffect(() => {
    let timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      timers.forEach(clearTimeout);
      const hash = window.location.hash;
      if (!hash || hash.length < 2) return;
      timers = [150, 600].map((ms) =>
        setTimeout(() => {
          let el: Element | null = null;
          try {
            el = document.querySelector(hash);
          } catch {
            /* not a valid selector */
          }
          if (!el) return;
          el.scrollIntoView({ behavior: "auto", block: "start" });
          if (hash.startsWith("#ref-")) {
            document.querySelectorAll(".ref-target").forEach((x) => x !== el && x.classList.remove("ref-target"));
            el.classList.add("ref-target");
          }
        }, ms)
      );
    };
    run();
    window.addEventListener("hashchange", run);
    window.addEventListener("app-ref-nav", run);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("hashchange", run);
      window.removeEventListener("app-ref-nav", run);
    };
  }, []);
  return null;
}
