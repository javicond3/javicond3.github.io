import { publications, conferencePublications, bookPublications, otherPublications } from "@/data/publications";
import { getCompetitiveProjects, getPrivateContracts } from "@/data/projects";
import { getPhDTheses, getMasterTheses, getBachelorTheses, getSupervisions } from "@/data/tutor";
import { yearRange, normalizeThesisYear } from "@/utils/buildDashboardData";

// The exact same year set the Dashboard's "Filter by year" bar shows — computed independently
// from the same underlying data, so it can be reused site-wide (e.g. the global search's year
// filter) without needing the full DashboardData payload.
//
// Server-only: reads the xlsx data files directly, so this must never be imported from a
// client component (unlike buildDashboardData.ts, which only takes already-loaded data in).
export function getAllYears(): number[] {
  const allPubs = [...publications, ...conferencePublications, ...bookPublications, ...otherPublications];
  const projects = [...getCompetitiveProjects(), ...getPrivateContracts()];
  const theses = [...getPhDTheses(), ...getMasterTheses(), ...getBachelorTheses(), ...getSupervisions()];
  return yearRange([
    ...allPubs.map((p) => p.year),
    ...projects.map((p) => p.startDate?.getFullYear()).filter((y): y is number => y != null),
    ...theses.map((t) => normalizeThesisYear(t.year)).filter((y): y is number => y != null),
  ]);
}
