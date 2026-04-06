import { getAwards, Award, getResearchVisits, ResearchVisit } from "@/data/awards";
import { getInvitedLectures, InvitedLecture, getEvents, InvitedEvent } from "@/data/tutor";
import { getWorkingGroups, WorkingGroup } from "@/data/projects";

function VisitCard({ visit }: { visit: ResearchVisit }) {
  const title = visit.title.replace(/\.+$/, '');
  return (
    <div className="flex gap-0 items-start">
      <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full ml-4 mr-2" style={{ backgroundColor: '#2ecfba', marginTop: '5.5px' }} />
      <div className="flex-1 min-w-0">
        <p className="text-[0.95rem] leading-snug text-gray-800">
          <span className="font-semibold">{title}</span>
          {visit.location && <span>. <span style={{ color: '#2ecfba' }}>{visit.location.replace(/\.+$/, '')}</span></span>}
          {(visit.year != null || visit.duration) && (
            <span className="text-gray-500"> ({[visit.year, visit.duration].filter(Boolean).join(' - ')})</span>
          )}
        </p>
      </div>
    </div>
  );
}

function AwardCard({ award }: { award: Award }) {
  const title = award.title.replace(/\.+$/, '');
  const org = award.organization ? award.organization.replace(/\.+$/, '') : '';

  return (
    <div className="flex gap-0 items-start">
      <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full ml-4 mr-2" style={{ backgroundColor: '#2ecfba', marginTop: '5.5px' }} />
      <div className="flex-1 min-w-0">
        <p className="text-[0.95rem] leading-snug text-gray-800">
          <span className="font-semibold">{title}</span>
          {org && <span>. {org}</span>}
          {award.year != null && <span className="text-gray-500"> ({award.year})</span>}
          {award.tipo && (
            <span> - <span style={{ color: '#2ecfba' }}>{award.tipo}</span></span>
          )}
        </p>
      </div>
    </div>
  );
}

function LectureCard({ lecture }: { lecture: InvitedLecture }) {
  const title = lecture.title.replace(/\.+$/, '');

  return (
    <div className="flex gap-0 items-start">
      <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full ml-4 mr-2" style={{ backgroundColor: '#2ecfba', marginTop: '5.5px' }} />
      <div className="flex-1 min-w-0">
        <p className="text-[0.95rem] leading-snug text-gray-800">
          <span className="font-semibold">{title}</span>
          {lecture.program && <span>. <span style={{ color: '#2ecfba' }}>{lecture.program}</span></span>}
          {lecture.location
            ? <span className="text-gray-500">. {lecture.location.replace(/\.+$/, '')}.</span>
            : <span>.</span>}
          {lecture.year != null && <span className="text-gray-500"> ({lecture.year})</span>}
        </p>
      </div>
    </div>
  );
}

function EventCard({ event }: { event: InvitedEvent }) {
  const title = event.title.replace(/\.+$/, '');

  return (
    <div className="flex gap-0 items-start">
      <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full ml-4 mr-2" style={{ backgroundColor: '#2ecfba', marginTop: '5.5px' }} />
      <div className="flex-1 min-w-0">
        <p className="text-[0.95rem] leading-snug text-gray-800">
          <span className="font-semibold">{title}</span>
          {event.rol && <span> [<span style={{ color: '#2ecfba' }}>{event.rol}</span>]</span>}
          {event.program && <span className="text-gray-500">. {event.program}</span>}
          {event.location
            ? <span className="text-gray-500">. {event.location.replace(/\.+$/, '')}.</span>
            : <span className="text-gray-500">.</span>}
          {event.year != null && <span className="text-gray-500"> ({event.year}).</span>}
        </p>
      </div>
    </div>
  );
}

function WorkingGroupCard({ wg }: { wg: WorkingGroup }) {
  const title = wg.title.replace(/\.+$/, '');
  return (
    <div className="flex gap-0 items-start">
      <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full ml-4 mr-2" style={{ backgroundColor: '#2ecfba', marginTop: '5.5px' }} />
      <div className="flex-1 min-w-0">
        <p className="text-[0.95rem] leading-snug text-gray-800">
          <span className="font-semibold">{title}</span>
          {wg.funder && <span>. <em>{wg.funder}</em></span>}
          {wg.year && <span className="text-gray-500"> ({wg.year})</span>}
          .
        </p>
      </div>
    </div>
  );
}

export default function InternationalSection() {
  const visits = getResearchVisits();
  const awards = getAwards();
  const workingGroups = getWorkingGroups();
  const lectures = getInvitedLectures();
  const events = getEvents();

  return (
    <>
      {visits.length > 0 && (
        <section id="research-visits" className="scroll-mt-20">
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Research Visits</h2>
          <div>
            {visits.map((v, idx) => (
              <div key={v.id}>
                {idx > 0 && <hr className="my-4 border-gray-200" />}
                <VisitCard visit={v} />
              </div>
            ))}
          </div>
        </section>
      )}

      {awards.length > 0 && (
        <section id="awards" className="scroll-mt-20 mt-10">
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Awards</h2>
          <div>
            {awards.map((a, idx) => (
              <div key={a.id}>
                {idx > 0 && <hr className="my-4 border-gray-200" />}
                <AwardCard award={a} />
              </div>
            ))}
          </div>
        </section>
      )}

      {workingGroups.length > 0 && (
        <section id="working-groups" className="scroll-mt-20 mt-8">
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Working Groups, Standardisation Bodies, and Industry</h2>
          <div>
            {workingGroups.map((wg, idx) => (
              <div key={wg.id}>
                {idx > 0 && <hr className="my-4 border-gray-200" />}
                <WorkingGroupCard wg={wg} />
              </div>
            ))}
          </div>
        </section>
      )}

      {lectures.length > 0 && (
        <section id="invited-lectures" className="scroll-mt-20 mt-8">
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Invited Lectures</h2>
          <div>
            {lectures.map((l, idx) => (
              <div key={l.id}>
                {idx > 0 && <hr className="my-4 border-gray-200" />}
                <LectureCard lecture={l} />
              </div>
            ))}
          </div>
        </section>
      )}
      {events.length > 0 && (
        <section id="events" className="scroll-mt-20 mt-8">
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Events</h2>
          <div>
            {events.map((e, idx) => (
              <div key={e.id}>
                {idx > 0 && <hr className="my-4 border-gray-200" />}
                <EventCard event={e} />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
