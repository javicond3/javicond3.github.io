import EntryBullet, { SelectableProps } from "./EntryBullet";
import CopyButton from "./CopyButton";

interface LectureLike {
  title: string;
  program?: string;
  location?: string;
  year?: string | number;
}

export default function LectureCard({ lecture, selectable }: { lecture: LectureLike; selectable?: SelectableProps }) {
  const title = lecture.title.replace(/\.+$/, '');
  const copyText = [
    title,
    lecture.program,
    lecture.location && lecture.location.replace(/\.+$/, ''),
    lecture.year != null && `(${lecture.year})`,
  ].filter(Boolean).join('. ') + '.';

  return (
    <div className="flex gap-0 items-start group">
      <EntryBullet selectable={selectable} />
      <div className="flex-1 min-w-0">
        <p className="text-[0.95rem] leading-snug text-gray-800">
          <span className="font-semibold">{title}</span>
          {lecture.program && <span>. <span style={{ color: '#2ecfba' }}>{lecture.program}</span></span>}
          {lecture.location
            ? <span className="text-gray-500">. {lecture.location.replace(/\.+$/, '')}.</span>
            : <span>.</span>}
          {lecture.year != null && <span className="text-gray-500"> ({lecture.year}).</span>}
          <CopyButton text={copyText} />
        </p>
      </div>
    </div>
  );
}
