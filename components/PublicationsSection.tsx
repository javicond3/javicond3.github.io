import { publications, conferencePublications, bookPublications, otherPublications, getReviewerData, Publication } from "@/data/publications";
import PublicationCard from "./PublicationCard";
import { normalizeSearchText } from "@/utils/normalizeSearch";
import { yearDataAttrs } from "@/utils/extractYearRange";
import { pubSearchText } from "@/utils/searchText";

function groupByYear(pubs: Publication[]) {
  const byYear = pubs.reduce<Record<number, Publication[]>>((acc, pub) => {
    if (!acc[pub.year]) acc[pub.year] = [];
    acc[pub.year].push(pub);
    return acc;
  }, {});
  const sortedYears = Object.keys(byYear).map(Number).sort((a, b) => b - a);
  return { byYear, sortedYears };
}

function PublicationGroup({ pubs }: { pubs: Publication[] }) {
  const { byYear, sortedYears } = groupByYear(pubs);
  return (
    <div className="space-y-3">
      {sortedYears.map((year) => (
        <div key={year} data-search-group>
          <h3 className="text-xl font-bold mb-4 pb-1 border-b" style={{ color: '#1c2d2d', borderColor: '#2ecfba' }}>
            {year} <span className="search-count text-gray-400 font-semibold text-xs align-middle" data-total={byYear[year].length}>({byYear[year].length})</span>
          </h3>
          <div>
            {byYear[year].map((pub, idx) => (
              <div
                key={pub.id}
                data-search={pubSearchText(pub)}
                data-pub-type={pub.type}
                data-pub-jcr={pub.jcr ?? ""}
                {...yearDataAttrs({ start: pub.year, end: pub.year })}
              >
                <hr className="my-4 border-gray-200" />
                <PublicationCard publication={pub} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PublicationsSection() {
  const { journals: reviewerJournals, conferences: reviewerConferences, books: reviewerBooks } = getReviewerData();
  return (
    <>
      <section id="journal-publications" className="scroll-mt-20" data-search-group>
        <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Journal Publications <span className="search-count text-gray-400 font-semibold text-sm align-middle" data-total={publications.length}>({publications.length})</span></h2>
        <PublicationGroup pubs={publications} />
      </section>

      <section id="conference-publications" className="scroll-mt-20 mt-8" data-search-group>
        <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Conference Papers <span className="search-count text-gray-400 font-semibold text-sm align-middle" data-total={conferencePublications.length}>({conferencePublications.length})</span></h2>
        <PublicationGroup pubs={conferencePublications} />
      </section>

      {bookPublications.length > 0 && (
        <section id="books" className="scroll-mt-20 mt-8" data-search-group>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Books <span className="search-count text-gray-400 font-semibold text-sm align-middle" data-total={bookPublications.length}>({bookPublications.length})</span></h2>
          <PublicationGroup pubs={bookPublications} />
        </section>
      )}

      {otherPublications.length > 0 && (
        <section id="other-publications" className="scroll-mt-20 mt-8" data-search-group>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Other Publications <span className="search-count text-gray-400 font-semibold text-sm align-middle" data-total={otherPublications.length}>({otherPublications.length})</span></h2>
          <PublicationGroup pubs={otherPublications} />
        </section>
      )}

      {(reviewerJournals.length > 0 || reviewerConferences.length > 0 || reviewerBooks.length > 0) && (
        <section
          id="reviewer"
          className="scroll-mt-20 mt-8"
          data-search={normalizeSearchText(["reviewer", ...reviewerJournals, ...reviewerBooks, ...reviewerConferences].join(" "))}
        >
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Reviewer</h2>
          <p className="text-[0.95rem] leading-relaxed text-gray-800">
            {`Reviewer in ${reviewerJournals.length} journals such as `}
            {reviewerJournals.map((j, i) => (
              <span key={j}>
                <em className="font-semibold">{j}</em>
                {i < reviewerJournals.length - 1 ? '; ' : ''}
              </span>
            ))}
            {reviewerBooks.length > 0 && (
              <>
                {`; ${reviewerBooks.length} books such as `}
                {reviewerBooks.map((b, i) => (
                  <span key={b}>
                    <em className="font-semibold">{b}</em>
                    {i < reviewerBooks.length - 1 ? '; ' : ''}
                  </span>
                ))}
              </>
            )}
            {reviewerConferences.length > 0 && (
              <>
                {`; and ${reviewerConferences.length} conferences such as `}
                {reviewerConferences.map((c, i) => (
                  <span key={c}>
                    <span className="font-semibold">{c}</span>
                    {i < reviewerConferences.length - 1 ? '; ' : ''}
                  </span>
                ))}
              </>
            )}
            .
          </p>
        </section>
      )}
    </>
  );
}
