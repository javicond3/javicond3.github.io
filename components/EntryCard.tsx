import EntryBullet, { SelectableProps } from "./EntryBullet";

interface EntryLike {
  title: string;
  organization?: string;
  year?: string;
  note?: string;
}

export default function EntryCard({ entry, selectable }: { entry: EntryLike; selectable?: SelectableProps }) {
  const title = entry.title.replace(/\.+$/, '');
  return (
    <div className="flex gap-0 items-start">
      <EntryBullet selectable={selectable} />
      <div className="flex-1 min-w-0">
        <p className="text-[0.95rem] leading-snug text-gray-800">
          <span className="font-semibold">{title}</span>
          {entry.organization && <span>. <em>{entry.organization}</em></span>}
          {entry.year && <span className="text-gray-500"> ({entry.year})</span>}
          {entry.note && <span style={{ color: '#2ecfba' }}> — {entry.note}</span>}
          .
        </p>
      </div>
    </div>
  );
}
