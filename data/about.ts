import * as xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

export interface AboutEntry {
  id: string;
  tipo: 'Position' | 'Education';
  title: string;
  year?: string;
  organization?: string;
  location?: string;
  note?: string;
}

const loadAbout = (): AboutEntry[] => {
  const filePath = path.join(process.cwd(), 'data', 'About.xlsx');
  const fileBuffer = fs.readFileSync(filePath);
  const wb = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data: any[] = xlsx.utils.sheet_to_json(ws);

  return data.map((row, index) => ({
    id: `about${index}`,
    tipo: (row['Tipo'] ?? '') as AboutEntry['tipo'],
    title: row['Título'] ? String(row['Título']).trim() : '',
    year: row['Año'] ? String(row['Año']).trim() : undefined,
    organization: row['Organization'] ? String(row['Organization']).trim() : undefined,
    location: row['Lugar'] ? String(row['Lugar']).trim() : undefined,
    note: row['Nota'] ? String(row['Nota']).trim() : undefined,
  }));
};

export const getPositions = (): AboutEntry[] =>
  loadAbout().filter(e => e.tipo === 'Position');

export const getEducation = (): AboutEntry[] =>
  loadAbout().filter(e => e.tipo === 'Education');

export const getCertificates = (): AboutEntry[] =>
  loadAbout().filter(e => (e.tipo as string).toLowerCase().startsWith('lang'));

export const getInstitutionalRoles = (): AboutEntry[] =>
  loadAbout().filter(e => (e.tipo as string).toLowerCase().startsWith('institutional'));
