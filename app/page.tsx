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
import { getBioStats } from "@/data/bioStats";
import AboutToggle from "@/components/AboutToggle";
import AboutSection from "@/components/AboutSection";

export default function Home() {
  const bioStats = getBioStats();
  return (
    <main className="px-6 lg:px-24 py-14 space-y-5">
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

        <div className="flex-1 space-y-3">
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
                className="px-3 py-1 rounded-full text-xs font-semibold border" style={{ backgroundColor: '#f0fdfa', color: '#1c2d2d', borderColor: '#2ecfba' }}
              >
                {tag}
              </span>
            ))}
          </div>

        </div>
      </section>

      {/* ── Position and Education ────────────────────────────────── */}
      <AboutToggle>
        <AboutSection />
      </AboutToggle>

      {/* ── Publications ──────────────────────────────────────────── */}
      <PublicationsToggle>
        <PublicationsSection />
      </PublicationsToggle>

      {/* ── Projects ─────────────────────────────────────── */}
      <ProjectsToggle>
        <ProjectsSection />
      </ProjectsToggle>

      {/* ── Teaching ──────────────────────────────────────────────── */}
      <TeachingToggle>
        <TeachingSection />
      </TeachingToggle>

      {/* ── International ─────────────────────────────────────────── */}
      <InternationalToggle>
        <InternationalSection />
      </InternationalToggle>

    </main>
  );
}
