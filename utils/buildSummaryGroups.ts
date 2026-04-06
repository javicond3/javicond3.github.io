import type { SearchableItem, SummaryGroups } from "@/components/SummaryCards";
import { extractYearRange, dateYearRange, YearRange } from "@/utils/extractYearRange";
import {
  pubSearchText,
  projectSearchText,
  thesisSearchText,
  courseSearchText,
  teachingProjectSearchText,
  externalCourseSearchText,
  visitSearchText,
  awardSearchText,
  lectureSearchText,
  eventSearchText,
  workingGroupSearchText,
  entrySearchText,
} from "@/utils/searchText";

export function toSearchable<T>(
  items: T[],
  searchText: (item: T) => string,
  yearRange?: (item: T) => YearRange | null,
  extra?: (item: T) => { category?: string; subcategory?: string; flag?: boolean; value?: number }
): SearchableItem[] {
  return items.map((item) => {
    const range = yearRange ? yearRange(item) : null;
    const { category, subcategory, flag, value } = extra
      ? extra(item)
      : { category: undefined, subcategory: undefined, flag: undefined, value: undefined };
    return { search: searchText(item), yearStart: range?.start, yearEnd: range?.end, category, subcategory, flag, value };
  });
}

const DURATION_UNIT_DAYS: Record<string, number> = {
  day: 1,
  days: 1,
  week: 7,
  weeks: 7,
  month: 30,
  months: 30,
  year: 365,
  years: 365,
};

export function parseDurationDays(duration?: string): number | undefined {
  if (!duration) return undefined;
  const match = duration.trim().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)/);
  if (!match) return undefined;
  const amount = parseFloat(match[1]);
  const unit = DURATION_UNIT_DAYS[match[2]];
  return unit ? Math.round(amount * unit) : undefined;
}

interface ProjectInput {
  title: string;
  funder: string;
  scope: string;
  tipo: string;
  isIP: boolean;
  startDate: Date | string | null;
  endDate: Date | string | null;
}

interface PublicationInput {
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

interface ThesisInput {
  title: string;
  author: string;
  degree?: string;
  year?: number | string;
  tipo: string;
}

interface AboutEntryInput {
  title: string;
  organization?: string;
  year?: string;
  note?: string;
}

interface VisitInput {
  title: string;
  location?: string;
  year?: number;
  duration?: string;
}

interface LectureInput {
  title: string;
  program?: string;
  location?: string;
  year?: string | number;
}

interface CourseYearHoursInput {
  label: string;
  startYear: number;
  hours: number;
}

interface CourseInput {
  title: string;
  program?: string;
  levelAndCourse?: string;
  centro?: string;
  year?: string;
  level?: 'BSc' | 'MSc';
  totalHours: number;
  hoursByYear: CourseYearHoursInput[];
}

interface TeachingProjectInput {
  title: string;
  funder?: string;
  year?: string;
  isPI: boolean;
}

interface ExternalCourseInput {
  title: string;
  program?: string;
  year?: string;
}

interface AwardInput {
  title: string;
  organization?: string;
  year?: string | number;
  tipo?: string;
}

interface EventInput {
  title: string;
  rol?: string;
  program?: string;
  location?: string;
  year?: string | number;
}

interface WorkingGroupInput {
  title: string;
  funder?: string;
  year?: string;
}

export interface SummaryGroupsInput {
  competitiveProjects: ProjectInput[];
  privateProjects: ProjectInput[];
  journals: PublicationInput[];
  conferences: PublicationInput[];
  books: PublicationInput[];
  otherPubs: PublicationInput[];
  sexenios: AboutEntryInput[];
  researchVisits: VisitInput[];
  phdTheses: ThesisInput[];
  bachelorTheses: ThesisInput[];
  masterTheses: ThesisInput[];
  supervisions: ThesisInput[];
  invitedLectures: LectureInput[];
  courses: CourseInput[];
  teachingProjects: TeachingProjectInput[];
  externalCourses: ExternalCourseInput[];
  awards: AwardInput[];
  events: EventInput[];
  workingGroups: WorkingGroupInput[];
}

export function buildSummaryGroups(data: SummaryGroupsInput): SummaryGroups {
  return {
    research: [
      {
        label: "Projects",
        flagLabel: "IP",
        applyProjectsFilter: true,
        items: toSearchable(
          [...data.competitiveProjects, ...data.privateProjects],
          projectSearchText,
          (p) => dateYearRange(p.startDate, p.endDate),
          (p) => ({
            category: p.tipo === "Competitive" ? "Competitive" : "Private",
            subcategory: p.scope || undefined,
            flag: p.isIP,
          })
        ),
      },
      {
        label: "Publications",
        sortChildren: true,
        chartCategories: ["Journal", "Conference"],
        applyPapersFilter: true,
        items: toSearchable(
          [...data.journals, ...data.conferences, ...data.books, ...data.otherPubs],
          pubSearchText,
          (p) => ({ start: p.year, end: p.year }),
          (p) => ({ category: p.type || "Other", subcategory: p.jcr || undefined })
        ),
      },
      { label: "Sexenios", items: toSearchable(data.sexenios, entrySearchText, (e) => extractYearRange(e.year)) },
      {
        label: "Research Visits",
        valueUnit: "days",
        items: toSearchable(data.researchVisits, visitSearchText, (v) => extractYearRange(v.year), (v) => ({ value: parseDurationDays(v.duration) })),
      },
      { label: "PhDs", items: toSearchable(data.phdTheses, thesisSearchText, (t) => extractYearRange(t.year)) },
    ],
    teaching: [
      {
        label: "Students Supervised",
        items: toSearchable(
          [...data.bachelorTheses, ...data.masterTheses, ...data.supervisions],
          thesisSearchText,
          (t) => extractYearRange(t.year),
          (t) => ({
            category:
              t.tipo === "Supervisor" ? "Scholarship" : t.tipo === "Bachelor" ? "Bachelor Thesis" : t.tipo === "Master" ? "Master Thesis" : t.tipo,
          })
        ),
      },
      { label: "Invited Lectures", items: toSearchable(data.invitedLectures, lectureSearchText, (l) => extractYearRange(l.year)) },
      {
        label: "Official Courses",
        sumValue: true,
        valueSuffix: "h",
        valueUnit: "hours",
        // One item per (course, academic year taught) — e.g. hours taught in "21-22" — rather than
        // lumping a course's total hours onto a single year, so the by-year chart is per academic course.
        items: data.courses.flatMap((c) =>
          c.hoursByYear.map((h) => ({
            search: courseSearchText(c),
            yearStart: h.startYear,
            yearEnd: h.startYear,
            yearLabel: h.label,
            category: c.level === "BSc" ? "Bachelor" : "Master",
            value: h.hours,
            groupKey: c.title,
          }))
        ),
      },
      {
        label: "Teaching Projects",
        flagLabel: "IP",
        items: toSearchable(data.teachingProjects, teachingProjectSearchText, (p) => extractYearRange(p.year), (p) => ({ flag: p.isPI })),
      },
      { label: "External Courses", items: toSearchable(data.externalCourses, externalCourseSearchText, (c) => extractYearRange(c.year)) },
    ],
    leadership: [
      {
        label: "Awards",
        items: toSearchable(data.awards, awardSearchText, (a) => extractYearRange(a.year), (a) => ({ category: a.tipo || undefined })),
      },
      { label: "Events", items: toSearchable(data.events, eventSearchText, (e) => extractYearRange(e.year)) },
      { label: "Institutional Roles", hideChart: true, items: toSearchable(data.workingGroups, workingGroupSearchText, (wg) => extractYearRange(wg.year)) },
    ],
  };
}
