import { getPhDTheses, getMasterTheses, getBachelorTheses, getSupervisions, getExternalCourses, getCourses, getTeachingProjects, Thesis, ExternalCourse, Course, TeachingProject } from "@/data/tutor";

function ThesisCard({ thesis }: { thesis: Thesis }) {
  return (
    <div className="flex gap-0 items-start">
      <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full ml-4 mr-2" style={{ backgroundColor: '#2ecfba', marginTop: '5.5px' }} />
      <div className="flex-1 min-w-0">
        <p className="text-[0.95rem] leading-snug text-gray-800">
          <span className="font-semibold">{thesis.title}</span>
          {thesis.author && <span>. {thesis.author}</span>}
          {thesis.degree && <span className="text-gray-500">. {thesis.degree}</span>}
          {thesis.year && !isNaN(thesis.year) && <span className="text-gray-500"> ({thesis.year})</span>}
          .
        </p>
      </div>
    </div>
  );
}

function ThesisGroup({ theses }: { theses: Thesis[] }) {
  return (
    <div>
      {theses.map((t, idx) => (
        <div key={t.id}>
          {idx > 0 && <hr className="my-4 border-gray-200" />}
          <ThesisCard thesis={t} />
        </div>
      ))}
    </div>
  );
}

function RegularCourseCard({ course }: { course: Course }) {
  return (
    <div className="flex gap-0 items-start">
      <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full ml-4 mr-2" style={{ backgroundColor: '#2ecfba', marginTop: '5.5px' }} />
      <div className="flex-1 min-w-0">
        <p className="text-[0.95rem] leading-snug text-gray-800">
          <span className="font-semibold">{course.title}</span>
          {course.isCoordinator && <span style={{ color: '#2ecfba' }}> [Course Coordinator]</span>}
          {course.program && <span>. {course.program}</span>}
          {course.levelAndCourse && <em className="text-gray-500"> - {course.levelAndCourse}</em>}
          {course.centro && <span>. {course.centro}.</span>}
          {course.year && <span className="text-gray-500"> ({course.year})</span>}
          .
        </p>
      </div>
    </div>
  );
}

function TeachingProjectCard({ project }: { project: TeachingProject }) {
  const title = project.title.replace(/\.+$/, '');
  return (
    <div className="flex gap-0 items-start">
      <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full ml-4 mr-2" style={{ backgroundColor: '#2ecfba', marginTop: '5.5px' }} />
      <div className="flex-1 min-w-0">
        <p className="text-[0.95rem] leading-snug text-gray-800">
          <span className="font-semibold">{title}</span>
          {project.isPI && <span style={{ color: '#2ecfba' }}> [PI]</span>}
          {project.funder && <span>. <em>{project.funder}</em>.</span>}
          {project.year && <span className="text-gray-500"> ({project.year})</span>}
          .
        </p>
      </div>
    </div>
  );
}

function CourseCard({ course }: { course: ExternalCourse }) {
  return (
    <div className="flex gap-0 items-start">
      <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full ml-4 mr-2" style={{ backgroundColor: '#2ecfba', marginTop: '5.5px' }} />
      <div className="flex-1 min-w-0">
        <p className="text-[0.95rem] leading-snug text-gray-800">
          <span className="font-semibold">{course.title}</span>
          {course.program && <span className="text-gray-500">. {course.program}</span>}
          {course.year && <span className="text-gray-500"> ({course.year})</span>}
          .
        </p>
      </div>
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
        <section id="courses" className="scroll-mt-20">
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Courses</h2>
          <div>
            {regularCourses.map((c, idx) => (
              <div key={c.id}>
                {idx > 0 && <hr className="my-4 border-gray-200" />}
                <RegularCourseCard course={c} />
              </div>
            ))}
          </div>
        </section>
      )}

      {teachingProjects.length > 0 && (
        <section id="teaching-innovation-projects" className="scroll-mt-20 mt-8">
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Teaching Innovation Projects</h2>
          <div>
            {teachingProjects.map((p, idx) => (
              <div key={p.id}>
                {idx > 0 && <hr className="my-4 border-gray-200" />}
                <TeachingProjectCard project={p} />
              </div>
            ))}
          </div>
        </section>
      )}

      {(phd.length > 0 || master.length > 0 || bachelor.length > 0 || supervision.length > 0) && (
        <section id="supervision" className="scroll-mt-20 mt-8">
          <h2 className="text-2xl font-bold mb-4" style={{ color: '#2ecfba' }}>Supervision</h2>

          {phd.length > 0 && (
            <div id="phd-thesis" className="scroll-mt-20 mb-6">
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#2ecfba' }}>PhD Thesis</h3>
              <ThesisGroup theses={phd} />
            </div>
          )}

          {master.length > 0 && (
            <div id="master-thesis" className="scroll-mt-20 mb-6">
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#2ecfba' }}>Master Thesis</h3>
              <ThesisGroup theses={master} />
            </div>
          )}

          {bachelor.length > 0 && (
            <div id="bachelor-thesis" className="scroll-mt-20 mb-6">
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#2ecfba' }}>Bachelor Thesis</h3>
              <ThesisGroup theses={bachelor} />
            </div>
          )}

          {supervision.length > 0 && (
            <div id="student-supervision" className="scroll-mt-20">
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#2ecfba' }}>Student Supervision</h3>
              <ThesisGroup theses={supervision} />
            </div>
          )}
        </section>
      )}

      {courses.length > 0 && (
        <section id="external-courses" className="scroll-mt-20 mt-8">
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>External Courses</h2>
          <div>
            {courses.map((c, idx) => (
              <div key={c.id}>
                {idx > 0 && <hr className="my-4 border-gray-200" />}
                <CourseCard course={c} />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
