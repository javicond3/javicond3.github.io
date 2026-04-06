// True when [start, end] contains at least one of the selected years (an empty
// selection means "no filter", so everything matches).
export function yearRangeMatchesSelection(start: number, end: number, selectedYears: number[]): boolean {
  if (selectedYears.length === 0) return true;
  return selectedYears.some((y) => end >= y && start <= y);
}
