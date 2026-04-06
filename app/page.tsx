import Image from "next/image";
import PublicationsToggle from "@/components/PublicationsToggle";
import PublicationsSection from "@/components/PublicationsSection";
import ProjectsToggle from "@/components/ProjectsToggle";
import ProjectsSection from "@/components/ProjectsSection";
import TeachingToggle from "@/components/TeachingToggle";
import TeachingSection from "@/components/TeachingSection";
import InternationalToggle from "@/components/InternationalToggle";
import InternationalSection from "@/components/InternationalSection";
import BioSection from "@/components/BioSection";
import SummaryCards from "@/components/SummaryCards";
import Dashboard from "@/components/Dashboard";
import { buildDashboardData } from "@/utils/buildDashboardData";
import { getBioStats } from "@/data/bioStats";
import AboutToggle from "@/components/AboutToggle";
import AboutSection from "@/components/AboutSection";
import { getPositions, getEducation, getCertificates, getInstitutionalRoles, getSexenios } from "@/data/about";
import { publications, conferencePublications, bookPublications, otherPublications } from "@/data/publications";
import { getCompetitiveProjects, getPrivateContracts, getSoftwareProjects, getWorkingGroups, getProjectsFunding } from "@/data/projects";
import { getPhDTheses, getMasterTheses, getBachelorTheses, getSupervisions, getExternalCourses, getCourses, getTeachingProjects, getInvitedLectures, getEvents } from "@/data/tutor";
import { getResearchVisits, getAwards } from "@/data/awards";
import { buildSummaryGroups } from "@/utils/buildSummaryGroups";

export default function Home() {
  const bioStats = getBioStats();

  const aboutCount = getPositions().length + getInstitutionalRoles().length + getEducation().length + getCertificates().length;

  const publicationsCount = publications.length + conferencePublications.length + bookPublications.length + otherPublications.length;

  const projectsCount = getCompetitiveProjects().length + getPrivateContracts().length + getSoftwareProjects().length;

  const teachingCount = getCourses().length + getTeachingProjects().length + getPhDTheses().length + getMasterTheses().length + getBachelorTheses().length + getSupervisions().length + getExternalCourses().length;

  const internationalCount = getResearchVisits().length + getAwards().length + getWorkingGroups().length + getInvitedLectures().length + getEvents().length;

  const dashboardData = buildDashboardData({
    journals: publications,
    conferences: conferencePublications,
    books: bookPublications,
    otherPubs: otherPublications,
    competitiveProjects: getCompetitiveProjects(),
    privateProjects: getPrivateContracts(),
    projectsFunding: getProjectsFunding(),
    phdTheses: getPhDTheses(),
    masterTheses: getMasterTheses(),
    bachelorTheses: getBachelorTheses(),
    supervisions: getSupervisions(),
  });

  const summaryGroups = buildSummaryGroups({
    competitiveProjects: getCompetitiveProjects(),
    privateProjects: getPrivateContracts(),
    journals: publications,
    conferences: conferencePublications,
    books: bookPublications,
    otherPubs: otherPublications,
    sexenios: getSexenios(),
    researchVisits: getResearchVisits(),
    phdTheses: getPhDTheses(),
    bachelorTheses: getBachelorTheses(),
    masterTheses: getMasterTheses(),
    supervisions: getSupervisions(),
    invitedLectures: getInvitedLectures(),
    courses: getCourses(),
    teachingProjects: getTeachingProjects(),
    externalCourses: getExternalCourses(),
    awards: getAwards(),
    events: getEvents(),
    workingGroups: getWorkingGroups(),
  });

  return (
    <main id="main-content" className="px-6 lg:px-24 py-14 space-y-5">
      {/* ── About ─────────────────────────────────────────────────── */}
      <section id="about" className="scroll-mt-20 flex flex-col sm:flex-row gap-8 items-start">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <Image
            src="/avatar.jpg"
            alt="Javier Conde"
            width={150}
            height={150}
            className="w-40 h-40 rounded-full object-cover shadow-md ring-2 ring-[#2ecfba]"
            priority
          />
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Javier Conde
          </h1>
          <p className="text-base text-gray-500 font-medium">
            Assistant Professor · Universidad Politécnica de Madrid
          </p>
          <BioSection stats={bioStats} />

          {/* Badges */}
          <div className="flex flex-wrap gap-2 pt-1">
            {[
              "Artificial Intelligence",
              "Educational Technology",
              "Digital Twins",
              "Linked Open Data",
              "Edge Computing",
            ].map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full text-xs font-semibold border" style={{ backgroundColor: '#f0fdfa', color: '#2ecfba', borderColor: '#2ecfba' }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Summary */}
          <div className="pt-1">
            <SummaryCards groups={summaryGroups} />
          </div>

        </div>
      </section>

      {/* ── Dashboard ─────────────────────────────────────────────── */}
      <Dashboard data={dashboardData} />

      {/* ── Position and Education ────────────────────────────────── */}
      <AboutToggle count={aboutCount}>
        <AboutSection />
      </AboutToggle>

      {/* ── Publications ──────────────────────────────────────────── */}
      <PublicationsToggle count={publicationsCount}>
        <PublicationsSection />
      </PublicationsToggle>

      {/* ── Projects ─────────────────────────────────────── */}
      <ProjectsToggle count={projectsCount}>
        <ProjectsSection />
      </ProjectsToggle>

      {/* ── Teaching ──────────────────────────────────────────────── */}
      <TeachingToggle count={teachingCount}>
        <TeachingSection />
      </TeachingToggle>

      {/* ── International ─────────────────────────────────────────── */}
      <InternationalToggle count={internationalCount}>
        <InternationalSection />
      </InternationalToggle>

    </main>
  );
}
