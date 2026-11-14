'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { isAuthenticated } from '@/utils/auth';
import type { CoauthorData, Coauthor } from '@/data/coauthors';
import { WORLD_PATHS, NAME2ISO } from '@/data/worldmap';

/* ---------- colours ---------- */
const COL_ME = '#e03131';
const COL_AUTHOR = '#12b5a5';
const COL_INST = '#5b7db1';
const COL_PAPER = '#f0a840';
const COL_COUNTRY = '#2ecfba';
const COL_COUNTRY_HOVER = '#17a692';
const COL_COUNTRY_NONE = '#dde2e8';

const W = 1000;
const H = 600;

/* ---------- helpers ---------- */
const shortInst = (name: string): string => {
  if (name.length <= 16) return name;
  const small = new Set(['de', 'of', 'the', 'la', 'el', 'los', 'las', 'and', 'y', 'for', 'in', 'del', 'di']);
  const words = name.replace(/[(),]/g, '').split(/\s+/).filter((w) => w && !small.has(w.toLowerCase()));
  const acro = words.map((w) => w.charAt(0).toUpperCase()).join('');
  return acro.length >= 2 ? acro : name.slice(0, 15);
};

type MatchFn = (c: Coauthor) => boolean;

function buildMatcher(query: string): MatchFn | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const tokens = q.split(/\s+/);
  const tests: MatchFn[] = tokens.map((t) => {
    let m = t.match(/^(h|hindex|papers|p)(>=|<=|>|<|=)(\d+)$/);
    if (m) {
      const field = m[1].startsWith('h') ? 'hindex' : 'papers';
      const n = parseInt(m[3], 10);
      const cmp = m[2];
      return (c) => {
        const v = c[field];
        return cmp === '>' ? v > n : cmp === '<' ? v < n : cmp === '>=' ? v >= n : cmp === '<=' ? v <= n : v === n;
      };
    }
    m = t.match(/^inst:(.+)$/);
    if (m) {
      const s = m[1];
      return (c) => c.institution.toLowerCase().includes(s);
    }
    m = t.match(/^country:(.+)$/);
    if (m) {
      const s = m[1];
      return (c) => c.country.toLowerCase().includes(s);
    }
    return (c) =>
      c.name.toLowerCase().includes(t) ||
      c.firma.toLowerCase().includes(t) ||
      c.institution.toLowerCase().includes(t) ||
      c.country.toLowerCase().includes(t);
  });
  return (c) => tests.every((f) => f(c));
}

/* ---------- layout ---------- */
interface Layout {
  pos: { x: number; y: number }[];          // per coauthor index (inGraph only placed)
  meIdx: number;
  graphIdxs: number[];
  instPos: Record<string, { x: number; y: number }>;
  instCount: Record<string, number>;
  paperPos: Record<string, { x: number; y: number; r: number; anchor: number }>;
  paperExtra: Record<number, number>;       // author idx -> hidden extra papers
  maxPapers: number;
}

function layout(data: CoauthorData): Layout {
  const { coauthors, papers, paperAuthors } = data;
  const meIdx = Math.max(0, coauthors.findIndex((c) => c.me));
  const graphIdxs = coauthors.map((c, i) => i).filter((i) => coauthors[i].inGraph && !coauthors[i].me);
  const maxPapers = Math.max(1, ...graphIdxs.map((i) => coauthors[i].papers));
  const cx = W / 2;
  const cy = H / 2;

  // authors on rings by shared-paper tier
  const rings: number[][] = [[], [], []];
  for (const i of graphIdxs) {
    const p = coauthors[i].papers;
    rings[p >= 7 ? 0 : p >= 3 ? 1 : 2].push(i);
  }
  const radii = [105, 165, 225];
  const pos: { x: number; y: number }[] = new Array(coauthors.length).fill({ x: -100, y: -100 });
  pos[meIdx] = { x: cx, y: cy };
  rings.forEach((ring, ri) => {
    ring.sort((a, b) => coauthors[b].papers - coauthors[a].papers);
    ring.forEach((idx, j) => {
      const a = (j / ring.length) * Math.PI * 2 - Math.PI / 2 + ri * 0.35;
      pos[idx] = { x: cx + radii[ri] * Math.cos(a), y: cy + radii[ri] * Math.sin(a) };
    });
  });

  // institutions on an outer ring
  const instCount: Record<string, number> = {};
  for (const i of graphIdxs) {
    if (coauthors[i].institution) instCount[coauthors[i].institution] = (instCount[coauthors[i].institution] || 0) + 1;
  }
  const insts = Object.keys(instCount).sort((a, b) => instCount[b] - instCount[a]);
  const instPos: Record<string, { x: number; y: number }> = {};
  const R = 272;
  insts.forEach((name, j) => {
    const a = (j / insts.length) * Math.PI * 2 - Math.PI / 2;
    instPos[name] = { x: cx + R * Math.cos(a), y: cy + (R * 0.92) * Math.sin(a) };
  });

  // papers orbit their primary (first visible, non-me) author; max 12 each
  const paperPos: Layout['paperPos'] = {};
  const perAuthor: Record<number, string[]> = {};
  const paperExtra: Record<number, number> = {};
  const maxCit = Math.max(1, ...papers.map((p) => p.citations));
  for (const p of papers) {
    const visible = (paperAuthors[p.id] || []).filter((i) => coauthors[i].inGraph && !coauthors[i].me);
    const anchor = visible.length ? visible[0] : coauthors.some((c) => c.me) && (paperAuthors[p.id] || []).includes(meIdx) ? meIdx : -1;
    if (anchor < 0) continue;
    (perAuthor[anchor] ||= []).push(p.id);
  }
  for (const [anchorS, ids] of Object.entries(perAuthor)) {
    const anchor = Number(anchorS);
    const sorted = ids.sort((a, b) => {
      const pa = papers.find((p) => p.id === a)!;
      const pb = papers.find((p) => p.id === b)!;
      return pb.citations - pa.citations;
    });
    const shown = sorted.slice(0, 12);
    paperExtra[anchor] = sorted.length - shown.length;
    shown.forEach((pid, k) => {
      const p = papers.find((pp) => pp.id === pid)!;
      const a = (k / shown.length) * Math.PI * 2 + (anchor % 7) * 0.5;
      const rad = anchor === meIdx ? 46 + 14 * (k % 3) : 26 + 9 * (k % 3);
      paperPos[pid] = {
        x: pos[anchor].x + rad * Math.cos(a),
        y: pos[anchor].y + rad * Math.sin(a),
        r: 8 + 13 * Math.sqrt(p.citations / maxCit),
        anchor,
      };
    });
  }

  return { pos, meIdx, graphIdxs, instPos, instCount, paperPos, paperExtra, maxPapers };
}

/* ---------- component ---------- */
export default function CoauthorGraph({ data }: { data: CoauthorData }) {
  const [authed, setAuthed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const [showPapers, setShowPapers] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [hoverPaper, setHoverPaper] = useState<string | null>(null);
  const [hoverInst, setHoverInst] = useState<string | null>(null);
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);
  const [hoverCountry, setHoverCountry] = useState<string | null>(null);
  const [mapMouse, setMapMouse] = useState<{ x: number; y: number } | null>(null);
  const [sortKey, setSortKey] = useState<'name' | 'institution' | 'country' | 'hindex' | 'papers'>('papers');
  const [sortAsc, setSortAsc] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const lay = useMemo(() => layout(data), [data]);
  const { coauthors, papers, paperAuthors, countries } = data;
  const paperById = useMemo(() => new Map(papers.map((p) => [p.id, p])), [papers]);

  useEffect(() => {
    setAuthed(isAuthenticated());
  }, []);
  if (!authed || coauthors.length === 0) return null;

  const matcher = buildMatcher(query);
  const matchCount = matcher ? coauthors.filter(matcher).length : 0;
  const isMatch = (i: number) => (matcher ? matcher(coauthors[i]) : true);
  const dim = (i: number) => (matcher && !matcher(coauthors[i]) ? 0.12 : 1);

  const paperVisible = (pid: string) => showPapers || (selected !== null && lay.paperPos[pid]?.anchor === selected);
  const authorR = (i: number) => 11 + 8 * Math.sqrt(coauthors[i].papers / lay.maxPapers);

  const clickAuthor = (i: number) => {
    setSelected(selected === i ? null : i);
  };

  const focus = selected !== null ? selected : hovered;

  /* popup content */
  const popupAuthor = focus !== null ? coauthors[focus] : null;
  const popupPaper = hoverPaper !== null ? paperById.get(hoverPaper) ?? null : null;

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

  const countryByIso2: Record<string, { name: string; count: number; maxH: number; avgH: number }> = {};
  for (const [name, a] of Object.entries(countries)) {
    const iso2 = NAME2ISO[name];
    if (iso2) countryByIso2[iso2] = a;
  }

  const btn: React.CSSProperties = {
    border: '1px solid #cbd5e1',
    background: '#fff',
    borderRadius: 6,
    padding: '2px 10px',
    cursor: 'pointer',
    fontSize: 13,
  };

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
              <input type="checkbox" checked={showPapers} onChange={(e) => setShowPapers(e.target.checked)} />
              Show all papers
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
              const r = e.currentTarget.getBoundingClientRect();
              setMouse({ x: e.clientX - r.left, y: e.clientY - r.top });
            }}
            onMouseLeave={() => {
              setHovered(null);
              setHoverPaper(null);
              setHoverInst(null);
              setMouse(null);
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
                {lay.graphIdxs.map((i) => {
                  const active = focus === i;
                  return (
                    <line
                      key={`e${i}`}
                      x1={lay.pos[lay.meIdx].x}
                      y1={lay.pos[lay.meIdx].y}
                      x2={lay.pos[i].x}
                      y2={lay.pos[i].y}
                      stroke={active ? '#333' : 'rgba(70,80,100,0.28)'}
                      strokeWidth={1 + 4 * Math.sqrt(coauthors[i].papers / lay.maxPapers)}
                      opacity={Math.min(dim(i), dim(lay.meIdx) === 0.12 ? 1 : 1) * (matcher && !matcher(coauthors[i]) ? 0.06 : 1)}
                    />
                  );
                })}
                {/* edges: author -> institution */}
                {lay.graphIdxs.map((i) => {
                  const inst = coauthors[i].institution;
                  if (!inst || !lay.instPos[inst]) return null;
                  const active = focus === i || hoverInst === inst;
                  return (
                    <line
                      key={`ei${i}`}
                      x1={lay.pos[i].x}
                      y1={lay.pos[i].y}
                      x2={lay.instPos[inst].x}
                      y2={lay.instPos[inst].y}
                      stroke={active ? COL_INST : 'rgba(91,125,177,0.28)'}
                      strokeWidth={active ? 1.4 : 0.7}
                      opacity={matcher && !matcher(coauthors[i]) ? 0.05 : 1}
                    />
                  );
                })}
                {/* edges: author -> paper */}
                {Object.entries(lay.paperPos).map(([pid, pp]) =>
                  paperVisible(pid) ? (
                    <line
                      key={`ep${pid}`}
                      x1={lay.pos[pp.anchor].x}
                      y1={lay.pos[pp.anchor].y}
                      x2={pp.x}
                      y2={pp.y}
                      stroke="rgba(240,168,64,0.55)"
                      strokeWidth={0.8}
                    />
                  ) : null
                )}

                {/* institution nodes */}
                {Object.entries(lay.instPos).map(([name, p]) => {
                  const n = lay.instCount[name];
                  const r = 7 + 5 * Math.sqrt(n / Math.max(1, ...Object.values(lay.instCount)));
                  const active = hoverInst === name;
                  return (
                    <g
                      key={`inst-${name}`}
                      onMouseEnter={() => setHoverInst(name)}
                      onMouseLeave={() => setHoverInst(null)}
                      style={{ cursor: 'default' }}
                    >
                      <circle cx={p.x} cy={p.y} r={r} fill={active ? '#46679a' : COL_INST} stroke="#fff" strokeWidth={1.5} />
                      <text x={p.x} y={p.y + r + 10} textAnchor="middle" fontSize={8.5} fill="#5b7db1" fontWeight={600}>
                        {shortInst(name)}
                      </text>
                    </g>
                  );
                })}

                {/* paper nodes */}
                {Object.entries(lay.paperPos).map(([pid, pp]) => {
                  if (!paperVisible(pid)) return null;
                  const p = paperById.get(pid)!;
                  const active = hoverPaper === pid;
                  return (
                    <g
                      key={pid}
                      onMouseEnter={() => setHoverPaper(pid)}
                      onMouseLeave={() => setHoverPaper(null)}
                      style={{ cursor: 'pointer' }}
                      onClick={() => p.doi && window.open(p.doi, '_blank')}
                    >
                      <circle cx={pp.x} cy={pp.y} r={pp.r} fill={active ? '#d98a1e' : COL_PAPER} stroke="#fff" strokeWidth={1.5} />
                      <text x={pp.x} y={pp.y + 3} textAnchor="middle" fontSize={Math.max(7, pp.r * 0.72)} fontWeight={700} fill="#fff">
                        {p.yy}
                      </text>
                      <text x={pp.x} y={pp.y + pp.r + 9} textAnchor="middle" fontSize={8} fill="#b57708" fontWeight={600}>
                        {p.citations}
                      </text>
                    </g>
                  );
                })}

                {/* author nodes */}
                {lay.graphIdxs.map((i) => {
                  const c = coauthors[i];
                  const r = authorR(i);
                  const active = focus === i;
                  return (
                    <g
                      key={i}
                      opacity={dim(i)}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => clickAuthor(i)}
                    >
                      {selected === i && <circle cx={lay.pos[i].x} cy={lay.pos[i].y} r={r + 5} fill="none" stroke={COL_AUTHOR} strokeWidth={2} />}
                      <circle cx={lay.pos[i].x} cy={lay.pos[i].y} r={r} fill={active ? '#0e9c8c' : COL_AUTHOR} stroke="#fff" strokeWidth={2} />
                      <text x={lay.pos[i].x} y={lay.pos[i].y + r * 0.38} textAnchor="middle" fontSize={Math.max(9, r * 0.62)} fontWeight={700} fill="#fff">
                        {c.initials}
                      </text>
                    </g>
                  );
                })}

                {/* me */}
                <g>
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

            {/* popup: paper */}
            {popupPaper && mouse && (
              <div
                style={{
                  position: 'absolute',
                  left: Math.min(mouse.x + 14, W - 330),
                  top: Math.max(8, mouse.y - 10),
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  boxShadow: '0 8px 24px rgba(15,23,42,0.14)',
                  padding: '12px 14px',
                  maxWidth: 320,
                  fontSize: 13,
                  pointerEvents: 'none',
                  zIndex: 5,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{popupPaper.title}</div>
                <div style={{ color: '#64748b', marginBottom: 4 }}>
                  {popupPaper.year}
                  {popupPaper.venue ? ` · ${popupPaper.venue}` : ''}
                </div>
                <div style={{ marginBottom: 4 }}>
                  <strong>{popupPaper.citations}</strong> citation{popupPaper.citations === 1 ? '' : 's'}
                </div>
                <div style={{ color: '#64748b', fontSize: 12 }}>
                  {(paperAuthors[popupPaper.id] || []).map((i) => coauthors[i].name).join(', ') || '—'}
                </div>
                {popupPaper.doi && <div style={{ marginTop: 4, fontSize: 12, color: '#2563eb' }}>Click the node to open the paper ↗</div>}
              </div>
            )}

            {/* popup: author */}
            {popupAuthor && !popupPaper && mouse && (
              <div
                style={{
                  position: 'absolute',
                  left: Math.min(mouse.x + 14, W - 330),
                  top: Math.max(8, mouse.y - 10),
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  boxShadow: '0 8px 24px rgba(15,23,42,0.14)',
                  padding: '12px 14px',
                  maxWidth: 320,
                  fontSize: 13,
                  pointerEvents: 'none',
                  zIndex: 5,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 2 }}>{popupAuthor.name}</div>
                <div style={{ color: '#64748b', marginBottom: 4 }}>
                  {popupAuthor.institution || '—'}
                  {popupAuthor.country ? ` · ${popupAuthor.country}` : ''}
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
                    Click to {selected === focus ? 'hide' : 'show'} their papers in the graph
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
            <span style={{ color: '#94a3b8' }}>Click an author to reveal their papers · drag to pan · +/− to zoom</span>
          </div>

          {/* world map */}
          <div style={{ marginTop: 26 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Collaborations around the world</h3>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: '#64748b' }}>
              Countries with at least one co-author. Hover a highlighted country for details.
            </p>
            <div
              style={{ position: 'relative', border: '1px solid #e2e8f0', borderRadius: 10, background: '#f8fafc', overflow: 'hidden' }}
              onMouseLeave={() => {
                setHoverCountry(null);
                setMapMouse(null);
              }}
              onMouseMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setMapMouse({ x: e.clientX - r.left, y: e.clientY - r.top });
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
                      fill={info ? (active ? COL_COUNTRY_HOVER : COL_COUNTRY) : COL_COUNTRY_NONE}
                      stroke="#fff"
                      strokeWidth={0.4}
                      style={info ? { cursor: 'pointer' } : undefined}
                      onMouseEnter={() => info && setHoverCountry(f.iso2)}
                      onMouseLeave={() => setHoverCountry(null)}
                    />
                  );
                })}
              </svg>
              {hoverCountry && countryByIso2[hoverCountry] && mapMouse && (
                <div
                  style={{
                    position: 'absolute',
                    left: Math.min(mapMouse.x + 14, 760),
                    top: Math.max(8, mapMouse.y - 20),
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    boxShadow: '0 8px 24px rgba(15,23,42,0.14)',
                    padding: '10px 12px',
                    fontSize: 13,
                    pointerEvents: 'none',
                    zIndex: 5,
                    minWidth: 170,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>{countryByIso2[hoverCountry].name}</div>
                  <div>
                    <strong>{countryByIso2[hoverCountry].count}</strong> co-author{countryByIso2[hoverCountry].count === 1 ? '' : 's'}
                  </div>
                  <div style={{ color: '#64748b' }}>
                    max h-index {countryByIso2[hoverCountry].maxH} · avg {countryByIso2[hoverCountry].avgH}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* full table */}
          <div style={{ marginTop: 26 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>All co-authors</h3>
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                    {([
                      ['name', 'Name'],
                      ['institution', 'Institution'],
                      ['country', 'Country'],
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
                      <td style={{ padding: '7px 10px', color: '#475569' }}>{c.institution || '—'}</td>
                      <td style={{ padding: '7px 10px', color: '#475569' }}>{c.country || '—'}</td>
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
