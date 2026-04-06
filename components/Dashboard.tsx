"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  DashboardData,
  BreakdownRow,
  MoneyBreakdownRow,
  AxisChart,
  Category,
  PublicationRaw,
  ProjectRaw,
  computeAxisChart,
  breakdown as computeBreakdown,
  moneyBreakdown as computeMoneyBreakdown,
  topPublisherCategoriesOf,
  TYPE_COLORS,
  JCR_COLORS,
  CORE_COLORS,
  PROJECT_COLORS,
  CALL_TYPE_COLORS,
  CALL_TYPE_PALETTE,
} from "@/utils/buildDashboardData";
import { useSearch } from "./SearchContext";
import { JCR_QUARTILES, CORE_LIST, papersFilterMatch } from "@/utils/papersFilter";
import { projectsFilterMatch } from "@/utils/projectsFilter";

// Keeps every chart's horizontal scroll container in sync: scrolling one (by any
// fraction of its own scrollable range) applies that same fraction to all the others,
// so charts with different bar widths still end up showing "the same years".
interface ScrollSync {
  register: (el: HTMLDivElement) => () => void;
  sync: (source: HTMLDivElement) => void;
}
const ScrollSyncContext = createContext<ScrollSync | null>(null);

function useScrollSync(): ScrollSync {
  const elsRef = useRef<Set<HTMLDivElement>>(new Set());
  const syncingRef = useRef(false);
  const register = (el: HTMLDivElement) => {
    elsRef.current.add(el);
    return () => {
      elsRef.current.delete(el);
    };
  };
  const sync = (source: HTMLDivElement) => {
    if (syncingRef.current) return;
    const range = source.scrollWidth - source.clientWidth;
    const fraction = range > 0 ? source.scrollLeft / range : 0;
    syncingRef.current = true;
    elsRef.current.forEach((el) => {
      if (el === source) return;
      const otherRange = el.scrollWidth - el.clientWidth;
      el.scrollLeft = otherRange > 0 ? fraction * otherRange : 0;
    });
    syncingRef.current = false;
  };
  return { register, sync };
}

function formatCountTick(v: number): string {
  return String(v);
}

function formatYear(y: number): string {
  return String(y).slice(-2);
}

function formatMoneyTick(v: number): string {
  return v === 0 ? "€0" : `€${v / 1000}k`;
}

function formatMoneyAmount(v: number): string {
  return v > 0 ? `€${Math.round(v).toLocaleString("es-ES")}` : "€0";
}

// Derives the count-based donut for one or more active years, summing segments across every
// matching bar. Falls back to the overall (all-years) breakdown when no year is active.
function breakdownForYears(
  chart: AxisChart,
  years: number[],
  fallbackRows: BreakdownRow[],
  fallbackTotal: number
): { rows: BreakdownRow[]; total: number; totalLabel: string } {
  if (years.length === 0) return { rows: fallbackRows, total: fallbackTotal, totalLabel: `${fallbackTotal}` };
  const bars = chart.bars.filter((b) => years.includes(b.year));
  const byLabel = new Map<string, { value: number; color: string }>();
  bars.forEach((bar) =>
    bar.segments.forEach((seg) => {
      const cur = byLabel.get(seg.label) ?? { value: 0, color: seg.color };
      cur.value += seg.value;
      byLabel.set(seg.label, cur);
    })
  );
  const total = [...byLabel.values()].reduce((s, x) => s + x.value, 0);
  const rows: BreakdownRow[] = [...byLabel.entries()].map(([label, { value, color }]) => ({
    label,
    count: value,
    pct: Math.round((100 * value) / (total || 1)),
    color,
  }));
  return { rows, total, totalLabel: `${total}` };
}

// Same idea for the money-based donut.
function moneyBreakdownForYears(
  chart: AxisChart,
  years: number[],
  fallbackRows: MoneyBreakdownRow[],
  fallbackTotal: number
): { rows: MoneyBreakdownRow[]; total: number; totalLabel: string } {
  if (years.length === 0) return { rows: fallbackRows, total: fallbackTotal, totalLabel: formatMoneyAmount(fallbackTotal) };
  const bars = chart.bars.filter((b) => years.includes(b.year));
  const byLabel = new Map<string, { value: number; color: string }>();
  bars.forEach((bar) =>
    bar.segments.forEach((seg) => {
      const cur = byLabel.get(seg.label) ?? { value: 0, color: seg.color };
      cur.value += seg.value;
      byLabel.set(seg.label, cur);
    })
  );
  const total = [...byLabel.values()].reduce((s, x) => s + x.value, 0);
  const rows: MoneyBreakdownRow[] = [...byLabel.entries()].map(([label, { value, color }]) => ({
    label,
    amount: value,
    amountLabel: formatMoneyAmount(value),
    pct: Math.round((100 * value) / (total || 1)),
    color,
  }));
  return { rows, total, totalLabel: formatMoneyAmount(total) };
}

// --- Papers filter (Filter / JCR / CORE), same structure as the original dashboard prototype ---
// (JCR_QUARTILES, CORE_LIST and papersFilterMatch live in utils/papersFilter.ts so the site-wide
// search filter can apply the exact same rules to the publication list.)

function pubTypeCategories(): Category<PublicationRaw>[] {
  return [
    { label: "Journal", color: TYPE_COLORS.Journal, match: (p) => p.type === "Journal" },
    { label: "Conference", color: TYPE_COLORS.Conference, match: (p) => p.type === "Conference" },
    { label: "Book", color: TYPE_COLORS.Book, match: (p) => p.type === "Book" },
    { label: "Other", color: TYPE_COLORS.Other, match: (p) => p.type === "Other" },
  ];
}
function pubJcrCategories(): Category<PublicationRaw>[] {
  return [
    ...JCR_QUARTILES.map((q) => ({ label: q, color: JCR_COLORS[q], match: (p: PublicationRaw) => p.jcr === q })),
    { label: "No JCR", color: JCR_COLORS["No JCR"], match: (p) => !JCR_QUARTILES.includes(p.jcr) },
  ];
}
function pubCoreCategories(): Category<PublicationRaw>[] {
  return [
    ...CORE_LIST.map((label) => ({ label, color: CORE_COLORS[label], match: (p: PublicationRaw) => p.jcr === label })),
    { label: "No CORE", color: CORE_COLORS["No CORE"], match: (p) => !CORE_LIST.includes(p.jcr) },
  ];
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors whitespace-nowrap flex-shrink-0"
      style={
        active
          ? { backgroundColor: "#1c2d2d", color: "#fff", borderColor: "#1c2d2d" }
          : { backgroundColor: "#fff", color: "#5b6663", borderColor: "#dfe4e2" }
      }
    >
      {label}
    </button>
  );
}

function PapersFilterBar({ filters, onToggle, onClear }: { filters: string[]; onToggle: (f: string) => void; onClear: () => void }) {
  return (
    <div className="flex flex-col gap-2 mb-5 pb-4 border-b border-gray-100">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-bold text-gray-400 mr-0.5" style={{ width: 46 }}>Filter:</span>
        <FilterChip label="All papers" active={filters.length === 0} onClick={onClear} />
        {["Journal", "Conference", "Book"].map((f) => (
          <FilterChip key={f} label={f} active={filters.includes(f)} onClick={() => onToggle(f)} />
        ))}
        <span className="ml-auto text-[11px] text-gray-400 font-medium">
          {filters.length > 0 ? filters.join(" or ") : "All papers"}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-bold text-gray-400 mr-0.5" style={{ width: 46 }}>JCR:</span>
        {[...JCR_QUARTILES, "JCR-Other"].map((f) => (
          <FilterChip key={f} label={f === "JCR-Other" ? "Other" : f} active={filters.includes(f)} onClick={() => onToggle(f)} />
        ))}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-bold text-gray-400 mr-0.5" style={{ width: 46 }}>CORE:</span>
        {[...CORE_LIST, "CORE-Other"].map((f) => (
          <FilterChip key={f} label={f === "CORE-Other" ? "Other" : f} active={filters.includes(f)} onClick={() => onToggle(f)} />
        ))}
      </div>
    </div>
  );
}

// --- Projects filter (Filter / Call type + "I'm PI only"), same structure as the original dashboard prototype ---

function projectTypeCategories(): Category<ProjectRaw>[] {
  return [
    { label: "Competitive", color: PROJECT_COLORS.Competitive, match: (p) => p.tipo === "Competitive" },
    { label: "Private", color: PROJECT_COLORS.Private, match: (p) => p.tipo === "Private" },
  ];
}
function callTypeCategoriesOf(scopes: string[]): Category<ProjectRaw>[] {
  return [
    ...scopes.map((scope, i) => ({
      label: scope,
      color: CALL_TYPE_COLORS[scope] ?? CALL_TYPE_PALETTE[i % CALL_TYPE_PALETTE.length],
      match: (p: ProjectRaw) => p.tipo === "Competitive" && p.scope === scope,
    })),
    { label: "Private", color: PROJECT_COLORS.Private, match: (p) => p.tipo === "Private" },
  ];
}

function ProjectsFilterBar({
  filters,
  onToggle,
  onClear,
  scopes,
  ipOnly,
  onToggleIp,
}: {
  filters: string[];
  onToggle: (f: string) => void;
  onClear: () => void;
  scopes: string[];
  ipOnly: boolean;
  onToggleIp: () => void;
}) {
  return (
    <div className="mb-5 pb-4 border-b border-gray-100">
      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 mb-2 cursor-pointer w-fit">
        <input type="checkbox" checked={ipOnly} onChange={onToggleIp} className="accent-[#2ecfba] cursor-pointer" />
        PI
      </label>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-gray-400 mr-0.5" style={{ width: 46 }}>Filter:</span>
          <FilterChip label="All projects" active={filters.length === 0} onClick={onClear} />
          {["Competitive", "Private"].map((f) => (
            <FilterChip key={f} label={f} active={filters.includes(f)} onClick={() => onToggle(f)} />
          ))}
          <span className="ml-auto text-[11px] text-gray-400 font-medium">
            {filters.length > 0 ? filters.join(" or ") : "All projects"}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-gray-400 mr-0.5" style={{ width: 46 }}>Call type:</span>
          {scopes.map((f) => (
            <FilterChip key={f} label={f} active={filters.includes(f)} onClick={() => onToggle(f)} />
          ))}
        </div>
      </div>
    </div>
  );
}

const BAR_WIDTH = 26;

// Generic axis-based stacked bar chart: a left-hand tick scale plus bars that are
// guaranteed to fit their fixed-height row (every bar.totalPx <= chart.maxH by construction),
// so nothing is ever clipped, and a separate year-labels row that can't be clipped either.
function AxisBarChart({
  chart,
  selectedYears,
  hoveredYear,
  onHoverYear,
  onClickYear,
  formatTick,
  formatSegmentValue,
  barWidth = BAR_WIDTH,
}: {
  chart: AxisChart;
  selectedYears: number[];
  hoveredYear: number | null;
  onHoverYear: (y: number | null) => void;
  onClickYear: (y: number) => void;
  formatTick: (v: number) => string;
  formatSegmentValue: (v: number) => string;
  barWidth?: number;
}) {
  const { axisTicks, maxH } = chart;
  // A pinned year filter (top "Filter by year") removes non-matching columns entirely,
  // rather than just dimming them.
  const bars = selectedYears.length > 0 ? chart.bars.filter((b) => selectedYears.includes(b.year)) : chart.bars;
  const axisMaxVal = axisTicks[axisTicks.length - 1] || 1;
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollSync = useContext(ScrollSyncContext);

  // Start scrolled all the way to the right, so the most recent (real) years are visible
  // without the user having to scroll past mostly-empty leading years first.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [bars.length]);

  // Register with the shared scroll-sync group so scrolling this chart moves the rest too.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && scrollSync) return scrollSync.register(el);
  }, [scrollSync]);

  return (
    <div className="flex gap-2 pt-2">
      {/* Axis tick column — kept OUTSIDE the horizontally-scrolling area, so it never scrolls off screen. */}
      <div className="relative flex-shrink-0" style={{ width: 34, height: maxH }}>
        {axisTicks.map((t) => (
          <div
            key={t}
            className="absolute left-0 right-1 text-right text-[9px] font-semibold text-gray-400"
            style={{ bottom: (t / axisMaxVal) * maxH, transform: "translateY(50%)" }}
          >
            {formatTick(t)}
          </div>
        ))}
      </div>
      <div
        className="overflow-x-auto flex-1 min-w-0"
        ref={scrollRef}
        onScroll={() => {
          const el = scrollRef.current;
          if (el && scrollSync) scrollSync.sync(el);
        }}
      >
        {/* Bars row — fixed height; every bar.totalPx is <= maxH by construction, so nothing overflows. */}
        <div className="flex items-end gap-2" style={{ height: maxH }}>
          {bars.map((bar) => {
            const dimmed = hoveredYear != null && hoveredYear !== bar.year;
            return (
              <div
                key={bar.year}
                className="flex flex-col-reverse rounded-t-[3px] overflow-hidden flex-shrink-0 cursor-pointer transition-opacity"
                style={{ width: barWidth, height: bar.totalPx, opacity: dimmed ? 0.3 : 1 }}
                onMouseEnter={() => onHoverYear(bar.year)}
                onMouseLeave={() => onHoverYear(null)}
                onClick={() => onClickYear(bar.year)}
              >
                {bar.segments.map((seg) => (
                  <div
                    key={seg.label}
                    className="w-full"
                    style={{ height: seg.heightPx, backgroundColor: seg.color }}
                    title={`${seg.label}: ${formatSegmentValue(seg.value)}`}
                  />
                ))}
              </div>
            );
          })}
        </div>
        {/* Year labels row — separate from the fixed-height bars row, so it can never be clipped. */}
        <div className="flex gap-2 mt-1.5">
          {bars.map((bar) => (
            <div key={bar.year} className="text-[10px] text-gray-400 font-semibold text-center flex-shrink-0" style={{ width: barWidth }}>
              {formatYear(bar.year)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface YearInteraction {
  selectedYears: number[];
  hoveredYear: number | null;
  onHoverYear: (y: number | null) => void;
  onClickYear: (y: number) => void;
}

function CountBarChart({ chart, ...interaction }: { chart: AxisChart } & YearInteraction) {
  return <AxisBarChart chart={chart} {...interaction} formatTick={formatCountTick} formatSegmentValue={(v) => String(v)} />;
}

function FundingAxisChart({ chart, ...interaction }: { chart: AxisChart } & YearInteraction) {
  return (
    <AxisBarChart
      chart={chart}
      {...interaction}
      formatTick={formatMoneyTick}
      formatSegmentValue={(v) => `€${Math.round(v).toLocaleString("es-ES")}`}
      barWidth={32}
    />
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-3 mt-3">
      {items.map((l) => (
        <span key={l.label} className="flex items-center gap-1.5 text-[11px] text-gray-500 font-semibold">
          <span className="w-2 h-2 rounded-[2px] inline-block flex-shrink-0" style={{ backgroundColor: l.color }} />
          {l.label}
        </span>
      ))}
    </div>
  );
}

function DonutBreakdown({ rows, total, totalLabel }: { rows: BreakdownRow[]; total: number; totalLabel: string }) {
  let acc = 0;
  const stops = rows.map((r) => {
    const start = (acc / (total || 1)) * 360;
    acc += r.count;
    const end = (acc / (total || 1)) * 360;
    return `${r.color} ${start}deg ${end}deg`;
  });
  const gradient = stops.length ? `conic-gradient(${stops.join(",")})` : "#f0f1f0";

  return (
    <div className="flex flex-col items-center sm:items-start gap-4 sm:flex-row">
      <div
        className="w-20 h-20 rounded-full flex-shrink-0 relative"
        style={{ background: gradient }}
      >
        <div className="absolute inset-[6px] rounded-full bg-white flex items-center justify-center">
          <span className="text-[11px] font-bold" style={{ color: "#1c2d2d" }}>{totalLabel}</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 flex-1 w-full">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex justify-between text-[11px] font-semibold mb-1" style={{ color: "#3f4b49" }}>
              <span>{r.label}</span>
              <span>{r.count} ({r.pct}%)</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${r.pct}%`, backgroundColor: r.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MoneyDonutBreakdown({ rows, total, totalLabel }: { rows: MoneyBreakdownRow[]; total: number; totalLabel: string }) {
  let acc = 0;
  const stops = rows.map((r) => {
    const start = (acc / (total || 1)) * 360;
    acc += r.amount;
    const end = (acc / (total || 1)) * 360;
    return `${r.color} ${start}deg ${end}deg`;
  });
  const gradient = stops.length ? `conic-gradient(${stops.join(",")})` : "#f0f1f0";

  return (
    <div className="flex flex-col items-center sm:items-start gap-4 sm:flex-row">
      <div className="w-20 h-20 rounded-full flex-shrink-0 relative" style={{ background: gradient }}>
        <div className="absolute inset-[6px] rounded-full bg-white flex items-center justify-center px-1">
          <span className="text-[9px] font-bold text-center leading-tight" style={{ color: "#1c2d2d" }}>{totalLabel}</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 flex-1 w-full">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex justify-between text-[11px] font-semibold mb-1" style={{ color: "#3f4b49" }}>
              <span>{r.label}</span>
              <span>{r.amountLabel} ({r.pct}%)</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${r.pct}%`, backgroundColor: r.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Card({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold" style={{ color: "#1c2d2d" }}>{title}</h3>
        {right && <span className="text-xs text-gray-400 font-medium">{right}</span>}
      </div>
      {children}
    </div>
  );
}

export default function Dashboard({ data }: { data: DashboardData }) {
  const {
    selectedYears,
    toggleYear,
    clearYears,
    papersFilters,
    togglePapersFilter,
    clearPapersFilters,
    projectsFilters,
    toggleProjectsFilter,
    clearProjectsFilters,
    ipOnly,
    toggleIpOnly,
  } = useSearch();
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const activeYears = hoveredYear != null ? [hoveredYear] : selectedYears;
  const interaction: YearInteraction = {
    selectedYears,
    hoveredYear,
    onHoverYear: setHoveredYear,
    // Clicking a bar only previews that year in the donuts (same as hovering) — it does
    // not add/remove it from the "Filter by year" selection above.
    onClickYear: setHoveredYear,
  };
  const scrollSync = useScrollSync();

  return (
    <ScrollSyncContext.Provider value={scrollSync}>
    <section id="dashboard" className="scroll-mt-20 space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-gray-500 mr-1">Filter by year:</span>
        <button
          onClick={clearYears}
          className="px-3 py-1 rounded-full text-xs font-semibold border transition-colors"
          style={
            selectedYears.length === 0
              ? { backgroundColor: "#2ecfba", color: "#fff", borderColor: "#2ecfba" }
              : { backgroundColor: "#fff", color: "#5b6663", borderColor: "#e7eae8" }
          }
        >
          All years
        </button>
        {data.years.map((y) => (
          <button
            key={y}
            onClick={() => toggleYear(y)}
            className="px-3 py-1 rounded-full text-xs font-semibold border transition-colors"
            style={
              selectedYears.includes(y)
                ? { backgroundColor: "#2ecfba", color: "#fff", borderColor: "#2ecfba" }
                : { backgroundColor: "#fff", color: "#5b6663", borderColor: "#e7eae8" }
            }
          >
            {formatYear(y)}
          </button>
        ))}
      </div>

      {(() => {
        const filteredPubs = data.publicationsRaw.filter((p) => papersFilterMatch(p.type, p.jcr, papersFilters));
        const journalsFiltered = filteredPubs.filter((p) => p.type === "Journal");
        const conferencesFiltered = filteredPubs.filter((p) => p.type === "Conference");

        const publicationsChart = computeAxisChart(filteredPubs, (p) => p.year, () => 1, pubTypeCategories(), data.years, 90);
        const jcrChart = computeAxisChart(journalsFiltered, (p) => p.year, () => 1, pubJcrCategories(), data.years, 90);
        const coreChart = computeAxisChart(conferencesFiltered, (p) => p.year, () => 1, pubCoreCategories(), data.years, 90);
        const publisherCategories = topPublisherCategoriesOf(journalsFiltered, 5);

        const pubD = breakdownForYears(publicationsChart, activeYears, computeBreakdown(filteredPubs, pubTypeCategories()), filteredPubs.length);
        const jcrD = breakdownForYears(jcrChart, activeYears, computeBreakdown(journalsFiltered, pubJcrCategories()), journalsFiltered.length);
        const coreD = breakdownForYears(coreChart, activeYears, computeBreakdown(conferencesFiltered, pubCoreCategories()), conferencesFiltered.length);
        const journalsYearScoped = activeYears.length > 0 ? journalsFiltered.filter((p) => activeYears.includes(p.year)) : journalsFiltered;
        const publisherRows = computeBreakdown(journalsYearScoped, publisherCategories);

        const journalCounts = new Map<string, { name: string; count: number; publisher: string; jcr: string }>();
        journalsYearScoped.forEach((p) => {
          const name = (p.journal || "Unknown").trim();
          const key = name.toLowerCase();
          const cur = journalCounts.get(key) ?? { name, count: 0, publisher: p.publisher, jcr: p.jcr };
          cur.count += 1;
          if (!cur.jcr && p.jcr) cur.jcr = p.jcr;
          journalCounts.set(key, cur);
        });
        const journalList = [...journalCounts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

        return (
          <Card title="Publications">
            <PapersFilterBar filters={papersFilters} onToggle={togglePapersFilter} onClear={clearPapersFilters} />

            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 mb-6">
              <div className="min-w-0">
                <CountBarChart chart={publicationsChart} {...interaction} />
                <Legend items={data.publicationsLegend} />
              </div>
              <DonutBreakdown rows={pubD.rows} total={pubD.total} totalLabel={pubD.totalLabel} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 mb-6 pt-5 border-t border-gray-100">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Journal quality (JCR)</p>
                <CountBarChart chart={jcrChart} {...interaction} />
                <Legend items={pubJcrCategories().map((c) => ({ label: c.label, color: c.color }))} />
              </div>
              <DonutBreakdown rows={jcrD.rows} total={jcrD.total} totalLabel={jcrD.totalLabel} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 mb-6 pt-5 border-t border-gray-100">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Conference ranking (CORE)</p>
                <CountBarChart chart={coreChart} {...interaction} />
                <Legend items={pubCoreCategories().map((c) => ({ label: c.label, color: c.color }))} />
              </div>
              <DonutBreakdown rows={coreD.rows} total={coreD.total} totalLabel={coreD.totalLabel} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 pt-5 border-t border-gray-100">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Journals</p>
                <div className="max-h-64 overflow-y-auto pr-2 space-y-1.5">
                  {journalList.map((j) => (
                    <div key={j.name} className="text-[12px] text-gray-700 leading-snug">
                      {j.name} <span className="text-gray-400">({j.count})</span>
                      {j.publisher && <span className="text-gray-400"> [{j.publisher}]</span>}
                      {j.jcr && <span className="text-gray-400"> {j.jcr}</span>}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Journal publishers</p>
                <DonutBreakdown rows={publisherRows} total={journalsYearScoped.length} totalLabel={`${journalsYearScoped.length}`} />
              </div>
            </div>
          </Card>
        );
      })()}

      {(() => {
        const scopes = [...new Set(data.projectsRaw.filter((p) => p.tipo === "Competitive").map((p) => p.scope).filter(Boolean))];
        const baseProjects = ipOnly ? data.projectsRaw.filter((p) => p.isIP) : data.projectsRaw;
        const filteredProjects = baseProjects.filter((p) => projectsFilterMatch(p.tipo, p.scope, projectsFilters));

        const typeCats = projectTypeCategories();
        const callCats = callTypeCategoriesOf(scopes);

        const projectsChart = computeAxisChart(filteredProjects, (p) => p.year, () => 1, typeCats, data.years, 90);
        const callTypeChart = computeAxisChart(filteredProjects, (p) => p.year, () => 1, callCats, data.years, 90);
        const fundingChart = computeAxisChart(filteredProjects, (p) => p.year, (p) => p.money, callCats, data.years, 90, 500_000);

        const projD = breakdownForYears(projectsChart, activeYears, computeBreakdown(filteredProjects, typeCats), filteredProjects.length);
        const callD = breakdownForYears(callTypeChart, activeYears, computeBreakdown(filteredProjects, callCats), filteredProjects.length);
        const fundingFallback = computeMoneyBreakdown(filteredProjects, callCats, (p) => p.money);
        const fundD = moneyBreakdownForYears(fundingChart, activeYears, fundingFallback, filteredProjects.reduce((s, p) => s + p.money, 0));

        return (
          <Card title="Projects & funding">
            <ProjectsFilterBar
              filters={projectsFilters}
              onToggle={toggleProjectsFilter}
              onClear={clearProjectsFilters}
              scopes={scopes}
              ipOnly={ipOnly}
              onToggleIp={toggleIpOnly}
            />

            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 mb-6">
              <div className="min-w-0">
                <CountBarChart chart={projectsChart} {...interaction} />
                <Legend items={typeCats.map((c) => ({ label: c.label, color: c.color }))} />
              </div>
              <DonutBreakdown rows={projD.rows} total={projD.total} totalLabel={projD.totalLabel} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 mb-6 pt-5 border-t border-gray-100">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">By call type</p>
                <CountBarChart chart={callTypeChart} {...interaction} />
                <Legend items={callCats.map((c) => ({ label: c.label, color: c.color }))} />
              </div>
              <DonutBreakdown rows={callD.rows} total={callD.total} totalLabel={callD.totalLabel} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 pt-5 border-t border-gray-100">
              <div className="min-w-0">
                <div className="flex items-baseline justify-between mb-3">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Funding by year (*without private projects)</p>
                  <span className="text-xs text-gray-400 font-medium">{fundD.totalLabel} total</span>
                </div>
                <FundingAxisChart chart={fundingChart} {...interaction} />
                <Legend items={callCats.map((c) => ({ label: c.label, color: c.color }))} />
              </div>
              <MoneyDonutBreakdown rows={fundD.rows} total={fundD.total} totalLabel={fundD.totalLabel} />
            </div>
          </Card>
        );
      })()}
    </section>
    </ScrollSyncContext.Provider>
  );
}
