import * as xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

export interface Coauthor {
  name: string;        // full name, e.g. "Pedro Reviriego"
  firma: string;       // paper-signature format, e.g. "P. Reviriego"
  initials: string;    // exactly two letters for the node, e.g. "PR"
  institution: string; // from the shared paper / Scholar / web ('' when unknown)
  hindex: number;      // Google Scholar h-index (0 when unknown)
  scholar: string;     // Google Scholar profile URL ('' when none)
  papers: number;      // shared papers, computed live from Hoja1 author lists
  me: boolean;         // the central node (Javier)
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

export function getCoauthors(): Coauthor[] {
  try {
    const filePath = path.join(process.cwd(), 'data', 'Publications.xlsx');
    const buf = fs.readFileSync(filePath);
    const wb = xlsx.read(buf, { type: 'buffer' });

    // Sheet 2 carries the curated co-author list. If the weekly SharePoint
    // sync ever drops it, the section just hides itself.
    const sheetName = wb.SheetNames.find((n) => n.toLowerCase() !== 'hoja1');
    if (!sheetName) return [];
    const rows: any[] = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]);

    // Shared-paper counts come from Hoja1 author lists (exact author-entry match).
    const hoja1: any[] = xlsx.utils.sheet_to_json(wb.Sheets['Hoja1']);
    const counts = new Map<string, number>();
    for (const row of hoja1) {
      const aut = row['Autores'];
      if (!aut) continue;
      const seen = new Set<string>();
      for (const entry of String(aut).split(',')) {
        const n = norm(entry);
        if (n && !seen.has(n)) {
          seen.add(n);
          counts.set(n, (counts.get(n) || 0) + 1);
        }
      }
    }

    return rows
      .filter((r) => r['Author'])
      .map((r) => {
        const name = String(r['Author']).trim();
        const firma = String(r['Firma'] || name).trim();
        const matched = counts.get(norm(firma)) || 0;
        // Co-authors of consortium papers (La Leaderboard, INCLUDE-2.0, ...)
        // are elided as "[...]" in Hoja1, so they never match: they still share
        // at least the one paper that tied them to the list.
        const papers = matched > 0 ? matched : 1;
        const h = Number(r['h-index']);
        return {
          name,
          firma,
          initials: toInitials(firma),
          institution: r['Institución'] ? String(r['Institución']).trim() : '',
          hindex: Number.isFinite(h) ? h : 0,
          scholar: r['Google Scholar'] ? String(r['Google Scholar']).trim() : '',
          papers,
          me: name.startsWith('Javier Conde'),
        };
      });
  } catch {
    return [];
  }
}
