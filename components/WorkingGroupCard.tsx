import EntryBullet, { SelectableProps } from "./EntryBullet";
import CopyButton from "./CopyButton";

interface WorkingGroupLike {
  title: string;
  funder?: string;
  year?: string;
}

export default function WorkingGroupCard({ wg, selectable }: { wg: WorkingGroupLike; selectable?: SelectableProps }) {
  const title = wg.title.replace(/\.+$/, '');
  const copyText = [title, wg.funder, wg.year && `(${wg.year})`].filter(Boolean).join('. ') + '.';

  return (
    <div className="flex gap-0 items-start group">
      <EntryBullet selectable={selectable} />
      <div className="flex-1 min-w-0">
        <p className="text-[0.95rem] leading-snug text-gray-800">
          <span className="font-semibold">{title}</span>
          {wg.funder && <span>. <em>{wg.funder}</em></span>}
          {wg.year && <span className="text-gray-500"> ({wg.year})</span>}
          .
          <CopyButton text={copyText} />
        </p>
      </div>
    </div>
  );
}
