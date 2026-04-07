import {
  getPublications,
  getConferencePublications,
  getBookPublications,
  getOtherPublications,
  getReviewerData,
} from "@/data/publications";
import {
  getCompetitiveProjects,
  getPrivateContracts,
  getSoftwareProjects,
  getWorkingGroups,
} from "@/data/projects";
import {
  getCourses,
  getTeachingProjects,
  getPhDTheses,
  getMasterTheses,
  getBachelorTheses,
  getSupervisions,
  getExternalCourses,
  getInvitedLectures,
  getEvents,
} from "@/data/tutor";
import {
  getPositions,
  getEducation,
  getCertificates,
  getInstitutionalRoles,
} from "@/data/about";
import { getAwards, getResearchVisits } from "@/data/awards";
import { getBioStats } from "@/data/bioStats";
import CVAdminClient from "@/components/CVAdminClient";
import type { CVData } from "@/types/cv";

export default function AdminPage() {
  const bioStats = getBioStats();
  const journals = getPublications();
  const conferences = getConferencePublications();
  const books = getBookPublications();
  const otherPubs = getOtherPublications();
  const reviewerData = getReviewerData();

  const serializeProjects = (projects: ReturnType<typeof getCompetitiveProjects>) =>
    projects.map((p) => ({
      ...p,
      startDate: p.startDate ? p.startDate.toISOString() : null,
      endDate: p.endDate ? p.endDate.toISOString() : null,
    }));

  const competitive = serializeProjects(getCompetitiveProjects());
  const privateContracts = serializeProjects(getPrivateContracts());
  const software = getSoftwareProjects();
  const workingGroups = getWorkingGroups();

  const courses = getCourses();
  const teachingProjects = getTeachingProjects();
  const phdTheses = getPhDTheses();
  const masterTheses = getMasterTheses();
  const bachelorTheses = getBachelorTheses();
  const supervisions = getSupervisions();
  const externalCourses = getExternalCourses();
  const invitedLectures = getInvitedLectures();
  const events = getEvents();

  const positions = getPositions();
  const institutionalRoles = getInstitutionalRoles();
  const education = getEducation();
  const certificates = getCertificates();

  const awards = getAwards();
  const researchVisits = getResearchVisits();

  const cvData: CVData = {
    bioStats,
    reviewerData,
    journals,
    conferences,
    books,
    otherPubs,
    competitive,
    private: privateContracts,
    software,
    workingGroups,
    courses,
    teachingProjects,
    phdTheses,
    masterTheses,
    bachelorTheses,
    supervisions,
    externalCourses,
    positions,
    institutionalRoles,
    education,
    certificates,
    awards,
    researchVisits,
    invitedLectures,
    events,
  };

  return <CVAdminClient initialData={cvData} />;
}
