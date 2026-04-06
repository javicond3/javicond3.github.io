import type { Publication } from "@/data/publications";
import type { Project, ProjectFunding } from "@/data/projects";
import type { Thesis } from "@/data/tutor";

export interface ChartSegment {
  label: string;
  value: number;
  color: string;
}

export interface YearBar {
  year: number;
  total: number;
  totalLabel: string;
  segments: ChartSegment[];
}

export interface BreakdownRow {
  label: string;
  count: number;
  pct: number;
  color: string;
}

export interface MoneyBreakdownRow {
  label: string;
  amount: number;
  amountLabel: string;
  pct: number;
  color: string;
}

export interface AxisBar {
  year: number;
  totalPx: number;
  segments: (ChartSegment & { heightPx: number })[];
}

export interface AxisChart {
  axisMax: number;
  axisTicks: number[];
  maxH: number;
  bars: AxisBar[];
}

// Kept as aliases so existing imports (e.g. FundingChart) keep working unchanged.
export type FundingBar = AxisBar;
export type FundingChart = AxisChart;

export interface Category<T> {
  label: string;
  color: string;
  match: (item: T) => boolean;
}

export function yearRange(years: number[]): number[] {
  const clean = years.filter((y): y is number => y != null && !isNaN(y) && y > 1900);
  if (clean.length === 0) return [];
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

function stackChart<T>(
  items: T[],
  getYear: (item: T) => number | undefined,
  getValue: (item: T) => number,
  categories: Category<T>[],
  years: number[],
  formatTotal: (n: number) => string
): YearBar[] {
  return years.map((year) => {
    const yearItems = items.filter((item) => getYear(item) === year);
    const total = yearItems.reduce((s, item) => s + getValue(item), 0);
    const segments = categories
      .map((cat) => ({
        label: cat.label,
        color: cat.color,
        value: yearItems.filter(cat.match).reduce((s, item) => s + getValue(item), 0),
      }))
      .filter((s) => s.value > 0);
    return { year, total, totalLabel: formatTotal(total), segments };
  });
}

// Rounds a step up to a "nice" 1/2/5 * 10^n value, e.g. 5, 10, 20, 50... instead of arbitrary numbers.
function niceStep(max: number, targetTicks = 5): number {
  if (max <= 0) return 1;
  const rawStep = max / targetTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  return Math.max(1, Math.round(step));
}

export function computeAxisChart<T>(
  items: T[],
  getYear: (item: T) => number | undefined,
  getValue: (item: T) => number,
  categories: Category<T>[],
  years: number[],
  maxH: number,
  axisStep?: number
): AxisChart {
  const totalsPerYear = years.map((y) => items.filter((i) => getYear(i) === y).reduce((s, i) => s + getValue(i), 0));
  const maxTotal = Math.max(...totalsPerYear, 0);
  const step = axisStep ?? niceStep(maxTotal);
  const axisMax = Math.max(step, Math.ceil(maxTotal / step) * step);
  const axisTicks: number[] = [];
  for (let v = 0; v <= axisMax + 1; v += step) axisTicks.push(v);

  const bars: AxisBar[] = years.map((year) => {
    const yearItems = items.filter((i) => getYear(i) === year);
    const total = yearItems.reduce((s, i) => s + getValue(i), 0);
    const totalPx = total > 0 ? Math.max(4, Math.round((total / axisMax) * maxH)) : 0;
    const segments = categories
      .map((cat) => {
        const value = yearItems.filter(cat.match).reduce((s, i) => s + getValue(i), 0);
        return { label: cat.label, color: cat.color, value, heightPx: total > 0 ? Math.max(value > 0 ? 2 : 0, Math.round((value / total) * totalPx)) : 0 };
      })
      .filter((s) => s.value > 0);
    return { year, totalPx, segments };
  });

  return { axisMax, axisTicks, maxH, bars };
}

export function breakdown<T>(items: T[], categories: Category<T>[]): BreakdownRow[] {
  const total = items.length || 1;
  return categories
    .map((cat) => {
      const count = items.filter(cat.match).length;
      return { label: cat.label, count, pct: Math.round((100 * count) / total), color: cat.color };
    })
    .filter((r) => r.count > 0);
}

export function moneyBreakdown<T>(items: T[], categories: Category<T>[], getAmount: (item: T) => number): MoneyBreakdownRow[] {
  const total = items.reduce((s, i) => s + getAmount(i), 0) || 1;
  return categories
    .map((cat) => {
      const amount = items.filter(cat.match).reduce((s, i) => s + getAmount(i), 0);
      return { label: cat.label, amount, amountLabel: moneyLabel(amount), pct: Math.round((100 * amount) / total), color: cat.color };
    })
    .filter((r) => r.amount > 0);
}

export interface PublicationRaw {
  year: number;
  type: "Journal" | "Conference" | "Book" | "Other";
  jcr: string;
  publisher: string;
  journal: string;
}

export interface ProjectRaw {
  year: number;
  tipo: "Competitive" | "Private";
  scope: string;
  isIP: boolean;
  money: number;
}

export interface DashboardData {
  years: number[];

  publicationsRaw: PublicationRaw[];
  projectsRaw: ProjectRaw[];

  publicationsTotal: number;
  publicationsChart: AxisChart;
  publicationsBreakdown: BreakdownRow[];
  publicationsLegend: { label: string; color: string }[];

  jcrTotal: number;
  jcrChart: AxisChart;
  jcrBreakdown: BreakdownRow[];

  coreTotal: number;
  coreChart: AxisChart;
  coreBreakdown: BreakdownRow[];

  publisherTotal: number;
  publisherBreakdown: BreakdownRow[];

  projectsTotal: number;
  projectsChart: AxisChart;
  projectsBreakdown: BreakdownRow[];
  projectsLegend: { label: string; color: string }[];

  callTypeChart: AxisChart;
  callTypeBreakdown: BreakdownRow[];
  callTypeLegend: { label: string; color: string }[];

  fundingTotalLabel: string;
  fundingLegend: { label: string; color: string }[];
  fundingChart: FundingChart;
  fundingBreakdown: MoneyBreakdownRow[];

  supervisionTotal: number;
  supervisionByYear: YearBar[];
  supervisionLegend: { label: string; color: string }[];
}

export const TYPE_COLORS = { Journal: "#2ecfba", Conference: "#1c2d2d", Book: "#eda100", Other: "#9ca3af" };
export const JCR_COLORS: Record<string, string> = { Q1: "#2a78d6", Q2: "#eb6834", Q3: "#1baf7a", Q4: "#eda100", "No JCR": "#c3c2b7" };
export const CORE_COLORS: Record<string, string> = {
  "CORE A*": "#2a78d6",
  "CORE A": "#1baf7a",
  "CORE B": "#eda100",
  "CORE C": "#eb6834",
  "CORE Multiconference": "#9ca3af",
  "No CORE": "#c3c2b7",
};
export const PUBLISHER_PALETTE = ["#2ecfba", "#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#9ca3af"];
export const PROJECT_COLORS = { Competitive: "#2ecfba", Private: "#1c2d2d" };
export const CALL_TYPE_COLORS: Record<string, string> = {
  European: "#2ecfba",
  National: "#2a78d6",
  Regional: "#eb6834",
  International: "#1baf7a",
  "European (Erasmus+)": "#eda100",
};
export const CALL_TYPE_PALETTE = ["#2ecfba", "#2a78d6", "#eb6834", "#1baf7a", "#eda100"];
const SUPERVISION_COLORS = { Bachelor: "#9ca3af", Master: "#2ecfba", PhD: "#1c2d2d", Scholarship: "#eda100" };

function normalizedPublisherOf(p: Publication): string {
  return p.publisher ? p.publisher.trim() : "Unknown";
}

function publisherLabels(journals: Publication[]): Map<string, string> {
  const counts = new Map<string, Map<string, number>>();
  journals.forEach((p) => {
    const raw = normalizedPublisherOf(p);
    const key = raw.toLowerCase();
    const variants = counts.get(key) ?? new Map<string, number>();
    variants.set(raw, (variants.get(raw) ?? 0) + 1);
    counts.set(key, variants);
  });
  const labels = new Map<string, string>();
  counts.forEach((variants, key) => {
    const best = [...variants.entries()].sort((a, b) => b[1] - a[1])[0][0];
    labels.set(key, best);
  });
  return labels;
}

function topPublisherCategories(journals: Publication[], n: number): Category<Publication>[] {
  const labelOf = publisherLabels(journals);
  const keyOf = (p: Publication) => normalizedPublisherOf(p).toLowerCase();
  const counts = new Map<string, number>();
  journals.forEach((p) => counts.set(keyOf(p), (counts.get(keyOf(p)) ?? 0) + 1));
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([key]) => key);
  const cats: Category<Publication>[] = top.map((key, i) => ({
    label: labelOf.get(key) ?? key,
    color: PUBLISHER_PALETTE[i % PUBLISHER_PALETTE.length],
    match: (p) => keyOf(p) === key,
  }));
  cats.push({ label: "Other", color: "#c3c2b7", match: (p) => !top.includes(keyOf(p)) });
  return cats;
}

// Generic version reusable client-side on already-canonicalized { publisher } records.
export function topPublisherCategoriesOf<T extends { publisher: string }>(items: T[], n: number): Category<T>[] {
  const keyOf = (p: T) => p.publisher || "Unknown";
  const counts = new Map<string, number>();
  items.forEach((p) => counts.set(keyOf(p), (counts.get(keyOf(p)) ?? 0) + 1));
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([key]) => key);
  const cats: Category<T>[] = top.map((key, i) => ({
    label: key,
    color: PUBLISHER_PALETTE[i % PUBLISHER_PALETTE.length],
    match: (p) => keyOf(p) === key,
  }));
  cats.push({ label: "Other", color: "#c3c2b7", match: (p) => !top.includes(keyOf(p)) });
  return cats;
}

function moneyLabel(amount: number): string {
  return amount > 0 ? `€${Math.round(amount).toLocaleString("es-ES")}` : "";
}

const FUNDING_AXIS_STEP = 500_000;

function computeFundingChart(
  items: (ProjectFunding & { __year?: number })[],
  categories: Category<ProjectFunding>[],
  years: number[]
): FundingChart {
  return computeAxisChart(items, (i) => i.__year, (i) => i.money, categories, years, 90, FUNDING_AXIS_STEP);
}

export function buildDashboardData(params: {
  journals: Publication[];
  conferences: Publication[];
  books: Publication[];
  otherPubs: Publication[];
  competitiveProjects: Project[];
  privateProjects: Project[];
  projectsFunding: ProjectFunding[];
  phdTheses: Thesis[];
  masterTheses: Thesis[];
  bachelorTheses: Thesis[];
  supervisions: Thesis[];
}): DashboardData {
  const {
    journals, conferences, books, otherPubs,
    competitiveProjects, privateProjects, projectsFunding,
    phdTheses, masterTheses, bachelorTheses, supervisions,
  } = params;

  const allPubs = [...journals, ...conferences, ...books, ...otherPubs].map((p) => ({ ...p, __group: p as Publication }));
  const pubTypeOf = (p: Publication): keyof typeof TYPE_COLORS =>
    p.type === "Journal" ? "Journal" : p.type === "Conference" ? "Conference" : p.type === "Book" ? "Book" : "Other";

  const journalPublisherLabelOf = publisherLabels(journals);
  const publicationsRaw: PublicationRaw[] = allPubs.map((p) => ({
    year: p.year,
    type: pubTypeOf(p),
    jcr: p.jcr ?? "",
    publisher: pubTypeOf(p) === "Journal" ? journalPublisherLabelOf.get(normalizedPublisherOf(p).toLowerCase()) ?? normalizedPublisherOf(p) : "",
    journal: p.journal ?? "",
  }));

  const projects = [
    ...competitiveProjects.map((p) => ({ ...p, __year: p.startDate?.getFullYear() })),
    ...privateProjects.map((p) => ({ ...p, __year: p.startDate?.getFullYear() })),
  ];

  const allTheses = [
    ...bachelorTheses.map((t) => ({ ...t, __year: normalizeThesisYear(t.year) })),
    ...masterTheses.map((t) => ({ ...t, __year: normalizeThesisYear(t.year) })),
    ...phdTheses.map((t) => ({ ...t, __year: normalizeThesisYear(t.year) })),
    ...supervisions.map((t) => ({ ...t, __year: normalizeThesisYear(t.year) })),
  ];

  const years = yearRange([
    ...allPubs.map((p) => p.year),
    ...projects.map((p) => p.__year).filter((y): y is number => y != null),
    ...allTheses.map((t) => t.__year).filter((y): y is number => y != null),
  ]);

  const pubCategories: Category<Publication>[] = [
    { label: "Journal", color: TYPE_COLORS.Journal, match: (p) => pubTypeOf(p) === "Journal" },
    { label: "Conference", color: TYPE_COLORS.Conference, match: (p) => pubTypeOf(p) === "Conference" },
    { label: "Book", color: TYPE_COLORS.Book, match: (p) => pubTypeOf(p) === "Book" },
    { label: "Other", color: TYPE_COLORS.Other, match: (p) => pubTypeOf(p) === "Other" },
  ];

  const jcrQuartiles = ["Q1", "Q2", "Q3", "Q4"];
  const jcrCategories: Category<Publication>[] = [
    ...jcrQuartiles.map((q) => ({ label: q, color: JCR_COLORS[q], match: (p: Publication) => p.jcr === q })),
    { label: "No JCR", color: JCR_COLORS["No JCR"], match: (p) => !jcrQuartiles.includes(p.jcr ?? "") },
  ];

  const coreRanks = Object.keys(CORE_COLORS).filter((k) => k !== "No CORE");
  const coreCategories: Category<Publication>[] = [
    ...coreRanks.map((label) => ({ label, color: CORE_COLORS[label], match: (p: Publication) => p.jcr === label })),
    { label: "No CORE", color: CORE_COLORS["No CORE"], match: (p) => !coreRanks.includes(p.jcr ?? "") },
  ];

  const projectCategories: Category<Project & { __year?: number }>[] = [
    { label: "Competitive", color: PROJECT_COLORS.Competitive, match: (p) => p.tipo === "Competitive" },
    { label: "Private", color: PROJECT_COLORS.Private, match: (p) => p.tipo === "Private" },
  ];

  const scopes: string[] = [];
  competitiveProjects.forEach((p) => {
    if (p.scope && !scopes.includes(p.scope)) scopes.push(p.scope);
  });
  const callTypeCategories: Category<Project & { __year?: number }>[] = [
    ...scopes.map((scope, i) => ({
      label: scope,
      color: CALL_TYPE_COLORS[scope] ?? CALL_TYPE_PALETTE[i % CALL_TYPE_PALETTE.length],
      match: (p: Project) => p.tipo === "Competitive" && p.scope === scope,
    })),
    { label: "Private", color: PROJECT_COLORS.Private, match: (p) => p.tipo === "Private" },
  ];

  const supervisionCategories: Category<Thesis & { __year?: number }>[] = [
    { label: "Bachelor", color: SUPERVISION_COLORS.Bachelor, match: (t) => t.tipo === "Bachelor" },
    { label: "Master", color: SUPERVISION_COLORS.Master, match: (t) => t.tipo === "Master" },
    { label: "PhD", color: SUPERVISION_COLORS.PhD, match: (t) => t.tipo === "PhD" },
    { label: "Scholarship", color: SUPERVISION_COLORS.Scholarship, match: (t) => t.tipo === "Supervisor" },
  ];

  const fundedProjects = projectsFunding.map((p) => ({ ...p, __year: p.startDate?.getFullYear() }));
  const totalFunding = fundedProjects.reduce((s, p) => s + p.money, 0);

  const projectsRaw: ProjectRaw[] = projectsFunding
    .map((p) => ({ year: p.startDate?.getFullYear(), tipo: p.tipo, scope: p.scope, isIP: p.isIP, money: p.money }))
    .filter((p): p is ProjectRaw => p.year != null);

  const fundingCallTypeCategories: Category<ProjectFunding>[] = [
    ...scopes.map((scope, i) => ({
      label: scope,
      color: CALL_TYPE_COLORS[scope] ?? CALL_TYPE_PALETTE[i % CALL_TYPE_PALETTE.length],
      match: (p: ProjectFunding) => p.tipo === "Competitive" && p.scope === scope,
    })),
    { label: "Private", color: PROJECT_COLORS.Private, match: (p) => p.tipo === "Private" },
  ];

  return {
    years,

    publicationsRaw,
    projectsRaw,

    publicationsTotal: allPubs.length,
    publicationsChart: computeAxisChart(allPubs, (p) => p.year, () => 1, pubCategories, years, 90),
    publicationsBreakdown: breakdown(allPubs, pubCategories),
    publicationsLegend: pubCategories.map((c) => ({ label: c.label, color: c.color })),

    jcrTotal: journals.length,
    jcrChart: computeAxisChart(journals, (p) => p.year, () => 1, jcrCategories, years, 90),
    jcrBreakdown: breakdown(journals, jcrCategories),

    coreTotal: conferences.length,
    coreChart: computeAxisChart(conferences, (p) => p.year, () => 1, coreCategories, years, 90),
    coreBreakdown: breakdown(conferences, coreCategories),

    publisherTotal: journals.length,
    publisherBreakdown: breakdown(journals, topPublisherCategories(journals, 5)),

    projectsTotal: projects.length,
    projectsChart: computeAxisChart(projects, (p) => p.__year, () => 1, projectCategories, years, 90),
    projectsBreakdown: breakdown(projects, projectCategories),
    projectsLegend: projectCategories.map((c) => ({ label: c.label, color: c.color })),

    callTypeChart: computeAxisChart(projects, (p) => p.__year, () => 1, callTypeCategories, years, 90),
    callTypeBreakdown: breakdown(projects, callTypeCategories),
    callTypeLegend: callTypeCategories.map((c) => ({ label: c.label, color: c.color })),

    fundingTotalLabel: moneyLabel(totalFunding),
    fundingLegend: fundingCallTypeCategories.map((c) => ({ label: c.label, color: c.color })),
    fundingChart: computeFundingChart(fundedProjects, fundingCallTypeCategories, years),
    fundingBreakdown: moneyBreakdown(fundedProjects, fundingCallTypeCategories, (p) => p.money),

    supervisionTotal: allTheses.length,
    supervisionByYear: stackChart(allTheses, (t) => t.__year, () => 1, supervisionCategories, years, (n) => String(n)),
    supervisionLegend: supervisionCategories.map((c) => ({ label: c.label, color: c.color })),
  };
}

export function normalizeThesisYear(year: string | number | undefined): number | undefined {
  if (year == null) return undefined;
  if (typeof year === "number") return year;
  const m = String(year).match(/(\d{4})/);
  return m ? parseInt(m[1], 10) : undefined;
}

