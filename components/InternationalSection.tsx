import { getAwards, getResearchVisits } from "@/data/awards";
import { getInvitedLectures, getEvents } from "@/data/tutor";
import { getWorkingGroups } from "@/data/projects";
import { extractYearRange, yearDataAttrs } from "@/utils/extractYearRange";
import { visitSearchText, awardSearchText, lectureSearchText, eventSearchText, workingGroupSearchText } from "@/utils/searchText";
import VisitCard from "./VisitCard";
import AwardCard from "./AwardCard";
import LectureCard from "./LectureCard";
import EventCard from "./EventCard";
import WorkingGroupCard from "./WorkingGroupCard";

export default function InternationalSection() {
  const visits = getResearchVisits();
  const awards = getAwards();
  const workingGroups = getWorkingGroups();
  const lectures = getInvitedLectures();
  const events = getEvents();

  return (
    <>
      {visits.length > 0 && (
        <section id="research-visits" className="scroll-mt-20" data-search-group>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Research Visits <span className="search-count text-gray-400 font-semibold text-sm align-middle" data-total={visits.length}>({visits.length})</span></h2>
          <div>
            {visits.map((v, idx) => (
              <div key={v.id} data-search={visitSearchText(v)} {...yearDataAttrs(extractYearRange(v.year))}>
                <hr className="my-4 border-gray-200" />
                <VisitCard visit={v} />
              </div>
            ))}
          </div>
        </section>
      )}

      {awards.length > 0 && (
        <section id="awards" className="scroll-mt-20 mt-10" data-search-group>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Awards <span className="search-count text-gray-400 font-semibold text-sm align-middle" data-total={awards.length}>({awards.length})</span></h2>
          <div>
            {awards.map((a, idx) => (
              <div key={a.id} data-search={awardSearchText(a)} {...yearDataAttrs(extractYearRange(a.year))}>
                <hr className="my-4 border-gray-200" />
                <AwardCard award={a} />
              </div>
            ))}
          </div>
        </section>
      )}

      {workingGroups.length > 0 && (
        <section id="working-groups" className="scroll-mt-20 mt-8" data-search-group>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Working Groups, Standardisation Bodies, and Industry <span className="search-count text-gray-400 font-semibold text-sm align-middle" data-total={workingGroups.length}>({workingGroups.length})</span></h2>
          <div>
            {workingGroups.map((wg, idx) => (
              <div key={wg.id} data-search={workingGroupSearchText(wg)} {...yearDataAttrs(extractYearRange(wg.year))}>
                <hr className="my-4 border-gray-200" />
                <WorkingGroupCard wg={wg} />
              </div>
            ))}
          </div>
        </section>
      )}

      {lectures.length > 0 && (
        <section id="invited-lectures" className="scroll-mt-20 mt-8" data-search-group>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Invited Lectures <span className="search-count text-gray-400 font-semibold text-sm align-middle" data-total={lectures.length}>({lectures.length})</span></h2>
          <div>
            {lectures.map((l, idx) => (
              <div key={l.id} data-search={lectureSearchText(l)} {...yearDataAttrs(extractYearRange(l.year))}>
                <hr className="my-4 border-gray-200" />
                <LectureCard lecture={l} />
              </div>
            ))}
          </div>
        </section>
      )}
      {events.length > 0 && (
        <section id="events" className="scroll-mt-20 mt-8" data-search-group>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Events <span className="search-count text-gray-400 font-semibold text-sm align-middle" data-total={events.length}>({events.length})</span></h2>
          <div>
            {events.map((e, idx) => (
              <div key={e.id} data-search={eventSearchText(e)} {...yearDataAttrs(extractYearRange(e.year))}>
                <hr className="my-4 border-gray-200" />
                <EventCard event={e} />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
