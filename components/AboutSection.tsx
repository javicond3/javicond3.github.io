import { getPositions, getEducation, getCertificates, getInstitutionalRoles } from "@/data/about";
import { extractYearRange, yearDataAttrs } from "@/utils/extractYearRange";
import { entrySearchText } from "@/utils/searchText";
import EntryCard from "./EntryCard";

export default function AboutSection() {
  const positions = getPositions();
  const education = getEducation();
  const certificates = getCertificates();
  const institutionalRoles = getInstitutionalRoles();

  return (
    <>
      {positions.length > 0 && (
        <section id="positions" className="scroll-mt-20" data-search-group>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Position <span className="search-count text-gray-400 font-semibold text-sm align-middle" data-total={positions.length}>({positions.length})</span></h2>
          <div>
            {positions.map((entry, idx) => (
              <div key={entry.id} data-search={entrySearchText(entry)} {...yearDataAttrs(extractYearRange(entry.year))}>
                <hr className="my-4 border-gray-200" />
                <EntryCard entry={entry} />
              </div>
            ))}
          </div>
        </section>
      )}

      {institutionalRoles.length > 0 && (
        <section id="institutional-roles" className="scroll-mt-20 mt-8" data-search-group>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Other Institutional Roles <span className="search-count text-gray-400 font-semibold text-sm align-middle" data-total={institutionalRoles.length}>({institutionalRoles.length})</span></h2>
          <div>
            {institutionalRoles.map((entry, idx) => (
              <div key={entry.id} data-search={entrySearchText(entry)} {...yearDataAttrs(extractYearRange(entry.year))}>
                <hr className="my-4 border-gray-200" />
                <EntryCard entry={entry} />
              </div>
            ))}
          </div>
        </section>
      )}

      {education.length > 0 && (
        <section id="education" className="scroll-mt-20 mt-8" data-search-group>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Education <span className="search-count text-gray-400 font-semibold text-sm align-middle" data-total={education.length}>({education.length})</span></h2>
          <div>
            {education.map((entry, idx) => (
              <div key={entry.id} data-search={entrySearchText(entry)} {...yearDataAttrs(extractYearRange(entry.year))}>
                <hr className="my-4 border-gray-200" />
                <EntryCard entry={entry} />
              </div>
            ))}
          </div>
        </section>
      )}

      {certificates.length > 0 && (
        <section id="certificates" className="scroll-mt-20 mt-8" data-search-group>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Certificates <span className="search-count text-gray-400 font-semibold text-sm align-middle" data-total={certificates.length}>({certificates.length})</span></h2>
          <div>
            {certificates.map((entry, idx) => (
              <div key={entry.id} data-search={entrySearchText(entry)} {...yearDataAttrs(extractYearRange(entry.year))}>
                <hr className="my-4 border-gray-200" />
                <EntryCard entry={entry} />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
