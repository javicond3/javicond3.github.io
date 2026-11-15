'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { isAuthenticated } from '@/utils/auth';
import type { CoauthorData, Coauthor } from '@/data/coauthors';
import { instSigla } from '@/data/siglas';
import { WORLD_PATHS, NAME2ISO } from '@/data/worldmap';

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
const shortInst = (name: string): string => {
  if (name.length <= 16) return name;
  const sig = instSigla(name);
  if (sig !== name.slice(0, 12) && sig.length <= 14) return sig;
  const small = new Set(['de', 'of', 'the', 'la', 'el', 'los', 'las', 'and', 'y', 'for', 'in', 'del', 'di']);
  const words = name.replace(/[(),]/g, '').split(/\s+/).filter((w) => w && !small.has(w.toLowerCase()));
  const acro = words.map((w) => w.charAt(0).toUpperCase()).join('');
  return acro.length >= 2 ? acro : name.slice(0, 15);
};

type MatchFn = (c: Coauthor) => boolean;

function buildMatcher(query: string): MatchFn | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const termTest = (t: string): MatchFn => {
    let m = t.match(/^(h|hindex|papers|p)(>=|<=|>|<|=)(\d+)$/);
    if (m) {
      const field = m[1].startsWith('h') ? 'hindex' : 'papers';
      const n = parseInt(m[3], 10);
      const cmp = m[2];
      return (c) => {
        const v = c[field as 'hindex' | 'papers'];
        return cmp === '>' ? v > n : cmp === '<' ? v < n : cmp === '>=' ? v >= n : cmp === '<=' ? v <= n : v === n;
      };
    }
    m = t.match(/^inst:(.+)$/);
    if (m) {
      const s = m[1];
      return (c) => c.institutions.some((i2) => i2.toLowerCase().includes(s));
    }
    m = t.match(/^country:(.+)$/);
    if (m) {
      const s = m[1];
      return (c) => c.countries.some((ct) => ct.toLowerCase().includes(s));
    }
    return (c) =>
      c.name.toLowerCase().includes(t) ||
      c.firma.toLowerCase().includes(t) ||
      c.institutions.some((i2) => i2.toLowerCase().includes(t)) ||
      c.countries.some((ct) => ct.toLowerCase().includes(t));
  };

  /* "a b | c" / "a b OR c": OR between groups, AND inside a group, "-x" / "!x" negates a term */
  const groups = q
    .split(/\s+or\s+|\|/)
    .map((g) => g.trim())
    .filter(Boolean);
  const groupFns = groups.map((g) => {
    const tests: MatchFn[] = g.split(/\s+/).map((tok) => {
      const neg = tok.startsWith('-') || tok.startsWith('!');
      const f = termTest(neg ? tok.slice(1) : tok);
      const nf: MatchFn = (c) => !f(c);
      return neg ? nf : f;
    });
    const gf: MatchFn = (c) => tests.every((f) => f(c));
    return gf;
  });

  const all: MatchFn = (c) => groupFns.some((f) => f(c));
  return all;
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
  const graphIdxs = focus ? allIdxs.filter((i) => focus.authors.has(i)) : allIdxs;
  const maxPapers = Math.max(1, ...allIdxs.map((i) => coauthors[i].papers));
  const maxH = Math.max(1, ...allIdxs.map((i) => coauthors[i].hindex), coauthors[meIdx].hindex);
  const cx = W / 2;
  const cy = H / 2;

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
  rings.forEach((ring, ri) => {
    ring.sort((a, b) => coauthors[b].papers - coauthors[a].papers);
    ring.forEach((idx, j) => {
      const a = (j / ring.length) * Math.PI * 2 - Math.PI / 2 + ri * 0.35;
      pos[idx] = { x: cx + radii[ri] * Math.cos(a), y: cy + radii[ri] * Math.sin(a) };
    });
  });

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
    const a = (j / insts.length) * Math.PI * 2 - Math.PI / 2;
    instPos[name] = { x: cx + R * Math.cos(a), y: cy + R * 0.92 * Math.sin(a) };
  });

  // papers orbit their primary (first visible, non-me) author; max 12 each
  const paperPos: Layout['paperPos'] = {};
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
  for (const [anchorS, ids] of Object.entries(perAuthor)) {
    const anchor = Number(anchorS);
    const sorted = ids.sort((a, b) => (paperById.get(b)?.citations || 0) - (paperById.get(a)?.citations || 0));
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
  const [query, setQuery] = useState('');
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
  const lay = useMemo(() => (focusSets ? layout(data, focusSets) : layBase), [focusSets, layBase, data]);
  const paperById = useMemo(() => new Map(papers.map((p) => [p.id, p])), [papers]);

  useEffect(() => {
    setAuthed(isAuthenticated());
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  if (!authed || coauthors.length === 0) return null;

  const matcher = buildMatcher(query);
  const matchCount = matcher ? coauthors.filter(matcher).length : 0;
  const resetAll = () => {
    setSelected(null);
    setSelInst(null);
    setSelPaper(null);
  };
  const instMatch = (name: string) => !matcher || (layBase.instMembers[name] || []).some((a) => matcher(coauthors[a]));
  const paperMatch = (pid: string) => !matcher || (paperAuthors[pid] || []).some((a) => matcher(coauthors[a]));

  const paperVisible = (pid: string) =>
    focusSets !== null ? focusSets.papers.has(pid) : showPapers && showAuthors;
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

  const popupAuthor = isMobile
    ? focus !== null
      ? coauthors[focus]
      : null
    : hovered !== null && hovered !== selected
      ? coauthors[hovered]
      : null;
  const popupPaper = isMobile
    ? selPaper !== null
      ? paperById.get(selPaper) ?? null
      : hoverPaper !== null
        ? paperById.get(hoverPaper) ?? null
        : null
    : hoverPaper !== null && hoverPaper !== selPaper
      ? paperById.get(hoverPaper) ?? null
      : null;
  const popupInst = isMobile ? (hoverInst !== null ? hoverInst : selInst) : hoverInst !== null && hoverInst !== selInst ? hoverInst : null;

  const sortedRows = [...coauthors].sort((a, b) => {
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
  const maxCountryCount = Math.max(2, ...Object.values(countries).map((a) => a.count));

  const btn: React.CSSProperties = {
    border: '1px solid #cbd5e1',
    background: '#fff',
    borderRadius: 6,
    padding: '2px 10px',
    cursor: 'pointer',
    fontSize: 13,
  };

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
          <div style={{ fontSize: 12 }}>{info.institutions.join(' · ')}</div>
        </div>
      )}
      {info.topCited.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Top cited papers</div>
          {info.topCited.map((p, pi) => (
            <div key={p.doi || pi} style={{ fontSize: 12 }}>
              {p.doi ? (
                <a href={p.doi} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>
                  {p.title.length > 55 ? p.title.slice(0, 55) + '…' : p.title}
                </a>
              ) : (
                p.title
              )}{' '}
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
              {a.scholar ? (
                <a href={a.scholar} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>
                  {a.name}
                </a>
              ) : (
                a.name
              )}{' '}
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
              {a.scholar ? (
                <a href={a.scholar} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>
                  {a.name}
                </a>
              ) : (
                a.name
              )}{' '}
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
        <div style={{ flex: 1, minWidth: 240 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Co-author network</h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
            {coauthors.length - 1} co-authors · {papers.length} papers · {Object.keys(countries).length} countries
          </p>
        </div>
        <button style={btn} onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? 'Expand ▾' : 'Minimize ▴'}
        </button>
      </div>

      {collapsed ? null : (
        <>
          {/* controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', margin: '12px 0 8px' }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Search: name, "inst:oxford", "h>10", "papers>3", "country:spain"'
              style={{
                flex: 1,
                minWidth: 280,
                padding: '6px 10px',
                fontSize: 13,
                border: '1px solid #cbd5e1',
                borderRadius: 6,
              }}
            />
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
            {matcher && (
              <span style={{ fontSize: 12, color: '#64748b' }}>
                {matchCount} match{matchCount === 1 ? '' : 'es'}
              </span>
            )}
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
              style={{ width: '100%', display: 'block', cursor: drag.current ? 'grabbing' : 'grab' }}
              onMouseDown={(e) => {
                drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
              }}
              onMouseMove={(e) => {
                if (drag.current) {
                  const svg = e.currentTarget;
                  const scale = W / svg.getBoundingClientRect().width;
                  setOffset({
                    x: drag.current.ox + (e.clientX - drag.current.x) * scale,
                    y: drag.current.oy + (e.clientY - drag.current.y) * scale,
                  });
                }
              }}
              onMouseUp={() => (drag.current = null)}
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
                  paperVisible(pid) && paperMatch(pid) ? (
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
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setSelInst(selInst === name ? null : name);
                        setSelected(null);
                      }}
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
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelPaper(selPaper === pid ? null : pid)}
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
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => {
                        setSelected(selected === i ? null : i);
                        setSelInst(null);
                      }}
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
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHovered(lay.meIdx)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => {
                    setSelected(null);
                    setSelInst(null);
                    setSelPaper(null);
                  }}
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
              everyone back · drag to pan · +/− to zoom
            </span>
          </div>


          {/* desktop: right info column for the clicked node */}
          {!isMobile && hasFocus && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                width: 340,
                height: '100vh',
                background: '#fff',
                borderLeft: '1px solid #e2e8f0',
                boxShadow: '-8px 0 24px rgba(15,23,42,0.12)',
                zIndex: 40,
                padding: '22px 20px 40px',
                overflowY: 'auto',
                fontSize: 14,
                color: '#0f172a',
              }}
            >
              <button
                onClick={resetAll}
                aria-label="Close"
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 14,
                  border: '1px solid #e2e8f0',
                  background: '#fff',
                  borderRadius: 8,
                  width: 30,
                  height: 30,
                  cursor: 'pointer',
                  fontSize: 16,
                  color: '#64748b',
                }}
              >
                ×
              </button>
              {selected !== null && selected !== lay.meIdx && (
                <>
                  <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 2 }}>{coauthors[selected].name}</div>
                  <div style={{ color: '#64748b', marginBottom: 8 }}>
                    {coauthors[selected].institutions.join('; ') || '—'}
                    {coauthors[selected].countries.length ? ` · ${coauthors[selected].countries.join('; ')}` : ''}
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <strong>{coauthors[selected].papers}</strong> shared paper{coauthors[selected].papers === 1 ? '' : 's'}
                    {coauthors[selected].hindex > 0 && (
                      <>
                        {' · '}h-index <strong>{coauthors[selected].hindex}</strong>
                      </>
                    )}
                  </div>
                  {coauthors[selected].scholar && (
                    <div style={{ marginBottom: 10 }}>
                      <a href={coauthors[selected].scholar} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>
                        Google Scholar ↗
                      </a>
                    </div>
                  )}
                  <div style={{ fontWeight: 700, margin: '12px 0 6px' }}>Shared papers</div>
                  {coauthors[selected].paperIds
                    .map((pid) => paperById.get(pid)!)
                    .filter(Boolean)
                    .sort((a, b) => b.citations - a.citations)
                    .map((p) => (
                      <div key={p.id} style={{ marginBottom: 8, fontSize: 13 }}>
                        {p.doi ? (
                          <a href={p.doi} target="_blank" rel="noreferrer" style={{ color: '#1d4ed8' }}>
                            {p.title}
                          </a>
                        ) : (
                          p.title
                        )}
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
                      <div
                        key={i}
                        onClick={() => {
                          setSelected(i);
                          setSelInst(null);
                        }}
                        style={{ cursor: 'pointer', padding: '4px 0', fontSize: 13, color: '#1d4ed8' }}
                      >
                        {coauthors[i].name}
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
                    {(paperAuthors[selPaper] || []).map((i) => coauthors[i].name).join(', ') || '—'}
                  </div>
                  {paperById.get(selPaper)!.doi && (
                    <a href={paperById.get(selPaper)!.doi} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>
                      Open the paper ↗
                    </a>
                  )}
                </>
              )}
              <div style={{ marginTop: 18, fontSize: 12, color: '#94a3b8' }}>Click JC in the graph or × to bring everyone back.</div>
            </div>
          )}

          {/* world map (heatmap) */}
          <div style={{ marginTop: 26 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Collaborations around the world</h3>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: '#64748b' }}>
              Number of co-authors per country. Hover for details.
            </p>
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
              <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: '#475569' }}>
                {Object.keys(countries).length} countries
              </span>
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
                {WORLD_PATHS.map((f) => {
                  const info = f.iso2 ? countryByIso2[f.iso2] : undefined;
                  const active = hoverCountry === f.iso2;
                  return (
                    <path
                      key={f.id}
                      d={f.d}
                      fill={info ? heatColor(info.count, maxCountryCount, active) : COL_COUNTRY_NONE}
                      stroke="#fff"
                      strokeWidth={0.4}
                      style={info ? { cursor: 'pointer' } : undefined}
                      onMouseEnter={() => info && setHoverCountry(f.iso2)}
                      onMouseLeave={() => setHoverCountry(null)}
                      onClick={() => info && setSelCountry(selCountry === f.iso2 ? null : f.iso2)}
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
            {isMobile && selCountry && countryByIso2[selCountry] && (
              <div style={{ marginTop: 8, border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', fontSize: 13, background: '#fff' }}>
                {countryPopupBody(countryByIso2[selCountry])}
              </div>
            )}
          </div>

          {/* full table */}
          <div style={{ marginTop: 26 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>
              All co-authors{' '}
              <span style={{ fontWeight: 500, fontSize: 13, color: '#64748b' }}>
                {matcher ? `${matchCount} of ${coauthors.length} match the filter` : `${coauthors.length} total`}
              </span>
            </h3>
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
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
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((c, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #e2e8f0', background: c.me ? '#fff5f5' : i % 2 ? '#fbfdff' : '#fff' }}>
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
                          <a href={c.scholar} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>
                            Profile ↗
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
