// Topics and keywords of papers and projects (columns "areas"/"topic" and "keywords" of the sheets).

/** A cell holding a JSON list (["LLM", "NLP"]) or a plain "a, b; c" list. */
export function parseTagList(raw: unknown): string[] {
  if (raw === undefined || raw === null) return [];
  const s = String(raw).trim();
  if (!s || s === "-") return [];
  let items: unknown[] | null = null;
  if (s.startsWith("[")) {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) items = parsed;
    } catch {
      /* not JSON: fall through to the plain list */
    }
  }
  if (!items) items = s.replace(/^\[|\]$/g, "").split(/[,;]/).map((x) => x.replace(/^\s*["']|["']\s*$/g, ""));
  return [...new Set(items.map((x) => String(x).trim()).filter(Boolean))];
}

/** Tags as they are embedded in the search text of an item: "[topic:Data] [kw:LLM]". */
export function tagSearchText(topics?: string[], keywords?: string[]): string {
  return [...(topics || []).map((t) => `[topic:${t}]`), ...(keywords || []).map((k) => `[kw:${k}]`)].join(" ");
}

/** Does the (normalized) search text carry a topic / keyword containing `value`? null when it has no tags at all. */
export function tagTest(text: string, kind: "topic" | "kw", value: string): boolean | null {
  if (!text.includes("[topic:") && !text.includes("[kw:")) return null;
  const open = `[${kind}:`;
  let i = text.indexOf(open);
  while (i >= 0) {
    const end = text.indexOf("]", i);
    if (end < 0) break;
    if (text.slice(i + open.length, end).includes(value)) return true;
    i = text.indexOf(open, end);
  }
  return false;
}

/** Distinct tags of a list of items, most used first. */
export function countTags(lists: (string[] | undefined)[]): { name: string; count: number }[] {
  const m = new Map<string, number>();
  for (const l of lists) for (const t of l || []) m.set(t, (m.get(t) || 0) + 1);
  return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
