import * as xlsx from 'xlsx';
import path from 'path';
import { instSigla, instsForCountry } from '../utils/acronym';
export { instSigla, instsForCountry } from '../utils/acronym';
import fs from 'fs';
import { parseTagList } from '../utils/tags';

export interface Coauthor {
  name: string;          // full name, e.g. "Pedro Reviriego"
  firma: string;         // paper-signature format, e.g. "P. Reviriego"
  initials: string;      // exactly two letters for the node, e.g. "PR"
  institution: string;   // primary institution (first affiliation, '' when unknown)
  country: string;       // primary country ('' when unknown)
  institutions: string[]; // every affiliation across his shared papers
  countries: string[];   // every affiliation country
  hindex: number;        // Google Scholar h-index (0 when unknown)
  scholar: string;       // Google Scholar profile URL ('' when none)
  orcid: string;         // ORCID URL ('' when none)
  papers: number;        // shared papers, computed live from Hoja1 author lists
  me: boolean;           // the central node (Javier)
  inGraph: boolean;      // shown in the graph: see MAX_FULL_AUTHORS rule in getCoauthorData
  paperIds: string[];    // shared papers (Hoja1 ids) linked via the firma
}

export interface PaperNode {
  id: string;
  title: string;
  year: number;
  yy: string;          // two-digit year for the node label
  venue: string;
  citations: number;
  doi: string;
  jcr: string;         // JCR quartile or CORE rank ('' when none)
  sjr: string;         // SJR quartile ('' when none)
  type: string;        // Journal / Conference / Book / Preprint / Other
  topics: string[];    // "areas" column
  keywords: string[];  // "keywords" column
}

export interface CountryAgg {
  name: string;
  count: number;   // co-authors with an affiliation in this country (multi-affiliation counts in each)
  maxH: number;
  avgH: number;
  topH: { name: string; scholar: string; hindex: number }[];
  topPapers: { name: string; scholar: string; papers: number }[];
  institutions: string[]; // acronyms of the institutions he collaborates with in this country
  papers: number;      // shared papers with co-authors in this country
  citations: number;   // total citations across those papers
  topCited: { title: string; citations: number; doi: string }[];
}

export interface CoauthorData {
  coauthors: Coauthor[];
  papers: PaperNode[];
  paperAuthors: Record<string, number[]>; // paper id -> coauthor indexes
  countries: Record<string, CountryAgg>;
}

const norm = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‐-―−]/g, '-')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

// signatures are compared without dots or spaces: "J.Conde" and "J. Conde" are the same author
const firmaKey = (s: string): string => norm(s).replace(/[.\s]/g, '');

// looser comparison: same first surname and at least one initial in common, so "J.A. Hernández"
// finds "J. Hernández" (and "M. Mayor" finds "M. Mayor-Rocher") but "B. Hernández" does not
const splitFirma = (s: string): { surname: string; initials: string[] } | null => {
  const t = norm(s).replace(/\./g, '. ').split(/[\s-]+/).filter(Boolean);
  const i = t.findIndex((w) => !(w.endsWith('.') || w.length === 1));
  if (i < 0) return null;
  const initials = t.slice(0, i).map((w) => w[0]);
  return { surname: t[i], initials: initials.length ? initials : [t[i][0]] };
};

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

// "; "-separated cells carry arrays (multi-affiliation authors)
const parseList = (raw: any): string[] =>
  raw
    ? String(raw)
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];


// Dictionary paper title -> full names of its authors (from the Coautores sheet), so a search for
// "Pedro Reviriego" finds the papers signed "P. Reviriego".
let authorNamesCache: Map<string, string> | null = null;
export function authorNamesForTitle(title: string): string {
  if (!authorNamesCache) {
    const { coauthors, papers, paperAuthors } = getCoauthorData();
    authorNamesCache = new Map(
      papers.map((p) => [norm(p.title), (paperAuthors[p.id] || []).map((i) => coauthors[i].name).join(', ')]),
    );
  }
  return authorNamesCache.get(norm(title)) || '';
}

const MAX_FULL_AUTHORS = 15;
const TOP_H_AUTHORS = 3;

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

    const papers: PaperNode[] = [];
    const paperAuthors: Record<string, number[]> = {};
    const firma2idx = new Map<string, number>();
    const bySurname = new Map<string, { idx: number; initials: string[] }[]>();
    const findAuthor = (entry: string): number | undefined => {
      const exact = firma2idx.get(firmaKey(entry));
      if (exact !== undefined) return exact;
      const f = splitFirma(entry);
      if (!f) return undefined;
      const hits = (bySurname.get(f.surname) || []).filter((c) => c.initials.some((x) => f.initials.includes(x)));
      return hits.length === 1 ? hits[0].idx : undefined; // ambiguous -> no link
    };

    const coauthors: Coauthor[] = rows
      .filter((r) => r['Author'])
      .map((r, i) => {
        const name = String(r['Author']).trim().replace(/\s*\(me\)\s*$/i, '');
        const firma = String(r['Firma'] || name).trim();
        firma2idx.set(firmaKey(firma), i);
        const f = splitFirma(firma);
        if (f) bySurname.set(f.surname, [...(bySurname.get(f.surname) || []), { idx: i, initials: f.initials }]);
        const institutions = parseList(r['Institución']);
        const countries = parseList(r['País']);
        return {
          name,
          firma,
          initials: toInitials(firma),
          institution: institutions[0] || '',
          country: countries[0] || '',
          institutions,
          countries,
          hindex: parseNum(r['h-index']),
          scholar: r['Google Scholar'] ? String(r['Google Scholar']).trim() : '',
          // the cell may hold the full URL or just the 0000-0000-0000-0000 id
          orcid: ((id) => (id ? `https://orcid.org/${id[0].toUpperCase()}` : ''))(String(r['ORCID'] || '').match(/\d{4}-\d{4}-\d{4}-\d{3}[\dXx]/)),
          papers: 0,
          me: name.startsWith('Javier Conde'),
          inGraph: false, // computed below from the author lists
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
        jcr: row['JCR'] && row['JCR'] !== '-' ? String(row['JCR']).trim() : '',
        sjr: row['SJR'] && row['SJR'] !== '-' ? String(row['SJR']).trim() : '',
        type: !row['Tipo'] || row['Tipo'] === 'Otro' ? 'Other' : String(row['Tipo']).trim(),
        topics: parseTagList(row['areas']),
        keywords: parseTagList(row['keywords']),
      });
      const seen = new Set<number>();
      for (const entry of String(aut).split(',')) {
        const idx = findAuthor(entry);
        if (idx !== undefined && !seen.has(idx)) {
          seen.add(idx);
          (paperAuthors[id] ||= []).push(idx);
          coauthors[idx].paperIds.push(id);
        }
      }
    }
    // Every row of Hoja1 is one of my papers, however my name is written in its author list
    const meIdx = coauthors.findIndex((c) => c.me);
    if (meIdx >= 0) {
      for (const p of papers) {
        if ((paperAuthors[p.id] ||= []).includes(meIdx)) continue;
        paperAuthors[p.id].push(meIdx);
        coauthors[meIdx].paperIds.push(p.id);
      }
    }
    for (const c of coauthors) c.papers = c.paperIds.length || (c.me ? 0 : 1);

    // Who is drawn in the graph. Papers with up to MAX_FULL_AUTHORS authors contribute all of them;
    // bigger author lists only contribute the first author, the last author and the
    // TOP_H_AUTHORS co-authors with the highest h-index.
    // Big papers have their 'Autores' cell abbreviated ("A, B, […], Z"), so the full list is taken
    // from the Bibtex cell when there is one.
    const nameKey = (s2: string): string => norm(s2).replace(/[-.]/g, ' ').split(' ').filter(Boolean).sort().join(' ');
    const name2idx = new Map(coauthors.map((c, i) => [nameKey(c.name), i]));
    const isEllipsis = (e: string) => /^\s*(\[?\s*(…|\.\.\.)\s*\]?)\s*$/.test(e);
    const link = (id: string, idx: number) => {
      if ((paperAuthors[id] ||= []).includes(idx)) return;
      paperAuthors[id].push(idx);
      coauthors[idx].paperIds.push(id);
    };
    const big: { id: string; first?: number; last?: number; full: boolean }[] = [];
    for (const [i, row] of hoja1.entries()) {
      if (!row['Autores']) continue;
      const id = `p${i}`;
      const entries = String(row['Autores']).split(',').map((e) => e.trim()).filter(Boolean);
      const total = Math.max(parseNum(row['Numero autores']), entries.filter((e) => !isEllipsis(e)).length);
      if (total <= MAX_FULL_AUTHORS) {
        for (const idx of paperAuthors[id] || []) coauthors[idx].inGraph = true;
        continue;
      }
      const bib = String(row['Bibtex'] || '').match(/author\s*=\s*\{([\s\S]*?)\}\s*,?\s*\n/);
      if (bib) {
        // "Last, First and Last, First and ..."
        const idxs = bib[1].split(/\s+and\s+/).map((a) => name2idx.get(nameKey(a.replace(',', ' '))));
        for (const idx of idxs) if (idx !== undefined) link(id, idx);
        big.push({ id, first: idxs[0], last: idxs[idxs.length - 1], full: true });
      } else {
        const lastEntry = entries[entries.length - 1];
        big.push({
          id,
          first: findAuthor(entries[0]),
          last: isEllipsis(lastEntry) ? undefined : findAuthor(lastEntry),
          full: false,
        });
      }
    }
    // Co-authors that appear in no author list can only come from an abbreviated one:
    // when a single big paper lacks its full list, they belong to it.
    const partial = big.filter((b) => !b.full);
    if (partial.length === 1) {
      coauthors.forEach((c, idx) => {
        if (!c.me && c.paperIds.length === 0) link(partial[0].id, idx);
      });
    }
    for (const b of big) {
      const members = (paperAuthors[b.id] || []).filter((idx) => !coauthors[idx].me);
      const topH = [...members].sort((x, y) => coauthors[y].hindex - coauthors[x].hindex).slice(0, TOP_H_AUTHORS);
      for (const idx of [b.first, b.last, ...topH]) if (idx !== undefined) coauthors[idx].inGraph = true;
    }
    for (const c of coauthors) {
      if (c.me) c.inGraph = true;
      c.papers = c.paperIds.length || (c.me ? 0 : 1);
    }

    // Country aggregates: a multi-affiliation author counts in each country
    const countries: Record<string, CountryAgg> = {};
    for (const c of coauthors) {
      if (c.me) continue;
      for (const country of c.countries) {
        const a = (countries[country] ||= { name: country, count: 0, maxH: 0, avgH: 0, topH: [], topPapers: [], institutions: [], papers: 0, citations: 0, topCited: [] });
        a.count += 1;
        a.maxH = Math.max(a.maxH, c.hindex);
      }
    }
    for (const [name, a] of Object.entries(countries)) {
      const members = coauthors.filter((c) => !c.me && c.countries.includes(name));
      a.avgH = Math.round((members.reduce((s, c) => s + c.hindex, 0) / members.length) * 10) / 10;
      a.topH = [...members]
        .sort((x, y) => y.hindex - x.hindex)
        .slice(0, 3)
        .map((c) => ({ name: c.name, scholar: c.scholar, hindex: c.hindex }));
      a.topPapers = [...members]
        .sort((x, y) => y.papers - x.papers)
        .slice(0, 3)
        .map((c) => ({ name: c.name, scholar: c.scholar, papers: c.papers }));
      const pmap = new Map(papers.map((p) => [p.id, p]));
      // acronyms are derived from the names: when two institutions of the country share one, keep the full names
      const instNames = [...new Set(members.flatMap((c) => instsForCountry(c.institutions, c.countries, name)))];
      const sigCount = new Map<string, number>();
      for (const n of instNames) sigCount.set(instSigla(n), (sigCount.get(instSigla(n)) || 0) + 1);
      // (unless the acronym is literally part of the name: "NEC (Germany)" and "NEC Laboratories Europe" are both NEC)
      a.institutions = [
        ...new Set(instNames.map((n) => (sigCount.get(instSigla(n)) === 1 || n.split(/[\s,()]+/).includes(instSigla(n)) ? instSigla(n) : n))),
      ].sort();
      const pids = [...new Set(members.flatMap((c) => c.paperIds))];
      a.papers = pids.length;
      a.citations = pids.reduce((sum, id) => sum + (pmap.get(id)?.citations || 0), 0);
      a.topCited = pids
        .map((id) => pmap.get(id)!)
        .filter(Boolean)
        .sort((x, y) => y.citations - x.citations)
        .slice(0, 3)
        .map((p) => ({ title: p.title, citations: p.citations, doi: p.doi }));
    }

    return { coauthors, papers, paperAuthors, countries };
  } catch {
    return empty;
  }
}
