"use client";

import { useEffect, useRef, useState } from "react";
import { useSearch } from "./SearchContext";
import { yearRangeMatchesSelection } from "@/utils/yearOverlap";
import { papersFilterMatch } from "@/utils/papersFilter";
import { projectsFilterMatch } from "@/utils/projectsFilter";
import { normalizeSearchText } from "@/utils/normalizeSearch";

export interface SearchableItem {
  search: string;
  yearStart?: number;
  yearEnd?: number;
  category?: string;
  subcategory?: string;
  flag?: boolean;
  value?: number;
  // Overrides the auto-generated 2-digit year label in the "by year" chart,
  // e.g. "21-22" for an academic year instead of just "21".
  yearLabel?: string;
  // Identifies the underlying entity when items are exploded into several rows (e.g. one
  // course split into one row per academic year taught) — used to count distinct entities.
  groupKey?: string;
}

export interface StatSource {
  label: string;
  items: SearchableItem[];
  flagLabel?: string;
  sortChildren?: boolean;
  valueUnit?: string;
  chartCategories?: string[];
  // When set, the pill/breakdown show a parenthetical sum of item.value (e.g. "(572h)") next to
  // the count. The count itself is the number of distinct groupKey values if items carry one,
  // otherwise falls back to the plain item count.
  sumValue?: boolean;
  valueSuffix?: string;
  // Suppresses the "by year" chart in this pill's hover popup.
  hideChart?: boolean;
  // Also filters items by the shared "papers" Filter/JCR/CORE selection (item.category is the
  // paper type, item.subcategory is its JCR/CORE value) — set on the Publications source so it
  // stays in sync with the Dashboard's Publications filter bar.
  applyPapersFilter?: boolean;
  // Same idea for the shared Projects Filter/Call-type/"I'm PI only" selection (item.category is
  // Competitive/Private, item.subcategory is the call scope, item.flag is isIP).
  applyProjectsFilter?: boolean;
}

export interface SummaryGroups {
  research: StatSource[];
  teaching: StatSource[];
  leadership: StatSource[];
}

interface BreakdownNode {
  label: string;
  count: number;
  paren?: string;
  flagCount?: number;
  children?: BreakdownNode[];
}

function matchesFilter(item: SearchableItem, normalized: string, selectedYears: number[]): boolean {
  const textMatch = normalized === "" || item.search.includes(normalized);
  let yearMatch = true;
  if (selectedYears.length > 0 && item.yearStart != null && item.yearEnd != null) {
    yearMatch = yearRangeMatchesSelection(item.yearStart, item.yearEnd, selectedYears);
  }
  return textMatch && yearMatch;
}

function filterItems(items: SearchableItem[], normalized: string, selectedYears: number[]): SearchableItem[] {
  if (normalized === "" && selectedYears.length === 0) return items;
  return items.filter((item) => matchesFilter(item, normalized, selectedYears));
}

function groupBy(items: SearchableItem[], key: "category" | "subcategory"): { label: string; items: SearchableItem[] }[] {
  const order: string[] = [];
  const groups = new Map<string, SearchableItem[]>();
  items.forEach((item) => {
    const label = item[key];
    if (!label) return;
    if (!groups.has(label)) {
      order.push(label);
      groups.set(label, []);
    }
    groups.get(label)!.push(item);
  });
  return order.map((label) => ({ label, items: groups.get(label)! }));
}

interface YearSeriesBucket {
  year: number;
  label: string;
  counts: number[];
}

interface YearSeries {
  categories: string[];
  buckets: YearSeriesBucket[];
}

const SEGMENT_OPACITIES = [1, 0.55, 0.32, 0.2, 0.12];

function computeYearSeries(items: SearchableItem[], stackKey: "category" | "flag" | null): YearSeries {
  const withYear = items
    .map((item) => ({ item, year: item.yearStart ?? item.yearEnd }))
    .filter((x): x is { item: SearchableItem; year: number } => x.year != null);
  if (withYear.length === 0) return { categories: [], buckets: [] };

  const getCat = (item: SearchableItem): string =>
    stackKey === "category" ? item.category ?? "Other" : stackKey === "flag" ? (item.flag ? "IP" : "Non-IP") : "Total";

  const categories: string[] = [];
  withYear.forEach(({ item }) => {
    const cat = getCat(item);
    if (!categories.includes(cat)) categories.push(cat);
  });

  const minYear = Math.min(...withYear.map((x) => x.year));
  const maxYear = Math.max(...withYear.map((x) => x.year));

  const buckets: YearSeriesBucket[] = [];
  for (let y = minYear; y <= maxYear; y++) {
    const yearItems = withYear.filter((x) => x.year === y);
    const counts = categories.map((cat) =>
      yearItems.filter((x) => getCat(x.item) === cat).reduce((sum, x) => sum + (x.item.value ?? 1), 0)
    );
    const label = yearItems.find((x) => x.item.yearLabel)?.item.yearLabel ?? String(y).slice(2);
    buckets.push({ year: y, label, counts });
  }
  return { categories, buckets };
}

function YearStackChart({ series, color, valueUnit }: { series: YearSeries; color: string; valueUnit?: string }) {
  const { categories, buckets } = series;
  if (buckets.length === 0) return null;
  const totals = buckets.map((b) => b.counts.reduce((s, c) => s + c, 0));
  const max = Math.max(...totals, 1);
  const barBoxH = 96;

  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wide">
        By year{valueUnit ? ` (${valueUnit})` : ""}
      </p>
      <div className="overflow-x-auto">
        {/* No fixed height here: each column's natural height (total label + bar + year label) is
            let to grow freely, so the total label above the bar is never clipped. barBoxH is only
            used below to scale bar pixel heights. */}
        <div className="flex items-end gap-1">
          {buckets.map((b) => {
            const total = b.counts.reduce((s, c) => s + c, 0);
            const totalPx = total > 0 ? Math.max(6, Math.round((total / max) * barBoxH)) : 0;

            // Largest-remainder rounding so segment pixel heights sum exactly to totalPx.
            const raw = b.counts.map((c) => (total > 0 ? (c / total) * totalPx : 0));
            const floors = raw.map(Math.floor);
            let remainder = totalPx - floors.reduce((s, v) => s + v, 0);
            const order = raw
              .map((v, idx) => ({ idx, frac: v - Math.floor(v) }))
              .sort((a, b2) => b2.frac - a.frac);
            const px = [...floors];
            for (const { idx } of order) {
              if (remainder <= 0) break;
              if (b.counts[idx] > 0) {
                px[idx] += 1;
                remainder -= 1;
              }
            }

            return (
              <div key={b.year} className="flex flex-col items-center flex-shrink-0" style={{ width: 22 }}>
                <span className="text-[9px] font-bold leading-none mb-1 tabular-nums" style={{ color }}>
                  {total > 0 ? total : ""}
                </span>
                <div className="w-full flex flex-col-reverse rounded-t-[3px] overflow-hidden" style={{ height: totalPx }}>
                  {b.counts.map(
                    (c, idx) =>
                      c > 0 && (
                        <div
                          key={idx}
                          className="w-full"
                          style={{ height: px[idx], backgroundColor: color, opacity: SEGMENT_OPACITIES[idx] ?? 0.15 }}
                        />
                      )
                  )}
                </div>
                {b.label.includes("-") ? (
                  <span className="flex flex-col items-center leading-tight text-[8px] text-gray-400 mt-1">
                    <span>{b.label.split("-")[0]}</span>
                    <span>{b.label.split("-")[1]}</span>
                  </span>
                ) : (
                  <span className="text-[8px] text-gray-400 mt-1">{b.label}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-x-2 gap-y-1 mt-2">
          {categories.map((cat, idx) => (
            <span key={cat} className="flex items-center gap-1 text-[9px] text-gray-500 whitespace-nowrap">
              <span
                className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                style={{ backgroundColor: color, opacity: SEGMENT_OPACITIES[idx] ?? 0.15 }}
              />
              {cat}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function sumOf(items: SearchableItem[]): number {
  return items.reduce((s, i) => s + (i.value ?? 1), 0);
}

// Number of distinct entities: counts unique groupKey values when items carry one
// (e.g. one course exploded into several per-academic-year rows), else plain item count.
function distinctCount(items: SearchableItem[]): number {
  if (items.length === 0) return 0;
  if (items.every((i) => i.groupKey == null)) return items.length;
  return new Set(items.map((i) => i.groupKey)).size;
}

function computeBreakdown(items: SearchableItem[], hasFlag: boolean, sortChildren: boolean, sumValue?: boolean, valueSuffix?: string): BreakdownNode[] {
  return groupBy(items, "category").map(({ label, items: catItems }) => {
    let children = groupBy(catItems, "subcategory").map(({ label: subLabel, items: subItems }) => ({
      label: subLabel,
      count: distinctCount(subItems),
      paren: sumValue ? `${sumOf(subItems)}${valueSuffix ?? ""}` : undefined,
      flagCount: hasFlag ? subItems.filter((i) => i.flag).length : undefined,
    }));
    if (sortChildren) children = [...children].sort((a, b) => a.label.localeCompare(b.label));
    return {
      label,
      count: distinctCount(catItems),
      paren: sumValue ? `${sumOf(catItems)}${valueSuffix ?? ""}` : undefined,
      flagCount: hasFlag ? catItems.filter((i) => i.flag).length : undefined,
      children: children.length > 0 ? children : undefined,
    };
  });
}

function BreakdownPill({ node, textColor, borderColor, tint, small }: { node: BreakdownNode; textColor: string; borderColor: string; tint: string; small?: boolean }) {
  return (
    <span
      className={`rounded-full font-medium border whitespace-nowrap ${small ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]"}`}
      style={{ backgroundColor: small ? "#ffffff" : tint, color: textColor, borderColor: small ? "#d1d5db" : borderColor }}
    >
      {node.count} {node.label}
      {node.paren ? ` (${node.paren})` : ""}
      {node.flagCount != null && node.flagCount > 0 ? ` (${node.flagCount} IP)` : ""}
    </span>
  );
}

interface SummaryPillProps {
  label: string;
  count: number;
  paren?: string;
  breakdown: BreakdownNode[];
  yearSeries: YearSeries;
  valueUnit?: string;
  flagLabel?: string;
  flagCount?: number;
  textColor: string;
  borderColor: string;
  tint: string;
  hideChart?: boolean;
}

function SummaryPill({ label, count, paren, breakdown, yearSeries, valueUnit, flagLabel, flagCount, textColor, borderColor, tint, hideChart }: SummaryPillProps) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hasDetails = breakdown.length > 0 || (!hideChart && yearSeries.buckets.length > 0);
  const visible = hasDetails && (open || hovered);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        role={hasDetails ? "button" : undefined}
        tabIndex={hasDetails ? 0 : undefined}
        onClick={() => hasDetails && setOpen((v) => !v)}
        className={`px-3 py-1 rounded-full text-xs font-semibold border select-none ${hasDetails ? "cursor-pointer" : ""}`}
        style={{ backgroundColor: tint, color: textColor, borderColor }}
      >
        {count} {label}
        {paren ? ` (${paren})` : ""}
        {flagLabel != null && flagCount != null && flagCount > 0 ? ` (${flagCount} ${flagLabel})` : ""}
      </span>

      {visible && (
        <div
          className="absolute left-0 top-full mt-2 z-20 min-w-[200px] max-w-[min(320px,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
        >

          <p className="text-xs font-bold text-gray-700 mb-2 whitespace-nowrap">
            {label} ({count}{paren ? `, ${paren}` : ""})
          </p>
          {breakdown.length > 0 && (
            <div className="space-y-2 mb-3">
              {breakdown.map((node) => (
                <div key={node.label}>
                  <BreakdownPill node={node} textColor={textColor} borderColor={borderColor} tint={tint} />
                  {node.children && (
                    <div className="flex flex-wrap gap-1 mt-1 ml-2">
                      {node.children.map((child) => (
                        <BreakdownPill key={child.label} node={child} textColor={textColor} borderColor={borderColor} tint={tint} small />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {!hideChart && <YearStackChart series={yearSeries} color={borderColor} valueUnit={valueUnit} />}
        </div>
      )}
    </div>
  );
}

function SummaryGroupRow({
  textColor, borderColor, tint, sources,
}: { textColor: string; borderColor: string; tint: string; sources: StatSource[] }) {
  const { query, selectedYears, papersFilters, projectsFilters, ipOnly } = useSearch();
  const normalized = normalizeSearchText(query);

  return (
    <div className="flex flex-wrap gap-2">
      {sources.map((source) => {
        let visible = filterItems(source.items, normalized, selectedYears);
        if (source.applyPapersFilter && papersFilters.length > 0) {
          visible = visible.filter((i) => papersFilterMatch(i.category ?? "", i.subcategory ?? "", papersFilters));
        }
        if (source.applyProjectsFilter) {
          if (ipOnly) visible = visible.filter((i) => i.flag);
          if (projectsFilters.length > 0) {
            visible = visible.filter((i) => projectsFilterMatch(i.category ?? "", i.subcategory ?? "", projectsFilters));
          }
        }
        const hasFlag = source.flagLabel != null;
        const breakdown = computeBreakdown(visible, hasFlag, source.sortChildren ?? false, source.sumValue, source.valueSuffix);
        const stackKey: "category" | "flag" | null = visible.some((i) => i.category) ? "category" : hasFlag ? "flag" : null;
        const chartItems = source.chartCategories
          ? visible.filter((i) => i.category != null && source.chartCategories!.includes(i.category))
          : visible;
        const yearSeries = computeYearSeries(chartItems, stackKey);
        const flagCount = hasFlag ? visible.filter((i) => i.flag).length : undefined;
        return (
          <SummaryPill
            key={source.label}
            label={source.label}
            count={distinctCount(visible)}
            paren={source.sumValue ? `${sumOf(visible)}${source.valueSuffix ?? ""}` : undefined}
            breakdown={breakdown}
            yearSeries={yearSeries}
            valueUnit={source.valueUnit}
            hideChart={source.hideChart}
            flagLabel={source.flagLabel}
            flagCount={flagCount}
            textColor={textColor}
            borderColor={borderColor}
            tint={tint}
          />
        );
      })}
    </div>
  );
}

export default function SummaryCards({ groups }: { groups: SummaryGroups }) {
  return (
    <div className="flex flex-col gap-2">
      <SummaryGroupRow textColor="#1c2d2d" borderColor="#2ecfba" tint="#f0fdfa" sources={groups.research} />
      <SummaryGroupRow textColor="#1c2d2d" borderColor="#1c2d2d" tint="#f4f4f5" sources={groups.teaching} />
      <SummaryGroupRow textColor="#854d0e" borderColor="#854d0e" tint="#fef9c3" sources={groups.leadership} />
    </div>
  );
}
