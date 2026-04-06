import { getCompetitiveProjects, getPrivateContracts, getSoftwareProjects, formatMonthYear, formatMoney, Project, SoftwareProject } from "@/data/projects";

function ProjectCard({ project }: { project: Project }) {
  const dateRange = [formatMonthYear(project.startDate), formatMonthYear(project.endDate)]
    .filter(Boolean)
    .join(' – ');

  return (
    <div className="flex gap-0 items-start">
      {/* Bullet */}
      <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full ml-4 mr-2" style={{ backgroundColor: '#2ecfba', marginTop: '5.5px' }} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[0.95rem] leading-snug text-gray-800">
          {dateRange && (
            <span className="text-gray-500">({dateRange}). </span>
          )}
          {(() => {
            const title = project.title.replace(/\.+$/, '');
            return project.link ? (
              <a
                href={project.link}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline"
                style={{ color: 'inherit' }}
              >
                {title}
              </a>
            ) : (
              <span className="font-semibold">{title}</span>
            );
          })()}
          {project.isIP && (
            <span className="ml-1 font-semibold" style={{ color: '#2ecfba' }}>[PI]</span>
          )}
          {(() => {
            const funder = project.funder?.replace(/\.+$/, '') ?? '';
            const hasScope = project.tipo === 'Competitive' && !!project.scope;
            const hasMoney = project.money != null;
            return (
              <>
                {funder && <span>. <em>{funder}</em></span>}
                {hasScope && <span style={{ color: '#2ecfba' }}>. {project.scope} project</span>}
                {hasMoney && <span style={{ color: '#2ecfba' }}>{hasScope ? ' - ' : '. '}{formatMoney(project.money!)}</span>}
                .
              </>
            );
          })()}
        </p>
      </div>
    </div>
  );
}

function ProjectGroup({ projects }: { projects: Project[] }) {
  return (
    <div>
      {projects.map((proj, idx) => (
        <div key={proj.id}>
          {idx > 0 && <hr className="my-4 border-gray-200" />}
          <ProjectCard project={proj} />
        </div>
      ))}
    </div>
  );
}

function SoftwareCard({ project }: { project: SoftwareProject }) {
  return (
    <div className="flex gap-0 items-start">
      <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full ml-4 mr-2" style={{ backgroundColor: '#2ecfba', marginTop: '5.5px' }} />
      <div className="flex-1 min-w-0">
        <p className="text-[0.95rem] leading-snug text-gray-800">
          {project.link ? (
            <a
              href={project.link}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline hover:opacity-80"
              style={{ color: 'inherit' }}
            >
              {project.title}
            </a>
          ) : (
            <span className="font-semibold">{project.title}</span>
          )}
          {project.description && (
            <span className="text-gray-600">. {project.description}</span>
          )}
        </p>
      </div>
    </div>
  );
}

export default function ProjectsSection() {
  const competitive = getCompetitiveProjects();
  const privateContracts = getPrivateContracts();
  const software = getSoftwareProjects();

  return (
    <>
      {competitive.length > 0 && (
        <section id="competitive-projects" className="scroll-mt-20">
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Competitive Projects</h2>
          <ProjectGroup projects={competitive} />
        </section>
      )}

      {privateContracts.length > 0 && (
        <section id="private-contracts" className="scroll-mt-20 mt-8">
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Private Contracts</h2>
          <ProjectGroup projects={privateContracts} />
        </section>
      )}

      {software.length > 0 && (
        <section id="software" className="scroll-mt-20 mt-8">
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Software</h2>
          <div>
            {software.map((sw, idx) => (
              <div key={sw.id}>
                {idx > 0 && <hr className="my-4 border-gray-200" />}
                <SoftwareCard project={sw} />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
