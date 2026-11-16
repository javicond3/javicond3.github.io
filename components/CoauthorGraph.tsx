'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { isAuthenticated } from '@/utils/auth';
import type { CoauthorData, Coauthor, PaperNode } from '@/data/coauthors';
import { useSearch } from './SearchContext';
import { parseQuery, matches, compare, paperFieldTest, SEARCH_PLACEHOLDER } from '@/utils/searchQuery';
import { normalizeSearchText } from '@/utils/normalizeSearch';
import { papersFilterMatch } from '@/utils/papersFilter';
import { refId } from '@/utils/copySelection';
import CopyButton from './CopyButton';
import { instSigla } from '@/utils/acronym';
import { WORLD_PATHS, NAME2ISO } from '@/data/worldmap';
import { tagSearchText, countTags } from '@/utils/tags';
import TopicGraph from './TopicGraph';

// short stable id of an author / paper / institution, used in the links made with "Ref"
const netId = (name: string) => refId(name).slice(4);

/* ---------- colours ---------- */
const COL_ME = '#e03131';
const COL_AUTHOR = '#12b5a5';
const COL_INST = '#5b7db1';
const COL_PAPER = '#f0a840';
const COL_DIM = '#cbd5e1';
const COL_COUNTRY_NONE = '#e6eaef';

const W = 1000;
const H = 600;

/* heatmap: ColorBrewer YlOrRd, few co-authors -> light yellow, many -> dark red (log scale) */
const HEAT_STOPS = ['#ffffcc', '#ffeda0', '#fed976', '#feb24c', '#fd8d3c', '#fc4e2a', '#e31a1c', '#bd0026', '#800026'].map(
  (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
);
function heatColor(count: number, maxCount: number, active: boolean): string {
  const t = Math.log(count) / Math.log(Math.max(2, maxCount));
  const x = t * (HEAT_STOPS.length - 1);
  const i = Math.min(HEAT_STOPS.length - 2, Math.floor(x));
  const f = x - i;
  const c = HEAT_STOPS[i].map((a, k) => Math.round(a + (HEAT_STOPS[i + 1][k] - a) * f));
  if (active) return `rgb(${c.map((v) => Math.max(0, v - 35)).join(',')})`;
  return `rgb(${c.join(',')})`;
}

/* ---------- helpers ---------- */
type MatchFn = (c: Coauthor) => boolean;
type Sel = { kind: 'author'; value: number } | { kind: 'inst' | 'paper' | 'country'; value: string };

/* The site-wide query language (utils/searchQuery.ts) applied to the network. Every term is judged
   on an (author, paper) pair: person terms (author:, inst:, country:, h, papers) look at the author,
   paper terms (type:, jcr:, sjr:, year, cit) at the paper, plain words at both. An author matches
   when one of his papers makes a matching pair; a paper when one of its authors does. */
function buildGraphMatch(
  query: string,
  data: CoauthorData,
  paperOk: (p: PaperNode) => boolean,
  hasExtra: boolean
): { authors: Set<number>; papers: Set<string> } | null {
  const ast = parseQuery(query);
  if (!ast && !hasExtra) return null;
  const { coauthors, papers, paperAuthors } = data;
  const own = coauthors.map((c) => normalizeSearchText([c.name, c.firma, ...c.institutions, ...c.countries].join(' | ')));
  const insts = coauthors.map((c) => c.institutions.map(normalizeSearchText));
  const ctries = coauthors.map((c) => c.countries.map(normalizeSearchText));
  const ptext = new Map(papers.map((p) => [p.id, normalizeSearchText(`${p.title} | ${p.venue} | ${tagSearchText(p.topics, p.keywords)}`)]));
  const pair = (ci: number, p: PaperNode | null): boolean =>
    !ast ||
    matches(ast, (t) => {
      const c = coauthors[ci];
      if (t.kind === 'text') return own[ci].includes(t.value) || (!!p && ptext.get(p.id)!.includes(t.value));
      if (t.kind === 'field') {
        if (t.field === 'author') return normalizeSearchText(`${c.name} ${c.firma}`).includes(t.value);
        if (t.field === 'inst') return insts[ci].some((x) => x.includes(t.value));
        if (t.field === 'country') return ctries[ci].some((x) => x.includes(t.value));
        if (t.field === 'project' || t.field === 'call' || t.field === 'pi') return null; // projects are not in the graph
        if (t.field === 'topic' || t.field === 'keyword') return !!p && (t.field === 'topic' ? p.topics : p.keywords).some((x) => normalizeSearchText(x).includes(t.value));
        return !!p && paperFieldTest(t.field, t.value, p); // type / jcr / sjr / core
      }
      if (t.field === 'h') return compare(c.hindex, t.op, t.n);
      if (t.field === 'papers') return compare(c.papers, t.op, t.n);
      return !!p && compare(t.field === 'year' ? p.year : p.citations, t.op, t.n);
    });
  const authors = new Set<number>();
  const shown = new Set<string>();
  for (const p of papers) {
    if (!paperOk(p)) continue;
    for (const ci of paperAuthors[p.id] || []) {
      if (pair(ci, p)) {
        authors.add(ci);
        shown.add(p.id);
      }
    }
  }
  // co-authors without a linked paper can still match by who they are
  if (!hasExtra) coauthors.forEach((c, ci) => c.paperIds.length === 0 && pair(ci, null) && authors.add(ci));
  return { authors, papers: shown };
}

/* ---------- layout ---------- */
interface Layout {
  pos: { x: number; y: number }[];
  meIdx: number;
  graphIdxs: number[];
  instPos: Record<string, { x: number; y: number }>;
  instCount: Record<string, number>;
  instMembers: Record<string, number[]>;
  paperPos: Record<string, { x: number; y: number; r: number; anchor: number }>;
  paperExtra: Record<number, number>;
  maxPapers: number;
  maxH: number;
}

interface FocusSet {
  authors: Set<number>;
  insts: Set<string>;
  papers: Set<string>;
}

function layout(data: CoauthorData, focus?: FocusSet | null): Layout {
  const { coauthors, papers, paperAuthors } = data;
  const meIdx = Math.max(0, coauthors.findIndex((c) => c.me));
  const allIdxs = coauthors.map((c, i) => i).filter((i) => coauthors[i].inGraph && !coauthors[i].me);
  // a focused author is drawn even when he is not curated for the full graph (picked from the table)
  const graphIdxs = focus ? coauthors.map((c, i) => i).filter((i) => !coauthors[i].me && focus.authors.has(i)) : allIdxs;
  // one author with several papers: he sits in the centre and his papers fill the whole canvas
  const single = !!focus && graphIdxs.length === 1 && focus.papers.size > 1;
  // focused layouts stretch horizontally to use the full canvas width
  const xs = focus ? 1.55 : 1;
  const maxPapers = Math.max(1, ...allIdxs.map((i) => coauthors[i].papers));
  const maxH = Math.max(1, ...allIdxs.map((i) => coauthors[i].hindex), coauthors[meIdx].hindex);
  const cx = W / 2;
  const cy = H / 2;

  // every paper hangs from its primary (first visible, non-me) author
  const perAuthor: Record<number, string[]> = {};
  const paperExtra: Record<number, number> = {};
  const maxCit = Math.max(1, ...papers.map((p) => p.citations));
  for (const p of papers) {
    if (focus && !focus.papers.has(p.id)) continue;
    const visible = (paperAuthors[p.id] || []).filter((i) => graphIdxs.includes(i));
    const anchor = visible.length ? visible[0] : (paperAuthors[p.id] || []).includes(meIdx) ? meIdx : -1;
    if (anchor < 0) continue;
    (perAuthor[anchor] ||= []).push(p.id);
  }
  const paperById = new Map(papers.map((p) => [p.id, p]));
  for (const ids of Object.values(perAuthor)) ids.sort((a, b) => (paperById.get(b)?.citations || 0) - (paperById.get(a)?.citations || 0));
  const paperPos: Layout['paperPos'] = {};
  const paperR = (pid: string) => 8 + 13 * Math.sqrt((paperById.get(pid)?.citations || 0) / maxCit);

  // several focused authors (an institution, a paper): me in the centre and one angular sector per
  // author, sized by his number of papers, with his papers fanned outwards up to the canvas edge
  const sector = !!focus && !single && graphIdxs.length > 0;
  const SRX = 455;
  const SRY = 252;
  const authorAngle: Record<number, number> = {};

  const rings: number[][] = focus
    ? graphIdxs.length > 10
      ? [[], []]
      : [[]]
    : [[], [], []];
  if (focus) {
    const sorted = [...graphIdxs].sort((a, b) => coauthors[b].papers - coauthors[a].papers);
    sorted.forEach((i, j) => rings[j % rings.length].push(i));
  } else {
    for (const i of graphIdxs) {
      const p = coauthors[i].papers;
      rings[p >= 7 ? 0 : p >= 3 ? 1 : 2].push(i);
    }
  }
  const radii = focus ? (rings.length > 1 ? [140, 215] : [150]) : [105, 165, 225];
  const pos: { x: number; y: number }[] = new Array(coauthors.length).fill({ x: -100, y: -100 });
  pos[meIdx] = { x: cx, y: cy };
  if (single) {
    pos[graphIdxs[0]] = { x: cx, y: cy };
    pos[meIdx] = { x: cx - 92, y: cy };
  } else if (sector) {
    const order = [...graphIdxs].sort((a, b) => (perAuthor[b]?.length || 0) - (perAuthor[a]?.length || 0));
    const weight = (i: number) => 2 + Math.sqrt(perAuthor[i]?.length || 0);
    const total = order.reduce((sum, i) => sum + weight(i), 0);
    const ROWS = [0.72, 0.86, 1];
    // the first (busiest) author is centred on the right, so two authors end up left / right
    let start = -(weight(order[0]) / total) * Math.PI;
    for (const [oi, i] of order.entries()) {
      const width = (weight(i) / total) * Math.PI * 2;
      const mid = start + width / 2;
      authorAngle[i] = mid;
      // narrow sectors: neighbours alternate between two radii so their nodes do not pile up
      const rhoA = width * 170 < 46 ? (oi % 2 ? 0.58 : 0.4) : 0.48;
      pos[i] = { x: cx + SRX * rhoA * Math.cos(mid), y: cy + SRY * rhoA * Math.sin(mid) };
      const ids = perAuthor[i] || [];
      // papers per row follow the room each row has (outer rows are longer); most cited innermost
      const usable = Math.min(width * 0.86, Math.PI * 1.9);
      const caps = ROWS.map((rho) => Math.max(1, Math.floor((usable * rho * 350) / 48)));
      const capSum = caps.reduce((a, b) => a + b, 0);
      const counts = ids.length <= caps[1] && ids.length <= 4 ? [0, ids.length, 0] : caps.map((c) => Math.floor((ids.length * c) / capSum));
      for (let r = ROWS.length - 1; counts.reduce((a, b) => a + b, 0) < ids.length; r = (r + ROWS.length - 1) % ROWS.length) counts[r] += 1;
      let k = 0;
      ROWS.forEach((rho, r) => {
        for (let j = 0; j < counts[r]; j++, k++) {
          const a = mid - usable / 2 + (usable * (j + 0.5)) / counts[r];
          paperPos[ids[k]] = { x: cx + SRX * rho * Math.cos(a), y: cy + SRY * rho * Math.sin(a), r: paperR(ids[k]), anchor: i };
        }
      });
      start += width;
    }
  } else {
    rings.forEach((ring, ri) => {
      ring.sort((a, b) => coauthors[b].papers - coauthors[a].papers);
      ring.forEach((idx, j) => {
        const a = (j / ring.length) * Math.PI * 2 - Math.PI / 2 + ri * 0.35;
        pos[idx] = { x: cx + radii[ri] * xs * Math.cos(a), y: cy + radii[ri] * Math.sin(a) };
      });
    });
  }

  // institutions (every affiliation counts) on an outer ring
  const instCount: Record<string, number> = {};
  const instMembers: Record<string, number[]> = {};
  for (const i of allIdxs) {
    for (const inst of coauthors[i].institutions) {
      instCount[inst] = (instCount[inst] || 0) + 1;
      (instMembers[inst] ||= []).push(i);
    }
  }
  const insts = Object.keys(instCount)
    .filter((name) => !focus || focus.insts.has(name))
    .sort((a, b) => instCount[b] - instCount[a]);
  const instPos: Record<string, { x: number; y: number }> = {};
  const R = 272;
  insts.forEach((name, j) => {
    if (single) {
      // fan on the right of the author (me sits on the left)
      const a = (-65 + (130 * (j + 0.5)) / insts.length) * (Math.PI / 180);
      instPos[name] = { x: cx + 88 * Math.cos(a), y: cy + 88 * Math.sin(a) };
      return;
    }
    if (sector) return;
    const a = (j / insts.length) * Math.PI * 2 - Math.PI / 2;
    instPos[name] = { x: cx + R * (focus ? 1.7 : 1) * Math.cos(a), y: cy + R * 0.92 * Math.sin(a) };
  });
  if (sector) {
    // inner ring, each institution towards its members; those sharing a direction are fanned apart
    const dir: Record<string, number> = {};
    for (const name of insts) {
      const ms = graphIdxs.filter((i) => coauthors[i].institutions.includes(name));
      dir[name] = ms.length
        ? Math.atan2(ms.reduce((sum, i) => sum + Math.sin(authorAngle[i]), 0), ms.reduce((sum, i) => sum + Math.cos(authorAngle[i]), 0))
        : 0;
    }
    const sortedInsts = [...insts].sort((a, b) => dir[a] - dir[b]);
    const minGap = Math.min(0.55, (Math.PI * 2) / Math.max(1, sortedInsts.length));
    const ang = sortedInsts.map((n) => dir[n]);
    for (let pass = 0; pass < 4; pass++) {
      for (let j = 1; j < ang.length; j++) {
        if (ang[j] - ang[j - 1] < minGap) {
          const mid = (ang[j] + ang[j - 1]) / 2;
          ang[j - 1] = mid - minGap / 2;
          ang[j] = mid + minGap / 2;
        }
      }
    }
    sortedInsts.forEach((name, j) => {
      instPos[name] = { x: cx + SRX * 0.25 * Math.cos(ang[j]), y: cy + SRY * 0.3 * Math.sin(ang[j]) };
    });
  }

  // full graph: papers orbit their author, max 12 each
  for (const [anchorS, ids] of Object.entries(perAuthor)) {
    const anchor = Number(anchorS);
    if (sector && anchor !== meIdx) {
      paperExtra[anchor] = 0;
      continue; // already placed in the author's sector
    }
    const sorted = ids;
    if (single) {
      // every paper, spread evenly (sunflower pattern) over an elliptical ring that fills the canvas,
      // most cited closest to the author
      const n = sorted.length;
      const sc = Math.max(0.55, Math.min(1, Math.sqrt(n / 40)));
      const rx = 465 * sc;
      const ry = 262 * sc;
      const rho0 = Math.min(0.8, 118 / ry);
      paperExtra[anchor] = 0;
      sorted.forEach((pid, k) => {
        const p = paperById.get(pid)!;
        const rho = Math.sqrt(rho0 * rho0 + (1 - rho0 * rho0) * ((k + 0.5) / n));
        const a = k * 2.39996323;
        paperPos[pid] = {
          x: cx + rx * rho * Math.cos(a),
          y: cy + ry * rho * Math.sin(a),
          r: 8 + 13 * Math.sqrt(p.citations / maxCit),
          anchor,
        };
      });
      continue;
    }
    const shown = sorted.slice(0, 12);
    paperExtra[anchor] = sorted.length - shown.length;
    shown.forEach((pid, k) => {
      const p = paperById.get(pid)!;
      const a = (k / shown.length) * Math.PI * 2 + (anchor % 7) * 0.5;
      const rad = anchor === meIdx ? 46 + 14 * (k % 3) : focus ? 34 + 11 * (k % 3) : 26 + 9 * (k % 3);
      paperPos[pid] = {
        x: pos[anchor].x + rad * Math.cos(a),
        y: pos[anchor].y + rad * Math.sin(a),
        r: 8 + 13 * Math.sqrt(p.citations / maxCit),
        anchor,
      };
    });
  }

  return { pos, meIdx, graphIdxs, instPos, instCount, instMembers, paperPos, paperExtra, maxPapers, maxH };
}

/* ---------- component ---------- */
export default function CoauthorGraph({ data }: { data: CoauthorData }) {
  const [authed, setAuthed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hideGraph, setHideGraph] = useState(false);
  const [hideMap, setHideMap] = useState(false);
  const [hideTable, setHideTable] = useState(false);
  const [hideVenues, setHideVenues] = useState(false);
  const [hideTopics, setHideTopics] = useState(false);
  const [venueSort, setVenueSort] = useState<{ key: 'venue' | 'type' | 'papers' | 'citations' | 'last'; asc: boolean }>({ key: 'papers', asc: false });
  const [openVenue, setOpenVenue] = useState<string | null>(null);
  const [venueTypes, setVenueTypes] = useState({ Journal: true, Conference: true });
  // the same search as the rest of the site (nav bar, main page), kept for the session
  const { query, setQuery, selectedYears, papersFilters, years, toggleYear, clearYears, topicFilters, toggleTopic, clearTopics, keywordFilters, toggleKeyword, clearKeywords } = useSearch();
  // the year / paper chips of the main page are part of the query text, and apply here too
  const hasExtra = selectedYears.length > 0 || papersFilters.length > 0;
  const match = useMemo(
    () =>
      buildGraphMatch(
        query,
        data,
        (p) =>
          (selectedYears.length === 0 || selectedYears.includes(p.year)) &&
          papersFilterMatch(['Journal', 'Conference', 'Book'].includes(p.type) ? p.type : 'Other', p.jcr, papersFilters, p.sjr),
        hasExtra
      ),
    [query, data, selectedYears, papersFilters, hasExtra]
  );
  const [showPapers, setShowPapers] = useState(true);
  const [showAuthors, setShowAuthors] = useState(true);
  const [showInsts, setShowInsts] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [selInst, setSelInst] = useState<string | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [hoverPaper, setHoverPaper] = useState<string | null>(null);
  const [hoverInst, setHoverInst] = useState<string | null>(null);
  const [view, setView] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [selPaper, setSelPaper] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [hoverCountry, setHoverCountry] = useState<string | null>(null);
  const [selCountry, setSelCountry] = useState<string | null>(null);
  const [mapView, setMapView] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [sortKey, setSortKey] = useState<'name' | 'institution' | 'country' | 'hindex' | 'papers'>('papers');
  const [sortAsc, setSortAsc] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  // session history of what was shown in the side panel (back / forward)
  const [hist, setHist] = useState<Sel[]>([]);
  const [hidx, setHidx] = useState(-1);

  const { coauthors, papers, paperAuthors, countries } = data;
  const layBase = useMemo(() => layout(data), [data]);
  const focusSets = useMemo<FocusSet | null>(() => {
    const meIdx = layBase.meIdx;
    if (selected !== null && selected !== meIdx) {
      const a = coauthors[selected];
      return {
        authors: new Set([selected]),
        insts: new Set(a.institutions.filter((n) => layBase.instCount[n])),
        papers: new Set(Object.entries(paperAuthors).filter(([, arr]) => arr.includes(selected)).map(([pid]) => pid)),
      };
    }
    if (selInst !== null) {
      const members = layBase.instMembers[selInst] || [];
      return {
        authors: new Set(members),
        insts: new Set(members.flatMap((i) => coauthors[i].institutions.filter((n) => layBase.instCount[n]))),
        papers: new Set(Object.entries(paperAuthors).filter(([, arr]) => arr.some((a) => members.includes(a))).map(([pid]) => pid)),
      };
    }
    if (selPaper !== null) {
      const authors = (paperAuthors[selPaper] || []).filter((i) => coauthors[i].inGraph && !coauthors[i].me);
      return {
        authors: new Set(authors),
        insts: new Set(authors.flatMap((i) => coauthors[i].institutions.filter((n) => layBase.instCount[n]))),
        papers: new Set([selPaper]),
      };
    }
    return null;
  }, [selected, selInst, selPaper, coauthors, paperAuthors, layBase]);
  const layRaw = useMemo(() => (focusSets ? layout(data, focusSets) : layBase), [focusSets, layBase, data]);
  // nodes dragged by hand: offsets on top of the computed layout (a paper follows its author)
  const [deltas, setDeltas] = useState<Record<string, { x: number; y: number }>>({});
  const nodeDrag = useRef<{ key: string; x: number; y: number; dx: number; dy: number; moved: boolean } | null>(null);
  const justDragged = useRef(false);
  const lay = useMemo<Layout>(() => {
    if (Object.keys(deltas).length === 0) return layRaw;
    const d = (k: string) => deltas[k] || { x: 0, y: 0 };
    const aKey = (i: number) => (i === layRaw.meIdx ? 'me' : `a${i}`);
    return {
      ...layRaw,
      pos: layRaw.pos.map((p, i) => ({ x: p.x + d(aKey(i)).x, y: p.y + d(aKey(i)).y })),
      instPos: Object.fromEntries(Object.entries(layRaw.instPos).map(([n, p]) => [n, { x: p.x + d(`i:${n}`).x, y: p.y + d(`i:${n}`).y }])),
      paperPos: Object.fromEntries(
        Object.entries(layRaw.paperPos).map(([pid, pp]) => [
          pid,
          { ...pp, x: pp.x + d(`p:${pid}`).x + d(aKey(pp.anchor)).x, y: pp.y + d(`p:${pid}`).y + d(aKey(pp.anchor)).y },
        ])
      ),
    };
  }, [layRaw, deltas]);
  const paperById = useMemo(() => new Map(papers.map((p) => [p.id, p])), [papers]);

  useEffect(() => {
    setAuthed(isAuthenticated());
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    const onKey = (e: KeyboardEvent) => {
      // closing the panel never touches the graph: its focus stays as it is
      if (e.key === 'Escape') setPanelOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('keydown', onKey);
    };
  }, []);
  // a new search starts a new browsing history
  useEffect(() => {
    setHist([]);
    setHidx(-1);
  }, [query]);
  // links made with "Ref" (#net-a-…, #net-p-…, #net-i-…, #net-c-…) open the card of that
  // author / paper / institution / country
  useEffect(() => {
    const apply = () => {
      const m = window.location.hash.match(/^#net-([apic])-(.+)$/);
      if (!m) return;
      const id = decodeURIComponent(m[2]);
      let sel: Sel | null = null;
      if (m[1] === 'a') {
        const i = coauthors.findIndex((c) => !c.me && netId(c.name) === id);
        if (i >= 0) sel = { kind: 'author', value: i };
      } else if (m[1] === 'p') {
        const paper = papers.find((x) => netId(x.title) === id);
        if (paper) sel = { kind: 'paper', value: paper.id };
      } else if (m[1] === 'i') {
        const name = Object.keys(layBase.instCount).find((n) => netId(n) === id);
        if (name) sel = { kind: 'inst', value: name };
      } else if (WORLD_PATHS.some((f) => f.iso2 === id)) sel = { kind: 'country', value: id };
      if (!sel) return;
      const s2 = sel;
      setSelected(s2.kind === 'author' ? s2.value : null);
      setSelInst(s2.kind === 'inst' ? s2.value : null);
      setSelPaper(s2.kind === 'paper' ? s2.value : null);
      setSelCountry(s2.kind === 'country' ? s2.value : null);
      setPanelOpen(true);
      setHist((h) => {
        setHidx(h.length);
        return [...h, s2];
      });
    };
    apply();
    window.addEventListener('hashchange', apply);
    window.addEventListener('app-ref-nav', apply);
    return () => {
      window.removeEventListener('hashchange', apply);
      window.removeEventListener('app-ref-nav', apply);
    };
  }, [coauthors, papers, layBase]);
  // every new focus is re-laid out to fit the canvas: drop any previous pan/zoom
  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setDeltas({});
  }, [selected, selInst, selPaper]);
  if (!authed || coauthors.length === 0) return null;

  const idxOf = new Map(coauthors.map((c, i) => [c, i]));
  const matcher: MatchFn | null = match ? (c) => match.authors.has(idxOf.get(c)!) : null;
  const matchCount = matcher ? coauthors.filter(matcher).length : 0;
  /* headline numbers follow the filter, each with its share of the unfiltered total */
  const pctOf = (n: number, total: number) => `${total ? Math.round((n / total) * 1000) / 10 : 0}%`;
  const others = coauthors.filter((c) => !c.me);
  const shownAuthors = matcher ? others.filter(matcher) : others;
  const shownPapers = match ? papers.filter((p) => match.papers.has(p.id)) : papers;
  const allCountryNames = Object.keys(data.countries);
  const shownCountryNames = matcher ? allCountryNames.filter((n) => shownAuthors.some((c) => c.countries.includes(n))) : allCountryNames;
  // journals and conferences I have published in (follows the current filter)
  const venueKey = (v: string) => normalizeSearchText(v.replace(/\s+/g, ' ').trim().replace(/\.$/, ''));
  const buildVenues = (list: PaperNode[]) => {
    const map = new Map<string, { key: string; venue: string; type: string; papers: PaperNode[] }>();
    for (const p of list) {
      if ((p.type !== 'Journal' && p.type !== 'Conference') || !p.venue.trim()) continue;
      const key = `${p.type}|${venueKey(p.venue)}`;
      if (!map.has(key)) map.set(key, { key, venue: p.venue.replace(/\s+/g, ' ').trim().replace(/\.$/, ''), type: p.type, papers: [] });
      map.get(key)!.papers.push(p);
    }
    return [...map.values()].map((v) => {
      const yrs = v.papers.map((p) => p.year).filter(Boolean);
      return {
        ...v,
        papers: [...v.papers].sort((a, b) => b.year - a.year || b.citations - a.citations),
        count: v.papers.length,
        citations: v.papers.reduce((sum, p) => sum + p.citations, 0),
        first: yrs.length ? Math.min(...yrs) : 0,
        last: yrs.length ? Math.max(...yrs) : 0,
        jcr: [...new Set(v.papers.map((p) => p.jcr).filter(Boolean))].join(', '),
        sjr: [...new Set(v.papers.map((p) => p.sjr).filter(Boolean))].join(', '),
      };
    });
  };
  const allVenues = buildVenues(papers);
  const venueRows = buildVenues(shownPapers).filter((v) => venueTypes[v.type as 'Journal' | 'Conference']).sort((a, b) => {
    const k = venueSort.key;
    const d =
      k === 'venue' ? a.venue.localeCompare(b.venue)
      : k === 'type' ? a.type.localeCompare(b.type)
      : k === 'papers' ? a.count - b.count
      : k === 'citations' ? a.citations - b.citations
      : a.last - b.last;
    return (venueSort.asc ? d : -d) || b.count - a.count || b.citations - a.citations || a.venue.localeCompare(b.venue);
  });
  const stat = (n: number, total: number, noun: string) => (
    <span style={{ whiteSpace: 'nowrap' }}>
      <strong style={{ color: '#334155' }}>{n}</strong>
      {matcher ? ` of ${total}` : ''} {noun} <span style={{ color: '#94a3b8' }}>({pctOf(n, total)})</span>
    </span>
  );
  /* one thing selected at a time: it drives both the graph focus and the side panel */
  const show = (sel: Sel | null) => {
    setSelected(sel?.kind === 'author' ? sel.value : null);
    setSelInst(sel?.kind === 'inst' ? sel.value : null);
    setSelPaper(sel?.kind === 'paper' ? sel.value : null);
    setSelCountry(sel?.kind === 'country' ? sel.value : null);
    if (sel) setPanelOpen(true);
  };
  const pick = (kind: Sel['kind'] | null, value?: number | string | null) => {
    if (kind === null || value === null || value === undefined) return show(null);
    const sel = { kind, value } as Sel;
    const cur = hist[hidx];
    if (!cur || cur.kind !== sel.kind || cur.value !== sel.value) {
      const next = [...hist.slice(0, hidx + 1), sel];
      setHist(next);
      setHidx(next.length - 1);
    }
    show(sel);
  };
  const resetAll = () => pick(null);
  const startNodeDrag = (key: string) => (e: React.PointerEvent) => {
    e.stopPropagation(); // not a pan
    nodeDrag.current = { key, x: e.clientX, y: e.clientY, dx: deltas[key]?.x || 0, dy: deltas[key]?.y || 0, moved: false };
  };
  const endDrag = () => {
    if (nodeDrag.current?.moved) {
      // the click that ends a drag must not select the node
      justDragged.current = true;
      setTimeout(() => (justDragged.current = false), 0);
    }
    nodeDrag.current = null;
    drag.current = null;
  };
  const hasSel = selected !== null || selInst !== null || selPaper !== null || selCountry !== null;
  // with nothing on screen, "back" returns to the last thing that was shown
  const backIdx = hasSel ? hidx - 1 : hidx;
  const canBack = backIdx >= 0;
  const canFwd = hidx < hist.length - 1;
  const go = (i: number) => {
    setHidx(i);
    show(hist[i]);
  };
  /* in-panel link: opens the card of an author / paper / institution / country instead of leaving the page */
  const cardLink = (kind: Sel['kind'], value: number | string, label: React.ReactNode, key?: React.Key) => (
    <span
      key={key}
      role="link"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        pick(kind, value);
      }}
      onKeyDown={(e) => e.key === 'Enter' && pick(kind, value)}
      style={{ color: '#1d4ed8', cursor: 'pointer', pointerEvents: 'auto' }}
    >
      {label}
    </span>
  );
  // graph labels: short names as they are, otherwise the derived acronym (full name when two institutions share it)
  const sigUses: Record<string, number> = {};
  for (const n of Object.keys(layBase.instCount)) sigUses[instSigla(n)] = (sigUses[instSigla(n)] || 0) + 1;
  const shortInst = (name: string): string => (name.length <= 16 || sigUses[instSigla(name)] > 1 ? name : instSigla(name));
  // country cards list institution acronyms: back to the full name of a graph institution
  const instBySigla = (country: string, sig: string) =>
    coauthors
      .filter((c) => !c.me && c.countries.includes(country))
      .flatMap((c) => c.institutions)
      .find((n) => (n === sig || instSigla(n) === sig) && layBase.instCount[n]);
  const paperIdOf = (title: string, doi: string) => papers.find((p) => p.title === title && p.doi === doi)?.id;
  const authorIdxOf = (name: string) => coauthors.findIndex((c) => c.name === name);
  const joinNodes = (nodes: React.ReactNode[], sep: string) =>
    nodes.flatMap((n, i) => (i ? [sep, n] : [n]));
  const instMatch = (name: string) => !matcher || (layBase.instMembers[name] || []).some((a) => matcher(coauthors[a]));
  const paperMatch = (pid: string) => !match || match.papers.has(pid);

  const paperVisible = (pid: string) =>
    focusSets !== null ? focusSets.papers.has(pid) : showPapers;
  const authorR = (i: number) => 11 + 8 * Math.sqrt(coauthors[i].hindex / lay.maxH);

  /* focus: with a selection, everything else disappears and the graph re-layouts */
  const hasFocus = focusSets !== null;
  const authorInFocus = (i: number) => !focusSets || focusSets.authors.has(i);
  const instInFocus = (name: string) => !focusSets || focusSets.insts.has(name);
  const paperInFocus = (pid: string) => !focusSets || focusSets.papers.has(pid);
  const dim = (i: number) => (matcher && !matcher(coauthors[i]) ? 0.12 : 1);

  const focus = selected !== null ? selected : hovered;

  /* popup positioning: clamp inside the container, flip up near the bottom */
  const popupStyle = (v: { x: number; y: number; w: number; h: number }): React.CSSProperties => {
    const style: React.CSSProperties = {
      position: 'absolute',
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 10,
      boxShadow: '0 8px 24px rgba(15,23,42,0.14)',
      padding: '12px 14px',
      maxWidth: 320,
      fontSize: 13,
      zIndex: 6,
    };
    style.left = Math.max(8, Math.min(v.x + 14, v.w - 336));
    if (v.y > v.h * 0.55) style.bottom = Math.max(8, v.h - v.y + 12);
    else style.top = Math.max(8, v.y - 10);
    return style;
  };

  const popupAuthor = hovered !== null && hovered !== selected ? coauthors[hovered] : null;
  const popupPaper = hoverPaper !== null && hoverPaper !== selPaper ? paperById.get(hoverPaper) ?? null : null;
  const popupInst = hoverInst !== null && hoverInst !== selInst ? hoverInst : null;

  const sortedRows = (matcher ? coauthors.filter(matcher) : [...coauthors]).sort((a, b) => {
    const va = a[sortKey];
    const vb = b[sortKey];
    const cmp = typeof va === 'number' ? (va as number) - (vb as number) : String(va).localeCompare(String(vb));
    return sortAsc ? cmp : -cmp;
  });
  const toggleSort = (k: typeof sortKey) => {
    if (k === sortKey) setSortAsc(!sortAsc);
    else {
      setSortKey(k);
      setSortAsc(false);
    }
  };
  const arrow = (k: typeof sortKey) => (sortKey === k ? (sortAsc ? ' ▲' : ' ▼') : '');

  const countryByIso2: Record<string, (typeof countries)[string]> = {};
  for (const [name, a] of Object.entries(countries)) {
    const iso2 = NAME2ISO[name];
    if (iso2) countryByIso2[iso2] = a;
  }
  // with a filter, the map only counts the matching co-authors
  const countryCount: Record<string, number> = {};
  for (const c of coauthors) {
    if (c.me || (matcher && !matcher(c))) continue;
    for (const name of c.countries) {
      const iso2 = NAME2ISO[name];
      if (iso2) countryCount[iso2] = (countryCount[iso2] || 0) + 1;
    }
  }
  const maxCountryCount = Math.max(2, ...Object.values(countryCount));
  /* what Copy / Add / Ref act on in the side panel: the text of the card and the link that reopens it */
  const cardCopy = ((): { text: string; hash: string } | null => {
    if (selected !== null && selected !== layBase.meIdx) {
      const c = coauthors[selected];
      return {
        text: [
          `${c.name}.`,
          c.institutions.length ? `${c.institutions.join('; ')}${c.countries.length ? ` (${c.countries.join('; ')})` : ''}.` : '',
          c.hindex > 0 ? `h-index ${c.hindex}.` : '',
          `${c.papers} shared paper${c.papers === 1 ? '' : 's'}.`,
          c.scholar,
          c.orcid,
        ].filter(Boolean).join(' '),
        hash: `net-a-${netId(c.name)}`,
      };
    }
    if (selInst !== null) {
      const ms = (layBase.instMembers[selInst] || []).map((i) => coauthors[i].name);
      return { text: `${selInst}. Co-authors: ${ms.join(', ')}.`, hash: `net-i-${netId(selInst)}` };
    }
    if (selPaper !== null && paperById.get(selPaper)) {
      const pp = paperById.get(selPaper)!;
      const names = (paperAuthors[selPaper] || []).map((i) => coauthors[i].name).join(', ');
      return {
        text: [names ? `${names}.` : '', `${pp.title}.`, [pp.venue, pp.year || ''].filter(Boolean).join(', ') + '.', `${pp.citations} citations.`, pp.doi].filter(Boolean).join(' '),
        hash: `net-p-${netId(pp.title)}`,
      };
    }
    if (selCountry !== null && countryByIso2[selCountry]) {
      const info = countryByIso2[selCountry];
      return {
        text: `${info.name}: ${info.count} co-author${info.count === 1 ? '' : 's'}, ${info.papers} shared paper${info.papers === 1 ? '' : 's'}, ${info.citations} citations. Institutions: ${info.institutions.join(', ')}.`,
        hash: `net-c-${selCountry}`,
      };
    }
    return null;
  })();

  const btn: React.CSSProperties = {
    border: '1px solid #cbd5e1',
    background: '#fff',
    borderRadius: 6,
    padding: '2px 10px',
    cursor: 'pointer',
    fontSize: 13,
  };

  /* same round +/- button as the sections of the main page */
  const roundToggle = (open: boolean, onClick: () => void, what: string, size = 22) => (
    <button
      onClick={onClick}
      aria-label={`${open ? 'Collapse' : 'Expand'} ${what}`}
      aria-expanded={open}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '50%',
        border: 'none',
        background: '#1c2d2d',
        color: '#fff',
        fontWeight: 700,
        fontSize: size * 0.8,
        lineHeight: 1,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        marginRight: 8,
        verticalAlign: 'middle',
      }}
    >
      {open ? '−' : '+'}
    </button>
  );

  const panelBtn: React.CSSProperties = {
    border: '1px solid #cbd5e1',
    background: '#fff',
    borderRadius: 8,
    width: 32,
    height: 32,
    cursor: 'pointer',
    fontSize: 18,
    lineHeight: 1,
    color: '#475569',
    padding: 0,
    boxShadow: '0 1px 4px rgba(15,23,42,0.12)',
  };

  /* the same query drives the graph, the map and the table */
  const searchBox = (
    <input
      type="text"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder={SEARCH_PLACEHOLDER}
      aria-label="Filter co-authors"
      style={{
        flex: 1,
        minWidth: 0,
        width: '100%',
        maxWidth: '100%',
        flexBasis: 280,
        padding: '6px 10px',
        fontSize: 13,
        border: '1px solid #cbd5e1',
        borderRadius: 6,
        boxSizing: 'border-box',
      }}
    />
  );
  const matchInfo = matcher ? (
    <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
      {matchCount} match{matchCount === 1 ? '' : 'es'}
    </span>
  ) : null;

  const countryPopupBody = (info: (typeof countryByIso2)[string]) => (
    <>
      <div style={{ fontWeight: 700, marginBottom: 2 }}>{info.name}</div>
      <div>
        <strong>{info.count}</strong> co-author{info.count === 1 ? '' : 's'}
      </div>
      <div>
        <strong>{info.papers}</strong> shared paper{info.papers === 1 ? '' : 's'} · <strong>{info.citations}</strong> total citation{info.citations === 1 ? '' : 's'}
      </div>
      <div style={{ color: '#64748b', marginBottom: 6 }}>
        max h-index {info.maxH} · avg {info.avgH}
      </div>
      {info.institutions.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Institutions</div>
          <div style={{ fontSize: 12 }}>
            {joinNodes(
              info.institutions.map((sig) => {
                const full = instBySigla(info.name, sig);
                return full ? <span key={sig} title={full}>{cardLink('inst', full, sig)}</span> : sig;
              }),
              ' · '
            )}
          </div>
        </div>
      )}
      {info.topCited.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Top cited papers</div>
          {info.topCited.map((p, pi) => (
            <div key={pi} style={{ fontSize: 12 }}>
              {paperIdOf(p.title, p.doi) ? cardLink('paper', paperIdOf(p.title, p.doi)!, p.title.length > 55 ? p.title.slice(0, 55) + '…' : p.title) : p.title}{' '}
              <span style={{ color: '#94a3b8' }}>{p.citations} cit.</span>
            </div>
          ))}
        </div>
      )}
      {info.topH.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Top h-index</div>
          {info.topH.map((a) => (
            <div key={a.name} style={{ fontSize: 12 }}>
              {cardLink('author', authorIdxOf(a.name), a.name)}{' '}
              <span style={{ color: '#94a3b8' }}>h={a.hindex}</span>
            </div>
          ))}
        </div>
      )}
      {info.topPapers.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Most collaborations</div>
          {info.topPapers.map((a) => (
            <div key={a.name} style={{ fontSize: 12 }}>
              {cardLink('author', authorIdxOf(a.name), a.name)}{' '}
              <span style={{ color: '#94a3b8' }}>{a.papers} papers</span>
            </div>
          ))}
        </div>
      )}
    </>
  );


  return (
    <section style={{ marginTop: 24 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: 10,
        }}
      >
        {roundToggle(!collapsed, () => setCollapsed(!collapsed), 'the co-author network', 28)}
        <div style={{ flex: 1, minWidth: 240 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Co-author network</h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
            {stat(shownAuthors.length, others.length, 'co-authors')} · {stat(shownPapers.length, papers.length, 'papers')} ·{' '}
            {stat(shownCountryNames.length, allCountryNames.length, 'countries')}
            {matcher && <span style={{ color: '#94a3b8' }}> · filtered</span>}
          </p>
        </div>
      </div>

      {collapsed ? null : (
        <>
          {/* same year chips as the main page (they are part of the shared query) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              margin: '12px 0 0',
              padding: 14,
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 16,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginRight: 4 }}>Filter by year:</span>
            {[null, ...years].map((y) => {
              const on = y === null ? selectedYears.length === 0 : selectedYears.includes(y);
              return (
                <button
                  key={y ?? 'all'}
                  onClick={() => (y === null ? clearYears() : toggleYear(y))}
                  aria-pressed={on}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: `1px solid ${on ? '#2ecfba' : '#e7eae8'}`,
                    background: on ? '#2ecfba' : '#fff',
                    color: on ? '#fff' : '#5b6663',
                  }}
                >
                  {y === null ? 'All years' : String(y).slice(2)}
                </button>
              );
            })}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              margin: '10px 0 0',
              padding: 16,
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 16,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginRight: 4 }}>Filter by topic:</span>
            {[null, ...countTags(papers.map((p) => p.topics)).map((t) => t.name)].map((t) => {
              const on = t === null ? topicFilters.length === 0 : topicFilters.includes(normalizeSearchText(t));
              return (
                <button
                  key={t ?? 'all'}
                  onClick={() => (t === null ? clearTopics() : toggleTopic(t))}
                  aria-pressed={on}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: `1px solid ${on ? '#2ecfba' : '#e7eae8'}`,
                    background: on ? '#2ecfba' : '#fff',
                    color: on ? '#fff' : '#5b6663',
                  }}
                >
                  {t ?? 'All topics'}
                </button>
              );
            })}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
              margin: '10px 0 0',
              padding: 16,
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 16,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginRight: 4 }}>Filter by keyword:</span>
            {[null, ...countTags(papers.map((p) => p.keywords)).map((t) => t.name)].map((t) => {
              const on = t === null ? keywordFilters.length === 0 : keywordFilters.includes(normalizeSearchText(t));
              return (
                <button
                  key={t ?? 'all'}
                  onClick={() => (t === null ? clearKeywords() : toggleKeyword(t))}
                  aria-pressed={on}
                  style={{
                    padding: '2px 10px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: `1px solid ${on ? '#2ecfba' : '#e7eae8'}`,
                    background: on ? '#2ecfba' : '#fff',
                    color: on ? '#fff' : '#5b6663',
                  }}
                >
                  {t === null ? 'All keywords' : `#${t}`}
                </button>
              );
            })}
          </div>

          <h3 style={{ margin: '14px 0 0', fontSize: 16, display: 'flex', alignItems: 'center' }}>
            {roundToggle(!hideGraph, () => setHideGraph(!hideGraph), 'the graph')}
            Graph
          </h3>
          <div style={{ display: hideGraph ? 'none' : undefined }}>
          {/* controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', margin: '12px 0 8px' }}>
            {searchBox}
            <label style={{ fontSize: 13, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={showAuthors} onChange={(e) => setShowAuthors(e.target.checked)} />
              Authors
            </label>
            <label style={{ fontSize: 13, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={showInsts} onChange={(e) => setShowInsts(e.target.checked)} />
              Institutions
            </label>
            <label style={{ fontSize: 13, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={showPapers} onChange={(e) => setShowPapers(e.target.checked)} />
              Papers
            </label>
            {matchInfo}
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button style={btn} onClick={() => setZoom((z) => Math.max(0.4, z / 1.25))}>−</button>
              <button style={btn} onClick={() => setZoom((z) => Math.min(4, z * 1.25))}>+</button>
            </span>
          </div>

          {/* graph */}
          <div
            style={{
              position: 'relative',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              overflow: 'hidden',
              background: '#fbfdff',
            }}
            onMouseMove={(e) => {
              if ((e.target as Element).closest?.('[data-popup]')) return;
              const r = e.currentTarget.getBoundingClientRect();
              setView({ x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height });
            }}
            onMouseLeave={() => {
              setHovered(null);
              setHoverPaper(null);
              setHoverInst(null);
              setView(null);
            }}
          >
            <svg
              viewBox={`0 0 ${W} ${H}`}
              style={{ width: '100%', display: 'block', cursor: drag.current ? 'grabbing' : 'grab', userSelect: 'none', WebkitUserSelect: 'none' }}
              onPointerDown={(e) => {
                // pan with the mouse only: a finger on the background keeps scrolling the page
                if (e.pointerType === 'mouse') drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
              }}
              onPointerMove={(e) => {
                const scale = W / e.currentTarget.getBoundingClientRect().width;
                const nd = nodeDrag.current;
                if (nd) {
                  const px = e.clientX - nd.x;
                  const py = e.clientY - nd.y;
                  if (!nd.moved && Math.hypot(px, py) < 4) return;
                  nd.moved = true;
                  setDeltas((prev) => ({ ...prev, [nd.key]: { x: nd.dx + (px * scale) / zoom, y: nd.dy + (py * scale) / zoom } }));
                } else if (drag.current) {
                  setOffset({
                    x: drag.current.ox + (e.clientX - drag.current.x) * scale,
                    y: drag.current.oy + (e.clientY - drag.current.y) * scale,
                  });
                }
              }}
              onPointerUp={endDrag}
              onPointerLeave={endDrag}
              onPointerCancel={endDrag}
              onClickCapture={(e) => {
                if (justDragged.current) {
                  e.stopPropagation();
                  justDragged.current = false;
                }
              }}
            >
              <g transform={`translate(${offset.x} ${offset.y}) scale(${zoom})`}>
                {/* edges: me -> author */}
                {showAuthors && lay.graphIdxs.map((i) => (
                  <line
                    key={`e${i}`}
                    x1={lay.pos[lay.meIdx].x}
                    y1={lay.pos[lay.meIdx].y}
                    x2={lay.pos[i].x}
                    y2={lay.pos[i].y}
                    stroke={focus === i ? '#333' : 'rgba(70,80,100,0.28)'}
                    strokeWidth={1 + 4 * Math.sqrt(coauthors[i].papers / lay.maxPapers)}
                    opacity={hasFocus && !authorInFocus(i) ? 0.05 : matcher && !matcher(coauthors[i]) ? 0.06 : 1}
                  />
                ))}
                {/* edges: author -> every affiliation */}
                {showAuthors && showInsts && lay.graphIdxs.flatMap((i) =>
                  coauthors[i].institutions.map((inst) => {
                    if (!lay.instPos[inst]) return null;
                    const active = focus === i || hoverInst === inst || selInst === inst;
                    if (!instMatch(inst)) return null;
                    return (
                      <line
                        key={`ei${i}-${inst}`}
                        x1={lay.pos[i].x}
                        y1={lay.pos[i].y}
                        x2={lay.instPos[inst].x}
                        y2={lay.instPos[inst].y}
                        stroke={active ? COL_INST : 'rgba(91,125,177,0.28)'}
                        strokeWidth={active ? 1.4 : 0.7}
                        opacity={hasFocus && !(authorInFocus(i) && instInFocus(inst)) ? 0.04 : matcher && !matcher(coauthors[i]) ? 0.05 : 1}
                      />
                    );
                  })
                )}
                {/* edges: author -> paper */}
                {Object.entries(lay.paperPos).map(([pid, pp]) =>
                  paperVisible(pid) && paperMatch(pid) && (showAuthors || pp.anchor === lay.meIdx) ? (
                    <line
                      key={`ep${pid}`}
                      x1={lay.pos[pp.anchor].x}
                      y1={lay.pos[pp.anchor].y}
                      x2={pp.x}
                      y2={pp.y}
                      stroke="rgba(240,168,64,0.55)"
                      strokeWidth={0.8}
                      opacity={hasFocus && !paperInFocus(pid) ? 0.1 : 1}
                    />
                  ) : null
                )}
                {/* every paper I sign is tied to me as well (the only link left when authors are hidden) */}
                {Object.entries(lay.paperPos).map(([pid, pp]) => {
                  if (!paperVisible(pid) || !paperMatch(pid) || pp.anchor === lay.meIdx) return null;
                  if (!(paperAuthors[pid] || []).includes(lay.meIdx)) return null;
                  const ax = lay.pos[lay.meIdx].x;
                  const ay = lay.pos[lay.meIdx].y;
                  const mx = (ax + pp.x) / 2 - (pp.y - ay) * 0.1;
                  const my = (ay + pp.y) / 2 + (pp.x - ax) * 0.1;
                  return (
                    <path
                      key={`epme${pid}`}
                      d={`M${ax} ${ay} Q${mx} ${my} ${pp.x} ${pp.y}`}
                      fill="none"
                      stroke={showAuthors ? 'rgba(240,168,64,0.32)' : 'rgba(240,168,64,0.6)'}
                      strokeWidth={0.8}
                      opacity={hasFocus && !paperInFocus(pid) ? 0.1 : 1}
                    />
                  );
                })}
                {/* a paper is tied to every visible author, not only to the one it orbits */}
                {showAuthors &&
                  Object.entries(lay.paperPos).flatMap(([pid, pp]) =>
                    paperVisible(pid) && paperMatch(pid)
                      ? (paperAuthors[pid] || [])
                          .filter((a) => a !== pp.anchor && a !== lay.meIdx && lay.graphIdxs.includes(a))
                          .map((a) => {
                            // curved, so it never hides behind a straight edge that runs the same way
                            const ax = lay.pos[a].x;
                            const ay = lay.pos[a].y;
                            const mx = (ax + pp.x) / 2 - (pp.y - ay) * 0.16;
                            const my = (ay + pp.y) / 2 + (pp.x - ax) * 0.16;
                            return (
                              <path
                                key={`ep${pid}-${a}`}
                                d={`M${ax} ${ay} Q${mx} ${my} ${pp.x} ${pp.y}`}
                                fill="none"
                                stroke={hasFocus ? 'rgba(240,168,64,0.55)' : 'rgba(240,168,64,0.4)'}
                                strokeWidth={0.8}
                              />
                            );
                          })
                      : []
                  )}

                {/* institution nodes */}
                {Object.entries(lay.instPos).map(([name, p]) => {
                  if (!showInsts || !instMatch(name)) return null;
                  const n = lay.instCount[name];
                  const r = 7 + 5 * Math.sqrt(n / Math.max(1, ...Object.values(lay.instCount)));
                  const active = hoverInst === name || selInst === name;
                  const off = hasFocus && !instInFocus(name);
                  return (
                    <g
                      key={`inst-${name}`}
                      onMouseEnter={() => setHoverInst(name)}
                      onMouseLeave={() => setHoverInst(null)}
                      style={{ cursor: 'pointer', touchAction: 'none' }}
                      onPointerDown={startNodeDrag(`i:${name}`)}
                      onClick={() => pick('inst', selInst === name ? null : name)}
                    >
                      {selInst === name && <circle cx={p.x} cy={p.y} r={r + 5} fill="none" stroke={COL_INST} strokeWidth={2} />}
                      <circle cx={p.x} cy={p.y} r={r} fill={off ? COL_DIM : active ? '#46679a' : COL_INST} stroke="#fff" strokeWidth={1.5} opacity={off ? 0.6 : 1} />
                      <text x={p.x} y={p.y + r + 10} textAnchor="middle" fontSize={8.5} fill={off ? '#a7b2c2' : '#5b7db1'} fontWeight={600}>
                        {shortInst(name)}
                      </text>
                    </g>
                  );
                })}

                {/* paper nodes */}
                {Object.entries(lay.paperPos).map(([pid, pp]) => {
                  if (!paperVisible(pid) || !paperMatch(pid)) return null;
                  const p = paperById.get(pid)!;
                  const active = hoverPaper === pid;
                  const off = hasFocus && !paperInFocus(pid);
                  return (
                    <g
                      key={pid}
                      onMouseEnter={() => setHoverPaper(pid)}
                      onMouseLeave={() => setHoverPaper(null)}
                      style={{ cursor: 'pointer', touchAction: 'none' }}
                      onPointerDown={startNodeDrag(`p:${pid}`)}
                      onClick={() => pick('paper', selPaper === pid ? null : pid)}
                      opacity={off ? 0.35 : 1}
                    >
                      <circle cx={pp.x} cy={pp.y} r={pp.r} fill={off ? COL_DIM : active ? '#d98a1e' : COL_PAPER} stroke="#fff" strokeWidth={1.5} />
                      <text x={pp.x} y={pp.y + 3} textAnchor="middle" fontSize={Math.max(7, pp.r * 0.72)} fontWeight={700} fill="#fff">
                        {p.yy}
                      </text>
                      <text x={pp.x} y={pp.y + pp.r + 9} textAnchor="middle" fontSize={8} fill={off ? '#a7b2c2' : '#b57708'} fontWeight={600}>
                        {p.citations}
                      </text>
                    </g>
                  );
                })}

                {/* author nodes */}
                {showAuthors && lay.graphIdxs.map((i) => {
                  const c = coauthors[i];
                  const r = authorR(i);
                  const active = focus === i;
                  const off = hasFocus && !authorInFocus(i);
                  return (
                    <g
                      key={i}
                      opacity={off ? 0.45 : dim(i)}
                      style={{ cursor: 'pointer', touchAction: 'none' }}
                      onPointerDown={startNodeDrag(`a${i}`)}
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => pick('author', selected === i ? null : i)}
                    >
                      {selected === i && <circle cx={lay.pos[i].x} cy={lay.pos[i].y} r={r + 5} fill="none" stroke={COL_AUTHOR} strokeWidth={2} />}
                      <circle cx={lay.pos[i].x} cy={lay.pos[i].y} r={r} fill={off ? COL_DIM : active ? '#0e9c8c' : COL_AUTHOR} stroke="#fff" strokeWidth={2} />
                      <text x={lay.pos[i].x} y={lay.pos[i].y + r * 0.38} textAnchor="middle" fontSize={Math.max(9, r * 0.62)} fontWeight={700} fill="#fff">
                        {c.initials}
                      </text>
                    </g>
                  );
                })}

                {/* me */}
                <g
                  style={{ cursor: 'pointer', touchAction: 'none' }}
                  onPointerDown={startNodeDrag('me')}
                  onMouseEnter={() => setHovered(lay.meIdx)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={resetAll}
                >
                  <circle cx={lay.pos[lay.meIdx].x} cy={lay.pos[lay.meIdx].y} r={26} fill={COL_ME} stroke="#fff" strokeWidth={3} />
                  <text x={lay.pos[lay.meIdx].x} y={lay.pos[lay.meIdx].y + 5} textAnchor="middle" fontSize={13} fontWeight={800} fill="#fff">
                    {coauthors[lay.meIdx]?.initials || 'JC'}
                  </text>
                  <text x={lay.pos[lay.meIdx].x} y={lay.pos[lay.meIdx].y + 40} textAnchor="middle" fontSize={11} fontWeight={700} fill={COL_ME}>
                    Javier Conde
                  </text>
                </g>
              </g>
            </svg>

            {/* mobile: popup content below the graph */}
            {isMobile && (popupPaper || popupAuthor || popupInst) && (
              <div style={{ borderTop: '1px solid #e2e8f0', padding: '12px 14px', fontSize: 13, background: '#fff' }}>
                {popupPaper ? (
                  <>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{popupPaper.title}</div>
                    <div style={{ color: '#64748b', marginBottom: 4 }}>
                      {popupPaper.year}
                      {popupPaper.venue ? ` · ${popupPaper.venue}` : ''}
                    </div>
                    <div style={{ marginBottom: 4 }}>
                      <strong>{popupPaper.citations}</strong> citation{popupPaper.citations === 1 ? '' : 's'}
                      {popupPaper.jcr && (
                        <span style={{ marginLeft: 8, background: '#eef2ff', color: '#4338ca', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>
                          {popupPaper.jcr}
                        </span>
                      )}
                    </div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>
                      {(paperAuthors[popupPaper.id] || []).map((i) => coauthors[i].name).join(', ') || '—'}
                    </div>
                    {popupPaper.doi && (
                      <div style={{ marginTop: 4, fontSize: 12 }}>
                        <a href={popupPaper.doi} target="_blank" rel="noreferrer" style={{ color: '#2563eb', pointerEvents: 'auto' }}>
                          Open the paper ↗
                        </a>
                      </div>
                    )}
                  </>
                ) : popupInst ? (
                  <>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>{popupInst}</div>
                    <div style={{ marginBottom: 4 }}>
                      <strong>{lay.instCount[popupInst]}</strong> co-author{lay.instCount[popupInst] === 1 ? '' : 's'} in the graph
                    </div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>
                      {(lay.instMembers[popupInst] || [])
                        .slice()
                        .sort((a, b) => coauthors[b].papers - coauthors[a].papers)
                        .slice(0, 5)
                        .map((i) => (
                          <div key={i}>• {coauthors[i].name}</div>
                        ))}
                    </div>
                  </>
                ) : popupAuthor ? (
                  <>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>{popupAuthor.name}</div>
                    <div style={{ color: '#64748b', marginBottom: 4 }}>
                      {popupAuthor.institutions.join('; ') || '—'}
                      {popupAuthor.countries.length ? ` · ${popupAuthor.countries.join('; ')}` : ''}
                    </div>
                    <div style={{ marginBottom: 4 }}>
                      <strong>{popupAuthor.papers}</strong> shared paper{popupAuthor.papers === 1 ? '' : 's'}
                      {popupAuthor.hindex > 0 && (
                        <>
                          {' · '}h-index <strong>{popupAuthor.hindex}</strong>
                        </>
                      )}
                    </div>
                    {popupAuthor.scholar && (
                      <div style={{ fontSize: 12 }}>
                        <a href={popupAuthor.scholar} target="_blank" rel="noreferrer" style={{ color: '#2563eb', pointerEvents: 'auto' }}>
                          Google Scholar ↗
                        </a>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            )}

            {/* popup: paper */}
            {popupPaper && view && !isMobile && (
              <div data-popup style={{ ...popupStyle(view), pointerEvents: 'none' }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{popupPaper.title}</div>
                <div style={{ color: '#64748b', marginBottom: 4 }}>
                  {popupPaper.year}
                  {popupPaper.venue ? ` · ${popupPaper.venue}` : ''}
                </div>
                <div style={{ marginBottom: 4 }}>
                  <strong>{popupPaper.citations}</strong> citation{popupPaper.citations === 1 ? '' : 's'}
                </div>
                {popupPaper.jcr && (
                  <div style={{ marginBottom: 4 }}>
                    <span style={{ background: '#eef2ff', color: '#4338ca', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>
                      {popupPaper.jcr}
                    </span>
                  </div>
                )}
                <div style={{ color: '#64748b', fontSize: 12 }}>
                  {(paperAuthors[popupPaper.id] || []).map((i) => coauthors[i].name).join(', ') || '—'}
                </div>
                {popupPaper.doi && (
                  <div style={{ marginTop: 4, fontSize: 12 }}>
                    <a href={popupPaper.doi} target="_blank" rel="noreferrer" style={{ color: '#2563eb', pointerEvents: 'auto' }}>
                      Open the paper ↗
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* popup: institution */}
            {popupInst && !popupPaper && view && !isMobile && (
              <div data-popup style={{ ...popupStyle(view), pointerEvents: 'none' }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>{popupInst}</div>
                <div style={{ marginBottom: 4 }}>
                  <strong>{lay.instCount[popupInst]}</strong> co-author{lay.instCount[popupInst] === 1 ? '' : 's'} in the graph
                </div>
                <div style={{ color: '#64748b', fontSize: 12 }}>
                  {(lay.instMembers[popupInst] || [])
                    .slice()
                    .sort((a, b) => coauthors[b].papers - coauthors[a].papers)
                    .slice(0, 5)
                    .map((i) => (
                      <div key={i}>• {coauthors[i].name}</div>
                    ))}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>
                  Click to {selInst === popupInst ? 'release' : 'focus'} this institution
                </div>
              </div>
            )}

            {/* popup: author */}
            {popupAuthor && !popupPaper && !popupInst && view && !isMobile && (
              <div data-popup style={{ ...popupStyle(view), pointerEvents: 'none' }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>{popupAuthor.name}</div>
                <div style={{ color: '#64748b', marginBottom: 4 }}>
                  {popupAuthor.institutions.join('; ') || '—'}
                  {popupAuthor.countries.length ? ` · ${popupAuthor.countries.join('; ')}` : ''}
                </div>
                <div style={{ marginBottom: 4 }}>
                  <strong>{popupAuthor.papers}</strong> shared paper{popupAuthor.papers === 1 ? '' : 's'}
                  {popupAuthor.hindex > 0 && (
                    <>
                      {' · '}h-index <strong>{popupAuthor.hindex}</strong>
                    </>
                  )}
                </div>
                {popupAuthor.paperIds.length > 0 && (
                  <div style={{ color: '#64748b', fontSize: 12 }}>
                    {popupAuthor.paperIds
                      .map((pid) => paperById.get(pid)!)
                      .filter(Boolean)
                      .sort((a, b) => b.citations - a.citations)
                      .slice(0, 4)
                      .map((p) => (
                        <div key={p.id}>• {p.title.length > 62 ? p.title.slice(0, 62) + '…' : p.title}</div>
                      ))}
                    {lay.paperExtra[focus!] > 0 && <div>+{lay.paperExtra[focus!]} more in the graph</div>}
                  </div>
                )}
                {!popupAuthor.me && (
                  <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>
                    Click to {selected === focus ? 'release the focus' : 'isolate their network'}
                    {popupAuthor.scholar && (
                      <>
                        {' · '}
                        <a href={popupAuthor.scholar} target="_blank" rel="noreferrer" style={{ color: '#2563eb', pointerEvents: 'auto' }}>
                          Scholar ↗
                        </a>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* legend */}
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 12, color: '#475569', margin: '8px 2px 0' }}>
            <span><i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 5, background: COL_ME, marginRight: 5 }} />Javier</span>
            <span><i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 5, background: COL_AUTHOR, marginRight: 5 }} />Co-author (initials)</span>
            <span><i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 5, background: COL_INST, marginRight: 5 }} />Institution</span>
            <span><i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 5, background: COL_PAPER, marginRight: 5 }} />Paper (year, citations below)</span>
            <span style={{ color: '#94a3b8' }}>
              Node size = h-index · edge width = shared publications · click a node to isolate its network · click JC to bring
              everyone back · drag a node to move it · drag the background to pan · +/− to zoom
            </span>
          </div>
          </div>


          {/* side panel (below the nav bar, over the page): card of the clicked node / country / table row */}
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            aria-label={panelOpen ? 'Hide side panel' : 'Show side panel'}
            title={panelOpen ? 'Hide side panel' : 'Show side panel'}
            style={{
              position: 'fixed',
              top: 68,
              right: panelOpen ? 'min(360px, 88vw)' : 0,
              zIndex: 46,
              width: 28,
              height: 44,
              border: '1px solid #cbd5e1',
              borderRight: 'none',
              borderRadius: '8px 0 0 8px',
              background: '#fff',
              boxShadow: '-3px 2px 8px rgba(15,23,42,0.12)',
              cursor: 'pointer',
              fontSize: 17,
              lineHeight: 1,
              color: '#475569',
              padding: 0,
            }}
          >
            {panelOpen ? '»' : '«'}
          </button>
          {panelOpen && (
            <div
              style={{
                position: 'fixed',
                top: 56,
                right: 0,
                width: 'min(360px, 88vw)',
                height: 'calc(100dvh - 56px)',
                background: 'rgba(255,255,255,0.8)',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)',
                borderLeft: '1px solid #e2e8f0',
                boxShadow: '-8px 0 24px rgba(15,23,42,0.12)',
                zIndex: 45,
                padding: '0 20px 40px',
                overflowY: 'auto',
                overflowWrap: 'anywhere',
                fontSize: 14,
                color: '#0f172a',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ position: 'sticky', top: 0, zIndex: 1, display: 'flex', gap: 6, alignItems: 'center', padding: '10px 0 6px', margin: '0 -8px' }}>
                {([
                  ['‹', 'Back', canBack, () => go(backIdx)],
                  ['›', 'Forward', canFwd, () => go(hidx + 1)],
                ] as [string, string, boolean, () => void][]).map(([glyph, label, enabled, fn]) => (
                  <button
                    key={label}
                    onClick={fn}
                    disabled={!enabled}
                    aria-label={label}
                    title={label}
                    style={{ ...panelBtn, opacity: enabled ? 1 : 0.4, cursor: enabled ? 'pointer' : 'default' }}
                  >
                    {glyph}
                  </button>
                ))}
                <button onClick={() => setPanelOpen(false)} aria-label="Close panel" title="Close (Esc)" style={{ ...panelBtn, marginLeft: 'auto' }}>
                  ×
                </button>
              </div>
              {cardCopy && (
                <div style={{ margin: '0 0 8px -8px' }}>
                  <CopyButton key={cardCopy.hash} text={cardCopy.text} refHash={cardCopy.hash} />
                </div>
              )}
              {!hasSel && (
                <div style={{ color: '#64748b', fontSize: 13, marginTop: 8 }}>
                  Nothing selected. Click a node in the graph, a country on the map or a row of the table to see its details here.
                </div>
              )}
              {selCountry !== null && countryByIso2[selCountry] && (
                <div style={{ fontSize: 14 }}>{countryPopupBody(countryByIso2[selCountry])}</div>
              )}
              {selected !== null && selected !== lay.meIdx && (
                <>
                  <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 2 }}>{coauthors[selected].name}</div>
                  <div style={{ color: '#64748b', marginBottom: 8 }}>
                    {coauthors[selected].institutions.length
                      ? joinNodes(
                          coauthors[selected].institutions.map((n) => (layBase.instCount[n] ? cardLink('inst', n, n, `i-${n}`) : n)),
                          '; '
                        )
                      : '—'}
                    {coauthors[selected].countries.length > 0 && ' · '}
                    {joinNodes(
                      coauthors[selected].countries.map((n) => (countryByIso2[NAME2ISO[n]] ? cardLink('country', NAME2ISO[n], n, `c-${n}`) : n)),
                      '; '
                    )}
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <strong>{coauthors[selected].papers}</strong> shared paper{coauthors[selected].papers === 1 ? '' : 's'}
                    {coauthors[selected].hindex > 0 && (
                      <>
                        {' · '}h-index <strong>{coauthors[selected].hindex}</strong>
                      </>
                    )}
                  </div>
                  {(coauthors[selected].scholar || coauthors[selected].orcid) && (
                    <div style={{ marginBottom: 10 }}>
                      {coauthors[selected].scholar && (
                        <a href={coauthors[selected].scholar} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>
                          Google Scholar ↗
                        </a>
                      )}
                      {coauthors[selected].scholar && coauthors[selected].orcid && ' · '}
                      {coauthors[selected].orcid && (
                        <a href={coauthors[selected].orcid} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>
                          ORCID {coauthors[selected].orcid.slice(-19)} ↗
                        </a>
                      )}
                    </div>
                  )}
                  <div style={{ fontWeight: 700, margin: '12px 0 6px' }}>Shared papers</div>
                  {coauthors[selected].paperIds
                    .map((pid) => paperById.get(pid)!)
                    .filter(Boolean)
                    .sort((a, b) => b.citations - a.citations)
                    .map((p) => (
                      <div key={p.id} style={{ marginBottom: 8, fontSize: 13 }}>
                        {cardLink('paper', p.id, p.title)}
                        <div style={{ color: '#64748b', fontSize: 12 }}>
                          {p.year}
                          {p.venue ? ` · ${p.venue}` : ''} · {p.citations} citation{p.citations === 1 ? '' : 's'}
                          {p.jcr ? ` · ${p.jcr}` : ''}
                        </div>
                      </div>
                    ))}
                </>
              )}
              {selInst !== null && (
                <>
                  <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 6 }}>{selInst}</div>
                  <div style={{ marginBottom: 10 }}>
                    <strong>{layBase.instCount[selInst]}</strong> co-author{layBase.instCount[selInst] === 1 ? '' : 's'} in the graph
                  </div>
                  <div style={{ fontWeight: 700, margin: '12px 0 6px' }}>Members</div>
                  {(layBase.instMembers[selInst] || [])
                    .slice()
                    .sort((a, b) => coauthors[b].papers - coauthors[a].papers)
                    .map((i) => (
                      <div key={i} style={{ padding: '4px 0', fontSize: 13 }}>
                        {cardLink('author', i, coauthors[i].name)}
                        <span style={{ color: '#64748b' }}>
                          {' '}
                          · {coauthors[i].papers} paper{coauthors[i].papers === 1 ? '' : 's'}
                          {coauthors[i].hindex > 0 ? ` · h-index ${coauthors[i].hindex}` : ''}
                        </span>
                      </div>
                    ))}
                </>
              )}
              {selPaper !== null && paperById.get(selPaper) && (
                <>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>{paperById.get(selPaper)!.title}</div>
                  <div style={{ color: '#64748b', marginBottom: 6 }}>
                    {paperById.get(selPaper)!.year}
                    {paperById.get(selPaper)!.venue ? ` · ${paperById.get(selPaper)!.venue}` : ''}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>{paperById.get(selPaper)!.citations}</strong> citation{paperById.get(selPaper)!.citations === 1 ? '' : 's'}
                    {paperById.get(selPaper)!.jcr && (
                      <span style={{ background: '#eef2ff', color: '#4338ca', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700, marginLeft: 6 }}>
                        {paperById.get(selPaper)!.jcr}
                      </span>
                    )}
                  </div>
                  <div style={{ fontWeight: 700, margin: '12px 0 6px' }}>Authors</div>
                  <div style={{ color: '#475569', fontSize: 13, marginBottom: 10 }}>
                    {(paperAuthors[selPaper] || []).length
                      ? joinNodes(
                          (paperAuthors[selPaper] || []).map((i) => (coauthors[i].me ? coauthors[i].name : cardLink('author', i, coauthors[i].name, i))),
                          ', '
                        )
                      : '—'}
                  </div>
                  {paperById.get(selPaper)!.doi && (
                    <a href={paperById.get(selPaper)!.doi} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>
                      Open the paper ↗
                    </a>
                  )}
                </>
              )}
              {hasFocus && <div style={{ marginTop: 18, fontSize: 12, color: '#94a3b8' }}>Closing this panel keeps the graph as it is. Click JC in the graph to bring everyone back.</div>}
            </div>
          )}

          {/* second graph: papers, topics and keywords only */}
          <div style={{ marginTop: 26 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>
              {roundToggle(!hideTopics, () => setHideTopics(!hideTopics), 'the topics graph')}
              Topics and keywords{' '}
              <span style={{ fontWeight: 500, fontSize: 13, color: '#64748b' }}>{stat(shownPapers.length, papers.length, 'papers')}</span>
            </h3>
            <div style={{ display: hideTopics ? 'none' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', margin: '0 0 8px' }}>
                {searchBox}
                {matchInfo}
              </div>
              <TopicGraph papers={shownPapers} selPaper={selPaper} onPaper={(id) => pick('paper', selPaper === id ? null : id)} />
            </div>
          </div>

          {/* world map (heatmap) */}
          <div style={{ marginTop: 26 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>
              {roundToggle(!hideMap, () => setHideMap(!hideMap), 'the map')}
              Collaborations around the world{' '}
              <span style={{ fontWeight: 500, fontSize: 13, color: '#64748b' }}>
                {stat(shownCountryNames.length, allCountryNames.length, 'countries')}
              </span>
            </h3>
            <div style={{ display: hideMap ? 'none' : undefined }}>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: '#64748b' }}>
              Number of co-authors per country. Hover for details, click a country to pin them in the side panel.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', margin: '0 0 8px' }}>
              {searchBox}
              {matchInfo}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 10px', fontSize: 11, color: '#64748b' }}>
              <span>1</span>
              <div
                style={{
                  width: 150,
                  height: 8,
                  borderRadius: 4,
                  border: '1px solid #d7deea',
                  background: `linear-gradient(90deg, ${[0, 0.25, 0.5, 0.75, 1]
                    .map((f) => heatColor(Math.max(1, Math.round(Math.exp(f * Math.log(maxCountryCount)))), maxCountryCount, false))
                    .join(', ')})`,
                }}
              />
              <span>{maxCountryCount} co-authors</span>
            </div>
            <div
              style={{ position: 'relative', border: '1px solid #e2e8f0', borderRadius: 10, background: '#f8fafc', overflow: 'visible' }}
              onMouseLeave={() => {
                setHoverCountry(null);
                setMapView(null);
              }}
              onMouseMove={(e) => {
                if ((e.target as Element).closest?.('[data-popup]')) return;
                const r = e.currentTarget.getBoundingClientRect();
                setMapView({ x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height });
              }}
            >
              <svg viewBox="0 0 1000 500" style={{ width: '100%', display: 'block' }}>
                {WORLD_PATHS.map((f, fi) => {
                  const n = f.iso2 ? countryCount[f.iso2] || 0 : 0;
                  const info = f.iso2 && n > 0 ? countryByIso2[f.iso2] : undefined;
                  const active = hoverCountry === f.iso2 || selCountry === f.iso2;
                  return (
                    <path
                      key={`${f.id}-${fi}`}
                      d={f.d}
                      fill={info ? heatColor(n, maxCountryCount, active) : COL_COUNTRY_NONE}
                      stroke="#fff"
                      strokeWidth={0.4}
                      style={info ? { cursor: 'pointer' } : undefined}
                      onMouseEnter={() => info && setHoverCountry(f.iso2)}
                      onMouseLeave={() => setHoverCountry(null)}
                      onClick={() => info && pick('country', selCountry === f.iso2 ? null : f.iso2)}
                    />
                  );
                })}
              </svg>
              {!isMobile && hoverCountry && countryByIso2[hoverCountry] && mapView && (
                <div data-popup style={{ ...popupStyle(mapView), pointerEvents: 'auto', minWidth: 210 }}>
                  {countryPopupBody(countryByIso2[hoverCountry])}
                </div>
              )}
            </div>
            </div>
          </div>

          {/* full table */}
          <div style={{ marginTop: 26 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>
              {roundToggle(!hideTable, () => setHideTable(!hideTable), 'the table')}
              All co-authors{' '}
              <span style={{ fontWeight: 500, fontSize: 13, color: '#64748b' }}>
                {stat(sortedRows.length, coauthors.length, 'rows')} · click a row for details
              </span>
            </h3>
            <div style={{ display: hideTable ? 'none' : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', margin: '0 0 8px' }}>
              {searchBox}
              {matchInfo}
            </div>
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }} title="Position in the current order">#</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', whiteSpace: 'nowrap' }} title="Position as a share of all co-authors, in the current order">
                      % of all
                    </th>
                    {([
                      ['name', 'Name'],
                      ['institution', 'Affiliations'],
                      ['country', 'Countries'],
                      ['hindex', 'h-index'],
                      ['papers', 'Shared papers'],
                    ] as [typeof sortKey, string][]).map(([k, label]) => (
                      <th
                        key={k}
                        onClick={() => toggleSort(k)}
                        style={{ padding: '8px 10px', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}
                      >
                        {label}
                        {arrow(k)}
                      </th>
                    ))}
                    <th style={{ padding: '8px 10px' }}>Scholar</th>
                    <th style={{ padding: '8px 10px' }}>ORCID</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((c, i) => {
                    const idx = coauthors.indexOf(c);
                    const isSel = selected === idx;
                    return (
                    <tr
                      key={i}
                      onClick={c.me ? undefined : () => pick('author', isSel ? null : idx)}
                      title={c.me ? undefined : 'Show details in the side panel'}
                      style={{
                        borderTop: '1px solid #e2e8f0',
                        background: isSel ? '#e6f7f5' : c.me ? '#fff5f5' : i % 2 ? '#fbfdff' : '#fff',
                        cursor: c.me ? 'default' : 'pointer',
                      }}
                    >
                      <td style={{ padding: '7px 10px', textAlign: 'right', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                        {(((i + 1) / coauthors.length) * 100).toFixed(1)}%
                      </td>
                      <td style={{ padding: '7px 10px', fontWeight: c.me ? 700 : 500 }}>
                        {c.name}
                        {c.me && <span style={{ color: COL_ME, marginLeft: 6, fontSize: 11 }}>(me)</span>}
                      </td>
                      <td style={{ padding: '7px 10px', color: '#475569' }}>{c.institutions.join('; ') || '—'}</td>
                      <td style={{ padding: '7px 10px', color: '#475569' }}>{c.countries.join('; ') || '—'}</td>
                      <td style={{ padding: '7px 10px' }}>{c.hindex || '—'}</td>
                      <td style={{ padding: '7px 10px' }}>{c.papers}</td>
                      <td style={{ padding: '7px 10px' }}>
                        {c.scholar ? (
                          <a href={c.scholar} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }} onClick={(e) => e.stopPropagation()}>
                            Profile ↗
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                        {c.orcid ? (
                          <a href={c.orcid} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }} onClick={(e) => e.stopPropagation()}>
                            {c.orcid.slice(-19)} ↗
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </div>
          </div>

          {/* journals and conferences */}
          <div style={{ marginTop: 26 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>
              {roundToggle(!hideVenues, () => setHideVenues(!hideVenues), 'the journals and conferences table')}
              Journals and conferences{' '}
              <span style={{ fontWeight: 500, fontSize: 13, color: '#64748b' }}>
                {stat(venueRows.filter((v) => v.type === 'Journal').length, allVenues.filter((v) => v.type === 'Journal').length, 'journals')} ·{' '}
                {stat(venueRows.filter((v) => v.type === 'Conference').length, allVenues.filter((v) => v.type === 'Conference').length, 'conferences')} · click a row
                for its papers
              </span>
            </h3>
            <div style={{ display: hideVenues ? 'none' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', margin: '0 0 8px' }}>
                {searchBox}
                {(['Journal', 'Conference'] as const).map((t) => (
                  <label key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <input type="checkbox" checked={venueTypes[t]} onChange={(e) => setVenueTypes({ ...venueTypes, [t]: e.target.checked })} />
                    {t === 'Journal' ? 'Journals' : 'Conferences'}
                  </label>
                ))}
                {matchInfo}
              </div>
              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>#</th>
                      {([
                        ['venue', 'Journal / conference'],
                        ['type', 'Type'],
                        ['papers', 'Papers'],
                        ['citations', 'Citations'],
                        ['last', 'Years'],
                      ] as [typeof venueSort.key, string][]).map(([k, label]) => (
                        <th
                          key={k}
                          onClick={() => setVenueSort({ key: k, asc: venueSort.key === k ? !venueSort.asc : k === 'venue' || k === 'type' })}
                          style={{ padding: '8px 10px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                        >
                          {label}
                          {venueSort.key === k ? (venueSort.asc ? ' ▲' : ' ▼') : ''}
                        </th>
                      ))}
                      <th style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>JCR / CORE</th>
                      <th style={{ padding: '8px 10px' }}>SJR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {venueRows.map((v, i) => {
                      const open = openVenue === v.key;
                      return (
                        <Fragment key={v.key}>
                          <tr
                            onClick={() => setOpenVenue(open ? null : v.key)}
                            title="Show its papers"
                            style={{ borderTop: '1px solid #eef2f7', background: open ? '#e6f7f5' : i % 2 ? '#fbfdff' : '#fff', cursor: 'pointer' }}
                          >
                            <td style={{ padding: '7px 10px', textAlign: 'right', color: '#94a3b8' }}>{i + 1}</td>
                            <td style={{ padding: '7px 10px', fontWeight: 500 }}>{v.venue}</td>
                            <td style={{ padding: '7px 10px', color: '#475569' }}>{v.type}</td>
                            <td style={{ padding: '7px 10px' }}>{v.count}</td>
                            <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }} title="Total citations (average per paper)">
                              {v.citations}{' '}
                              <span style={{ color: '#94a3b8' }}>({(Math.round((v.citations / v.count) * 10) / 10).toLocaleString('en')}/paper)</span>
                            </td>
                            <td style={{ padding: '7px 10px', color: '#475569', whiteSpace: 'nowrap' }}>
                              {v.first ? (v.first === v.last ? v.last : `${v.first}–${v.last}`) : '—'}
                            </td>
                            <td style={{ padding: '7px 10px', color: '#475569' }}>{v.jcr || '—'}</td>
                            <td style={{ padding: '7px 10px', color: '#475569' }}>{v.sjr || '—'}</td>
                          </tr>
                          {open && (
                            <tr style={{ background: '#f5fbfa' }}>
                              <td />
                              <td colSpan={7} style={{ padding: '4px 10px 10px' }}>
                                {v.papers.map((p) => (
                                  <div key={p.id} style={{ padding: '2px 0' }}>
                                    <span style={{ color: '#94a3b8' }}>{p.year || '—'} · </span>
                                    {cardLink('paper', p.id, p.title)}
                                    <span style={{ color: '#94a3b8' }}> · {p.citations} cit.</span>
                                    {/* the quartile / rank the venue had for this paper's year */}
                                    {p.jcr && (
                                      <span style={{ marginLeft: 8, padding: '1px 7px', borderRadius: 999, background: '#e0f2fe', color: '#075985', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                        {/^Q\d/i.test(p.jcr) ? `JCR ${p.jcr}` : p.jcr}
                                      </span>
                                    )}
                                    {p.sjr && (
                                      <span style={{ marginLeft: 6, padding: '1px 7px', borderRadius: 999, background: '#f1f5f9', color: '#475569', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                        {/^Q\d/i.test(p.sjr) ? `SJR ${p.sjr}` : p.sjr}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                    {venueRows.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ padding: '12px 10px', color: '#94a3b8' }}>
                          No journals or conferences for the current filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
