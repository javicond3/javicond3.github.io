import { normalizeSearchText } from "./normalizeSearch";

interface AboutEntryLike {
  title: string;
  organization?: string;
  year?: string;
  note?: string;
}

export function entrySearchText(entry: AboutEntryLike): string {
  return normalizeSearchText([entry.title, entry.organization, entry.year, entry.note].filter(Boolean).join(" "));
}

interface PublicationLike {
  title: string;
  authors: string;
  journal: string;
  year: number;
  location?: string;
  type?: string;
  doi?: string;
  jcr?: string;
  keywords?: string[];
}

export function pubSearchText(p: PublicationLike): string {
  return normalizeSearchText(
    [p.title, p.authors, p.journal, p.year, p.location, p.type, p.doi, p.jcr, p.keywords?.join(" ")]
      .filter(Boolean)
      .join(" ")
  );
}

interface ProjectLike {
  title: string;
  funder: string;
  scope: string;
}

export function projectSearchText(p: ProjectLike): string {
  return normalizeSearchText([p.title, p.funder, p.scope].filter(Boolean).join(" "));
}

interface SoftwareLike {
  title: string;
  description?: string;
}

export function softwareSearchText(p: SoftwareLike): string {
  return normalizeSearchText([p.title, p.description].filter(Boolean).join(" "));
}

interface ThesisLike {
  title: string;
  author: string;
  degree?: string;
  year?: number | string;
}

export function thesisSearchText(t: ThesisLike): string {
  return normalizeSearchText([t.title, t.author, t.degree, t.year].filter(Boolean).join(" "));
}

interface CourseLike {
  title: string;
  program?: string;
  levelAndCourse?: string;
  centro?: string;
  year?: string;
}

export function courseSearchText(c: CourseLike): string {
  return normalizeSearchText([c.title, c.program, c.levelAndCourse, c.centro, c.year].filter(Boolean).join(" "));
}

interface TeachingProjectLike {
  title: string;
  funder?: string;
  year?: string;
}

export function teachingProjectSearchText(p: TeachingProjectLike): string {
  return normalizeSearchText([p.title, p.funder, p.year].filter(Boolean).join(" "));
}

interface ExternalCourseLike {
  title: string;
  program?: string;
  year?: string;
}

export function externalCourseSearchText(c: ExternalCourseLike): string {
  return normalizeSearchText([c.title, c.program, c.year].filter(Boolean).join(" "));
}

interface VisitLike {
  title: string;
  location?: string;
  year?: number;
  duration?: string;
}

export function visitSearchText(v: VisitLike): string {
  return normalizeSearchText([v.title, v.location, v.year, v.duration].filter(Boolean).join(" "));
}

interface AwardLike {
  title: string;
  organization?: string;
  year?: string | number;
  tipo?: string;
}

export function awardSearchText(a: AwardLike): string {
  return normalizeSearchText([a.title, a.organization, a.year, a.tipo].filter(Boolean).join(" "));
}

interface LectureLike {
  title: string;
  program?: string;
  location?: string;
  year?: string | number;
}

export function lectureSearchText(l: LectureLike): string {
  return normalizeSearchText([l.title, l.program, l.location, l.year].filter(Boolean).join(" "));
}

interface EventLike {
  title: string;
  rol?: string;
  program?: string;
  location?: string;
  year?: string | number;
}

export function eventSearchText(e: EventLike): string {
  return normalizeSearchText([e.title, e.rol, e.program, e.location, e.year].filter(Boolean).join(" "));
}

interface WorkingGroupLike {
  title: string;
  funder?: string;
  year?: string;
}

export function workingGroupSearchText(wg: WorkingGroupLike): string {
  return normalizeSearchText([wg.title, wg.funder, wg.year].filter(Boolean).join(" "));
}
