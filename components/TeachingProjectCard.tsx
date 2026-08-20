import EntryBullet, { SelectableProps } from "./EntryBullet";
import CopyButton from "./CopyButton";

interface TeachingProjectLike {
  title: string;
  isPI: boolean;
  funder?: string;
  year?: string;
}

export default function TeachingProjectCard({ project, selectable }: { project: TeachingProjectLike; selectable?: SelectableProps }) {
  const title = project.title.replace(/\.+$/, '');
  const copyText = [
    title + (project.isPI ? ' [PI]' : ''),
    project.funder,
    project.year && `(${project.year})`,
  ].filter(Boolean).join('. ') + '.';

  return (
    <div className="flex gap-0 items-start group">
      <EntryBullet selectable={selectable} />
      <div className="flex-1 min-w-0">
        <p className="text-[0.95rem] leading-snug text-gray-800">
          <span className="font-semibold">{title}</span>
          {project.isPI && <span style={{ color: '#2ecfba' }}> [PI]</span>}
          {project.funder && <span>. <em>{project.funder}</em>.</span>}
          {project.year && <span className="text-gray-500"> ({project.year})</span>}
          .
          <CopyButton text={copyText} />
        </p>
      </div>
    </div>
  );
}
