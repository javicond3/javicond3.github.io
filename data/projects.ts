import * as xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

export interface Project {
  id: string;
  tipo: 'Competitive' | 'Private';
  title: string;
  funder: string;
  scope: string;
  startDate: Date | null;
  endDate: Date | null;
  money?: number;
  isIP: boolean;
  link?: string;
}

const MONTHS_EN = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];

export function formatMonthYear(date: Date | null): string {
  if (!date) return '';
  return `${MONTHS_EN[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatMoney(amount: number): string {
  return amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

const loadProjects = (): Project[] => {
  const filePath = path.join(process.cwd(), 'data', 'Projects.xlsx');
  const fileBuffer = fs.readFileSync(filePath);
  const wb = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data: any[] = xlsx.utils.sheet_to_json(ws);

  return data.filter(row => row['Tipo'] === 'Competitive' || row['Tipo'] === 'Private').map((row, index) => {
    const tipo: 'Competitive' | 'Private' = row['Tipo'] === 'Competitive' ? 'Competitive' : 'Private';

    let startDate: Date | null = null;
    let endDate: Date | null = null;
    const rawStart = row['Duración (inicio)'];
    const rawEnd = row['Duración (fin)'];
    if (rawStart instanceof Date) startDate = rawStart;
    else if (typeof rawStart === 'string' && rawStart) startDate = new Date(rawStart);
    if (rawEnd instanceof Date) endDate = rawEnd;
    else if (typeof rawEnd === 'string' && rawEnd) endDate = new Date(rawEnd);

    const rawMoney = row[' Asignación a la UPM '];
    const money = rawMoney != null && !isNaN(Number(rawMoney)) ? Number(rawMoney) : undefined;

    const ipYo = row['IP-YO'];
    const isIP = typeof ipYo === 'string' && ipYo.trim().toLowerCase() === 'yes';

    return {
      id: `proj${index}`,
      tipo,
      title: row['Título proyecto'] ? String(row['Título proyecto']) : '',
      funder: row['ENTIDAD FINANCIADORA'] ? String(row['ENTIDAD FINANCIADORA']) : '',
      scope: row['Alcance'] ? String(row['Alcance']) : '',
      startDate,
      endDate,
      money: tipo === 'Competitive' ? money : undefined,
      isIP,
      link: row['Link'] ? String(row['Link']) : undefined,
    };
  });
};

export interface SoftwareProject {
  id: string;
  title: string;
  link?: string;
  description?: string;
}

export const getSoftwareProjects = (): SoftwareProject[] => {
  const filePath = path.join(process.cwd(), 'data', 'Projects.xlsx');
  const fileBuffer = fs.readFileSync(filePath);
  const wb = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data: any[] = xlsx.utils.sheet_to_json(ws);
  return data
    .filter(row => row['Tipo'] === 'Software')
    .map((row, index) => ({
      id: `sw${index}`,
      title: row['Título proyecto'] ? String(row['Título proyecto']) : '',
      link: row['Link'] ? String(row['Link']) : undefined,
      description: row['Description'] ? String(row['Description']) : undefined,
    }));
};

export interface WorkingGroup {
  id: string;
  title: string;
  funder?: string;
  year?: string;
}

export const getWorkingGroups = (): WorkingGroup[] => {
  const filePath = path.join(process.cwd(), 'data', 'Projects.xlsx');
  const fileBuffer = fs.readFileSync(filePath);
  const wb = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data: any[] = xlsx.utils.sheet_to_json(ws);

  return data
    .filter(row => row['Tipo'] === 'Working Group')
    .map((row, index) => ({
      id: `wg${index}`,
      title: row['Título proyecto'] ? String(row['Título proyecto']).trim().replace(/\.+$/, '') : '',
      funder: row['ENTIDAD FINANCIADORA'] ? String(row['ENTIDAD FINANCIADORA']).trim() : undefined,
      year: row['Año'] ? String(row['Año']).trim().replace(/\.+$/, '') : undefined,
    }))
    .sort((a, b) => {
      const parse = (y: string | undefined) => {
        const m = String(y ?? '0').match(/\d{4}/g);
        return m ? parseInt(m[m.length - 1]) : 0;
      };
      return parse(b.year) - parse(a.year);
    });
};

export const getCompetitiveProjects = (): Project[] =>
  loadProjects()
    .filter(p => p.tipo === 'Competitive')
    .sort((a, b) => (b.endDate?.getTime() ?? 0) - (a.endDate?.getTime() ?? 0));

export const getPrivateContracts = (): Project[] =>
  loadProjects()
    .filter(p => p.tipo === 'Private')
    .sort((a, b) => (b.endDate?.getTime() ?? 0) - (a.endDate?.getTime() ?? 0));
