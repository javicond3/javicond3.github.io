import EntryBullet, { SelectableProps } from "./EntryBullet";

interface SoftwareLike {
  title: string;
  link?: string;
  description?: string;
}

export default function SoftwareCard({ project, selectable }: { project: SoftwareLike; selectable?: SelectableProps }) {
  return (
    <div className="flex gap-0 items-start">
      <EntryBullet selectable={selectable} />
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
