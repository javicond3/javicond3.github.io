'use client';

import { useMemo, useRef, useState } from 'react';
import type { PaperNode } from '@/data/coauthors';
import { useSearch } from './SearchContext';
import { normalizeSearchText } from '@/utils/normalizeSearch';

/* A second graph of the network page: only my papers, their topics and their keywords.
   A paper is tied to each of its topics and keywords; nothing else is drawn. */

const W = 1100;
const H = 760;
const COL_TOPIC = '#0f766e';
const COL_KEYWORD = '#7c5cc4';
const COL_PAPER = '#f0a840';

type Kind = 'topic' | 'keyword' | 'paper';
interface GNode {
  id: string;
  kind: Kind;
  label: string;
  r: number;
  x: number;
  y: number;
  count: number; // papers of a topic / keyword, citations of a paper
  paper?: PaperNode;
}
interface GEdge {
  a: number; // paper
  b: number; // topic or keyword
  kind: 'topic' | 'keyword';
}

function build(papers: PaperNode[]): { nodes: GNode[]; edges: GEdge[]; nbrs: Set<number>[] } {
  const nodes: GNode[] = [];
  const edges: GEdge[] = [];
  const index = new Map<string, number>();
  const tag = (kind: 'topic' | 'keyword', name: string) => {
    const id = `${kind}:${name}`;
    if (!index.has(id)) {
      index.set(id, nodes.length);
      nodes.push({ id, kind, label: name, r: 0, x: 0, y: 0, count: 0 });
    }
    const i = index.get(id)!;
    nodes[i].count += 1;
    return i;
  };
  const maxCit = Math.max(1, ...papers.map((p) => p.citations));
  const paperTags: { p: PaperNode; tags: { i: number; kind: 'topic' | 'keyword' }[] }[] = papers.map((p) => ({
    p,
    tags: [...p.topics.map((t) => ({ i: tag('topic', t), kind: 'topic' as const })), ...p.keywords.map((k) => ({ i: tag('keyword', k), kind: 'keyword' as const }))],
  }));
  const maxTopic = Math.max(1, ...nodes.filter((n) => n.kind === 'topic').map((n) => n.count));
  const maxKw = Math.max(1, ...nodes.filter((n) => n.kind === 'keyword').map((n) => n.count));
  for (const n of nodes) n.r = n.kind === 'topic' ? 22 + 16 * Math.sqrt(n.count / maxTopic) : 9 + 13 * Math.sqrt(n.count / maxKw);

  // start: topics on an inner circle, keywords on an outer one (alphabetical), papers between their tags
  const topics = nodes.filter((n) => n.kind === 'topic').sort((a, b) => b.count - a.count);
  topics.forEach((n, i) => {
    const ang = (2 * Math.PI * i) / Math.max(1, topics.length) - Math.PI / 2;
    n.x = 150 * Math.cos(ang);
    n.y = 150 * Math.sin(ang);
  });
  const kws = nodes.filter((n) => n.kind === 'keyword').sort((a, b) => a.label.localeCompare(b.label));
  kws.forEach((n, i) => {
    const ang = (2 * Math.PI * i) / Math.max(1, kws.length);
    n.x = 380 * Math.cos(ang);
    n.y = 380 * Math.sin(ang);
  });
  paperTags.forEach(({ p, tags }, k) => {
    const i = nodes.length;
    const jit = k * 2.399963; // golden angle: papers with the same tags do not start on the same spot
    const cx = tags.length ? tags.reduce((s, t) => s + nodes[t.i].x, 0) / tags.length : 0;
    const cy = tags.length ? tags.reduce((s, t) => s + nodes[t.i].y, 0) / tags.length : 0;
    nodes.push({ id: p.id, kind: 'paper', label: p.title, r: 7 + 7 * Math.sqrt(p.citations / maxCit), x: cx + 30 * Math.cos(jit), y: cy + 30 * Math.sin(jit), count: p.citations, paper: p });
    for (const t of tags) edges.push({ a: i, b: t.i, kind: t.kind });
  });

  // force layout (deterministic): everything repels, an edge pulls a paper towards its tags
  const n = nodes.length;
  const K = 62;
  const dx = new Float64Array(n);
  const dy = new Float64Array(n);
  const ITER = 320;
  for (let it = 0; it < ITER; it++) {
    const temp = 34 * (1 - it / ITER) + 0.6;
    dx.fill(0);
    dy.fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let ex = nodes[i].x - nodes[j].x;
        let ey = nodes[i].y - nodes[j].y;
        let d = Math.hypot(ex, ey);
        if (d < 0.01) {
          ex = Math.cos(i * 1.7 + j);
          ey = Math.sin(i * 1.7 + j);
          d = 1;
        }
        // tags push harder than papers, so topics and keywords spread and papers gather around them
        const w = (nodes[i].kind === 'paper' ? 1.5 : 2.6) * (nodes[j].kind === 'paper' ? 1.5 : 2.6);
        const f = (K * K * w) / (d * d);
        dx[i] += ex * f;
        dy[i] += ey * f;
        dx[j] -= ex * f;
        dy[j] -= ey * f;
      }
    }
    for (const e of edges) {
      const ex = nodes[e.a].x - nodes[e.b].x;
      const ey = nodes[e.a].y - nodes[e.b].y;
      const d = Math.hypot(ex, ey) || 1;
      // big hubs (LLM, Artificial Intelligence) pull each paper less, or everything would collapse on them
      const f = (d / K) * (e.kind === 'topic' ? 0.45 : 1) / Math.pow(nodes[e.b].count, 0.72);
      dx[e.a] -= ex * f;
      dy[e.a] -= ey * f;
      dx[e.b] += ex * f;
      dy[e.b] += ey * f;
    }
    for (let i = 0; i < n; i++) {
      dx[i] -= nodes[i].x * 0.008;
      dy[i] -= nodes[i].y * 0.014; // a bit stronger vertically: the canvas is wide
      const m = Math.hypot(dx[i], dy[i]) || 1;
      const step = Math.min(m, temp);
      nodes[i].x += (dx[i] / m) * step;
      nodes[i].y += (dy[i] / m) * step;
    }
  }
  // fit to the canvas, then push overlapping nodes apart
  const pad = 70;
  const xs = nodes.map((p) => p.x);
  const ys = nodes.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  for (const p of nodes) {
    p.x = pad + ((p.x - minX) / Math.max(1, maxX - minX)) * (W - 2 * pad);
    p.y = pad + ((p.y - minY) / Math.max(1, maxY - minY)) * (H - 2 * pad);
  }
  for (let pass = 0; pass < 60; pass++) {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const ex = nodes[i].x - nodes[j].x;
        const ey = nodes[i].y - nodes[j].y;
        const d = Math.hypot(ex, ey) || 0.01;
        const min = nodes[i].r + nodes[j].r + (nodes[i].kind === 'paper' && nodes[j].kind === 'paper' ? 3 : 10);
        if (d < min) {
          const push = (min - d) / 2;
          nodes[i].x += (ex / d) * push;
          nodes[i].y += (ey / d) * push;
          nodes[j].x -= (ex / d) * push;
          nodes[j].y -= (ey / d) * push;
        }
      }
    }
  }
  for (const p of nodes) {
    p.x = Math.min(W - 30, Math.max(30, p.x));
    p.y = Math.min(H - 30, Math.max(30, p.y));
  }
  const nbrs: Set<number>[] = nodes.map(() => new Set<number>());
  for (const e of edges) {
    nbrs[e.a].add(e.b);
    nbrs[e.b].add(e.a);
  }
  return { nodes, edges, nbrs };
}

export default function TopicGraph({ papers, selPaper, onPaper }: { papers: PaperNode[]; selPaper: string | null; onPaper: (id: string) => void }) {
  const { topicFilters, keywordFilters, toggleTopic, toggleKeyword } = useSearch();
  const [hover, setHover] = useState<number | null>(null);
  const [showTopics, setShowTopics] = useState(true);
  const [showKeywords, setShowKeywords] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number; moved: boolean } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const scale = () => {
    const r = svgRef.current?.getBoundingClientRect();
    return r && r.width ? W / r.width : 1;
  };
  const key = papers.map((p) => p.id).join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const g = useMemo(() => build(papers), [key]);
  const { edges, nbrs } = g;
  // nodes can be dragged: the offsets are kept per node id, on top of the computed layout
  const [moved, setMoved] = useState<Record<string, { x: number; y: number }>>({});
  const nodes = useMemo(() => g.nodes.map((n) => (moved[n.id] ? { ...n, x: n.x + moved[n.id].x, y: n.y + moved[n.id].y } : n)), [g, moved]);
  const nodeDrag = useRef<{ id: string; x: number; y: number; ox: number; oy: number; moved: boolean } | null>(null);
  const startNodeDrag = (id: string) => (e: React.PointerEvent) => {
    e.stopPropagation(); // not a pan of the canvas
    const start = moved[id] || { x: 0, y: 0 };
    nodeDrag.current = { id, x: e.clientX, y: e.clientY, ox: start.x, oy: start.y, moved: false };
    const s = scale() / zoom;
    const move = (ev: PointerEvent) => {
      const d = nodeDrag.current;
      if (!d) return;
      if (Math.abs(ev.clientX - d.x) + Math.abs(ev.clientY - d.y) > 4) d.moved = true;
      if (d.moved) setMoved((m) => ({ ...m, [d.id]: { x: d.ox + (ev.clientX - d.x) * s, y: d.oy + (ev.clientY - d.y) * s } }));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setTimeout(() => { nodeDrag.current = null; }, 0); // after the click, so a drag does not count as one
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const visible = (n: GNode) => n.kind === 'paper' || (n.kind === 'topic' ? showTopics : showKeywords);
  const lit = (i: number) => hover === null || hover === i || nbrs[hover].has(i);
  const isOn = (n: GNode) =>
    n.kind === 'topic' ? topicFilters.includes(normalizeSearchText(n.label)) : n.kind === 'keyword' ? keywordFilters.includes(normalizeSearchText(n.label)) : selPaper === n.id;

  const btn: React.CSSProperties = { width: 32, height: 28, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 700 };
  const nTopics = nodes.filter((n) => n.kind === 'topic').length;
  const nKeywords = nodes.filter((n) => n.kind === 'keyword').length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', margin: '0 0 8px', fontSize: 13 }}>
        <span style={{ color: '#64748b' }}>
          <strong style={{ color: '#334155' }}>{papers.length}</strong> papers · <strong style={{ color: '#334155' }}>{nTopics}</strong> topics ·{' '}
          <strong style={{ color: '#334155' }}>{nKeywords}</strong> keywords — click a topic or keyword to filter by it, a paper for its details, drag any node to move it
        </span>
        <span style={{ flex: 1 }} />
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={showTopics} onChange={(e) => setShowTopics(e.target.checked)} />
          <span style={{ width: 10, height: 10, borderRadius: 999, background: COL_TOPIC, display: 'inline-block' }} /> Topics
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={showKeywords} onChange={(e) => setShowKeywords(e.target.checked)} />
          <span style={{ width: 10, height: 10, borderRadius: 999, background: COL_KEYWORD, display: 'inline-block' }} /> Keywords
        </label>
        <span style={{ display: 'inline-flex', gap: 6 }}>
          <button style={btn} aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.5, z / 1.25))}>−</button>
          <button style={btn} aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(4, z * 1.25))}>+</button>
          <button style={{ ...btn, width: 'auto', padding: '0 10px', fontWeight: 600, fontSize: 12 }} onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); setMoved({}); }}>Reset</button>
        </span>
      </div>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, background: '#fbfcfe', overflow: 'hidden' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', display: 'block', cursor: drag.current ? 'grabbing' : 'grab', touchAction: 'none' }}
          onPointerDown={(e) => {
            drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y, moved: false };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            const s = scale();
            if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 4) d.moved = true;
            if (d.moved) setOffset({ x: d.ox + (e.clientX - d.x) * s, y: d.oy + (e.clientY - d.y) * s });
          }}
          onPointerUp={() => { setTimeout(() => { drag.current = null; }, 0); }}
          onPointerLeave={() => { drag.current = null; }}
        >
          <g transform={`translate(${offset.x + (W / 2) * (1 - zoom)} ${offset.y + (H / 2) * (1 - zoom)}) scale(${zoom})`}>
            {edges.map((e, i) => {
              if (!visible(nodes[e.b])) return null;
              const hot = hover !== null && (hover === e.a || hover === e.b);
              return (
                <line
                  key={i}
                  x1={nodes[e.a].x}
                  y1={nodes[e.a].y}
                  x2={nodes[e.b].x}
                  y2={nodes[e.b].y}
                  stroke={e.kind === 'topic' ? COL_TOPIC : COL_KEYWORD}
                  strokeWidth={hot ? 1.4 : 0.7}
                  opacity={hover === null ? (e.kind === 'topic' ? 0.16 : 0.3) : hot ? 0.85 : 0.04}
                />
              );
            })}
            {nodes.map((n, i) => {
              if (!visible(n)) return null;
              const on = isOn(n);
              const dim = !lit(i);
              const click = () => {
                if (drag.current?.moved || nodeDrag.current?.moved) return;
                if (n.kind === 'paper') onPaper(n.id);
                else if (n.kind === 'topic') toggleTopic(n.label);
                else toggleKeyword(n.label);
              };
              const fill = n.kind === 'topic' ? COL_TOPIC : n.kind === 'keyword' ? COL_KEYWORD : COL_PAPER;
              return (
                <g
                  key={n.id}
                  data-kind={n.kind}
                  opacity={dim ? 0.15 : 1}
                  style={{ cursor: 'pointer', touchAction: 'none' }}
                  onPointerDown={startNodeDrag(n.id)}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onClick={click}
                >
                  <title>
                    {n.kind === 'paper'
                      ? `${n.label} (${n.paper!.year || '—'}) · ${n.count} citations\n${[...n.paper!.topics, ...n.paper!.keywords.map((k) => `#${k}`)].join(' · ')}`
                      : `${n.kind === 'topic' ? 'Topic' : 'Keyword'}: ${n.label} · ${n.count} paper${n.count === 1 ? '' : 's'}`}
                  </title>
                  {on && <circle cx={n.x} cy={n.y} r={n.r + 5} fill="none" stroke={n.kind === 'paper' ? '#d98a1e' : '#2ecfba'} strokeWidth={3} />}
                  <circle cx={n.x} cy={n.y} r={n.r} fill={fill} stroke="#fff" strokeWidth={n.kind === 'paper' ? 1.5 : 2.5} />
                  {n.kind === 'paper' ? (
                    <text x={n.x} y={n.y + 3} textAnchor="middle" fontSize={Math.max(7, n.r * 0.75)} fontWeight={700} fill="#fff" style={{ pointerEvents: 'none' }}>
                      {n.paper!.yy}
                    </text>
                  ) : (
                    <>
                      <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={n.kind === 'topic' ? 13 : 10} fontWeight={800} fill="#fff" style={{ pointerEvents: 'none' }}>
                        {n.count}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
            {/* names of topics and keywords on top of everything, so papers never cover them */}
            {nodes.map((n, i) => {
              if (n.kind === 'paper' || !visible(n)) return null;
              const fill = n.kind === 'topic' ? COL_TOPIC : COL_KEYWORD;
              return (
                <g key={`l-${n.id}`} opacity={lit(i) ? 1 : 0.15}>
                  <text
                    x={n.x}
                    y={n.y + n.r + (n.kind === 'topic' ? 16 : 12)}
                    textAnchor="middle"
                    fontSize={n.kind === 'topic' ? 14 : 10.5}
                    fontWeight={n.kind === 'topic' ? 800 : 600}
                    fill={fill}
                    stroke="#fbfcfe"
                    strokeWidth={3}
                    paintOrder="stroke"
                    style={{ pointerEvents: 'none' }}
                  >
                    {n.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
