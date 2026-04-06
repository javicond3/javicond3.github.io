import * as xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

function readSheet(file: string) {
  const buf = fs.readFileSync(path.join(process.cwd(), 'data', file));
  const wb = xlsx.read(buf, { type: 'buffer', cellDates: true });
  return xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as any[];
}

export interface BioStats {
  progdocYears: number;
  totalPapers: number;
  journalCount: number;
  journalQ1: number;
  journalQ1D1: number;
  journalQ2: number;
  journalQ3: number;
  journalQ4: number;
  bookCount: number;
  conferenceCount: number;
  totalProjects: number;
  competitiveProjects: number;
  privateProjects: number;
  piCompetitiveProjects: number;
  piPrivateProjects: number;
  researchMonths: number;
  invitedTalks: number;
  externalCourses: number;
  totalSubjects: number;
  coordinatedSubjects: number;
  totalTeachingHours: number;
  totalInnovationProjects: number;
  coordinatedInnovationProjects: number;
  supervisionStudents: number;
  bachelorTheses: number;
  masterTheses: number;
  phdStudents: number;
  reviewerJournalCount: number;
  reviewerConferenceCount: number;
  reviewerBookCount: number;
  moocCount: number;
}

export function getBioStats(): BioStats {
  // --- Projects.xlsx ---
  const projects = readSheet('Projects.xlsx');
  const progdoc = projects.find(r =>
    String(r['Título proyecto original'] ?? '').toLowerCase() === 'progdoc'
  );
  let progdocStartYear = 2020;
  if (progdoc?.Description) {
    const m = String(progdoc.Description).match(/since\s+(\d{4})/i);
    if (m) progdocStartYear = parseInt(m[1]);
  }
  const currentYear = new Date().getFullYear();
  const progdocYears = currentYear - progdocStartYear;

  const competitiveProjects = projects.filter(r => r['Tipo'] === 'Competitive').length;
  const privateProjects = projects.filter(r => r['Tipo'] === 'Private').length;
  const totalProjects = competitiveProjects + privateProjects;
  const isPI = (r: any) => String(r['IP-YO'] ?? '').trim().toLowerCase() === 'yes';
  const piCompetitiveProjects = projects.filter(r => r['Tipo'] === 'Competitive' && isPI(r)).length;
  const piPrivateProjects = projects.filter(r => r['Tipo'] === 'Private' && isPI(r)).length;

  // --- Publications.xlsx ---
  const publications = readSheet('Publications.xlsx');
  const journalPubs = publications.filter(r => r['Tipo'] === 'Journal');
  const journalCount = journalPubs.length;
  const journalQ1 = journalPubs.filter(r => r['JCR'] === 'Q1').length;
  const journalQ1D1 = journalPubs.filter(r => r['JCR'] === 'Q1' && String(r['JCR Details'] ?? '').includes('[D1]')).length;
  const journalQ2 = journalPubs.filter(r => r['JCR'] === 'Q2').length;
  const journalQ3 = journalPubs.filter(r => r['JCR'] === 'Q3').length;
  const journalQ4 = journalPubs.filter(r => r['JCR'] === 'Q4').length;
  const bookCount = publications.filter(r => r['Tipo'] === 'Book').length;
  const conferenceCount = publications.filter(r => r['Tipo'] === 'Conference').length;
  const totalPapers = journalCount + conferenceCount + bookCount;

  // --- Visits.xlsx ---
  const visits = readSheet('Visits.xlsx');
  const researchMonths = visits.reduce((sum, r) => {
    const m = String(r['Duration'] ?? '').match(/(\d+)/);
    return sum + (m ? parseInt(m[1]) : 0);
  }, 0);

  // --- External_Courses_Events_Lectures.xlsx ---
  const external = readSheet('External_Courses_Events_Lectures.xlsx');
  const invitedTalks = external.filter(r => r['Tipo'] === 'Lecture').length;
  const externalCourses = external.filter(r => r['Tipo'] === 'Course').length;
  const moocCount = external.filter(r => String(r['Título'] ?? '').trim().startsWith('MOOC')).length;

  // --- Reviewer_papers.xlsx ---
  const reviewerData = readSheet('Reviewer_papers.xlsx');
  const reviewerJournalCount = new Set(
    reviewerData.filter(r => r['Tipo'] === 'Journal').map(r => String(r['Título']).trim())
  ).size;
  const reviewerConferenceCount = new Set(
    reviewerData.filter(r => r['Tipo'] === 'Conference').map(r => String(r['Título']).trim())
  ).size;
  const reviewerBookCount = new Set(
    reviewerData.filter(r => r['Tipo'] === 'Book').map(r => String(r['Título']).trim())
  ).size;

  // --- Courses.xlsx ---
  const courses = readSheet('Courses.xlsx');
  const totalSubjects = courses.length;
  const coordinatedSubjects = courses.filter(r =>
    String(r['Course Coordinator'] ?? '').trim().toLowerCase() === 'yes'
  ).length;
  const totalTeachingHours = courses.reduce((sum, r) => {
    const m = String(r['Total Hours'] ?? '').match(/(\d+)/);
    return sum + (m ? parseInt(m[1]) : 0);
  }, 0);

  // --- Teaching_Projects.xlsx ---
  const teachingProjects = readSheet('Teaching_Projects.xlsx');
  const totalInnovationProjects = teachingProjects.filter(r =>
    String(r['Tipo'] ?? '').toLowerCase() === 'project'
  ).length;
  const coordinatedInnovationProjects = teachingProjects.filter(r =>
    String(r['Tipo'] ?? '').toLowerCase() === 'project' &&
    String(r['IP-YO'] ?? '').trim().toLowerCase() === 'yes'
  ).length;

  // --- Tutor.xlsx ---
  const tutor = readSheet('Tutor.xlsx');
  const tutorFiltered = tutor.filter(r => r['Mi rol'] !== 'ponente');
  const supervisionStudents = tutorFiltered.filter(r => r['Tipo'] === 'Supervision').length;
  const bachelorTheses = tutorFiltered.filter(r => r['Tipo'] === 'Bachelor').length;
  const masterTheses = tutorFiltered.filter(r => r['Tipo'] === 'Master').length;
  const phdStudents = tutorFiltered.filter(r => r['Tipo'] === 'PhD').length;

  return {
    progdocYears,
    totalPapers,
    journalCount,
    journalQ1,
    journalQ1D1,
    journalQ2,
    journalQ3,
    journalQ4,
    bookCount,
    conferenceCount,
    totalProjects,
    competitiveProjects,
    privateProjects,
    piCompetitiveProjects,
    piPrivateProjects,
    researchMonths,
    invitedTalks,
    externalCourses,
    totalSubjects,
    coordinatedSubjects,
    totalTeachingHours,
    totalInnovationProjects,
    coordinatedInnovationProjects,
    supervisionStudents,
    bachelorTheses,
    masterTheses,
    phdStudents,
    reviewerJournalCount,
    reviewerConferenceCount,
    reviewerBookCount,
    moocCount,
  };
}
