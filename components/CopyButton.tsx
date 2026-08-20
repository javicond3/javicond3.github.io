"use client";

import { useState } from "react";

export default function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copied" : label}
      className="inline-flex align-middle text-xs font-medium px-2 py-0.5 rounded-md border ml-2 not-italic"
      style={{
        borderColor: copied ? "#2ecfba" : "#d1d5db",
        color: copied ? "#2ecfba" : "#6b7280",
        backgroundColor: copied ? "#f0fdfa" : "transparent",
      }}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
