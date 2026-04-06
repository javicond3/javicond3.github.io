import EntryBullet, { SelectableProps } from "./EntryBullet";

interface VisitLike {
  title: string;
  location?: string;
  year?: number;
  duration?: string;
}

export default function VisitCard({ visit, selectable }: { visit: VisitLike; selectable?: SelectableProps }) {
  const title = visit.title.replace(/\.+$/, '');
  return (
    <div className="flex gap-0 items-start">
      <EntryBullet selectable={selectable} />
      <div className="flex-1 min-w-0">
        <p className="text-[0.95rem] leading-snug text-gray-800">
          <span className="font-semibold">{title}</span>
          {visit.location && <span>. <span style={{ color: '#2ecfba' }}>{visit.location.replace(/\.+$/, '')}</span></span>}
          {(visit.year != null || visit.duration) && (
            <span className="text-gray-500"> ({[visit.year, visit.duration].filter(Boolean).join(' - ')})</span>
          )}
          .
        </p>
      </div>
    </div>
  );
}
