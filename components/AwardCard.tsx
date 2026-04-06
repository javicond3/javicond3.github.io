import EntryBullet, { SelectableProps } from "./EntryBullet";

interface AwardLike {
  title: string;
  organization?: string;
  year?: string | number;
  tipo: string;
}

export default function AwardCard({ award, selectable }: { award: AwardLike; selectable?: SelectableProps }) {
  const title = award.title.replace(/\.+$/, '');
  const org = award.organization ? award.organization.replace(/\.+$/, '') : '';

  return (
    <div className="flex gap-0 items-start">
      <EntryBullet selectable={selectable} />
      <div className="flex-1 min-w-0">
        <p className="text-[0.95rem] leading-snug text-gray-800">
          <span className="font-semibold">{title}</span>
          {org && <span>. {org}</span>}
          {award.year != null && <span className="text-gray-500"> ({award.year})</span>}
          {award.tipo && (
            <span> - <span style={{ color: '#2ecfba' }}>{award.tipo}</span></span>
          )}
          .
        </p>
      </div>
    </div>
  );
}
