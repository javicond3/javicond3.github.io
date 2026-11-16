// Institution acronyms, derived from the name itself (no hand-kept table):
// connector words of any language are dropped and the initials of the main words remain,
// e.g. "Universidad Politécnica de Madrid" -> "UPM".
//  - text in parentheses is ignored; address-like names ("X, 10587 Berlin, Germany") keep "X"
//  - a word that already is an acronym (3+ capitals: KTH, NEC, FIWARE) is the result
//  - roman numerals become digits ("Carlos III" -> "C3")
//  - a name with a single main word stays as it is ("Oracle", "Bluetab")
const CONNECTORS = new Set(
  (
    // Spanish, Catalan, Galician, Portuguese, Italian, French
    'a al an con da das de del dela dels des di do dos du e el els en et i il la las le les lo los na o os per por para pour sur un una y ' +
    'degli dei della delle dello nel nella au aux d l ' +
    // English
    'and at by for from in of on the to with ' +
    // German, Dutch, Scandinavian
    'am an auf aus bei dem den der die das für im in und van von voor vom zu zum zur het te ten ter och og i av för på ' +
    // Polish, Czech, Russian (transliterated), Turkish, others
    'im imienia w we z na v ve u ile ve'
  ).split(' '),
);
const ROMAN: Record<string, string> = { II: '2', III: '3', IV: '4', V: '5', VI: '6', VII: '7', VIII: '8', IX: '9', X: '10', XI: '11', XII: '12', XIII: '13' };

export const instSigla = (name: string): string => {
  let base = name.replace(/\([^)]*\)/g, ' ').trim();
  const segs = base.split(',').map((x) => x.trim()).filter(Boolean);
  if (segs.length > 2 || segs.slice(1).some((x) => /\d/.test(x))) base = segs[0];
  const words = base
    .split(/[\s,;:/\-‐-―−]+/)
    .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').replace(/^[dl]['’]/i, ''))
    .filter((w) => w && !CONNECTORS.has(w.toLowerCase()));
  if (!words.length) return name.trim();
  if (words.length === 1) return words[0];
  const isAcronym = (w: string) => w.length >= 3 && !ROMAN[w] && /^[\p{Lu}\p{N}]+$/u.test(w) && /\p{Lu}/u.test(w);
  const ready = words.find(isAcronym);
  if (ready) return ready;
  return words
    .map((w) => ROMAN[w] || (/^\d+$/.test(w) ? w : w.charAt(0).toUpperCase()))
    .join('')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

// Institutions and countries are separate lists in the sheet; pair them
// index-wise (primary affiliation first) and put any extra institutions in
// the last country.
export const instsForCountry = (institutions: string[], countries: string[], country: string): string[] => {
  const out: string[] = [];
  institutions.forEach((inst, i) => {
    const c = countries[Math.min(i, countries.length - 1)] || '';
    if (c === country) out.push(inst);
  });
  return out;
};

