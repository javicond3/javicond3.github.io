export interface YearRange {
  start: number;
  end: number;
}

const ONGOING_REGEX = /today|present|ongoing|actualidad/i;
const ONGOING_YEAR = new Date().getFullYear();

export function extractYearRange(value: string | number | null | undefined): YearRange | null {
  if (value == null) return null;

  if (typeof value === "number") {
    return Number.isNaN(value) ? null : { start: value, end: value };
  }

  const text = String(value);
  const matches = text.match(/\d{4}/g);
  if (!matches || matches.length === 0) return null;

  const nums = matches.map(Number);
  const start = Math.min(...nums);
  const end = ONGOING_REGEX.test(text) ? ONGOING_YEAR : Math.max(...nums);
  return { start, end };
}

export function yearDataAttrs(range: YearRange | null): Record<string, number> {
  return range ? { "data-year-start": range.start, "data-year-end": range.end } : {};
}

export function dateYearRange(startDate: Date | string | null, endDate: Date | string | null): YearRange | null {
  const toDate = (d: Date | string | null): Date | null => (d ? (typeof d === "string" ? new Date(d) : d) : null);
  const start = toDate(startDate);
  const end = toDate(endDate);
  const startYear = start ? start.getFullYear() : null;
  const endYear = end ? end.getFullYear() : null;

  if (startYear == null && endYear == null) return null;
  if (startYear != null && endYear == null) return { start: startYear, end: ONGOING_YEAR };
  if (startYear == null && endYear != null) return { start: endYear, end: endYear };
  return { start: Math.min(startYear!, endYear!), end: Math.max(startYear!, endYear!) };
}
