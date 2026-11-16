"use client";

import { useSearch } from "./SearchContext";
import { normalizeSearchText } from "@/utils/normalizeSearch";

const ON = { backgroundColor: "#2ecfba", color: "#fff", borderColor: "#2ecfba" };
const TOPIC_OFF = { backgroundColor: "#f0fdfa", color: "#0f766e", borderColor: "#2ecfba" };
const KEYWORD_OFF = { backgroundColor: "#f8fafc", color: "#475569", borderColor: "#e2e8f0" };

/** Topic and keyword tags of a paper or a project. Clicking one filters papers and projects by it. */
export default function TagChips({ topics, keywords, className = "" }: { topics?: string[]; keywords?: string[]; className?: string }) {
  const { topicFilters, keywordFilters, toggleTopic, toggleKeyword } = useSearch();
  if (!topics?.length && !keywords?.length) return null;
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {(topics || []).map((t) => {
        const on = topicFilters.includes(normalizeSearchText(t));
        return (
          <button
            key={`t-${t}`}
            type="button"
            onClick={() => toggleTopic(t)}
            aria-pressed={on}
            title={`Topic: ${t} — click to ${on ? "remove the filter" : "filter papers and projects"}`}
            className="px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-colors"
            style={on ? ON : TOPIC_OFF}
          >
            {t}
          </button>
        );
      })}
      {(keywords || []).map((k) => {
        const on = keywordFilters.includes(normalizeSearchText(k));
        return (
          <button
            key={`k-${k}`}
            type="button"
            onClick={() => toggleKeyword(k)}
            aria-pressed={on}
            title={`Keyword: ${k} — click to ${on ? "remove the filter" : "filter papers and projects"}`}
            className="px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors"
            style={on ? ON : KEYWORD_OFF}
          >
            #{k}
          </button>
        );
      })}
    </div>
  );
}
