import EntryBullet, { SelectableProps } from "./EntryBullet";

interface CourseLike {
  title: string;
  isCoordinator: boolean;
  program?: string;
  levelAndCourse?: string;
  centro?: string;
  year?: string;
}

export default function RegularCourseCard({ course, selectable }: { course: CourseLike; selectable?: SelectableProps }) {
  return (
    <div className="flex gap-0 items-start">
      <EntryBullet selectable={selectable} />
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
