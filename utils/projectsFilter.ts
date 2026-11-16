// OR-match across every selected chip: a project matches if it satisfies at least one of the
// selected "Filter" (Competitive/Private) / "Call type" chips. Shared between the Dashboard's
// Projects filter bar and the site-wide search/filter so both stay perfectly in sync.
import { normalizeSearchText as norm } from "./normalizeSearch";

// Call types are compared without case / accents: the chips keep them as typed in the search box.
export function projectsFilterMatch(tipo: string, scope: string, filters: string[]): boolean {
  if (filters.length === 0) return true;
  return filters.some((f) => (["Competitive", "Private"].includes(f) ? tipo === f : tipo === "Competitive" && norm(scope) === norm(f)));
}
