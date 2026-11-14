"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { isAuthenticated } from "@/utils/auth";
import type { Coauthor } from "@/data/coauthors";

interface SimNode extends Coauthor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

const W = 1400;
const H = 860;
const CX = W / 2;
const CY = H / 2;

// Deterministic PRNG so every visitor sees the same layout.
const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Deterministic ring packing: Javier at the center, co-authors on concentric
// rings ordered by h-index (highest closest), with per-ring angular spacing
// derived from the actual node radii so nothing overlaps.
function layout(data: Coauthor[]): SimNode[] {
  const maxH = Math.max(...data.map((d) => d.hindex), 1);
  const rand = mulberry32(42);

  const radiusOf = (d: Coauthor) =>
    d.me ? 46 : 13 + 24 * Math.sqrt(Math.max(d.hindex, 0) / maxH);

  const me = data.find((d) => d.me);
  const rest = data
    .filter((d) => !d.me)
    .sort((a, b) => b.hindex - a.hindex || b.papers - a.papers);

  const nodes: SimNode[] = [];
  if (me) nodes.push({ ...me, r: radiusOf(me), x: CX, y: CY, vx: 0, vy: 0 });

  const GAP = 9;
  let ring = 0;
  let ringR = (me ? radiusOf(me) : 40) + 78; // first ring clears the center node
  let usedAngle = 0;
  let prevR = 0;

  for (const d of rest) {
    const r = radiusOf(d);
    const need = ((prevR + r) / 2 + GAP) / ringR; // angular width of this node
    if (usedAngle + need > Math.PI * 2 - 0.02) {
      ring += 1;
      ringR += 62; // ring pitch
      usedAngle = 0;
      prevR = 0;
    }
    const jitter = (rand() - 0.5) * 0.05;
    const angle = usedAngle + need / 2 + ring * 0.35 + jitter; // per-ring offset staggers nodes
    nodes.push({
      ...d,
      r,
      x: CX + Math.cos(angle) * (ringR + (rand() - 0.5) * 14),
      y: CY + Math.sin(angle) * (ringR + (rand() - 0.5) * 14),
      vx: 0,
      vy: 0,
    });
    usedAngle += need;
    prevR = r;
  }
  return nodes;
}

export default function CoauthorGraph({ data }: { data: Coauthor[] }) {
  const [authed, setAuthed] = useState(false);
  const [selected, setSelected] = useState<SimNode | null>(null);
  const [scale, setScale] = useState(1);
  const [hover, setHover] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setAuthed(isAuthenticated());
  }, []);

  const nodes = useMemo(() => (authed ? layout(data) : []), [authed, data]);
  const maxP = useMemo(() => Math.max(...data.map((d) => d.papers), 1), [data]);

  // Logged-out visitors (and crawlers) get nothing at all.
  if (!authed || nodes.length === 0) return null;

  const vw = W / scale;
  const vh = H / scale;
  const vx0 = CX - vw / 2;
  const vy0 = CY - vh / 2;

  const zoom = (dir: number) =>
    setScale((s) => Math.min(3.5, Math.max(0.55, +(s * (dir > 0 ? 1.25 : 0.8)).toFixed(3))));

  return (
    <section id="coauthors" className="scroll-mt-20">
      <div className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3" style={{ backgroundColor: "#1c2d2d" }}>
          <div>
            <h2 className="text-lg font-bold text-white">Co-author network</h2>
            <p className="text-xs text-gray-300">
              {data.length - 1} co-authors · node size = h-index · edge width = shared papers · private view
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => zoom(-1)}
              aria-label="Zoom out"
              className="w-8 h-8 rounded-md text-white text-lg font-bold hover:bg-white/10 border border-white/20"
            >
              −
            </button>
            <button
              onClick={() => zoom(1)}
              aria-label="Zoom in"
              className="w-8 h-8 rounded-md text-white text-lg font-bold hover:bg-white/10 border border-white/20"
            >
              +
            </button>
          </div>
        </div>

        <div className="bg-white">
          <svg
            ref={svgRef}
            viewBox={`${vx0} ${vy0} ${vw} ${vh}`}
            className="w-full h-auto block select-none"
            role="img"
            aria-label="Co-author collaboration graph"
          >
            {/* edges */}
            {nodes
              .filter((n) => !n.me)
              .map((n) => {
                const me = nodes.find((m) => m.me)!;
                return (
                  <line
                    key={`e-${n.firma}`}
                    x1={me.x}
                    y1={me.y}
                    x2={n.x}
                    y2={n.y}
                    stroke={hover === n.firma ? "#1c2d2d" : "#9adfd3"}
                    strokeWidth={0.8 + 7 * (n.papers / maxP)}
                    strokeOpacity={hover === n.firma ? 0.9 : 0.55}
                  />
                );
              })}
            {/* nodes */}
            {nodes.map((n) => (
              <g
                key={n.firma}
                transform={`translate(${n.x}, ${n.y})`}
                onClick={() => setSelected(n)}
                onMouseEnter={() => setHover(n.firma)}
                onMouseLeave={() => setHover(null)}
                className="cursor-pointer"
              >
                <circle
                  r={n.r}
                  fill={n.me ? "#1c2d2d" : hover === n.firma ? "#18b09a" : "#2ecfba"}
                  stroke={n.me ? "#2ecfba" : "#1c2d2d"}
                  strokeWidth={n.me ? 3 : 1.2}
                  fillOpacity={n.me ? 1 : 0.92}
                />
                <text
                  textAnchor="middle"
                  y={-n.r * 0.08}
                  fontSize={Math.max(n.r * 0.52, 7)}
                  fontWeight={700}
                  fill={n.me ? "#2ecfba" : "#1c2d2d"}
                  pointerEvents="none"
                >
                  {n.initials}
                </text>
                <text
                  textAnchor="middle"
                  y={n.r * 0.62}
                  fontSize={Math.max(n.r * 0.34, 5.5)}
                  fill={n.me ? "#9adfd3" : "#0f5f53"}
                  pointerEvents="none"
                >
                  {n.hindex}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* click popup */}
      {selected && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 leading-tight">{selected.name}</h3>
                <p className="text-sm text-gray-500">{selected.firma}</p>
              </div>
              <div
                className="flex-shrink-0 w-14 h-14 rounded-full flex flex-col items-center justify-center font-bold"
                style={{ backgroundColor: "#2ecfba", color: "#1c2d2d" }}
              >
                <span className="text-base leading-none">{selected.initials}</span>
                <span className="text-[10px] leading-none mt-0.5">{selected.hindex}</span>
              </div>
            </div>
            <dl className="text-sm space-y-1.5">
              <div className="flex gap-2">
                <dt className="font-semibold text-gray-700 w-32">Institution</dt>
                <dd className="text-gray-900 flex-1">{selected.institution || "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-semibold text-gray-700 w-32">h-index</dt>
                <dd className="text-gray-900 flex-1">{selected.hindex || "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-semibold text-gray-700 w-32">Shared papers</dt>
                <dd className="text-gray-900 flex-1">{selected.papers}</dd>
              </div>
            </dl>
            {selected.scholar && (
              <a
                href={selected.scholar}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: "#1c2d2d" }}
              >
                Google Scholar profile
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path
                    fillRule="evenodd"
                    d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z"
                    clipRule="evenodd"
                  />
                  <path
                    fillRule="evenodd"
                    d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
            )}
            <button
              onClick={() => setSelected(null)}
              className="block w-full mt-1 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
