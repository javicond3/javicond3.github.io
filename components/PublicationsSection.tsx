import { publications, conferencePublications, bookPublications, otherPublications, getReviewerData, Publication } from "@/data/publications";
import PublicationCard from "./PublicationCard";

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
        <div key={year}>
          <h3 className="text-xl font-bold mb-4 pb-1 border-b" style={{ color: '#1c2d2d', borderColor: '#2ecfba' }}>
            {year}
          </h3>
          <div>
            {byYear[year].map((pub, idx) => (
              <div key={pub.id}>
                {idx > 0 && <hr className="my-4 border-gray-200" />}
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
      <section id="journal-publications" className="scroll-mt-20">
        <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Journal Publications</h2>
        <PublicationGroup pubs={publications} />
      </section>

      <section id="conference-publications" className="scroll-mt-20 mt-8">
        <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Conference Papers</h2>
        <PublicationGroup pubs={conferencePublications} />
      </section>

      {bookPublications.length > 0 && (
        <section id="books" className="scroll-mt-20 mt-8">
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Books</h2>
          <PublicationGroup pubs={bookPublications} />
        </section>
      )}

      {otherPublications.length > 0 && (
        <section id="other-publications" className="scroll-mt-20 mt-8">
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Other Publications</h2>
          <PublicationGroup pubs={otherPublications} />
        </section>
      )}

      {(reviewerJournals.length > 0 || reviewerConferences.length > 0 || reviewerBooks.length > 0) && (
        <section id="reviewer" className="scroll-mt-20 mt-8">
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
