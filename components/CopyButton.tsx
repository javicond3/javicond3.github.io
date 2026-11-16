"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { copySelection, refSelection, refLabels, getServerSelection, refId } from "@/utils/copySelection";

const base = "inline-flex align-middle text-xs font-medium px-2 py-0.5 rounded-md border not-italic";
const idle = { borderColor: "#d1d5db", color: "#6b7280", backgroundColor: "transparent" };
const lit = { borderColor: "#2ecfba", color: "#0f766e", backgroundColor: "#ccfbf1" };
const flash = { borderColor: "#2ecfba", color: "#2ecfba", backgroundColor: "#f0fdfa" };

/**
 * "Copy" copies the item; "Add" puts it in a selection that is copied all together from the
 * bar at the bottom of the page (it stays lit until removed; a reload empties the selection);
 * "Ref" does the same with a link that opens the page at this item.
 * A button with its own label (e.g. ".bib") is a plain copy button.
 */
export default function CopyButton({ text, label = "Copy", refHash }: { text: string; label?: string; refHash?: string }) {
  const [copied, setCopied] = useState<"text" | null>(null);
  const refs = useSyncExternalStore(refSelection.subscribe, refSelection.get, getServerSelection);
  // the link is only known in the browser, once the container has its anchor
  const [link, setLink] = useState("");
  const refSelected = link !== "" && refs.includes(link);
  const selection = useSyncExternalStore(copySelection.subscribe, copySelection.get, getServerSelection);
  const selected = selection.includes(text);
  const ref = useRef<HTMLButtonElement>(null);
  const full = label === "Copy";

  // The item's container gets the anchor its link points to.
  useEffect(() => {
    if (!full) return;
    const here = `${window.location.origin}${window.location.pathname}`;
    // refHash: the link is resolved by the page itself (e.g. an author of the network), not by an anchor
    if (refHash) return setLink(`${here}#${refHash}`);
    const host = ref.current?.closest<HTMLElement>("[data-search]") ?? ref.current?.parentElement?.parentElement;
    if (host && !host.id) host.id = refId(text);
    setLink(`${here}#${host?.id || refId(text)}`);
  }, [full, text, refHash]);

  const write = async (value: string, kind: "text") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  };

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          write(text, "text");
        }}
        aria-label={copied === "text" ? "Copied" : label}
        className={`${base} ml-2`}
        style={copied === "text" ? flash : idle}
      >
        {copied === "text" ? "Copied!" : label}
      </button>
      {full && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              copySelection.toggle(text);
            }}
            aria-pressed={selected}
            title={selected ? "Remove from the selection" : "Add to the selection to copy several items together"}
            className={`${base} ml-1`}
            style={selected ? lit : idle}
          >
            {selected ? "Added ✓" : "Add"}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!link) return;
              refLabels.set(link, text);
              refSelection.toggle(link);
            }}
            aria-pressed={refSelected}
            title={refSelected ? "Remove its link from the selection" : "Add a link to this item to the selection"}
            className={`${base} ml-1`}
            style={refSelected ? lit : idle}
          >
            {refSelected ? "Ref ✓" : "Ref"}
          </button>
        </>
      )}
    </>
  );
}
