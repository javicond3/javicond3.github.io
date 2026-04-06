import EntryBullet, { SelectableProps } from "./EntryBullet";

interface ThesisLike {
  title: string;
  author: string;
  degree?: string;
  year?: number | string;
}

export default function ThesisCard({ thesis, selectable }: { thesis: ThesisLike; selectable?: SelectableProps }) {
  return (
    <div className="flex gap-0 items-start">
      <EntryBullet selectable={selectable} />
      <div className="flex-1 min-w-0">
        <p className="text-[0.95rem] leading-snug text-gray-800">
          <span className="font-semibold">{thesis.title}</span>
          {thesis.author && <span>. {thesis.author}</span>}
          {thesis.degree && <span className="text-gray-500">. {thesis.degree}</span>}
          {thesis.year && <span className="text-gray-500"> ({thesis.year})</span>}
          .
        </p>
      </div>
    </div>
  );
}
