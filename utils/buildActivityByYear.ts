import { extractYearRange, dateYearRange } from "@/utils/extractYearRange";

export interface YearSeriesData {
  label: string;
  color: string;
  values: number[];
}

export interface YearChartData {
  years: number[];
  series: YearSeriesData[];
}

export interface YearValueData {
  years: number[];
  values: number[];
}

interface PublicationInput {
  year: number;
  jcr?: string;
}

interface ProjectInput {
  startDate: Date | string | null;
  endDate: Date | string | null;
  isIP: boolean;
  money?: number;
}

interface LectureInput {
  year?: string | number;
}

export interface ActivityInput {
  journals: PublicationInput[];
  conferences: PublicationInput[];
  books: PublicationInput[];
  otherPubs: PublicationInput[];
  competitiveProjects: ProjectInput[];
  privateProjects: ProjectInput[];
  invitedLectures: LectureInput[];
}

export interface ActivityByYear {
  publicationsByJcr: YearChartData;
  projectsByIP: YearChartData;
  fundingByYear: YearValueData;
  talksByYear: YearValueData;
}

// First two slots of the validated categorical palette (blue/orange), kept in
// their documented CVD-safe adjacent order, plus aqua/yellow for Q3/Q4.
const JCR_ORDER = ["Q1", "Q2", "Q3", "Q4", "No JCR"];
const JCR_COLORS: Record<string, string> = {
  Q1: "#2a78d6",
  Q2: "#eb6834",
  Q3: "#1baf7a",
  Q4: "#eda100",
  "No JCR": "#c3c2b7",
};

function startYearOf(p: ProjectInput): number | null {
  const range = dateYearRange(p.startDate, p.endDate);
  return range ? range.start : null;
}

const emptyChart: ActivityByYear = {
  publicationsByJcr: { years: [], series: [] },
  projectsByIP: { years: [], series: [] },
  fundingByYear: { years: [], values: [] },
  talksByYear: { years: [], values: [] },
};

export function buildActivityByYear(data: ActivityInput): ActivityByYear {
  const allPubs = [...data.journals, ...data.conferences, ...data.books, ...data.otherPubs];
  const allProjects = [...data.competitiveProjects, ...data.privateProjects];

  const pubYears = allPubs.map((p) => p.year).filter((y): y is number => !!y);
  const projYears = allProjects.map(startYearOf).filter((y): y is number => y != null);
  const talkYears = data.invitedLectures.map((l) => extractYearRange(l.year)?.start).filter((y): y is number => y != null);

  const allYears = [...pubYears, ...projYears, ...talkYears];
  if (allYears.length === 0) return emptyChart;

  const minYear = Math.min(...allYears);
  const maxYear = Math.max(...allYears);
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

  const jcrOf = (p: PublicationInput): string => (p.jcr && JCR_ORDER.includes(p.jcr) ? p.jcr : "No JCR");
  const publicationsByJcr: YearChartData = {
    years,
    series: JCR_ORDER.map((cat) => ({
      label: cat,
      color: JCR_COLORS[cat],
      values: years.map((y) => allPubs.filter((p) => p.year === y && jcrOf(p) === cat).length),
    })).filter((s) => s.values.some((v) => v > 0)),
  };

  const projectsByIP: YearChartData = {
    years,
    series: [
      { label: "IP", color: "#2ecfba", values: years.map((y) => allProjects.filter((p) => startYearOf(p) === y && p.isIP).length) },
      { label: "Non-IP", color: "#9ca3af", values: years.map((y) => allProjects.filter((p) => startYearOf(p) === y && !p.isIP).length) },
    ].filter((s) => s.values.some((v) => v > 0)),
  };

  const fundingByYear: YearValueData = {
    years,
    values: years.map((y) => allProjects.filter((p) => startYearOf(p) === y).reduce((sum, p) => sum + (p.money ?? 0), 0)),
  };

  const talksByYear: YearValueData = {
    years,
    values: years.map((y) => data.invitedLectures.filter((l) => extractYearRange(l.year)?.start === y).length),
  };

  return { publicationsByJcr, projectsByIP, fundingByYear, talksByYear };
}
