"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { saveAs } from "file-saver";
import { generateCVBlob } from "@/utils/cvDocx";
import { yearRangeMatchesSelection } from "@/utils/yearOverlap";
import { papersFilterMatch } from "@/utils/papersFilter";
import { projectsFilterMatch } from "@/utils/projectsFilter";
import type { CVData } from "@/types/cv";
import BioSection from "./BioSection";
import SummaryCards from "./SummaryCards";
import Dashboard from "./Dashboard";
import { buildSummaryGroups } from "@/utils/buildSummaryGroups";
import EntryCard from "./EntryCard";
import PublicationCard from "./PublicationCard";
import ProjectCard from "./ProjectCard";
import SoftwareCard from "./SoftwareCard";
import WorkingGroupCard from "./WorkingGroupCard";
import RegularCourseCard from "./RegularCourseCard";
import TeachingProjectCard from "./TeachingProjectCard";
import ThesisCard from "./ThesisCard";
import ExternalCourseCard from "./ExternalCourseCard";
import VisitCard from "./VisitCard";
import AwardCard from "./AwardCard";
import LectureCard from "./LectureCard";
import EventCard from "./EventCard";
import { SelectableProps } from "./EntryBullet";
import { extractYearRange, dateYearRange, yearDataAttrs, YearRange } from "@/utils/extractYearRange";
import { normalizeSearchText } from "@/utils/normalizeSearch";
import { useSearch } from "./SearchContext";
import {
  entrySearchText,
  pubSearchText,
  projectSearchText,
  softwareSearchText,
  thesisSearchText,
  courseSearchText,
  teachingProjectSearchText,
  externalCourseSearchText,
  visitSearchText,
  awardSearchText,
  lectureSearchText,
  eventSearchText,
  workingGroupSearchText,
} from "@/utils/searchText";

// ─── Key helpers ────────────────────────────────────────────────────────────
// Keys follow the exact `${prefix}-${index}` scheme expected by generateCVBlob.

function keysFor(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}-${i}`);
}

type CheckState = "checked" | "unchecked" | "indeterminate";

function getGroupState(keys: string[], selected: Set<string>): CheckState {
  if (keys.length === 0) return "unchecked";
  const checkedCount = keys.filter((k) => selected.has(k)).length;
  if (checkedCount === 0) return "unchecked";
  if (checkedCount === keys.length) return "checked";
  return "indeterminate";
}

// ─── Search/year-aware group info ──────────────────────────────────────────
// Mirrors the filtering logic in SearchBar.tsx so header counts reflect what's
// currently visible, not just the raw total.

interface GroupInfo {
  keys: string[];
  state: CheckState;
  selectedCount: number;
  total: number;
}

function groupInfo<T>(
  items: T[],
  prefix: string,
  selected: Set<string>,
  searchTextFn: (item: T) => string,
  yearRangeFn: ((item: T) => YearRange | null) | undefined,
  normalizedQuery: string,
  selectedYears: number[],
  extraMatchFn?: (item: T) => boolean
): GroupInfo {
  const keys = items
    .map((item, idx) => {
      const textMatch = normalizedQuery === "" || searchTextFn(item).includes(normalizedQuery);
      let yearMatch = true;
      if (selectedYears.length > 0) {
        const range = yearRangeFn ? yearRangeFn(item) : null;
        if (range) {
          yearMatch = yearRangeMatchesSelection(range.start, range.end, selectedYears);
        }
      }
      const extraMatch = extraMatchFn ? extraMatchFn(item) : true;
      return textMatch && yearMatch && extraMatch ? `${prefix}-${idx}` : null;
    })
    .filter((k): k is string => k != null);

  return {
    keys,
    state: getGroupState(keys, selected),
    selectedCount: keys.filter((k) => selected.has(k)).length,
    total: keys.length,
  };
}

function combineGroups(selected: Set<string>, ...groups: GroupInfo[]): GroupInfo {
  const keys = groups.flatMap((g) => g.keys);
  return {
    keys,
    state: getGroupState(keys, selected),
    selectedCount: keys.filter((k) => selected.has(k)).length,
    total: keys.length,
  };
}

// ─── Shared selection controls ──────────────────────────────────────────────

function SelectAllCheckbox({ state, onChange, label }: { state: CheckState; onChange: () => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === "indeterminate";
  }, [state]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={state === "checked"}
      onChange={onChange}
      aria-label={`Select all: ${label}`}
      className="w-4 h-4 rounded cursor-pointer flex-shrink-0"
      style={{ accentColor: "#2ecfba" }}
    />
  );
}

function CountPill({ selected, total }: { selected: number; total: number }) {
  return (
    <span
      className="text-xs rounded-full px-1.5 py-0.5 ml-2 font-mono align-middle"
      style={{
        backgroundColor: selected === total ? "#d1faf4" : selected === 0 ? "#f3f4f6" : "#fef9c3",
        color: selected === total ? "#065f46" : selected === 0 ? "#6b7280" : "#854d0e",
      }}
    >
      {selected}/{total}
    </span>
  );
}

function ExpandButton({ expanded, onClick, label }: { expanded: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
      aria-expanded={expanded}
      onClick={onClick}
      className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-[#2ecfba] hover:bg-[#f0fdfa] transition-colors flex-shrink-0"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 transition-transform ${expanded ? "rotate-90" : ""}`}>
        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L10.94 10 7.23 6.29a.75.75 0 1 1 1.06-1.06l4.24 4.24a.75.75 0 0 1 0 1.06l-4.24 4.24a.75.75 0 0 1-1.08 0Z" clipRule="evenodd" />
      </svg>
    </button>
  );
}

// ─── H1 / H2 / H3 headers (mirrors app/page.tsx typography) ────────────────

function H1Header({
  label, state, onSelectAll, expanded, onToggleExpand, selectedCount, total,
}: {
  label: string; state: CheckState; onSelectAll: () => void;
  expanded: boolean; onToggleExpand: () => void; selectedCount: number; total: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <SelectAllCheckbox state={state} onChange={onSelectAll} label={label} />
      <button
        onClick={onToggleExpand}
        aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
        className="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold leading-none select-none hover:brightness-110 transition-all"
        style={{ backgroundColor: '#1c2d2d', fontSize: "1.4rem", lineHeight: 1 }}
      >
        {expanded ? "−" : "+"}
      </button>
      <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: '#1c2d2d' }}>
        {label}
        <CountPill selected={selectedCount} total={total} />
      </h1>
    </div>
  );
}

function H2Header({
  label, state, onSelectAll, expanded, onToggleExpand, selectedCount, total, className,
}: {
  label: string; state: CheckState; onSelectAll: () => void;
  expanded: boolean; onToggleExpand: () => void; selectedCount: number; total: number; className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 mb-3 ${className ?? ""}`}>
      <SelectAllCheckbox state={state} onChange={onSelectAll} label={label} />
      <ExpandButton expanded={expanded} onClick={onToggleExpand} label={label} />
      <h2 className="text-2xl font-bold" style={{ color: '#2ecfba' }}>
        {label}
        <CountPill selected={selectedCount} total={total} />
      </h2>
    </div>
  );
}

function H3Header({
  label, state, onSelectAll, expanded, onToggleExpand, selectedCount, total,
}: {
  label: string; state: CheckState; onSelectAll: () => void;
  expanded: boolean; onToggleExpand: () => void; selectedCount: number; total: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <SelectAllCheckbox state={state} onChange={onSelectAll} label={label} />
      <ExpandButton expanded={expanded} onClick={onToggleExpand} label={label} />
      <h3 className="text-lg font-semibold" style={{ color: '#2ecfba' }}>
        {label}
        <CountPill selected={selectedCount} total={total} />
      </h3>
    </div>
  );
}

// ─── Generic entry list (bullet/checkbox + hr dividers, like the main site) ─

function EntryList<T extends { id: string }>({
  items, prefix, selected, onToggle, renderCard, searchText, yearRange, sortDescBy, extraAttrs,
}: {
  items: T[];
  prefix: string;
  selected: Set<string>;
  onToggle: (key: string) => void;
  renderCard: (item: T, selectable: SelectableProps) => React.ReactNode;
  searchText?: (item: T) => string;
  yearRange?: (item: T) => YearRange | null;
  sortDescBy?: (item: T) => number | null | undefined;
  // Extra data-* attributes (e.g. data-pub-type) picked up by SearchBar.tsx's filtering effect,
  // so the Dashboard's Publications/Projects filter bars also hide/show these list items.
  extraAttrs?: (item: T) => Record<string, string>;
}) {
  // Key indices always refer to the original (unsorted) array position, so
  // selection stays correctly mapped for generateCVBlob regardless of display order.
  const ordered = items.map((item, idx) => ({ item, idx }));
  if (sortDescBy) {
    ordered.sort((a, b) => {
      const va = sortDescBy(a.item);
      const vb = sortDescBy(b.item);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return vb - va;
    });
  }

  return (
    <div>
      {ordered.map(({ item, idx }, pos) => {
        const key = `${prefix}-${idx}`;
        const attrs: Record<string, string | number> = {};
        if (searchText) attrs["data-search"] = searchText(item);
        if (yearRange) Object.assign(attrs, yearDataAttrs(yearRange(item)));
        if (extraAttrs) Object.assign(attrs, extraAttrs(item));
        return (
          <div key={item.id} {...attrs}>
            {pos > 0 && <hr className="my-4 border-gray-200" />}
            {renderCard(item, { checked: selected.has(key), onToggle: () => onToggle(key) })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main CVBuilder ──────────────────────────────────────────────────────────

interface CVBuilderProps {
  cvData: CVData;
}

export default function CVBuilder({ cvData }: CVBuilderProps) {
  const { query, selectedYears, papersFilters, projectsFilters, ipOnly } = useSearch();
  const normalizedQuery = normalizeSearchText(query);

  const hasReviewer =
    cvData.reviewerData.journals.length > 0 ||
    cvData.reviewerData.books.length > 0 ||
    cvData.reviewerData.conferences.length > 0;

  const allKeys = [
    "bio",
    ...keysFor("journal", cvData.journals.length),
    ...keysFor("conference", cvData.conferences.length),
    ...keysFor("book", cvData.books.length),
    ...keysFor("other", cvData.otherPubs.length),
    ...(hasReviewer ? ["reviewer"] : []),
    ...keysFor("competitive", cvData.competitive.length),
    ...keysFor("private", cvData.private.length),
    ...keysFor("software", cvData.software.length),
    ...keysFor("wg-project", cvData.workingGroups.length),
    ...keysFor("course", cvData.courses.length),
    ...keysFor("tproject", cvData.teachingProjects.length),
    ...keysFor("phd", cvData.phdTheses.length),
    ...keysFor("master", cvData.masterTheses.length),
    ...keysFor("bachelor", cvData.bachelorTheses.length),
    ...keysFor("supervision", cvData.supervisions.length),
    ...keysFor("extcourse", cvData.externalCourses.length),
    ...keysFor("position", cvData.positions.length),
    ...keysFor("institutional", cvData.institutionalRoles.length),
    ...keysFor("education", cvData.education.length),
    ...keysFor("certificate", cvData.certificates.length),
    ...keysFor("award", cvData.awards.length),
    ...keysFor("visit", cvData.researchVisits.length),
    ...keysFor("wg-intl", cvData.workingGroups.length),
    ...keysFor("lecture", cvData.invitedLectures.length),
    ...keysFor("event", cvData.events.length),
  ];

  const [selected, setSelected] = useState<Set<string>>(new Set(allKeys));
  // Tracks collapsed section ids; everything is expanded by default (like the main site).
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isExpanded = useCallback((id: string) => !collapsed.has(id), [collapsed]);
  const toggleExpand = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Expand everything once a search starts, so matches inside collapsed sections become visible.
  useEffect(() => {
    const expandAll = () => setCollapsed(new Set());
    window.addEventListener("app-search-start", expandAll);
    return () => window.removeEventListener("app-search-start", expandAll);
  }, []);

  const handleToggleItem = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleToggleItems = useCallback((keys: string[], force: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (force) keys.forEach((k) => next.add(k));
      else keys.forEach((k) => next.delete(k));
      return next;
    });
  }, []);

  const handleSelectAll = () => setSelected(new Set(allKeys));
  const handleDeselectAll = () => setSelected(new Set());

  const handleGenerate = async () => {
    if (selected.size === 0) {
      setError("Please select at least one item.");
      return;
    }
    setError(null);
    setGenerating(true);
    try {
      const blob = await generateCVBlob(Array.from(selected), cvData);
      saveAs(blob, "javier-conde-cv.docx");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate CV.");
    } finally {
      setGenerating(false);
    }
  };

  // Per-subsection info: keys/state/counts, all aware of the active search + year filter.
  const gi = <T,>(
    items: T[],
    prefix: string,
    searchFn: (item: T) => string,
    yearFn?: (item: T) => YearRange | null,
    extraMatchFn?: (item: T) => boolean
  ) => groupInfo(items, prefix, selected, searchFn, yearFn, normalizedQuery, selectedYears, extraMatchFn);

  const positionInfo = gi(cvData.positions, "position", entrySearchText, (e) => extractYearRange(e.year));
  const institutionalInfo = gi(cvData.institutionalRoles, "institutional", entrySearchText, (e) => extractYearRange(e.year));
  const educationInfo = gi(cvData.education, "education", entrySearchText, (e) => extractYearRange(e.year));
  const certificateInfo = gi(cvData.certificates, "certificate", entrySearchText, (e) => extractYearRange(e.year));

  const papersMatchFn = (p: { type: string; jcr?: string }) => papersFilterMatch(p.type, p.jcr ?? "", papersFilters);
  const journalInfo = gi(cvData.journals, "journal", pubSearchText, (p) => extractYearRange(p.year), papersMatchFn);
  const conferenceInfo = gi(cvData.conferences, "conference", pubSearchText, (p) => extractYearRange(p.year), papersMatchFn);
  const bookInfo = gi(cvData.books, "book", pubSearchText, (p) => extractYearRange(p.year), papersMatchFn);
  const otherInfo = gi(cvData.otherPubs, "other", pubSearchText, (p) => extractYearRange(p.year), papersMatchFn);

  const projectsMatchFn = (p: { tipo: string; scope: string; isIP: boolean }) =>
    (!ipOnly || p.isIP) && projectsFilterMatch(p.tipo, p.scope, projectsFilters);
  const competitiveInfo = gi(cvData.competitive, "competitive", projectSearchText, (p) => dateYearRange(p.startDate, p.endDate), projectsMatchFn);
  const privateInfo = gi(cvData.private, "private", projectSearchText, (p) => dateYearRange(p.startDate, p.endDate), projectsMatchFn);
  const softwareInfo = gi(cvData.software, "software", softwareSearchText);
  const wgProjectInfo = gi(cvData.workingGroups, "wg-project", workingGroupSearchText, (wg) => extractYearRange(wg.year));

  const courseInfo = gi(cvData.courses, "course", courseSearchText, (c) => extractYearRange(c.year));
  const tprojectInfo = gi(cvData.teachingProjects, "tproject", teachingProjectSearchText, (p) => extractYearRange(p.year));
  const phdInfo = gi(cvData.phdTheses, "phd", thesisSearchText, (t) => extractYearRange(t.year));
  const masterInfo = gi(cvData.masterTheses, "master", thesisSearchText, (t) => extractYearRange(t.year));
  const bachelorInfo = gi(cvData.bachelorTheses, "bachelor", thesisSearchText, (t) => extractYearRange(t.year));
  const supervisionEntryInfo = gi(cvData.supervisions, "supervision", thesisSearchText, (t) => extractYearRange(t.year));
  const extcourseInfo = gi(cvData.externalCourses, "extcourse", externalCourseSearchText, (c) => extractYearRange(c.year));

  const visitInfo = gi(cvData.researchVisits, "visit", visitSearchText, (v) => extractYearRange(v.year));
  const awardInfo = gi(cvData.awards, "award", awardSearchText, (a) => extractYearRange(a.year));
  const wgIntlInfo = gi(cvData.workingGroups, "wg-intl", workingGroupSearchText, (wg) => extractYearRange(wg.year));
  const lectureInfo = gi(cvData.invitedLectures, "lecture", lectureSearchText, (l) => extractYearRange(l.year));
  const eventInfo = gi(cvData.events, "event", eventSearchText, (e) => extractYearRange(e.year));

  const reviewerSearchTextValue = normalizeSearchText(
    ["reviewer", ...cvData.reviewerData.journals, ...cvData.reviewerData.books, ...cvData.reviewerData.conferences].join(" ")
  );
  const reviewerVisible = hasReviewer && (normalizedQuery === "" || reviewerSearchTextValue.includes(normalizedQuery));
  const reviewerKeys = reviewerVisible ? ["reviewer"] : [];

  // H1-level aggregates (for the top select-all checkbox of each group)
  const aboutGroup = combineGroups(selected, positionInfo, institutionalInfo, educationInfo, certificateInfo);
  const pubsGroupKeys = [...journalInfo.keys, ...conferenceInfo.keys, ...bookInfo.keys, ...otherInfo.keys, ...reviewerKeys];
  const pubsGroup: GroupInfo = {
    keys: pubsGroupKeys,
    state: getGroupState(pubsGroupKeys, selected),
    selectedCount: pubsGroupKeys.filter((k) => selected.has(k)).length,
    total: pubsGroupKeys.length,
  };
  const projectsGroup = combineGroups(selected, competitiveInfo, privateInfo, softwareInfo, wgProjectInfo);
  const supervisionGroup = combineGroups(selected, phdInfo, masterInfo, bachelorInfo, supervisionEntryInfo);
  const teachingGroup = combineGroups(selected, courseInfo, tprojectInfo, supervisionGroup, extcourseInfo);
  const internationalGroup = combineGroups(selected, visitInfo, awardInfo, wgIntlInfo, lectureInfo, eventInfo);

  const badges = ["Artificial Intelligence", "Educational Technology", "Digital Twins", "Linked Open Data", "Edge Computing"];

  const summaryGroups = buildSummaryGroups({
    competitiveProjects: cvData.competitive,
    privateProjects: cvData.private,
    journals: cvData.journals,
    conferences: cvData.conferences,
    books: cvData.books,
    otherPubs: cvData.otherPubs,
    sexenios: cvData.certificates.filter((c) => c.tipo.toLowerCase().startsWith("sexenio")),
    researchVisits: cvData.researchVisits,
    phdTheses: cvData.phdTheses,
    bachelorTheses: cvData.bachelorTheses,
    masterTheses: cvData.masterTheses,
    supervisions: cvData.supervisions,
    invitedLectures: cvData.invitedLectures,
    courses: cvData.courses,
    teachingProjects: cvData.teachingProjects,
    externalCourses: cvData.externalCourses,
    awards: cvData.awards,
    events: cvData.events,
    workingGroups: cvData.workingGroups,
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fffe" }}>
      <main id="main-content" className="px-6 lg:px-24 py-10 w-full space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Generate CV</h1>
          <p className="text-sm text-gray-500">
            Select the items to include, then click Generate. The page below mirrors your public profile.
          </p>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-3 sticky top-0 z-30 bg-[#f8fffe]/95 backdrop-blur-sm py-3 -mx-6 lg:-mx-24 px-6 lg:px-24 border-b border-gray-100">
          <button
            onClick={handleGenerate}
            disabled={generating || selected.size === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50 shadow-md"
            style={{ backgroundColor: "#2ecfba", color: "#1c2d2d" }}
          >
            {generating ? (
              <>
                <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Generating…
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                  <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                </svg>
                Generate Word
              </>
            )}
          </button>

          <button
            onClick={handleSelectAll}
            className="px-3 py-2 rounded-lg text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:border-[#2ecfba] hover:text-[#2ecfba] transition-colors"
          >
            Select All
          </button>
          <button
            onClick={handleDeselectAll}
            className="px-3 py-2 rounded-lg text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:border-gray-400 transition-colors"
          >
            Deselect All
          </button>

          <span className="text-xs text-gray-400 ml-auto">
            {selected.size} / {allKeys.length} items selected
          </span>
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── About / Bio ──────────────────────────────────────────────── */}
        <section className="scroll-mt-20 flex flex-col sm:flex-row gap-8 items-start">
          <div className="flex-shrink-0 flex flex-col items-center gap-2">
            <input
              type="checkbox"
              checked={selected.has("bio")}
              onChange={() => handleToggleItem("bio")}
              aria-label="Include Bio paragraph"
              className="w-4 h-4 rounded cursor-pointer"
              style={{ accentColor: "#2ecfba" }}
            />
            <Image
              src="/avatar.jpg"
              alt="Javier Conde"
              width={150}
              height={150}
              className="w-40 h-40 rounded-full object-cover shadow-md ring-2 ring-[#2ecfba]"
            />
          </div>

          <div className="flex-1 space-y-3">
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Javier Conde</h1>
            <p className="text-base text-gray-500 font-medium">
              Associate Professor · Universidad Politécnica de Madrid
            </p>
            <BioSection stats={cvData.bioStats} />
            <div className="flex flex-wrap gap-2 pt-1">
              {badges.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-xs font-semibold border"
                  style={{ backgroundColor: '#f0fdfa', color: '#1c2d2d', borderColor: '#2ecfba' }}
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="pt-1">
              <SummaryCards groups={summaryGroups} />
            </div>
          </div>
        </section>

        {/* ── Dashboard ─────────────────────────────────────────────────── */}
        <Dashboard data={cvData.dashboardData} />

        {/* ── Position and Education ───────────────────────────────────── */}
        <div className="pb-6 border-b border-gray-100">
          <H1Header
            label="Position and Education"
            state={aboutGroup.state}
            onSelectAll={() => handleToggleItems(aboutGroup.keys, aboutGroup.state !== "checked")}
            expanded={isExpanded("about")}
            onToggleExpand={() => toggleExpand("about")}
            selectedCount={aboutGroup.selectedCount}
            total={aboutGroup.total}
          />
          {isExpanded("about") && (
            <div className="mt-6 space-y-8">
              {cvData.positions.length > 0 && (
                <section data-search-group>
                  <H2Header
                    label="Position"
                    state={positionInfo.state}
                    onSelectAll={() => handleToggleItems(positionInfo.keys, positionInfo.state !== "checked")}
                    expanded={isExpanded("about:position")}
                    onToggleExpand={() => toggleExpand("about:position")}
                    selectedCount={positionInfo.selectedCount}
                    total={positionInfo.total}
                  />
                  {isExpanded("about:position") && (
                    <EntryList items={cvData.positions} prefix="position" selected={selected} onToggle={handleToggleItem}
              searchText={entrySearchText}
              yearRange={(e) => extractYearRange(e.year)}
                      renderCard={(e, sel) => <EntryCard entry={e} selectable={sel} />} />
                  )}
                </section>
              )}

              {cvData.institutionalRoles.length > 0 && (
                <section data-search-group>
                  <H2Header
                    label="Other Institutional Roles"
                    state={institutionalInfo.state}
                    onSelectAll={() => handleToggleItems(institutionalInfo.keys, institutionalInfo.state !== "checked")}
                    expanded={isExpanded("about:institutional")}
                    onToggleExpand={() => toggleExpand("about:institutional")}
                    selectedCount={institutionalInfo.selectedCount}
                    total={institutionalInfo.total}
                  />
                  {isExpanded("about:institutional") && (
                    <EntryList items={cvData.institutionalRoles} prefix="institutional" selected={selected} onToggle={handleToggleItem}
              searchText={entrySearchText}
              yearRange={(e) => extractYearRange(e.year)}
                      renderCard={(e, sel) => <EntryCard entry={e} selectable={sel} />} />
                  )}
                </section>
              )}

              {cvData.education.length > 0 && (
                <section data-search-group>
                  <H2Header
                    label="Education"
                    state={educationInfo.state}
                    onSelectAll={() => handleToggleItems(educationInfo.keys, educationInfo.state !== "checked")}
                    expanded={isExpanded("about:education")}
                    onToggleExpand={() => toggleExpand("about:education")}
                    selectedCount={educationInfo.selectedCount}
                    total={educationInfo.total}
                  />
                  {isExpanded("about:education") && (
                    <EntryList items={cvData.education} prefix="education" selected={selected} onToggle={handleToggleItem}
              searchText={entrySearchText}
              yearRange={(e) => extractYearRange(e.year)}
                      renderCard={(e, sel) => <EntryCard entry={e} selectable={sel} />} />
                  )}
                </section>
              )}

              {cvData.certificates.length > 0 && (
                <section data-search-group>
                  <H2Header
                    label="Certificates"
                    state={certificateInfo.state}
                    onSelectAll={() => handleToggleItems(certificateInfo.keys, certificateInfo.state !== "checked")}
                    expanded={isExpanded("about:certificate")}
                    onToggleExpand={() => toggleExpand("about:certificate")}
                    selectedCount={certificateInfo.selectedCount}
                    total={certificateInfo.total}
                  />
                  {isExpanded("about:certificate") && (
                    <EntryList items={cvData.certificates} prefix="certificate" selected={selected} onToggle={handleToggleItem}
              searchText={entrySearchText}
              yearRange={(e) => extractYearRange(e.year)}
                      renderCard={(e, sel) => <EntryCard entry={e} selectable={sel} />} />
                  )}
                </section>
              )}
            </div>
          )}
        </div>

        {/* ── Publications ──────────────────────────────────────────────── */}
        <div className="pb-6 border-b border-gray-100">
          <H1Header
            label="Publications"
            state={pubsGroup.state}
            onSelectAll={() => handleToggleItems(pubsGroup.keys, pubsGroup.state !== "checked")}
            expanded={isExpanded("publications")}
            onToggleExpand={() => toggleExpand("publications")}
            selectedCount={pubsGroup.selectedCount}
            total={pubsGroup.total}
          />
          {isExpanded("publications") && (
            <div className="mt-6 space-y-8">
              {cvData.journals.length > 0 && (
                <section data-search-group>
                  <H2Header
                    label="Journal Publications"
                    state={journalInfo.state}
                    onSelectAll={() => handleToggleItems(journalInfo.keys, journalInfo.state !== "checked")}
                    expanded={isExpanded("publications:journal")}
                    onToggleExpand={() => toggleExpand("publications:journal")}
                    selectedCount={journalInfo.selectedCount}
                    total={journalInfo.total}
                  />
                  {isExpanded("publications:journal") && (
                    <EntryList items={cvData.journals} prefix="journal" selected={selected} onToggle={handleToggleItem}
              searchText={pubSearchText}
              yearRange={(p) => extractYearRange(p.year)}
              sortDescBy={(p) => p.year}
              extraAttrs={(p) => ({ "data-pub-type": p.type, "data-pub-jcr": p.jcr ?? "" })}
                      renderCard={(p, sel) => <PublicationCard publication={p} selectable={sel} />} />
                  )}
                </section>
              )}

              {cvData.conferences.length > 0 && (
                <section data-search-group>
                  <H2Header
                    label="Conference Papers"
                    state={conferenceInfo.state}
                    onSelectAll={() => handleToggleItems(conferenceInfo.keys, conferenceInfo.state !== "checked")}
                    expanded={isExpanded("publications:conference")}
                    onToggleExpand={() => toggleExpand("publications:conference")}
                    selectedCount={conferenceInfo.selectedCount}
                    total={conferenceInfo.total}
                  />
                  {isExpanded("publications:conference") && (
                    <EntryList items={cvData.conferences} prefix="conference" selected={selected} onToggle={handleToggleItem}
              searchText={pubSearchText}
              yearRange={(p) => extractYearRange(p.year)}
              sortDescBy={(p) => p.year}
              extraAttrs={(p) => ({ "data-pub-type": p.type, "data-pub-jcr": p.jcr ?? "" })}
                      renderCard={(p, sel) => <PublicationCard publication={p} selectable={sel} />} />
                  )}
                </section>
              )}

              {cvData.books.length > 0 && (
                <section data-search-group>
                  <H2Header
                    label="Books"
                    state={bookInfo.state}
                    onSelectAll={() => handleToggleItems(bookInfo.keys, bookInfo.state !== "checked")}
                    expanded={isExpanded("publications:book")}
                    onToggleExpand={() => toggleExpand("publications:book")}
                    selectedCount={bookInfo.selectedCount}
                    total={bookInfo.total}
                  />
                  {isExpanded("publications:book") && (
                    <EntryList items={cvData.books} prefix="book" selected={selected} onToggle={handleToggleItem}
              searchText={pubSearchText}
              yearRange={(p) => extractYearRange(p.year)}
              sortDescBy={(p) => p.year}
              extraAttrs={(p) => ({ "data-pub-type": p.type, "data-pub-jcr": p.jcr ?? "" })}
                      renderCard={(p, sel) => <PublicationCard publication={p} selectable={sel} />} />
                  )}
                </section>
              )}

              {cvData.otherPubs.length > 0 && (
                <section data-search-group>
                  <H2Header
                    label="Other Publications"
                    state={otherInfo.state}
                    onSelectAll={() => handleToggleItems(otherInfo.keys, otherInfo.state !== "checked")}
                    expanded={isExpanded("publications:other")}
                    onToggleExpand={() => toggleExpand("publications:other")}
                    selectedCount={otherInfo.selectedCount}
                    total={otherInfo.total}
                  />
                  {isExpanded("publications:other") && (
                    <EntryList items={cvData.otherPubs} prefix="other" selected={selected} onToggle={handleToggleItem}
              searchText={pubSearchText}
              yearRange={(p) => extractYearRange(p.year)}
              sortDescBy={(p) => p.year}
              extraAttrs={(p) => ({ "data-pub-type": p.type, "data-pub-jcr": p.jcr ?? "" })}
                      renderCard={(p, sel) => <PublicationCard publication={p} selectable={sel} />} />
                  )}
                </section>
              )}

              {hasReviewer && (
                <section
                  data-search={normalizeSearchText(["reviewer", ...cvData.reviewerData.journals, ...cvData.reviewerData.books, ...cvData.reviewerData.conferences].join(" "))}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      checked={selected.has("reviewer")}
                      onChange={() => handleToggleItem("reviewer")}
                      aria-label="Include Reviewer"
                      className="w-4 h-4 rounded cursor-pointer flex-shrink-0"
                      style={{ accentColor: "#2ecfba" }}
                    />
                    <h2 className="text-2xl font-bold" style={{ color: '#2ecfba' }}>Reviewer</h2>
                  </div>
                  <p className="text-[0.95rem] leading-relaxed text-gray-800">
                    {`Reviewer in ${cvData.reviewerData.journals.length} journals such as `}
                    {cvData.reviewerData.journals.map((j, i) => (
                      <span key={j}>
                        <em className="font-semibold">{j}</em>
                        {i < cvData.reviewerData.journals.length - 1 ? '; ' : ''}
                      </span>
                    ))}
                    {cvData.reviewerData.books.length > 0 && (
                      <>
                        {`; ${cvData.reviewerData.books.length} books such as `}
                        {cvData.reviewerData.books.map((b, i) => (
                          <span key={b}>
                            <em className="font-semibold">{b}</em>
                            {i < cvData.reviewerData.books.length - 1 ? '; ' : ''}
                          </span>
                        ))}
                      </>
                    )}
                    {cvData.reviewerData.conferences.length > 0 && (
                      <>
                        {`; and ${cvData.reviewerData.conferences.length} conferences such as `}
                        {cvData.reviewerData.conferences.map((c, i) => (
                          <span key={c}>
                            <span className="font-semibold">{c}</span>
                            {i < cvData.reviewerData.conferences.length - 1 ? '; ' : ''}
                          </span>
                        ))}
                      </>
                    )}
                    .
                  </p>
                </section>
              )}
            </div>
          )}
        </div>

        {/* ── Projects ──────────────────────────────────────────────────── */}
        <div className="pb-6 border-b border-gray-100">
          <H1Header
            label="Projects"
            state={projectsGroup.state}
            onSelectAll={() => handleToggleItems(projectsGroup.keys, projectsGroup.state !== "checked")}
            expanded={isExpanded("projects")}
            onToggleExpand={() => toggleExpand("projects")}
            selectedCount={projectsGroup.selectedCount}
            total={projectsGroup.total}
          />
          {isExpanded("projects") && (
            <div className="mt-6 space-y-8">
              {cvData.competitive.length > 0 && (
                <section data-search-group>
                  <H2Header
                    label="Competitive Projects"
                    state={competitiveInfo.state}
                    onSelectAll={() => handleToggleItems(competitiveInfo.keys, competitiveInfo.state !== "checked")}
                    expanded={isExpanded("projects:competitive")}
                    onToggleExpand={() => toggleExpand("projects:competitive")}
                    selectedCount={competitiveInfo.selectedCount}
                    total={competitiveInfo.total}
                  />
                  {isExpanded("projects:competitive") && (
                    <EntryList items={cvData.competitive} prefix="competitive" selected={selected} onToggle={handleToggleItem}
              searchText={projectSearchText}
              yearRange={(p) => dateYearRange(p.startDate, p.endDate)}
              extraAttrs={(p) => ({ "data-project-tipo": p.tipo, "data-project-scope": p.scope, "data-project-ip": p.isIP ? "yes" : "no" })}
                      renderCard={(p, sel) => <ProjectCard project={p} selectable={sel} />} />
                  )}
                </section>
              )}

              {cvData.private.length > 0 && (
                <section data-search-group>
                  <H2Header
                    label="Private Contracts"
                    state={privateInfo.state}
                    onSelectAll={() => handleToggleItems(privateInfo.keys, privateInfo.state !== "checked")}
                    expanded={isExpanded("projects:private")}
                    onToggleExpand={() => toggleExpand("projects:private")}
                    selectedCount={privateInfo.selectedCount}
                    total={privateInfo.total}
                  />
                  {isExpanded("projects:private") && (
                    <EntryList items={cvData.private} prefix="private" selected={selected} onToggle={handleToggleItem}
              searchText={projectSearchText}
              yearRange={(p) => dateYearRange(p.startDate, p.endDate)}
              extraAttrs={(p) => ({ "data-project-tipo": p.tipo, "data-project-scope": p.scope, "data-project-ip": p.isIP ? "yes" : "no" })}
                      renderCard={(p, sel) => <ProjectCard project={p} selectable={sel} />} />
                  )}
                </section>
              )}

              {cvData.software.length > 0 && (
                <section data-search-group>
                  <H2Header
                    label="Software"
                    state={softwareInfo.state}
                    onSelectAll={() => handleToggleItems(softwareInfo.keys, softwareInfo.state !== "checked")}
                    expanded={isExpanded("projects:software")}
                    onToggleExpand={() => toggleExpand("projects:software")}
                    selectedCount={softwareInfo.selectedCount}
                    total={softwareInfo.total}
                  />
                  {isExpanded("projects:software") && (
                    <EntryList items={cvData.software} prefix="software" selected={selected} onToggle={handleToggleItem}
              searchText={softwareSearchText}
                      renderCard={(s, sel) => <SoftwareCard project={s} selectable={sel} />} />
                  )}
                </section>
              )}

              {cvData.workingGroups.length > 0 && (
                <section data-search-group>
                  <H2Header
                    label="Working Groups, Standardisation Bodies, and Industry"
                    state={wgProjectInfo.state}
                    onSelectAll={() => handleToggleItems(wgProjectInfo.keys, wgProjectInfo.state !== "checked")}
                    expanded={isExpanded("projects:wg-project")}
                    onToggleExpand={() => toggleExpand("projects:wg-project")}
                    selectedCount={wgProjectInfo.selectedCount}
                    total={wgProjectInfo.total}
                  />
                  {isExpanded("projects:wg-project") && (
                    <EntryList items={cvData.workingGroups} prefix="wg-project" selected={selected} onToggle={handleToggleItem}
              searchText={workingGroupSearchText}
              yearRange={(wg) => extractYearRange(wg.year)}
                      renderCard={(wg, sel) => <WorkingGroupCard wg={wg} selectable={sel} />} />
                  )}
                </section>
              )}
            </div>
          )}
        </div>

        {/* ── Teaching ──────────────────────────────────────────────────── */}
        <div className="pb-6 border-b border-gray-100">
          <H1Header
            label="Teaching"
            state={teachingGroup.state}
            onSelectAll={() => handleToggleItems(teachingGroup.keys, teachingGroup.state !== "checked")}
            expanded={isExpanded("teaching")}
            onToggleExpand={() => toggleExpand("teaching")}
            selectedCount={teachingGroup.selectedCount}
            total={teachingGroup.total}
          />
          {isExpanded("teaching") && (
            <div className="mt-6 space-y-8">
              {cvData.courses.length > 0 && (
                <section data-search-group>
                  <H2Header
                    label="Courses"
                    state={courseInfo.state}
                    onSelectAll={() => handleToggleItems(courseInfo.keys, courseInfo.state !== "checked")}
                    expanded={isExpanded("teaching:course")}
                    onToggleExpand={() => toggleExpand("teaching:course")}
                    selectedCount={courseInfo.selectedCount}
                    total={courseInfo.total}
                  />
                  {isExpanded("teaching:course") && (
                    <EntryList items={cvData.courses} prefix="course" selected={selected} onToggle={handleToggleItem}
              searchText={courseSearchText}
              yearRange={(c) => extractYearRange(c.year)}
                      renderCard={(c, sel) => <RegularCourseCard course={c} selectable={sel} />} />
                  )}
                </section>
              )}

              {cvData.teachingProjects.length > 0 && (
                <section data-search-group>
                  <H2Header
                    label="Teaching Innovation Projects"
                    state={tprojectInfo.state}
                    onSelectAll={() => handleToggleItems(tprojectInfo.keys, tprojectInfo.state !== "checked")}
                    expanded={isExpanded("teaching:tproject")}
                    onToggleExpand={() => toggleExpand("teaching:tproject")}
                    selectedCount={tprojectInfo.selectedCount}
                    total={tprojectInfo.total}
                  />
                  {isExpanded("teaching:tproject") && (
                    <EntryList items={cvData.teachingProjects} prefix="tproject" selected={selected} onToggle={handleToggleItem}
              searchText={teachingProjectSearchText}
              yearRange={(p) => extractYearRange(p.year)}
                      renderCard={(p, sel) => <TeachingProjectCard project={p} selectable={sel} />} />
                  )}
                </section>
              )}

              {(cvData.phdTheses.length > 0 || cvData.masterTheses.length > 0 || cvData.bachelorTheses.length > 0 || cvData.supervisions.length > 0) && (
                <section data-search-group>
                  <H2Header
                    label="Supervision"
                    state={supervisionGroup.state}
                    onSelectAll={() => handleToggleItems(supervisionGroup.keys, supervisionGroup.state !== "checked")}
                    expanded={isExpanded("teaching:supervision")}
                    onToggleExpand={() => toggleExpand("teaching:supervision")}
                    selectedCount={supervisionGroup.selectedCount}
                    total={supervisionGroup.total}
                  />
                  {isExpanded("teaching:supervision") && (
                    <div className="space-y-6">
                      {cvData.phdTheses.length > 0 && (
                        <div data-search-group>
                          <H3Header
                            label="PhD Thesis"
                            state={phdInfo.state}
                            onSelectAll={() => handleToggleItems(phdInfo.keys, phdInfo.state !== "checked")}
                            expanded={isExpanded("teaching:supervision:phd")}
                            onToggleExpand={() => toggleExpand("teaching:supervision:phd")}
                            selectedCount={phdInfo.selectedCount}
                            total={phdInfo.total}
                          />
                          {isExpanded("teaching:supervision:phd") && (
                            <EntryList items={cvData.phdTheses} prefix="phd" selected={selected} onToggle={handleToggleItem}
              searchText={thesisSearchText}
              yearRange={(t) => extractYearRange(t.year)}
                              renderCard={(t, sel) => <ThesisCard thesis={t} selectable={sel} />} />
                          )}
                        </div>
                      )}

                      {cvData.masterTheses.length > 0 && (
                        <div data-search-group>
                          <H3Header
                            label="Master Thesis"
                            state={masterInfo.state}
                            onSelectAll={() => handleToggleItems(masterInfo.keys, masterInfo.state !== "checked")}
                            expanded={isExpanded("teaching:supervision:master")}
                            onToggleExpand={() => toggleExpand("teaching:supervision:master")}
                            selectedCount={masterInfo.selectedCount}
                            total={masterInfo.total}
                          />
                          {isExpanded("teaching:supervision:master") && (
                            <EntryList items={cvData.masterTheses} prefix="master" selected={selected} onToggle={handleToggleItem}
              searchText={thesisSearchText}
              yearRange={(t) => extractYearRange(t.year)}
                              renderCard={(t, sel) => <ThesisCard thesis={t} selectable={sel} />} />
                          )}
                        </div>
                      )}

                      {cvData.bachelorTheses.length > 0 && (
                        <div data-search-group>
                          <H3Header
                            label="Bachelor Thesis"
                            state={bachelorInfo.state}
                            onSelectAll={() => handleToggleItems(bachelorInfo.keys, bachelorInfo.state !== "checked")}
                            expanded={isExpanded("teaching:supervision:bachelor")}
                            onToggleExpand={() => toggleExpand("teaching:supervision:bachelor")}
                            selectedCount={bachelorInfo.selectedCount}
                            total={bachelorInfo.total}
                          />
                          {isExpanded("teaching:supervision:bachelor") && (
                            <EntryList items={cvData.bachelorTheses} prefix="bachelor" selected={selected} onToggle={handleToggleItem}
              searchText={thesisSearchText}
              yearRange={(t) => extractYearRange(t.year)}
                              renderCard={(t, sel) => <ThesisCard thesis={t} selectable={sel} />} />
                          )}
                        </div>
                      )}

                      {cvData.supervisions.length > 0 && (
                        <div data-search-group>
                          <H3Header
                            label="Scholarship Supervision"
                            state={supervisionEntryInfo.state}
                            onSelectAll={() => handleToggleItems(supervisionEntryInfo.keys, supervisionEntryInfo.state !== "checked")}
                            expanded={isExpanded("teaching:supervision:supervision")}
                            onToggleExpand={() => toggleExpand("teaching:supervision:supervision")}
                            selectedCount={supervisionEntryInfo.selectedCount}
                            total={supervisionEntryInfo.total}
                          />
                          {isExpanded("teaching:supervision:supervision") && (
                            <EntryList items={cvData.supervisions} prefix="supervision" selected={selected} onToggle={handleToggleItem}
              searchText={thesisSearchText}
              yearRange={(t) => extractYearRange(t.year)}
                              renderCard={(t, sel) => <ThesisCard thesis={t} selectable={sel} />} />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}

              {cvData.externalCourses.length > 0 && (
                <section data-search-group>
                  <H2Header
                    label="External Courses"
                    state={extcourseInfo.state}
                    onSelectAll={() => handleToggleItems(extcourseInfo.keys, extcourseInfo.state !== "checked")}
                    expanded={isExpanded("teaching:extcourse")}
                    onToggleExpand={() => toggleExpand("teaching:extcourse")}
                    selectedCount={extcourseInfo.selectedCount}
                    total={extcourseInfo.total}
                  />
                  {isExpanded("teaching:extcourse") && (
                    <EntryList items={cvData.externalCourses} prefix="extcourse" selected={selected} onToggle={handleToggleItem}
              searchText={externalCourseSearchText}
              yearRange={(c) => extractYearRange(c.year)}
                      renderCard={(c, sel) => <ExternalCourseCard course={c} selectable={sel} />} />
                  )}
                </section>
              )}
            </div>
          )}
        </div>

        {/* ── International ─────────────────────────────────────────────── */}
        <div>
          <H1Header
            label="International"
            state={internationalGroup.state}
            onSelectAll={() => handleToggleItems(internationalGroup.keys, internationalGroup.state !== "checked")}
            expanded={isExpanded("international")}
            onToggleExpand={() => toggleExpand("international")}
            selectedCount={internationalGroup.selectedCount}
            total={internationalGroup.total}
          />
          {isExpanded("international") && (
            <div className="mt-6 space-y-8">
              {cvData.researchVisits.length > 0 && (
                <section data-search-group>
                  <H2Header
                    label="Research Visits"
                    state={visitInfo.state}
                    onSelectAll={() => handleToggleItems(visitInfo.keys, visitInfo.state !== "checked")}
                    expanded={isExpanded("international:visit")}
                    onToggleExpand={() => toggleExpand("international:visit")}
                    selectedCount={visitInfo.selectedCount}
                    total={visitInfo.total}
                  />
                  {isExpanded("international:visit") && (
                    <EntryList items={cvData.researchVisits} prefix="visit" selected={selected} onToggle={handleToggleItem}
              searchText={visitSearchText}
              yearRange={(v) => extractYearRange(v.year)}
                      renderCard={(v, sel) => <VisitCard visit={v} selectable={sel} />} />
                  )}
                </section>
              )}

              {cvData.awards.length > 0 && (
                <section data-search-group>
                  <H2Header
                    label="Awards"
                    state={awardInfo.state}
                    onSelectAll={() => handleToggleItems(awardInfo.keys, awardInfo.state !== "checked")}
                    expanded={isExpanded("international:award")}
                    onToggleExpand={() => toggleExpand("international:award")}
                    selectedCount={awardInfo.selectedCount}
                    total={awardInfo.total}
                  />
                  {isExpanded("international:award") && (
                    <EntryList items={cvData.awards} prefix="award" selected={selected} onToggle={handleToggleItem}
              searchText={awardSearchText}
              yearRange={(a) => extractYearRange(a.year)}
                      renderCard={(a, sel) => <AwardCard award={a} selectable={sel} />} />
                  )}
                </section>
              )}

              {cvData.workingGroups.length > 0 && (
                <section data-search-group>
                  <H2Header
                    label="Working Groups, Standardisation Bodies, and Industry"
                    state={wgIntlInfo.state}
                    onSelectAll={() => handleToggleItems(wgIntlInfo.keys, wgIntlInfo.state !== "checked")}
                    expanded={isExpanded("international:wg-intl")}
                    onToggleExpand={() => toggleExpand("international:wg-intl")}
                    selectedCount={wgIntlInfo.selectedCount}
                    total={wgIntlInfo.total}
                  />
                  {isExpanded("international:wg-intl") && (
                    <EntryList items={cvData.workingGroups} prefix="wg-intl" selected={selected} onToggle={handleToggleItem}
              searchText={workingGroupSearchText}
              yearRange={(wg) => extractYearRange(wg.year)}
                      renderCard={(wg, sel) => <WorkingGroupCard wg={wg} selectable={sel} />} />
                  )}
                </section>
              )}

              {cvData.invitedLectures.length > 0 && (
                <section data-search-group>
                  <H2Header
                    label="Invited Lectures"
                    state={lectureInfo.state}
                    onSelectAll={() => handleToggleItems(lectureInfo.keys, lectureInfo.state !== "checked")}
                    expanded={isExpanded("international:lecture")}
                    onToggleExpand={() => toggleExpand("international:lecture")}
                    selectedCount={lectureInfo.selectedCount}
                    total={lectureInfo.total}
                  />
                  {isExpanded("international:lecture") && (
                    <EntryList items={cvData.invitedLectures} prefix="lecture" selected={selected} onToggle={handleToggleItem}
              searchText={lectureSearchText}
              yearRange={(l) => extractYearRange(l.year)}
                      renderCard={(l, sel) => <LectureCard lecture={l} selectable={sel} />} />
                  )}
                </section>
              )}

              {cvData.events.length > 0 && (
                <section data-search-group>
                  <H2Header
                    label="Events"
                    state={eventInfo.state}
                    onSelectAll={() => handleToggleItems(eventInfo.keys, eventInfo.state !== "checked")}
                    expanded={isExpanded("international:event")}
                    onToggleExpand={() => toggleExpand("international:event")}
                    selectedCount={eventInfo.selectedCount}
                    total={eventInfo.total}
                  />
                  {isExpanded("international:event") && (
                    <EntryList items={cvData.events} prefix="event" selected={selected} onToggle={handleToggleItem}
              searchText={eventSearchText}
              yearRange={(e) => extractYearRange(e.year)}
                      renderCard={(e, sel) => <EventCard event={e} selectable={sel} />} />
                  )}
                </section>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
