export const JCR_QUARTILES = ["Q1", "Q2", "Q3", "Q4"];
export const CORE_LIST = ["CORE A*", "CORE A", "CORE B", "CORE C", "CORE Multiconference"];

// OR-match across every selected chip: a paper matches if it satisfies at least one of the
// selected "Filter" (type) / "JCR" / "CORE" chips. Shared between the Dashboard's Publications
// filter bar and the site-wide search/filter so both stay perfectly in sync.
export function papersFilterMatch(type: string, jcr: string, filters: string[]): boolean {
  if (filters.length === 0) return true;
  return filters.some((f) => {
    if (["Journal", "Conference", "Book"].includes(f)) return type === f;
    if (JCR_QUARTILES.includes(f)) return type === "Journal" && jcr === f;
    if (f === "JCR-Other") return type === "Journal" && !JCR_QUARTILES.includes(jcr);
    if (CORE_LIST.includes(f)) return type === "Conference" && jcr === f;
    if (f === "CORE-Other") return type === "Conference" && !CORE_LIST.includes(jcr);
    return false;
  });
}
