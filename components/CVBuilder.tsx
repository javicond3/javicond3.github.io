"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { logout } from "@/utils/auth";
import { useRouter } from "next/navigation";

// ─── Data types (mirrors server-side types) ───────────────────────────────────

export interface Publication {
  id: string;
  authors: string;
  year: number;
  title: string;
  journal: string;
  type: string;
  location?: string;
  status?: string;
  doi?: string;
  jcr?: string;
  abstract: string;
  keywords: string[];
}

export interface Project {
  id: string;
  tipo: "Competitive" | "Private";
  title: string;
  funder: string;
  scope: string;
  startDate: string | null; // ISO string (serializable across server/client boundary)
  endDate: string | null;
  money?: number;
  isIP: boolean;
  link?: string;
}

export interface SoftwareProject {
  id: string;
  title: string;
  link?: string;
  description?: string;
}

export interface WorkingGroup {
  id: string;
  title: string;
  funder?: string;
  year?: string;
}

export interface Thesis {
  id: string;
  tipo: "PhD" | "Master" | "Bachelor" | "Supervision";
  title: string;
  author: string;
  degree?: string;
  year?: number;
}

export interface Course {
  id: string;
  title: string;
  isCoordinator: boolean;
  program?: string;
  levelAndCourse?: string;
  centro?: string;
  year?: string;
}

export interface ExternalCourse {
  id: string;
  title: string;
  program?: string;
  year?: string;
}

export interface InvitedLecture {
  id: string;
  title: string;
  program?: string;
  location?: string;
  year?: string | number;
}

export interface InvitedEvent {
  id: string;
  title: string;
  program?: string;
  location?: string;
  year?: string | number;
  rol?: string;
}

export interface TeachingProject {
  id: string;
  title: string;
  funder?: string;
  year?: string;
  isPI: boolean;
}

export interface AboutEntry {
  id: string;
  tipo: string;
  title: string;
  year?: string;
  organization?: string;
  location?: string;
  note?: string;
}

export interface Award {
  id: string;
  title: string;
  organization?: string;
  year?: string | number;
  tipo: string;
}

export interface ResearchVisit {
  id: string;
  title: string;
  location?: string;
  year?: number;
  duration?: string;
}

export interface CVData {
  journals: Publication[];
  conferences: Publication[];
  books: Publication[];
  otherPubs: Publication[];
  competitive: Project[];
  private: Project[];
  software: SoftwareProject[];
  workingGroups: WorkingGroup[];
  courses: Course[];
  teachingProjects: TeachingProject[];
  phdTheses: Thesis[];
  masterTheses: Thesis[];
  bachelorTheses: Thesis[];
  supervisions: Thesis[];
  externalCourses: ExternalCourse[];
  positions: AboutEntry[];
  institutionalRoles: AboutEntry[];
  education: AboutEntry[];
  certificates: AboutEntry[];
  awards: Award[];
  researchVisits: ResearchVisit[];
  invitedLectures: InvitedLecture[];
  events: InvitedEvent[];
}

// ─── Formatting helpers ────────────────────────────────────────────────────────

function formatMonthYear(date: string | null): string {
  if (!date) return "";
  const d = new Date(date);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function journalLabel(p: Publication): string {
  const jcr = p.jcr ? ` (JCR ${p.jcr})` : "";
  return `"${p.title}". (${p.year}). ${p.authors}. ${p.journal}${jcr}.`;
}

function conferenceLabel(p: Publication): string {
  const loc = p.location ? `. ${p.location}` : "";
  return `"${p.title}". (${p.year}). ${p.authors}. ${p.journal}${loc}.`;
}

function bookLabel(p: Publication): string {
  return `"${p.title}". (${p.year}). ${p.authors}. ${p.journal}.`;
}

function otherPubLabel(p: Publication): string {
  const type = p.type ? ` [${p.type}]` : "";
  return `"${p.title}". (${p.year}). ${p.authors}. ${p.journal}${type}.`;
}

function competitiveLabel(p: Project): string {
  const start = formatMonthYear(p.startDate);
  const end = formatMonthYear(p.endDate);
  const period = start || end ? `(${[start, end].filter(Boolean).join(" – ")}) ` : "";
  const ip = p.isIP ? " [PI]" : "";
  const scope = p.scope ? `. ${p.scope}` : "";
  const money = p.money != null ? `. €${p.money.toLocaleString("es-ES")}` : "";
  return `${period}${p.title}${ip}. ${p.funder}${scope}${money}`;
}

function privateLabel(p: Project): string {
  const start = formatMonthYear(p.startDate);
  const end = formatMonthYear(p.endDate);
  const period = start || end ? `(${[start, end].filter(Boolean).join(" – ")}) ` : "";
  const scope = p.scope ? `. ${p.scope}` : "";
  return `${period}${p.title}. ${p.funder}${scope}`;
}

function softwareLabel(s: SoftwareProject): string {
  const desc = s.description ? ` ${s.description}` : "";
  return `${s.title}.${desc}`;
}

function wgLabel(wg: WorkingGroup): string {
  const year = wg.year ? ` (${wg.year})` : "";
  const funder = wg.funder ? `. ${wg.funder}` : "";
  return `${wg.title}${funder}${year}.`;
}

function courseLabel(c: Course): string {
  const coord = c.isCoordinator ? " [Course Coordinator]" : "";
  const prog = c.program ? ` - ${c.program}` : "";
  const level = c.levelAndCourse ? `. ${c.levelAndCourse}` : "";
  const centro = c.centro ? `. ${c.centro}` : "";
  const year = c.year ? ` (${c.year})` : "";
  return `${c.title}${coord}${prog}${level}${centro}${year}.`;
}

function teachingProjectLabel(tp: TeachingProject): string {
  const ip = tp.isPI ? " [PI]" : "";
  const funder = tp.funder ? `. ${tp.funder}` : "";
  const year = tp.year ? ` (${tp.year})` : "";
  return `${tp.title}${ip}${funder}${year}.`;
}

function thesisLabel(t: Thesis): string {
  const year = t.year ? ` (${t.year})` : "";
  const degree = t.degree ? `. ${t.degree}` : "";
  return `"${t.title}". ${t.author}${degree}${year}.`;
}

function externalCourseLabel(c: ExternalCourse): string {
  const prog = c.program ? `. ${c.program}` : "";
  const year = c.year ? ` (${c.year})` : "";
  return `${c.title}${prog}${year}.`;
}

function aboutLabel(e: AboutEntry): string {
  const org = e.organization ? `. ${e.organization}` : "";
  const year = e.year ? `. ${e.year}` : "";
  const note = e.note ? `. ${e.note}` : "";
  return `${e.title}${org}${year}${note}.`;
}

function visitLabel(v: ResearchVisit): string {
  const loc = v.location ? `. ${v.location}` : "";
  const year = v.year ? ` (${v.year}` : "";
  const dur = v.duration ? ` - ${v.duration}` : "";
  const close = v.year ? ")" : "";
  return `${v.title}${loc}${year}${dur}${close}.`;
}

function awardLabel(a: Award): string {
  const org = a.organization ? `. ${a.organization}` : "";
  const year = a.year ? `. (${a.year})` : "";
  const tipo = a.tipo ? ` - ${a.tipo}` : "";
  return `${a.title}${org}${year}${tipo}.`;
}

function lectureLabel(l: InvitedLecture): string {
  const prog = l.program ? `. ${l.program}` : "";
  const loc = l.location ? `. ${l.location}` : "";
  const year = l.year != null ? ` (${l.year})` : "";
  return `${l.title}${prog}${loc}${year}.`;
}

function eventLabel(e: InvitedEvent): string {
  const rol = e.rol ? ` [${e.rol}]` : "";
  const prog = e.program ? `. ${e.program}` : "";
  const loc = e.location ? `. ${e.location}` : "";
  const year = e.year != null ? ` (${e.year})` : "";
  return `${e.title}${rol}${prog}${loc}${year}.`;
}

// ─── Build item key map ────────────────────────────────────────────────────────
// Returns { key -> label } for every selectable item.

function buildItemMap(data: CVData): Map<string, string> {
  const map = new Map<string, string>();
  map.set("bio", "Bio / Introduction paragraph");

  data.journals.forEach((p, i) => map.set(`journal-${i}`, journalLabel(p)));
  data.conferences.forEach((p, i) => map.set(`conference-${i}`, conferenceLabel(p)));
  data.books.forEach((p, i) => map.set(`book-${i}`, bookLabel(p)));
  data.otherPubs.forEach((p, i) => map.set(`other-${i}`, otherPubLabel(p)));

  data.competitive.forEach((p, i) => map.set(`competitive-${i}`, competitiveLabel(p)));
  data.private.forEach((p, i) => map.set(`private-${i}`, privateLabel(p)));
  data.software.forEach((s, i) => map.set(`software-${i}`, softwareLabel(s)));
  data.workingGroups.forEach((wg, i) => map.set(`wg-project-${i}`, wgLabel(wg)));

  data.courses.forEach((c, i) => map.set(`course-${i}`, courseLabel(c)));
  data.teachingProjects.forEach((tp, i) => map.set(`tproject-${i}`, teachingProjectLabel(tp)));
  data.phdTheses.forEach((t, i) => map.set(`phd-${i}`, thesisLabel(t)));
  data.masterTheses.forEach((t, i) => map.set(`master-${i}`, thesisLabel(t)));
  data.bachelorTheses.forEach((t, i) => map.set(`bachelor-${i}`, thesisLabel(t)));
  data.supervisions.forEach((t, i) => map.set(`supervision-${i}`, thesisLabel(t)));
  data.externalCourses.forEach((c, i) => map.set(`extcourse-${i}`, externalCourseLabel(c)));

  data.positions.forEach((e, i) => map.set(`position-${i}`, aboutLabel(e)));
  data.institutionalRoles.forEach((e, i) => map.set(`institutional-${i}`, aboutLabel(e)));
  data.education.forEach((e, i) => map.set(`education-${i}`, aboutLabel(e)));
  data.certificates.forEach((e, i) => map.set(`certificate-${i}`, aboutLabel(e)));

  data.awards.forEach((a, i) => map.set(`award-${i}`, awardLabel(a)));
  data.researchVisits.forEach((v, i) => map.set(`visit-${i}`, visitLabel(v)));
  data.workingGroups.forEach((wg, i) => map.set(`wg-intl-${i}`, wgLabel(wg)));
  data.invitedLectures.forEach((l, i) => map.set(`lecture-${i}`, lectureLabel(l)));
  data.events.forEach((e, i) => map.set(`event-${i}`, eventLabel(e)));

  return map;
}

// ─── Section groups: prefix -> section label ────────────────────────────────

interface SectionGroup {
  h1: string;
  subsections: {
    label: string;
    prefix: string;
    count: number;
    subgroups?: { label: string; prefix: string; count: number }[];
  }[];
}

function buildSectionGroups(data: CVData): SectionGroup[] {
  return [
    {
      h1: "Bio",
      subsections: [{ label: "Bio", prefix: "bio", count: 1 }],
    },
    {
      h1: "Position and Education",
      subsections: [
        { label: "Position", prefix: "position", count: data.positions.length },
        { label: "Other Institutional Roles", prefix: "institutional", count: data.institutionalRoles.length },
        { label: "Education", prefix: "education", count: data.education.length },
        { label: "Certificates", prefix: "certificate", count: data.certificates.length },
      ],
    },
    {
      h1: "Publications",
      subsections: [
        { label: "Journal Publications", prefix: "journal", count: data.journals.length },
        { label: "Conference Papers", prefix: "conference", count: data.conferences.length },
        { label: "Books", prefix: "book", count: data.books.length },
        { label: "Other Publications", prefix: "other", count: data.otherPubs.length },
      ],
    },
    {
      h1: "Research Projects",
      subsections: [
        { label: "Competitive Projects", prefix: "competitive", count: data.competitive.length },
        { label: "Private Contracts", prefix: "private", count: data.private.length },
        { label: "Software", prefix: "software", count: data.software.length },
        { label: "Working Groups, Standardisation Bodies, and Industry", prefix: "wg-project", count: data.workingGroups.length },
      ],
    },
    {
      h1: "Teaching",
      subsections: [
        { label: "Courses", prefix: "course", count: data.courses.length },
        { label: "Teaching Innovation Projects", prefix: "tproject", count: data.teachingProjects.length },
        {
          label: "Supervision",
          prefix: "supervision-group",
          count: data.phdTheses.length + data.masterTheses.length + data.bachelorTheses.length + data.supervisions.length,
          subgroups: [
            { label: "PhD Thesis", prefix: "phd", count: data.phdTheses.length },
            { label: "Master Thesis", prefix: "master", count: data.masterTheses.length },
            { label: "Bachelor Thesis", prefix: "bachelor", count: data.bachelorTheses.length },
            { label: "Student Supervision", prefix: "supervision", count: data.supervisions.length },
          ],
        },
        { label: "External Courses", prefix: "extcourse", count: data.externalCourses.length },
      ],
    },
    {
      h1: "International",
      subsections: [
        { label: "Research Visits", prefix: "visit", count: data.researchVisits.length },
        { label: "Awards", prefix: "award", count: data.awards.length },
        { label: "Working Groups, Standardisation Bodies, and Industry", prefix: "wg-intl", count: data.workingGroups.length },
        { label: "Invited Lectures", prefix: "lecture", count: data.invitedLectures.length },
        { label: "Events", prefix: "event", count: data.events.length },
      ],
    },
  ];
}

// ─── Helper: get all item keys for a prefix ────────────────────────────────────

function getKeysForPrefix(prefix: string, itemMap: Map<string, string>): string[] {
  if (prefix === "bio") return itemMap.has("bio") ? ["bio"] : [];
  return Array.from(itemMap.keys()).filter((k) => k.startsWith(prefix + "-"));
}

type CheckState = "checked" | "unchecked" | "indeterminate";

function getGroupState(keys: string[], selected: Set<string>): CheckState {
  if (keys.length === 0) return "unchecked";
  const checkedCount = keys.filter((k) => selected.has(k)).length;
  if (checkedCount === 0) return "unchecked";
  if (checkedCount === keys.length) return "checked";
  return "indeterminate";
}

// ─── IndeterminateCheckbox ─────────────────────────────────────────────────────

interface IndeterminateCheckboxProps {
  state: CheckState;
  onChange: () => void;
  label: string;
  bold?: boolean;
  count?: { selected: number; total: number };
}

function IndeterminateCheckbox({ state, onChange, label, bold, count }: IndeterminateCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = state === "indeterminate";
    }
  }, [state]);

  return (
    <label className="flex items-center gap-2 cursor-pointer py-1 group select-none w-full">
      <input
        ref={ref}
        type="checkbox"
        checked={state === "checked"}
        onChange={onChange}
        className="w-4 h-4 rounded cursor-pointer flex-shrink-0"
        style={{ accentColor: "#2ecfba" }}
      />
      <span
        className={`${bold ? "font-semibold text-gray-800" : "font-medium text-gray-700"} text-sm group-hover:text-[#2ecfba] transition-colors flex-1 min-w-0`}
      >
        {label}
        {count != null && (
          <span className="font-normal text-gray-400 ml-1">({count.total})</span>
        )}
      </span>
      {count != null && (
        <span className="text-xs rounded-full px-1.5 py-0.5 ml-1 flex-shrink-0 font-mono"
          style={{
            backgroundColor: count.selected === count.total ? "#d1faf4" : count.selected === 0 ? "#f3f4f6" : "#fef9c3",
            color: count.selected === count.total ? "#065f46" : count.selected === 0 ? "#6b7280" : "#854d0e",
          }}
        >
          {count.selected}/{count.total}
        </span>
      )}
    </label>
  );
}

// ─── ItemCheckbox ─────────────────────────────────────────────────────────────

interface ItemCheckboxProps {
  itemKey: string;
  label: string;
  selected: boolean;
  onToggle: (key: string) => void;
}

function ItemCheckbox({ itemKey, label, selected, onToggle }: ItemCheckboxProps) {
  return (
    <label className="flex items-start gap-2 py-1 pl-4 cursor-pointer hover:bg-gray-50 rounded group select-none">
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(itemKey)}
        className="w-4 h-4 rounded cursor-pointer flex-shrink-0 mt-0.5"
        style={{ accentColor: "#2ecfba" }}
      />
      <span className="text-sm text-gray-600 leading-tight group-hover:text-gray-900 transition-colors">
        {label}
      </span>
    </label>
  );
}

// ─── SubsectionBlock ──────────────────────────────────────────────────────────

interface SubsectionBlockProps {
  label: string;
  prefix: string;
  itemMap: Map<string, string>;
  selected: Set<string>;
  onToggleItems: (keys: string[], force: boolean) => void;
  onToggleItem: (key: string) => void;
  subgroups?: { label: string; prefix: string; count: number }[];
}

function SubsectionBlock({ label, prefix, itemMap, selected, onToggleItems, onToggleItem, subgroups }: SubsectionBlockProps) {
  if (subgroups) {
    // Supervision-style: has subgroups
    const allKeys = subgroups.flatMap((sg) => getKeysForPrefix(sg.prefix, itemMap));
    const groupState = getGroupState(allKeys, selected);
    const selectedCount = allKeys.filter((k) => selected.has(k)).length;

    return (
      <div className="mt-2">
        <IndeterminateCheckbox
          state={groupState}
          onChange={() => onToggleItems(allKeys, groupState !== "checked")}
          label={label}
          bold
          count={{ selected: selectedCount, total: allKeys.length }}
        />
        <div className="border-l-2 border-gray-100 ml-2 mt-1 space-y-2">
          {subgroups.map((sg) => {
            const sgKeys = getKeysForPrefix(sg.prefix, itemMap);
            const sgState = getGroupState(sgKeys, selected);
            const sgSelected = sgKeys.filter((k) => selected.has(k)).length;
            return (
              <div key={sg.prefix} className="pl-2">
                <IndeterminateCheckbox
                  state={sgState}
                  onChange={() => onToggleItems(sgKeys, sgState !== "checked")}
                  label={sg.label}
                  count={{ selected: sgSelected, total: sgKeys.length }}
                />
                <div className="mt-0.5">
                  {sgKeys.map((k) => (
                    <ItemCheckbox
                      key={k}
                      itemKey={k}
                      label={itemMap.get(k) ?? k}
                      selected={selected.has(k)}
                      onToggle={onToggleItem}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const keys = getKeysForPrefix(prefix, itemMap);
  if (keys.length === 0) return null;
  const groupState = getGroupState(keys, selected);
  const selectedCount = keys.filter((k) => selected.has(k)).length;

  return (
    <div className="mt-2">
      <IndeterminateCheckbox
        state={groupState}
        onChange={() => onToggleItems(keys, groupState !== "checked")}
        label={label}
        bold
        count={{ selected: selectedCount, total: keys.length }}
      />
      <div className="mt-0.5">
        {keys.map((k) => (
          <ItemCheckbox
            key={k}
            itemKey={k}
            label={itemMap.get(k) ?? k}
            selected={selected.has(k)}
            onToggle={onToggleItem}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main CVBuilder ────────────────────────────────────────────────────────────

interface CVBuilderProps {
  cvData: CVData;
}

export default function CVBuilder({ cvData }: CVBuilderProps) {
  const router = useRouter();
  const itemMap = buildItemMap(cvData);
  const allKeys = Array.from(itemMap.keys());
  const sectionGroups = buildSectionGroups(cvData);

  const [selected, setSelected] = useState<Set<string>>(new Set(allKeys));
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const handleGenerate = async () => {
    if (selected.size === 0) {
      setError("Please select at least one item.");
      return;
    }
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedItems: Array.from(selected) }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Server error: ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "javier-conde-cv.docx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate CV.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fffe" }}>
      {/* Main content */}
      <main className="px-6 lg:px-24 py-10 w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Generate CV</h1>
          <p className="text-sm text-gray-500">
            Select individual items to include in your Word document, then click Generate.
          </p>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
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
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Section tree */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-5 space-y-4">
          {sectionGroups.map((group) => {
            const allGroupKeys = group.subsections.flatMap((sub) => {
              if (sub.subgroups) {
                return sub.subgroups.flatMap((sg) => getKeysForPrefix(sg.prefix, itemMap));
              }
              return getKeysForPrefix(sub.prefix, itemMap);
            });
            const groupState = getGroupState(allGroupKeys, selected);
            const groupSelected = allGroupKeys.filter((k) => selected.has(k)).length;

            return (
              <div key={group.h1} className="pb-4 border-b border-gray-100 last:border-b-0 last:pb-0">
                {/* H1-level parent */}
                <IndeterminateCheckbox
                  state={groupState}
                  onChange={() => handleToggleItems(allGroupKeys, groupState !== "checked")}
                  label={group.h1}
                  bold
                  count={{ selected: groupSelected, total: allGroupKeys.length }}
                />

                {/* H2-level subsections */}
                <div className="border-l-2 border-gray-100 ml-2 mt-1 space-y-1 pl-2">
                  {group.subsections.map((sub) => (
                    <SubsectionBlock
                      key={sub.prefix}
                      label={sub.label}
                      prefix={sub.prefix}
                      itemMap={itemMap}
                      selected={selected}
                      onToggleItems={handleToggleItems}
                      onToggleItem={handleToggleItem}
                      subgroups={sub.subgroups}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
