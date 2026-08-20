import EntryBullet, { SelectableProps } from "./EntryBullet";
import CopyButton from "./CopyButton";

interface ExternalCourseLike {
  title: string;
  program?: string;
  year?: string;
}

export default function ExternalCourseCard({ course, selectable }: { course: ExternalCourseLike; selectable?: SelectableProps }) {
  const copyText = [
    course.title,
    course.program,
    course.year && `(${course.year})`,
  ].filter(Boolean).join('. ') + '.';

  return (
    <div className="flex gap-0 items-start group">
      <EntryBullet selectable={selectable} />
      <div className="flex-1 min-w-0">
        <p className="text-[0.95rem] leading-snug text-gray-800">
          <span className="font-semibold">{course.title}</span>
          {course.program && <span className="text-gray-500">. {course.program}</span>}
          {course.year && <span className="text-gray-500"> ({course.year})</span>}
          .
          <CopyButton text={copyText} />
        </p>
      </div>
    </div>
  );
}
