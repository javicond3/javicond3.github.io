import * as xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

export interface Coauthor {
  name: string;        // full name, e.g. "Pedro Reviriego"
  firma: string;       // paper-signature format, e.g. "P. Reviriego"
  initials: string;    // exactly two letters for the node, e.g. "PR"
  institution: string; // from the shared paper / Scholar / web ('' when unknown)
  country: string;     // English country name ('' when unknown)
  hindex: number;      // Google Scholar h-index (0 when unknown)
  scholar: string;     // Google Scholar profile URL ('' when none)
  papers: number;      // shared papers, computed live from Hoja1 author lists
  me: boolean;         // the central node (Javier)
  inGraph: boolean;    // curated in the sheet: relevant enough for the graph
  paperIds: string[];  // shared papers (Hoja1 ids) linked via the firma
}

export interface PaperNode {
  id: string;
  title: string;
  year: number;
  yy: string;          // two-digit year for the node label
  venue: string;
  citations: number;
  doi: string;
}

export interface CoauthorData {
  coauthors: Coauthor[];
  papers: PaperNode[];
  paperAuthors: Record<string, number[]>; // paper id -> coauthor indexes
  countries: Record<string, { name: string; count: number; maxH: number; avgH: number }>;
}

const norm = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‐-―−]/g, '-')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const toInitials = (firma: string): string => {
  const parts = firma.split(' ');
  const first = (parts[0] || ' ').replace(/\./g, '').charAt(0);
  const last = (parts.length > 1 ? parts[parts.length - 1] : ' ').charAt(0);
  return (first + last)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase();
};

const parseNum = (raw: any): number => {
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
};

export function getCoauthorData(): CoauthorData {
  const empty: CoauthorData = { coauthors: [], papers: [], paperAuthors: {}, countries: {} };
  try {
    const filePath = path.join(process.cwd(), 'data', 'Publications.xlsx');
    const buf = fs.readFileSync(filePath);
    const wb = xlsx.read(buf, { type: 'buffer' });

    // Sheet 2 carries the curated co-author list. If the weekly SharePoint
    // sync ever drops it, the section just hides itself.
    const sheetName = wb.SheetNames.find((n) => n.toLowerCase() === 'coautores');
    if (!sheetName || !wb.SheetNames.includes('Hoja1')) return empty;
    const rows: any[] = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]);
    const hoja1: any[] = xlsx.utils.sheet_to_json(wb.Sheets['Hoja1']);

    // Papers from Hoja1
    const papers: PaperNode[] = [];
    const paperAuthors: Record<string, number[]> = {};
    const firma2idx = new Map<string, number>();

    const coauthors: Coauthor[] = rows
      .filter((r) => r['Author'])
      .map((r, i) => {
        const name = String(r['Author']).trim().replace(/\s*\(me\)\s*$/i, '');
        const firma = String(r['Firma'] || name).trim();
        firma2idx.set(norm(firma), i);
        return {
          name,
          firma,
          initials: toInitials(firma),
          institution: r['Institución'] ? String(r['Institución']).trim() : '',
          country: r['País'] ? String(r['País']).trim() : '',
          hindex: parseNum(r['h-index']),
          scholar: r['Google Scholar'] ? String(r['Google Scholar']).trim() : '',
          papers: 0,
          me: name.startsWith('Javier Conde'),
          inGraph: String(r['En grafo'] || 'Sí').trim().toLowerCase() !== 'no',
          paperIds: [],
        };
      });

    for (const [i, row] of hoja1.entries()) {
      const aut = row['Autores'];
      if (!aut) continue;
      const id = `p${i}`;
      const yrMatch = String(row['Año'] || '').match(/(\d{4})/);
      const year = yrMatch ? parseInt(yrMatch[1], 10) : 0;
      papers.push({
        id,
        title: row['Publicación'] ? String(row['Publicación']).trim() : '',
        year,
        yy: year ? String(year % 100).padStart(2, '0') : '??',
        venue: row['Revista'] && row['Revista'] !== '-' ? String(row['Revista']).trim() : '',
        citations: parseNum(row['Citas (con autocitas Google Scholar)']),
        doi: row['Link'] && row['Link'] !== '-' ? String(row['Link']).trim() : '',
      });
      const seen = new Set<number>();
      for (const entry of String(aut).split(',')) {
        const idx = firma2idx.get(norm(entry));
        if (idx !== undefined && !seen.has(idx)) {
          seen.add(idx);
          (paperAuthors[id] ||= []).push(idx);
          coauthors[idx].paperIds.push(id);
        }
      }
    }
    for (const c of coauthors) c.papers = c.paperIds.length || (c.me ? 0 : 1);

    // Country aggregates (co-authors only, not Javier)
    const countries: CoauthorData['countries'] = {};
    for (const c of coauthors) {
      if (c.me || !c.country) continue;
      const a = (countries[c.country] ||= { name: c.country, count: 0, maxH: 0, avgH: 0 });
      a.count += 1;
      a.maxH = Math.max(a.maxH, c.hindex);
    }
    for (const a of Object.values(countries)) {
      const hs = coauthors.filter((c) => !c.me && c.country === a.name).map((c) => c.hindex);
      a.avgH = Math.round((hs.reduce((s, h) => s + h, 0) / hs.length) * 10) / 10;
    }

    return { coauthors, papers, paperAuthors, countries };
  } catch {
    return empty;
  }
}
