import EntryBullet, { SelectableProps } from "./EntryBullet";
import CopyButton from "./CopyButton";

interface EventLike {
  title: string;
  rol?: string;
  program?: string;
  location?: string;
  year?: string | number;
}

export default function EventCard({ event, selectable }: { event: EventLike; selectable?: SelectableProps }) {
  const title = event.title.replace(/\.+$/, '');
  const copyText = [
    title + (event.rol ? ` [${event.rol}]` : ''),
    event.program,
    event.location && event.location.replace(/\.+$/, ''),
    event.year != null && `(${event.year})`,
  ].filter(Boolean).join('. ') + '.';

  return (
    <div className="flex gap-0 items-start group">
      <EntryBullet selectable={selectable} />
      <div className="flex-1 min-w-0">
        <p className="text-[0.95rem] leading-snug text-gray-800">
          <span className="font-semibold">{title}</span>
          {event.rol && <span> [<span style={{ color: '#2ecfba' }}>{event.rol}</span>]</span>}
          {event.program && <span className="text-gray-500">. {event.program}</span>}
          {event.location
            ? <span className="text-gray-500">. {event.location.replace(/\.+$/, '')}.</span>
            : <span className="text-gray-500">.</span>}
          {event.year != null && <span className="text-gray-500"> ({event.year}).</span>}
          <CopyButton text={copyText} />
        </p>
      </div>
    </div>
  );
}
