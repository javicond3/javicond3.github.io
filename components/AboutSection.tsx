import { getPositions, getEducation, getCertificates, getInstitutionalRoles, AboutEntry } from "@/data/about";

function EntryCard({ entry }: { entry: AboutEntry }) {
  const title = entry.title.replace(/\.+$/, '');
  return (
    <div className="flex gap-0 items-start">
      <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full ml-4 mr-2" style={{ backgroundColor: '#2ecfba', marginTop: '5.5px' }} />
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

export default function AboutSection() {
  const positions = getPositions();
  const education = getEducation();
  const certificates = getCertificates();
  const institutionalRoles = getInstitutionalRoles();

  return (
    <>
      {positions.length > 0 && (
        <section id="positions" className="scroll-mt-20">
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Position</h2>
          <div>
            {positions.map((entry, idx) => (
              <div key={entry.id}>
                {idx > 0 && <hr className="my-4 border-gray-200" />}
                <EntryCard entry={entry} />
              </div>
            ))}
          </div>
        </section>
      )}

      {institutionalRoles.length > 0 && (
        <section id="institutional-roles" className="scroll-mt-20 mt-8">
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Other Institutional Roles</h2>
          <div>
            {institutionalRoles.map((entry, idx) => (
              <div key={entry.id}>
                {idx > 0 && <hr className="my-4 border-gray-200" />}
                <div className="flex gap-0 items-start">
                  <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full ml-4 mr-2" style={{ backgroundColor: '#2ecfba', marginTop: '5.5px' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.95rem] leading-snug text-gray-800">
                      <span className="font-semibold">{entry.title.replace(/\.+$/, '')}</span>
                      {entry.organization && <span>. <em>{entry.organization}</em></span>}
                      {entry.year && <span className="text-gray-500"> ({entry.year})</span>}
                      .
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {education.length > 0 && (
        <section id="education" className="scroll-mt-20 mt-8">
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Education</h2>
          <div>
            {education.map((entry, idx) => (
              <div key={entry.id}>
                {idx > 0 && <hr className="my-4 border-gray-200" />}
                <EntryCard entry={entry} />
              </div>
            ))}
          </div>
        </section>
      )}

      {certificates.length > 0 && (
        <section id="certificates" className="scroll-mt-20 mt-8">
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2ecfba' }}>Certificates</h2>
          <div>
            {certificates.map((entry, idx) => (
              <div key={entry.id}>
                {idx > 0 && <hr className="my-4 border-gray-200" />}
                <div className="flex gap-0 items-start">
                  <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full ml-4 mr-2" style={{ backgroundColor: '#2ecfba', marginTop: '5.5px' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.95rem] leading-snug text-gray-800">
                      <span className="font-semibold">{entry.title.replace(/\.+$/, '')}</span>
                      {entry.year && <span className="text-gray-500"> ({entry.year})</span>}
                      .
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
