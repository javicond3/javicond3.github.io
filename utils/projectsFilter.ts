// OR-match across every selected chip: a project matches if it satisfies at least one of the
// selected "Filter" (Competitive/Private) / "Call type" chips. Shared between the Dashboard's
// Projects filter bar and the site-wide search/filter so both stay perfectly in sync.
export function projectsFilterMatch(tipo: string, scope: string, filters: string[]): boolean {
  if (filters.length === 0) return true;
  return filters.some((f) => (["Competitive", "Private"].includes(f) ? tipo === f : tipo === "Competitive" && scope === f));
}
