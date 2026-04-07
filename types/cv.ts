export interface Publication {
  id: string;
  authors: string;
  year: number;
  title: string;
  journal: string;
  type: string;
  location?: string;
  status?: string;
  doi?: string;
  jcr?: string;
  abstract: string;
  keywords: string[];
}

export interface Project {
  id: string;
  tipo: "Competitive" | "Private";
  title: string;
  funder: string;
  scope: string;
  startDate: string | null;
  endDate: string | null;
  money?: number;
  isIP: boolean;
  link?: string;
}

export interface SoftwareProject {
  id: string;
  title: string;
  link?: string;
  description?: string;
}

export interface WorkingGroup {
  id: string;
  title: string;
  funder?: string;
  year?: string;
}

export interface Thesis {
  id: string;
  tipo: "PhD" | "Master" | "Bachelor" | "Supervision";
  title: string;
  author: string;
  degree?: string;
  year?: number;
}

export interface Course {
  id: string;
  title: string;
  isCoordinator: boolean;
  program?: string;
  levelAndCourse?: string;
  centro?: string;
  year?: string;
}

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

export interface InvitedEvent {
  id: string;
  title: string;
  program?: string;
  location?: string;
  year?: string | number;
  rol?: string;
}

export interface TeachingProject {
  id: string;
  title: string;
  funder?: string;
  year?: string;
  isPI: boolean;
}

export interface AboutEntry {
  id: string;
  tipo: string;
  title: string;
  year?: string;
  organization?: string;
  location?: string;
  note?: string;
}

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

export interface ReviewerData {
  journals: string[];
  conferences: string[];
  books: string[];
}

export interface CVData {
  bioStats: BioStats;
  reviewerData: ReviewerData;
  journals: Publication[];
  conferences: Publication[];
  books: Publication[];
  otherPubs: Publication[];
  competitive: Project[];
  private: Project[];
  software: SoftwareProject[];
  workingGroups: WorkingGroup[];
  courses: Course[];
  teachingProjects: TeachingProject[];
  phdTheses: Thesis[];
  masterTheses: Thesis[];
  bachelorTheses: Thesis[];
  supervisions: Thesis[];
  externalCourses: ExternalCourse[];
  positions: AboutEntry[];
  institutionalRoles: AboutEntry[];
  education: AboutEntry[];
  certificates: AboutEntry[];
  awards: Award[];
  researchVisits: ResearchVisit[];
  invitedLectures: InvitedLecture[];
  events: InvitedEvent[];
}