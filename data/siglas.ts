// Institution acronyms for the country popup. Curated for the institutions in
// the sheet; anything new falls back to initials of the capitalized words.
const SIGLAS: Record<string, string> = {
  'Universidad Politécnica de Madrid': 'UPM',
  'Information Processing and Telecommunications Center': 'IPTC',
  'Universidad Autónoma de Madrid': 'UAM',
  'Universidad Carlos III de Madrid': 'UC3M',
  'Universidad Complutense de Madrid': 'UCM',
  'Universidad de Salamanca': 'USAL',
  'Universidad de Valladolid': 'UVa',
  'Universidad de Cantabria': 'UC',
  'Universidad de Granada': 'UGR',
  'Universidad de Jaén': 'UJA',
  'Universidad Nebrija': 'Nebrija',
  'Universitat Rovira i Virgili': 'URV',
  'University of the Basque Country': 'UPV/EHU',
  'Barcelona Supercomputing Center': 'BSC',
  'École Polytechnique Fédérale de Lausanne': 'EPFL',
  'Ghent University': 'UGent',
  'University of Eastern Finland': 'UEF',
  'University of Göttingen': 'UGOE',
  'Humboldt-Universität zu Berlin': 'HU Berlin',
  'Technische Universität Berlin': 'TU Berlin',
  'Technical University of Munich': 'TUM',
  'Philipps University of Marburg': 'Uni Marburg',
  'University of Southern Denmark': 'SDU',
  'KTH Royal Institute of Technology': 'KTH',
  'University of Amsterdam': 'UvA',
  'Leiden University': 'Leiden',
  'University of Edinburgh': 'UoE',
  'University of Aberdeen': 'UoA',
  'Imperial College London': 'Imperial',
  'University of Oxford': 'Oxford',
  'Politecnico di Milano': 'PoliMi',
  'University of Rome Tor Vergata': 'Tor Vergata',
  'Johannes Kepler University of Linz': 'JKU',
  'Technion – Israel Institute of Technology': 'Technion',
  'Fraunhofer Institute for Open Communication Systems': 'Fraunhofer FOKUS',
  'Northeastern University': 'NEU',
  'Massachusetts Institute of Technology': 'MIT',
  'New York University': 'NYU',
  'Rutgers, The State University of New Jersey': 'Rutgers',
  'University of California San Diego': 'UCSD',
  'University of California, Santa Barbara': 'UCSB',
  'University of South Carolina': 'USC',
  'University of New Haven': 'UNH',
  'Duke University': 'Duke',
  'Stevens Institute of Technology': 'Stevens',
  'The University of Texas MD Anderson Cancer Center': 'MD Anderson',
  'Tianjin University': 'TJU',
  'Tianjin University of Technology': 'TianjinTech',
  'Tsinghua University': 'Tsinghua',
  'University of Electronic Science and Technology of China': 'UESTC',
  'University of Hong Kong': 'HKU',
  'Chang Gung University of Science and Technology': 'CGUST',
  'University of the Ryukyus': 'Ryudai',
  'Ho Chi Minh City University of Science': 'HCMUS',
  'Birla Institute of Technology, Mesra': 'BIT Mesra',
  'Indian Institute of Technology Roorkee': 'IIT Roorkee',
  'Punjabi University': 'Punjabi',
  'Universidad Nacional Autónoma de México': 'UNAM',
  'Universidad Autónoma Metropolitana': 'UAM-X',
  'Universidad Nacional de Córdoba': 'UNC',
  'Universidad Nacional de Loja': 'UNL',
  'Universidad Nacional de Educación a Distancia': 'UNED',
  'Universidad de la República de Uruguay': 'UdelaR',
  'Escuela Superior Politecnica del Litoral': 'ESPOL',
  'Instituto de Ingeniería del Conocimiento': 'IIC',
  'Instituto de Investigaciones Químicas': 'IIQ',
  'Instituto de Investigación Biomédica de Málaga': 'IBIMA',
  'BioCruces Health research Institute': 'BioCruces',
  'Fundación CI3': 'CI3',
  'FIWARE Foundation': 'FIWARE',
  'FIWARE Foundation, 10587 Berlin, Germany': 'FIWARE',
  'Orange Labs': 'Orange',
  'Telefónica Tech': 'Telefónica',
  'AI and Data Unit, Telefónica Tech, Madrid, Spain': 'Telefónica',
  'Oracle (United States)': 'Oracle',
  'NEC (Germany)': 'NEC',
  'NEC Laboratories Europe': 'NEC',
  'EGM': 'EGM',
  'Easy Global Market (France)': 'EGM',
  'Bluetab': 'Bluetab',
  'LenguajeNatural.AI': 'LenguajeNatural.AI',
  'WonderNetwork, WonderProxy, Waterloo, Ontario, Canada': 'WonderNetwork',
};

const SIGLA_STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'of', 'the', 'and', 'y', 'i', 'e', 'for', 'in', 'on', 'zu', 'der', 'den', 'des', 'du', 'à', 'en', 'di', 'da']);

export const instSigla = (name: string): string => {
  if (SIGLAS[name]) return SIGLAS[name];
  const words = name
    .replace(/[(),]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !SIGLA_STOP.has(w.toLowerCase()));
  const sig = words
    .slice(0, 4)
    .map((w) => (w.toUpperCase() === w && w.length <= 4 ? w : w[0].toUpperCase()))
    .join('');
  return sig || name.slice(0, 12);
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

