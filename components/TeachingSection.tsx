import { getPhDTheses, getMasterTheses, getBachelorTheses, getSupervisions, getExternalCourses, getCourses, getTeachingProjects, Thesis } from "@/data/tutor";
import { extractYearRange, yearDataAttrs } from "@/utils/extractYearRange";
import { thesisSearchText, courseSearchText, teachingProjectSearchText, externalCourseSearchText } from "@/utils/searchText";
import ThesisCard from "./ThesisCard";
import RegularCourseCard from "./RegularCourseCard";
import TeachingProjectCard from "./TeachingProjectCard";
import ExternalCourseCard from "./ExternalCourseCard";

function ThesisGroup({ theses }: { theses: Thesis[] }) {
  return (
    <div>
      {theses.map((t, idx) => (
        <div key={t.id} data-search={thesisSearchText(t)} {...yearDataAttrs(extractYearRange(t.year))}>
          <hr className="my-4 border-gray-200" />
          <ThesisCard thesis={t} />
        </div>
      ))}
    </div>
  );
}

export default function TeachingSection() {
  const teachingProjects = getTeachingProjects();
  const regularCourses = getCourses();
  const phd = getPhDTheses();
  const master = getMasterTheses();
  const bachelor = getBachelorTheses();
  const supervision = getSupervisions();
  const courses = getExternalCourses();

  return (
    <>
      {regularCourses.length > 0 && (
        <section id="courses" className="scroll-mt-20" data-search-group>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Courses <span className="search-count text-gray-400 font-semibold text-sm align-middle" data-total={regularCourses.length}>({regularCourses.length})</span></h2>
          <div>
            {regularCourses.map((c, idx) => (
              <div key={c.id} data-search={courseSearchText(c)} {...yearDataAttrs(extractYearRange(c.year))}>
                <hr className="my-4 border-gray-200" />
                <RegularCourseCard course={c} />
              </div>
            ))}
          </div>
        </section>
      )}

      {teachingProjects.length > 0 && (
        <section id="teaching-innovation-projects" className="scroll-mt-20 mt-8" data-search-group>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Teaching Innovation Projects <span className="search-count text-gray-400 font-semibold text-sm align-middle" data-total={teachingProjects.length}>({teachingProjects.length})</span></h2>
          <div>
            {teachingProjects.map((p, idx) => (
              <div key={p.id} data-search={teachingProjectSearchText(p)} {...yearDataAttrs(extractYearRange(p.year))}>
                <hr className="my-4 border-gray-200" />
                <TeachingProjectCard project={p} />
              </div>
            ))}
          </div>
        </section>
      )}

      {(phd.length > 0 || master.length > 0 || bachelor.length > 0 || supervision.length > 0) && (
        <section id="supervision" className="scroll-mt-20 mt-8" data-search-group>
          <h2 className="text-2xl font-bold mb-4" style={{ color: '#2ecfba' }}>Supervision <span className="search-count text-gray-400 font-semibold text-sm align-middle" data-total={phd.length + master.length + bachelor.length + supervision.length}>({phd.length + master.length + bachelor.length + supervision.length})</span></h2>

          {phd.length > 0 && (
            <div id="phd-thesis" className="scroll-mt-20 mb-6" data-search-group>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#2ecfba' }}>PhD Thesis <span className="search-count text-gray-400 font-semibold text-xs align-middle" data-total={phd.length}>({phd.length})</span></h3>
              <ThesisGroup theses={phd} />
            </div>
          )}

          {master.length > 0 && (
            <div id="master-thesis" className="scroll-mt-20 mb-6" data-search-group>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#2ecfba' }}>Master Thesis <span className="search-count text-gray-400 font-semibold text-xs align-middle" data-total={master.length}>({master.length})</span></h3>
              <ThesisGroup theses={master} />
            </div>
          )}

          {bachelor.length > 0 && (
            <div id="bachelor-thesis" className="scroll-mt-20 mb-6" data-search-group>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#2ecfba' }}>Bachelor Thesis <span className="search-count text-gray-400 font-semibold text-xs align-middle" data-total={bachelor.length}>({bachelor.length})</span></h3>
              <ThesisGroup theses={bachelor} />
            </div>
          )}

          {supervision.length > 0 && (
            <div id="scholarships" className="scroll-mt-20" data-search-group>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#2ecfba' }}>Scholarship Supervision <span className="search-count text-gray-400 font-semibold text-xs align-middle" data-total={supervision.length}>({supervision.length})</span></h3>
              <ThesisGroup theses={supervision} />
            </div>
          )}
        </section>
      )}

      {courses.length > 0 && (
        <section id="external-courses" className="scroll-mt-20 mt-8" data-search-group>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>External Courses <span className="search-count text-gray-400 font-semibold text-sm align-middle" data-total={courses.length}>({courses.length})</span></h2>
          <div>
            {courses.map((c, idx) => (
              <div key={c.id} data-search={externalCourseSearchText(c)} {...yearDataAttrs(extractYearRange(c.year))}>
                <hr className="my-4 border-gray-200" />
                <ExternalCourseCard course={c} />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
