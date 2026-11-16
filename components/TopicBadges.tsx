"use client";

import { useSearch } from "./SearchContext";
import { normalizeSearchText } from "@/utils/normalizeSearch";

/** The research topics under the name: the ones used to tag papers and projects, and a filter for both. */
export default function TopicBadges({ topics }: { topics: string[] }) {
  const { topicFilters, toggleTopic } = useSearch();
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {topics.map((tag) => {
        const on = topicFilters.includes(normalizeSearchText(tag));
        return (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTopic(tag)}
            aria-pressed={on}
            title={on ? "Remove this topic filter" : "Show only the papers and projects of this topic"}
            className="px-3 py-1 rounded-full text-xs font-semibold border transition-colors"
            style={on ? { backgroundColor: "#2ecfba", color: "#fff", borderColor: "#2ecfba" } : { backgroundColor: "#f0fdfa", color: "#2ecfba", borderColor: "#2ecfba" }}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
