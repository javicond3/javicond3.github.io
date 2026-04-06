import * as xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

export interface Award {
  id: string;
  title: string;
  organization?: string;
  year?: string | number;
  tipo: string;
}

export interface ResearchVisit {
  id: string;
  title: string;
  location?: string;
  year?: number;
  duration?: string;
}

export const getResearchVisits = (): ResearchVisit[] => {
  const filePath = path.join(process.cwd(), 'data', 'Visits.xlsx');
  const fileBuffer = fs.readFileSync(filePath);
  const wb = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data: any[] = xlsx.utils.sheet_to_json(ws);

  return data
    .map((row, index) => ({
      id: `visit${index}`,
      title: row['Título'] ? String(row['Título']).trim() : '',
      location: row['Lugar'] ? String(row['Lugar']).trim() : undefined,
      year: row['Año'] ? Number(row['Año']) : undefined,
      duration: row['Duration'] ? String(row['Duration']).trim() : undefined,
    }))
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
};

export const getAwards = (): Award[] => {
  const filePath = path.join(process.cwd(), 'data', 'Awards.xlsx');
  const fileBuffer = fs.readFileSync(filePath);
  const wb = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data: any[] = xlsx.utils.sheet_to_json(ws);

  return data
    .map((row, index) => ({
      id: `award${index}`,
      title: row['Título'] ? String(row['Título']).trim() : '',
      organization: row['Organización'] ? String(row['Organización']).trim() : undefined,
      year: row['Año'] ?? undefined,
      tipo: row['Tipo'] ? String(row['Tipo']).trim() : '',
    }))
    .sort((a, b) => {
      const parse = (y: string | number | undefined) => {
        const s = String(y ?? '0');
        const parts = s.split('-');
        return parseInt(parts[parts.length - 1]) || 0;
      };
      return parse(b.year) - parse(a.year);
    });
};
