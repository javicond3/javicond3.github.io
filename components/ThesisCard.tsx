import EntryBullet, { SelectableProps } from "./EntryBullet";
import CopyButton from "./CopyButton";

interface ThesisLike {
  title: string;
  author: string;
  degree?: string;
  year?: number | string;
}

export default function ThesisCard({ thesis, selectable }: { thesis: ThesisLike; selectable?: SelectableProps }) {
  const copyText = [
    thesis.title,
    thesis.author,
    thesis.degree,
    thesis.year && `(${thesis.year})`,
  ].filter(Boolean).join('. ') + '.';

  return (
    <div className="flex gap-0 items-start group">
      <EntryBullet selectable={selectable} />
      <div className="flex-1 min-w-0">
        <p className="text-[0.95rem] leading-snug text-gray-800">
          <span className="font-semibold">{thesis.title}</span>
          {thesis.author && <span>. {thesis.author}</span>}
          {thesis.degree && <span className="text-gray-500">. {thesis.degree}</span>}
          {thesis.year && <span className="text-gray-500"> ({thesis.year})</span>}
          .
          <CopyButton text={copyText} />
        </p>
      </div>
    </div>
  );
}
