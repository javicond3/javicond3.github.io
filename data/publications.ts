import * as xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

export interface Publication {
  id: string;
  authors: string; // raw author string; bold name is applied via highlighting key author
  highlightAuthor: string; // substring to bold
  year: number;
  title: string;
  journal: string;
  type: string;
  location?: string;
  status?: string; // e.g. "in-press"
  doi?: string;
  jcr?: string; // e.g. "Q1", "Q2"
  publisher?: string;
  abstract: string;
  keywords: string[];
  openAccess?: string[]; // links from the "Open Access" column (arXiv, TechRxiv, mirrors, ...)
  upmRepo?: string; // link from "En el repo de UPM" (Archivo Digital UPM)
  dataRepos?: string[]; // links from "Datos/Repos" (code, datasets: GitHub, Zenodo, ...)
  diffusion?: string[]; // links from "Noticias/Posts" (diffusion / divulgación)
  citations?: number; // from "Citas (con autocitas Google Scholar)"
}

const parseCitations = (raw: any): number | undefined => {
  if (raw === undefined || raw === null || raw === '' || raw === '-') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
};

// Cells can hold "-", a bare value, or a bracketed comma-separated list like
// "[https://a, https://b]". This normalizes all three into a clean string[].
const parseList = (raw: any): string[] => {
  if (raw === undefined || raw === null) return [];
  let value = String(raw).trim();
  if (!value || value === '-') return [];
  if (value.startsWith('[') && value.endsWith(']')) value = value.slice(1, -1);
  return value
    .split(',')
    .map((part) => part.replace(/\s+/g, ''))
    .filter((part) => part && part !== '-');
};

const parseRows = (data: any[], tipo: string, prefix: string): Publication[] => {
  return data.filter((row: any) => row['Tipo'] === tipo).map((row: any, index) => {
    let year = 0;
    let status = undefined;
    if (typeof row['Año'] === 'string') {
      const match = row['Año'].match(/(\d{4})/);
      if (match) year = parseInt(match[1], 10);
      if (row['Status'] && row['Status'].toLowerCase().includes('accepted')) {
        status = 'accepted';
      }
    } else if (typeof row['Año'] === 'number') {
      year = row['Año'];
    }

    return {
      id: `${prefix}${index}`,
      authors: row['Autores'] ? String(row['Autores']) : '',
      highlightAuthor: 'J. Conde',
      year,
      title: row['Publicación'] ? String(row['Publicación']) : '',
      journal: (row['Revista'] && row['Revista'] !== "-") ? String(row['Revista']) : '',
      type: tipo,
      location: (row['Lugar'] && row['Lugar'] !== "-") ? String(row['Lugar']) : undefined,
      status,
      doi: (row['Link'] && row['Link'] !== "-") ? String(row['Link']) : '',
      jcr: (row['JCR'] && row['JCR'] !== "-") ? String(row['JCR']) : '',
      publisher: (row['Editorial'] && row['Editorial'] !== "-") ? String(row['Editorial']) : undefined,
      abstract: row['Sumary'] ? String(row['Sumary']) : '',
      keywords: row['Keywords'] ? String(row['Keywords']).split(',').map((k: string) => k.trim()) : [],
      openAccess: parseList(row['Open Access']),
      upmRepo: (row['En el repo de UPM'] && row['En el repo de UPM'] !== "-") ? parseList(row['En el repo de UPM'])[0] ?? String(row['En el repo de UPM']).trim() : undefined,
      dataRepos: parseList(row['Datos/Repos']),
      diffusion: parseList(row['Noticias/Posts']),
      citations: parseCitations(row['Citas (con autocitas Google Scholar)']),
    };
  });
};

const loadData = () => {
  const filePath = path.join(process.cwd(), 'data', 'Publications.xlsx');
  const fileBuffer = fs.readFileSync(filePath);
  const wb = xlsx.read(fileBuffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return xlsx.utils.sheet_to_json(ws);
};

export const getPublications = (): Publication[] => parseRows(loadData(), 'Journal', 'pub');
export const getConferencePublications = (): Publication[] => parseRows(loadData(), 'Conference', 'conf');
export const getBookPublications = (): Publication[] => parseRows(loadData(), 'Book', 'book');
export const getOtherPublications = (): Publication[] => {
  const excluded = new Set(['Journal', 'Conference', 'Book']);
  const data = loadData();
  return (data as any[])
    .filter((row) => !excluded.has(row['Tipo']))
    .map((row, index) => {
      let year = 0;
      let status = undefined;
      if (typeof row['Año'] === 'string') {
        const match = row['Año'].match(/(\d{4})/);
        if (match) year = parseInt(match[1], 10);
        if (row['Status'] && row['Status'].toLowerCase().includes('accepted')) status = 'accepted';
      } else if (typeof row['Año'] === 'number') {
        year = row['Año'];
      }
      return {
        id: `other${index}`,
        authors: row['Autores'] ? String(row['Autores']) : '',
        highlightAuthor: 'J. Conde',
        year,
        title: row['Publicación'] ? String(row['Publicación']) : '',
        journal: (row['Revista'] && row['Revista'] !== "-") ? String(row['Revista']) : '',
        type: (row['Tipo'] && row['Tipo'] !== "Otro") ? String(row['Tipo']) : '',
        location: (row['Lugar'] && row['Lugar'] !== "-") ? String(row['Lugar']) : undefined,
        status,
        doi: (row['Link'] && row['Link'] !== "-") ? String(row['Link']) : '',
        jcr: (row['JCR'] && row['JCR'] !== "-") ? String(row['JCR']) : '',
        abstract: row['Sumary'] ? String(row['Sumary']) : '',
        keywords: row['Keywords'] ? String(row['Keywords']).split(',').map((k: string) => k.trim()) : [],
        openAccess: parseList(row['Open Access']),
        upmRepo: (row['En el repo de UPM'] && row['En el repo de UPM'] !== "-") ? parseList(row['En el repo de UPM'])[0] ?? String(row['En el repo de UPM']).trim() : undefined,
        dataRepos: parseList(row['Datos/Repos']),
        diffusion: parseList(row['Noticias/Posts']),
        citations: parseCitations(row['Citas (con autocitas Google Scholar)']),
      };
    });
};

export const publications: Publication[] = getPublications();
export const conferencePublications: Publication[] = getConferencePublications();
export const bookPublications: Publication[] = getBookPublications();
export const otherPublications: Publication[] = getOtherPublications();

export interface ReviewerData {
  journals: string[];
  conferences: string[];
  books: string[];
}

export const getReviewerData = (): ReviewerData => {
  const filePath = path.join(process.cwd(), 'data', 'Reviewer_papers.xlsx');
  const fileBuffer = fs.readFileSync(filePath);
  const wb = xlsx.read(fileBuffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(ws) as any[];

  const journals = [...new Set(
    data.filter(r => r['Tipo'] === 'Journal').map(r => String(r['Título']).trim())
  )];
  const conferences = [...new Set(
    data.filter(r => r['Tipo'] === 'Conference').map(r => String(r['Título']).trim())
  )];
  const books = [...new Set(
    data.filter(r => r['Tipo'] === 'Book').map(r => String(r['Título']).trim())
  )];

  return { journals, conferences, books };
};
