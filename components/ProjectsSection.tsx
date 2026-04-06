import { getCompetitiveProjects, getPrivateContracts, getSoftwareProjects, Project } from "@/data/projects";
import { dateYearRange, yearDataAttrs } from "@/utils/extractYearRange";
import { projectSearchText, softwareSearchText } from "@/utils/searchText";
import ProjectCard from "./ProjectCard";
import SoftwareCard from "./SoftwareCard";

function ProjectGroup({ projects }: { projects: Project[] }) {
  return (
    <div>
      {projects.map((proj, idx) => (
        <div
          key={proj.id}
          data-search={projectSearchText(proj)}
          data-project-tipo={proj.tipo}
          data-project-scope={proj.scope}
          data-project-ip={proj.isIP ? "yes" : "no"}
          {...yearDataAttrs(dateYearRange(proj.startDate, proj.endDate))}
        >
          <hr className="my-4 border-gray-200" />
          <ProjectCard project={proj} />
        </div>
      ))}
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
        <section id="competitive-projects" className="scroll-mt-20" data-search-group>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Competitive Projects <span className="search-count text-gray-400 font-semibold text-sm align-middle" data-total={competitive.length}>({competitive.length})</span></h2>
          <ProjectGroup projects={competitive} />
        </section>
      )}

      {privateContracts.length > 0 && (
        <section id="private-contracts" className="scroll-mt-20 mt-8" data-search-group>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Private Contracts <span className="search-count text-gray-400 font-semibold text-sm align-middle" data-total={privateContracts.length}>({privateContracts.length})</span></h2>
          <ProjectGroup projects={privateContracts} />
        </section>
      )}

      {software.length > 0 && (
        <section id="software" className="scroll-mt-20 mt-8" data-search-group>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Software <span className="search-count text-gray-400 font-semibold text-sm align-middle" data-total={software.length}>({software.length})</span></h2>
          <div>
            {software.map((sw, idx) => (
              <div key={sw.id} data-search={softwareSearchText(sw)}>
                <hr className="my-4 border-gray-200" />
                <SoftwareCard project={sw} />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
