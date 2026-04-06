import * as xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

export interface Thesis {
  id: string;
  tipo: 'PhD' | 'Master' | 'Bachelor' | 'Supervisor';
  title: string;
  author: string;
  degree?: string;
  year?: number | string;
}

const loadTheses = (): Thesis[] => {
  const filePath = path.join(process.cwd(), 'data', 'Tutor.xlsx');
  const fileBuffer = fs.readFileSync(filePath);
  const wb = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data: any[] = xlsx.utils.sheet_to_json(ws);

  const sortableYear = (year?: number | string) => {
    if (year == null) return 0;
    if (typeof year === 'number') return year;
    return isNaN(Number(year)) ? Infinity : Number(year);
  };

  return data
    .filter(row => row['Mi rol'] !== 'ponente')
    .map((row, index) => {
      const rawYear = row['Año Lectura'] ? String(row['Año Lectura']).trim() : undefined;
      return {
        id: `thesis${index}`,
        tipo: row['Tipo'] as Thesis['tipo'],
        title: row['Título'] ? String(row['Título']).trim() : '',
        author: row['Autor'] ? String(row['Autor']).trim() : '',
        degree: row['Titulación'] ? String(row['Titulación']).trim() : undefined,
        year: rawYear ? (isNaN(Number(rawYear)) ? rawYear : Number(rawYear)) : undefined,
      };
    })
    .sort((a, b) => sortableYear(b.year) - sortableYear(a.year));
};

export const getPhDTheses = (): Thesis[] => loadTheses().filter(t => t.tipo === 'PhD');
export const getMasterTheses = (): Thesis[] => loadTheses().filter(t => t.tipo === 'Master');
export const getBachelorTheses = (): Thesis[] => loadTheses().filter(t => t.tipo === 'Bachelor');
export const getSupervisions = (): Thesis[] => loadTheses().filter(t => t.tipo === 'Supervisor');

export interface CourseYearHours {
  label: string; // e.g. "21-22"
  startYear: number; // e.g. 2021
  hours: number;
}

export interface Course {
  id: string;
  title: string;
  isCoordinator: boolean;
  program?: string;
  levelAndCourse?: string;
  centro?: string;
  year?: string;
  level?: 'BSc' | 'MSc';
  totalHours: number;
  hoursByYear: CourseYearHours[];
}

const ACADEMIC_YEAR_COL = /^(\d{4})-(\d{2})$/;

export const getCourses = (): Course[] => {
  const filePath = path.join(process.cwd(), 'data', 'Courses.xlsx');
  const fileBuffer = fs.readFileSync(filePath);
  const wb = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data: any[] = xlsx.utils.sheet_to_json(ws);

  return data.map((row, index) => {
    const hoursByYear: CourseYearHours[] = Object.keys(row)
      .filter((key) => ACADEMIC_YEAR_COL.test(key) && Number(row[key]) > 0)
      .map((key) => {
        const m = key.match(ACADEMIC_YEAR_COL)!;
        return { label: `${m[1].slice(2)}-${m[2]}`, startYear: parseInt(m[1], 10), hours: Number(row[key]) };
      })
      .sort((a, b) => a.startYear - b.startYear);

    return {
      id: `course-reg${index}`,
      title: row['Título'] ? String(row['Título']).trim() : '',
      isCoordinator: String(row['Course Coordinator'] ?? '').trim().toLowerCase() === 'yes',
      program: row['Programa'] ? String(row['Programa']).trim() : undefined,
      levelAndCourse: row['Level and course'] ? String(row['Level and course']).trim() : undefined,
      centro: row['Centro'] ? String(row['Centro']).trim() : undefined,
      year: row['Año'] ? String(row['Año']).trim() : undefined,
      level: row['Level'] === 'BSc' || row['Level'] === 'MSc' ? row['Level'] : undefined,
      totalHours: Number(row['Total Hours']) || 0,
      hoursByYear,
    };
  });
};

export interface ExternalCourse {
  id: string;
  title: string;
  program?: string;
  year?: string;
}

export interface InvitedLecture {
  id: string;
  title: string;
  program?: string;
  location?: string;
  year?: string | number;
}

export const getInvitedLectures = (): InvitedLecture[] => {
  const filePath = path.join(process.cwd(), 'data', 'External_Courses_Events_Lectures.xlsx');
  const fileBuffer = fs.readFileSync(filePath);
  const wb = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data: any[] = xlsx.utils.sheet_to_json(ws);

  return data
    .filter(row => row['Tipo'] === 'Lecture')
    .map((row, index) => ({
      id: `lecture${index}`,
      title: row['Título'] ? String(row['Título']).trim() : '',
      program: row['Programa'] ? String(row['Programa']).trim() : undefined,
      location: row['Lugar'] ? String(row['Lugar']).trim() : undefined,
      year: row['Año'] ?? undefined,
    }))
    .sort((a, b) => {
      const parse = (y: string | number | undefined) => {
        const parts = String(y ?? '0').split('-');
        return parseInt(parts[parts.length - 1]) || 0;
      };
      return parse(b.year) - parse(a.year);
    });
};

export interface InvitedEvent {
  id: string;
  title: string;
  program?: string;
  location?: string;
  year?: string | number;
  rol?: string;
}

export const getEvents = (): InvitedEvent[] => {
  const filePath = path.join(process.cwd(), 'data', 'External_Courses_Events_Lectures.xlsx');
  const fileBuffer = fs.readFileSync(filePath);
  const wb = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data: any[] = xlsx.utils.sheet_to_json(ws);

  return data
    .filter(row => row['Tipo'] === 'Event')
    .map((row, index) => ({
      id: `event${index}`,
      title: row['Título'] ? String(row['Título']).trim() : '',
      program: row['Programa'] ? String(row['Programa']).trim() : undefined,
      location: row['Lugar'] ? String(row['Lugar']).trim() : undefined,
      year: row['Año'] ?? undefined,
      rol: row['Rol'] ? String(row['Rol']).trim() : undefined,
    }))
    .sort((a, b) => {
      const parse = (y: string | number | undefined) => {
        const parts = String(y ?? '0').split('-');
        return parseInt(parts[parts.length - 1]) || 0;
      };
      return parse(b.year) - parse(a.year);
    });
};

export interface TeachingProject {
  id: string;
  title: string;
  funder?: string;
  year?: string;
  isPI: boolean;
}

export const getTeachingProjects = (): TeachingProject[] => {
  const filePath = path.join(process.cwd(), 'data', 'Teaching_Projects.xlsx');
  const fileBuffer = fs.readFileSync(filePath);
  const wb = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data: any[] = xlsx.utils.sheet_to_json(ws);

  return data
    .filter(row => String(row['Tipo'] ?? '').toLowerCase() === 'project')
    .map((row, index) => ({
      id: `tproject${index}`,
      title: row['Título'] ? String(row['Título']).trim() : '',
      funder: row['ENTIDAD FINANCIADORA'] ? String(row['ENTIDAD FINANCIADORA']).trim() : undefined,
      year: row['Año'] ? String(row['Año']).trim() : undefined,
      isPI: String(row['IP-YO'] ?? '').trim().toLowerCase() === 'yes',
    }))
    .sort((a, b) => {
      const parse = (y: string | undefined) => parseInt(String(y ?? '0').split('-')[0]) || 0;
      return parse(b.year) - parse(a.year);
    });
};

export const getExternalCourses = (): ExternalCourse[] => {
  const filePath = path.join(process.cwd(), 'data', 'External_Courses_Events_Lectures.xlsx');
  const fileBuffer = fs.readFileSync(filePath);
  const wb = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data: any[] = xlsx.utils.sheet_to_json(ws);

  return data
    .filter(row => row['Tipo'] === 'Course')
    .map((row, index) => ({
      id: `course${index}`,
      title: row['Título'] ? String(row['Título']).trim() : '',
      program: row['Programa'] ? String(row['Programa']).trim() : undefined,
      year: row['Año'] ? String(row['Año']).trim() : undefined,
    }))
    .sort((a, b) => {
      const parse = (y: string | undefined) => {
        const parts = String(y ?? '0').split('-');
        const end = parseInt(parts[parts.length - 1]);
        const start = parseInt(parts[0]);
        return { end, start };
      };
      const ay = parse(a.year);
      const by = parse(b.year);
      if (by.end !== ay.end) return by.end - ay.end;
      return by.start - ay.start;
    });
};
