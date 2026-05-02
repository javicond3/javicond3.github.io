import {
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

import type { CVData } from "@/types/cv";

const SZ = 18;
const SZ_H1 = 26;
const SZ_H2 = 22;
const SZ_H3 = 20;
const TEAL = "2ECFBA";
const DARK = "1C2D2D";
const GRAY = "6B7280";
const BLACK = "000000";
const SP_AFTER_ITEM = 40;
const SP_BEFORE_H1 = 200;
const SP_AFTER_H1 = 80;
const SP_BEFORE_H2 = 160;
const SP_AFTER_H2 = 60;
const SP_BEFORE_H3 = 120;
const SP_AFTER_H3 = 40;

const N = (text: string) => new TextRun({ text, size: SZ, color: BLACK });
const B = (text: string) => new TextRun({ text, size: SZ, bold: true, color: BLACK });
const It = (text: string) => new TextRun({ text, size: SZ, italics: true, color: BLACK });
const G = (text: string) => new TextRun({ text, size: SZ, color: GRAY });
const Tc = (text: string) => new TextRun({ text, size: SZ, color: TEAL });
const BoldIt = (text: string) => new TextRun({ text, size: SZ, bold: true, italics: true, color: BLACK });

function h1(text: string, selected?: number, total?: number): Paragraph {
  const badge = selected != null && total != null ? ` (listed ${selected} of ${total})` : "";
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: SP_BEFORE_H1, after: SP_AFTER_H1 },
    children: [
      new TextRun({ text, size: SZ_H1, bold: true, color: DARK }),
      ...(badge ? [new TextRun({ text: badge, size: SZ_H1 - 4, bold: false, color: GRAY })] : []),
    ],
  });
}

function h2(text: string, selected?: number, total?: number): Paragraph {
  const badge = selected != null && total != null ? ` (listed ${selected} of ${total})` : "";
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: SP_BEFORE_H2, after: SP_AFTER_H2 },
    children: [
      new TextRun({ text, size: SZ_H2, bold: true, color: TEAL }),
      ...(badge ? [new TextRun({ text: badge, size: SZ_H2 - 4, bold: false, color: GRAY })] : []),
    ],
  });
}

function h3(text: string, selected?: number, total?: number): Paragraph {
  const badge = selected != null && total != null ? ` (listed ${selected} of ${total})` : "";
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: SP_BEFORE_H3, after: SP_AFTER_H3 },
    children: [
      new TextRun({ text, size: SZ_H3, bold: true, color: TEAL }),
      ...(badge ? [new TextRun({ text: badge, size: SZ_H3 - 4, bold: false, color: GRAY })] : []),
    ],
  });
}

function item(runs: TextRun[]): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: "• ", size: SZ, color: TEAL }), ...runs],
    spacing: { after: SP_AFTER_ITEM },
    indent: { left: 200, hanging: 200 },
  });
}

function para(runs: TextRun[], spaceAfter = 80): Paragraph {
  return new Paragraph({
    children: runs,
    spacing: { after: spaceAfter },
    alignment: AlignmentType.JUSTIFIED,
  });
}

function formatMonthYear(date: string | null): string {
  if (!date) return "";
  const value = new Date(date);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[value.getMonth()]} ${value.getFullYear()}`;
}

function stripTrailingPeriods(value: string | undefined): string {
  return value ? value.trim().replace(/\.+$/, "") : "";
}

function buildReviewerRuns(cvData: CVData): TextRun[] {
  const { journals, books, conferences } = cvData.reviewerData;
  const runs: TextRun[] = [];

  if (journals.length > 0) {
    runs.push(N(`Reviewer in ${journals.length} journals such as `));
    journals.forEach((journal, index) => {
      runs.push(It(journal));
      if (index < journals.length - 1) runs.push(N("; "));
    });
  }

  if (books.length > 0) {
    if (runs.length > 0) runs.push(N(`; ${books.length} books such as `));
    else runs.push(N(`Reviewer in ${books.length} books such as `));
    books.forEach((book, index) => {
      runs.push(It(book));
      if (index < books.length - 1) runs.push(N("; "));
    });
  }

  if (conferences.length > 0) {
    if (runs.length > 0) runs.push(N(`; and ${conferences.length} conferences such as `));
    else runs.push(N(`Reviewer in ${conferences.length} conferences such as `));
    conferences.forEach((conference, index) => {
      runs.push(B(conference));
      if (index < conferences.length - 1) runs.push(N("; "));
    });
  }

  runs.push(N("."));
  return runs;
}

function buildBio(cvData: CVData): Paragraph[] {
  const s = cvData.bioStats;
  const paras: Paragraph[] = [];

  paras.push(para([
    N("In "), B("2018"), N(" and "), B("2020"),
    N(", I obtained my "),
    B("Bachelor's and Master's degrees in Telecommunications Engineering"),
    N(" from the "), B("Universidad Politécnica de Madrid (UPM)"),
    N(". My professional, teaching, and research experience began during the final year of my undergraduate studies. In this initial stage, I worked at "),
    B("SENER"), N(", developing tools for the aerospace sector. Thanks to my academic achievements, having the "),
    B("highest grades in Telematics and in the Master's in Telecommunications Engineering"),
    N(", I received the "), B("Ángel Barbero Scholarship"),
    N(", which allowed me to join the "), B("Digital Integration Group (GID)"),
    N(". In this group, I actively participated in the "), B("digital transformation of the University"),
    N(", resulting in impactful outcomes such as the "), B("teaching schedule management tool at ETSIT"),
    N(", which has been in operation for more than "), B(String(s.progdocYears)), N(" years."),
  ], 60));

  paras.push(para([
    N("In September "), B("2020"),
    N(", I started my "), B("PhD in Telematics Engineering"),
    N(" at UPM within the "), B("Next Generation Internet Group"),
    N(", with a predoctoral contract obtained through a competitive call of the UPM's Own R&D+i Program. My doctoral research focused on "),
    B("digital twins and open data"), N(", carried out within European projects such as "),
    B("ARPortwin"), N(" and "), B("YODA"),
    N(". The thesis was awarded the highest distinction, "), B('"Sobresaliente Cum Laude,"'),
    N(" and received several honors, including the "), B("Extraordinary PhD Award"),
    N(" and the "), B("Margarita Salas Prize"), N(" in "), B("2025"), N("."),
  ], 60));

  paras.push(para([
    N("During the final year of my PhD, I combined research with my role as "),
    B("head of the telecommunications network at ADIF"),
    N(" in Aragón, which enabled me to establish strong collaborations between industry and academia."),
  ], 60));

  paras.push(para([
    N("Since "), B("2023"), N(", I have been an "), B("Assistant Professor"),
    N(" at the "), B("Universidad Politécnica de Madrid"),
    N(", in the Department of Telematic Systems Engineering. My research focuses on "),
    B("edge computing, open data, and artificial intelligence"),
    N(" applied to "), B("digital twins and education"),
    N(". Within this context, I work on the characterization and detection of "),
    B("single-bit errors in neural networks"), N(", the evaluation and identification of "),
    B("biases in large and multimodal language models"), N(", the design of "),
    B("agent-based systems"), N(" to improve student engagement and learning, "),
    B("model compression"), N(", and the generation of "), B("synthetic datasets"),
    N(" applied to cognitive science. I have published more than "),
    B(String(s.totalPapers)), N(" scientific papers, including "),
    B(String(s.journalCount)), N(" journal articles ("),
    B(String(s.journalQ1)), N(" JCR Q1 ["), B(String(s.journalQ1D1)), N(" D1], "),
    B(String(s.journalQ2)), N(" JCR Q2, "),
    B(String(s.journalQ3)), N(" JCR Q3, "),
    B(String(s.journalQ4)), N(" JCR Q4), mostly as first author, in addition to "),
    B(String(s.bookCount)), N(" book chapters and "),
    B(String(s.conferenceCount)), N(" international conference contributions, maintaining a strong commitment to "),
    B("Open Science"), N(" principles. In "), B("2024"),
    N(", I was named a "), B("Young Scholar by the US Marconi Society"),
    N(", which recognizes top engineers and researchers in information and communication technologies, becoming the "),
    B("first Spanish researcher"), N(" to receive this distinction."),
  ], 60));

  paras.push(para([
    N("During this period, I participated in a total of "), B(String(s.totalProjects)),
    N(" research projects, "), B(String(s.competitiveProjects)),
    N(" funded by "), B("European, national, and regional programs"), N(", and "),
    B(String(s.privateProjects)), N(" through "), B("private contracts"),
    N(". From these projects I was the "), B("principal investigator"),
    N(" in "), B(String(s.piCompetitiveProjects)), N(" competitive projects and "),
    B(String(s.piPrivateProjects)), N(" private contracts, including the European project "),
    B("Smarty"), N(", focused on AI at the edge, the project "), B("Cybertutor"),
    N(" on integrating generative AI in education, and the project "), B("Sostenibilidad Generativa"),
    N(", focused on AI and sustainability. Additionally, I am the "),
    B("director of the ARANGO-UPM Chair"), N(", dedicated to knowledge graphs for agent-based systems. Since "),
    B("2024"), N(", I have coordinated the "),
    B("Spanish Local Group on Artificial Intelligence of IEEE"), N("."),
  ], 60));

  paras.push(para([
    N("In the context of internationalization, I have an extensive "), B("collaboration network"),
    N(", with most of my publications co-authored with researchers from other institutions and countries. I have completed over "),
    B(String(s.researchMonths)), N(" months of "), B("research stays abroad"),
    N(", including at the "), B("University of Edinburgh"), N(", "), B("Ghent University"),
    N(", and the "), B("University of Eastern Finland"),
    N(". I have actively served as a "), B("reviewer"), N(" for "),
    B(String(s.reviewerJournalCount)), N(" prestigious journals, "),
    B(String(s.reviewerBookCount)), N(" books, and "),
    B(String(s.reviewerConferenceCount)), N(" conferences such as "),
    B("ACM TIST"), N(" and "), B("IEEE TLT"),
    N(", and I have contributed to "), B("open-source initiatives"),
    N(" and "), B("standardization organizations"), N(" such as "),
    B("FIWARE"), N(", "), B("ETSI"), N(", and "), B("W3C"),
    N(", including preparing technical reports and defining standards such as "), B("DCAT"),
    N(". I have also been invited to give "), B(String(s.invitedTalks)),
    N(" talks at institutions such as "), B("Saint Louis University"), N(", "),
    B("FECYT"), N(", and the "), B("Instituto de Ingeniería de España"), N("."),
  ], 60));

  paras.push(para([
    N("One of the most important aspects of my contributions is their "), B("societal impact"),
    N(". Therefore, my work focuses on "), B("replicability, openness, and technology transfer"),
    N(". For example, work carried out during my early career resulted in "), B("4"),
    N(" "), B("academic management applications"), N(" currently used at the Universidad Politécnica de Madrid. I also manage the "),
    B("Your Open Data portal"), N(", developed as part of the European "), B("YODA project"),
    N(", which demonstrated how the publication of open data can be automated while automatically ensuring "),
    B("FAIR principles"), N(". Additionally, I have delivered "),
    B(String(s.externalCourses)), N(" "), B("external courses"),
    N(", including training for companies, organizations, and international workshops, among which are courses for companies and teachers on integrating AI into professional activities. Another key aspect is the "),
    B("dissemination"), N(" of my work, which has been featured in general media ("),
    B("Forbes"), N(", "), B("El Confidencial"),
    N(", etc.), interviews, and social media posts where I have an active presence. I have also published a "),
    B("popular science book"), N(" on using generative AI for non-technical audiences. Continuing education is another of my activities, having participated in "),
    B(String(s.moocCount)), N(" "), B("MOOCs"),
    N(", one of which I coordinated on an introduction to generative AI, reaching over "), B("1000"), N(" students."),
  ], 60));

  paras.push(para([
    N("In "), B("teaching"), N(", I have delivered courses in both undergraduate and master's programs in "),
    B(String(s.totalSubjects)), N(" subjects, coordinating "), B(String(s.coordinatedSubjects)),
    N(" of them, related to "), B("Big Data, artificial intelligence, and cloud computing"),
    N(", accumulating over "), B(String(s.totalTeachingHours)),
    N(" teaching hours with average student evaluations above "), B("9"),
    N(" out of "), B("10"), N(". I have also participated in "),
    B(String(s.totalInnovationProjects)), N(" "), B("educational innovation projects"),
    N(", coordinating "), B(String(s.coordinatedInnovationProjects)),
    N(", through which "), B("18"), N(" student scholarships were generated. I have supervised "),
    B(String(s.supervisionStudents)), N(" internship students and over "),
    B(String(s.bachelorTheses + s.masterTheses)), N(" final degree projects ("),
    B(String(s.bachelorTheses)), N(" BSc Thesis, "), B(String(s.masterTheses)),
    N(" MSc Thesis), including "), B(String(s.phdStudents)),
    N(` PhD student${s.phdStudents !== 1 ? "s" : ""} (on going). As `),
    B("director of the ARANGO-UPM Chair"),
    N(", I have led a team of more than "), B("10"),
    N(" members, including engineers, researchers, and students. Over the years, I have complemented my training as a researcher, engineer, and teacher by completing more than "),
    B("30"), N(" courses and specializations, including the "), B("500"),
    N("-hour University Teaching Training Program."),
  ], 60));

  return paras;
}

function selectedIndices(selectedItems: string[], prefix: string): Set<number> {
  const indices = new Set<number>();
  for (const key of selectedItems) {
    const valuePrefix = `${prefix}-`;
    if (!key.startsWith(valuePrefix)) continue;
    const index = parseInt(key.slice(valuePrefix.length), 10);
    if (!Number.isNaN(index)) indices.add(index);
  }
  return indices;
}

function buildDocument(selectedItems: string[], cvData: CVData): Document {
  const itemSet = new Set<string>(selectedItems);
  const docChildren: Paragraph[] = [];

  const allPositions = cvData.positions;
  const allInstitutional = cvData.institutionalRoles;
  const allEducation = cvData.education;
  const allCertificates = cvData.certificates;
  const allJournals = cvData.journals;
  const allConferences = cvData.conferences;
  const allBooks = cvData.books;
  const allOther = cvData.otherPubs;
  const hasReviewer = cvData.reviewerData.journals.length > 0 || cvData.reviewerData.books.length > 0 || cvData.reviewerData.conferences.length > 0;
  const allCompetitive = cvData.competitive;
  const allPrivate = cvData.private;
  const allSoftware = cvData.software;
  const allWgProjects = cvData.workingGroups;
  const allCourses = cvData.courses;
  const allTProjects = cvData.teachingProjects;
  const allPhD = cvData.phdTheses;
  const allMaster = cvData.masterTheses;
  const allBachelor = cvData.bachelorTheses;
  const allSupervisions = cvData.supervisions;
  const allExtCourses = cvData.externalCourses;
  const allVisits = cvData.researchVisits;
  const allAwards = cvData.awards;
  const allLectures = cvData.invitedLectures;
  const allEvents = cvData.events;

  if (itemSet.has("bio")) {
    docChildren.push(h1("Javier Conde"));
    docChildren.push(new Paragraph({
      children: [new TextRun({ text: "Assistant Professor · Universidad Politécnica de Madrid", size: SZ, italics: true, color: GRAY })],
      spacing: { after: 100 },
    }));
    docChildren.push(...buildBio(cvData));
  }

  {
    const posIdx = selectedIndices(selectedItems, "position");
    const instIdx = selectedIndices(selectedItems, "institutional");
    const eduIdx = selectedIndices(selectedItems, "education");
    const certIdx = selectedIndices(selectedItems, "certificate");
    const hasAny = posIdx.size > 0 || instIdx.size > 0 || eduIdx.size > 0 || certIdx.size > 0;

    if (hasAny) {
      const selPosEdu = posIdx.size + instIdx.size + eduIdx.size + certIdx.size;
      const totPosEdu = allPositions.length + allInstitutional.length + allEducation.length + allCertificates.length;
      docChildren.push(h1("Position and Education", selPosEdu, totPosEdu));

      if (posIdx.size > 0) {
        docChildren.push(h2("Position", posIdx.size, allPositions.length));
        allPositions.forEach((p, i) => {
          if (!posIdx.has(i)) return;
          const title = p.title.replace(/\.+$/, "");
          docChildren.push(item([
            B(title),
            ...(p.organization ? [N(". "), It(p.organization)] : []),
            ...(p.year ? [G(` (${p.year})`)] : []),
            ...(p.note ? [Tc(` - ${p.note}`)] : []),
            N("."),
          ]));
        });
      }

      if (instIdx.size > 0) {
        docChildren.push(h2("Other Institutional Roles", instIdx.size, allInstitutional.length));
        allInstitutional.forEach((role, i) => {
          if (!instIdx.has(i)) return;
          const title = role.title.replace(/\.+$/, "");
          docChildren.push(item([
            B(title),
            ...(role.organization ? [N(". "), It(role.organization)] : []),
            ...(role.year ? [G(` (${role.year})`)] : []),
            N("."),
          ]));
        });
      }

      if (eduIdx.size > 0) {
        docChildren.push(h2("Education", eduIdx.size, allEducation.length));
        allEducation.forEach((entry, i) => {
          if (!eduIdx.has(i)) return;
          const title = entry.title.replace(/\.+$/, "");
          docChildren.push(item([
            B(title),
            ...(entry.organization ? [N(". "), It(entry.organization)] : []),
            ...(entry.year ? [G(` (${entry.year})`)] : []),
            ...(entry.note ? [Tc(` - ${entry.note}`)] : []),
            N("."),
          ]));
        });
      }

      if (certIdx.size > 0) {
        docChildren.push(h2("Certificates", certIdx.size, allCertificates.length));
        allCertificates.forEach((certificate, i) => {
          if (!certIdx.has(i)) return;
          const title = certificate.title.replace(/\.+$/, "");
          docChildren.push(item([
            B(title),
            ...(certificate.year ? [G(` (${certificate.year})`)] : []),
            N("."),
          ]));
        });
      }
    }
  }

  {
    const journalIdx = selectedIndices(selectedItems, "journal");
    const confIdx = selectedIndices(selectedItems, "conference");
    const bookIdx = selectedIndices(selectedItems, "book");
    const otherIdx = selectedIndices(selectedItems, "other");
    const reviewerSelected = itemSet.has("reviewer");
    const hasAny = journalIdx.size > 0 || confIdx.size > 0 || bookIdx.size > 0 || otherIdx.size > 0 || reviewerSelected;

    if (hasAny) {
      docChildren.push(h1(
        "Publications",
        journalIdx.size + confIdx.size + bookIdx.size + otherIdx.size + (reviewerSelected ? 1 : 0),
        allJournals.length + allConferences.length + allBooks.length + allOther.length + (hasReviewer ? 1 : 0),
      ));

      if (journalIdx.size > 0) {
        docChildren.push(h2("Journal Publications", journalIdx.size, allJournals.length));
        allJournals.forEach((p, i) => {
          if (!journalIdx.has(i)) return;
          const authors = p.authors.replace("J. Conde", "\u0001J. Conde\u0001");
          const authorRuns = authors.split("\u0001").map((segment, index) => index % 2 === 1 ? B(segment) : N(segment));
          docChildren.push(item([
            N(`"${p.title}". `),
            G(`(${p.year}). `),
            ...authorRuns,
            N(". "),
            It(p.journal),
            ...(p.location ? [G(`, ${p.location}`)] : []),
            ...(p.doi ? [N(". doi: "), new TextRun({ text: p.doi, size: SZ, color: TEAL })] : []),
            ...(p.jcr ? [G(` (JCR ${p.jcr}).`)] : [N(".")]),
          ]));
        });
      }

      if (confIdx.size > 0) {
        docChildren.push(h2("Conference Papers", confIdx.size, allConferences.length));
        allConferences.forEach((p, i) => {
          if (!confIdx.has(i)) return;
          const authors = p.authors.replace("J. Conde", "\u0001J. Conde\u0001");
          const authorRuns = authors.split("\u0001").map((segment, index) => index % 2 === 1 ? B(segment) : N(segment));
          docChildren.push(item([
            N(`"${p.title}". `),
            G(`(${p.year}). `),
            ...authorRuns,
            N(". "),
            It(p.journal),
            ...(p.location ? [G(`, ${p.location}`)] : []),
            ...(p.jcr ? [G(` (${p.jcr}).`)] : [N(".")]),
          ]));
        });
      }

      if (bookIdx.size > 0) {
        docChildren.push(h2("Books", bookIdx.size, allBooks.length));
        allBooks.forEach((p, i) => {
          if (!bookIdx.has(i)) return;
          const authors = p.authors.replace("J. Conde", "\u0001J. Conde\u0001");
          const authorRuns = authors.split("\u0001").map((segment, index) => index % 2 === 1 ? B(segment) : N(segment));
          docChildren.push(item([
            N(`"${p.title}". `),
            G(`(${p.year}). `),
            ...authorRuns,
            N(". "),
            It(p.journal),
            N("."),
          ]));
        });
      }

      if (otherIdx.size > 0) {
        docChildren.push(h2("Other Publications", otherIdx.size, allOther.length));
        allOther.forEach((p, i) => {
          if (!otherIdx.has(i)) return;
          const journal = p.journal !== "-"
            ? p.journal
            : (p.type === "Preprint" ? p.type : "");          
          const authors = p.authors.replace("J. Conde", "\u0001J. Conde\u0001");
          const authorRuns = authors.split("\u0001").map((segment, index) => index % 2 === 1 ? B(segment) : N(segment));
          docChildren.push(item([
            N(`"${p.title}". `),
            G(`(${p.year}). `),
            ...authorRuns,
            N(". "),
            It(journal),
            N(journal ? "." : ""),
          ]));
        });
      }

      if (reviewerSelected && hasReviewer) {
        docChildren.push(h2("Reviewer", 1, 1));
        docChildren.push(para(buildReviewerRuns(cvData), 60));
      }
    }
  }

  {
    const compIdx = selectedIndices(selectedItems, "competitive");
    const privIdx = selectedIndices(selectedItems, "private");
    const swIdx = selectedIndices(selectedItems, "software");
    const wgProjIdx = selectedIndices(selectedItems, "wg-project");
    const hasAny = compIdx.size > 0 || privIdx.size > 0 || swIdx.size > 0 || wgProjIdx.size > 0;

    if (hasAny) {
      docChildren.push(h1(
        "Research Projects",
        compIdx.size + privIdx.size + swIdx.size + wgProjIdx.size,
        allCompetitive.length + allPrivate.length + allSoftware.length + allWgProjects.length,
      ));

      if (compIdx.size > 0) {
        docChildren.push(h2("Competitive Projects", compIdx.size, allCompetitive.length));
        allCompetitive.forEach((project, i) => {
          if (!compIdx.has(i)) return;
          const start = formatMonthYear(project.startDate);
          const end = formatMonthYear(project.endDate);
          const period = start || end ? `(${[start, end].filter(Boolean).join(" – ")}). ` : "";
          const title = project.title.replace(/\.+$/, "");
          docChildren.push(item([
            ...(period ? [G(period)] : []),
            B(title),
            ...(project.isIP ? [Tc(" [PI]")] : []),
            N(". "),
            It(project.funder),
            N("."),
            ...(project.scope ? [N(" "), Tc(project.scope), Tc(" project.")] : []),
            ...(project.money != null ? [N(" "), Tc(`€${project.money.toLocaleString("es-ES")}`), N(".")] : []),
          ]));
        });
      }

      if (privIdx.size > 0) {
        docChildren.push(h2("Private Contracts", privIdx.size, allPrivate.length));
        allPrivate.forEach((project, i) => {
          if (!privIdx.has(i)) return;
          const start = formatMonthYear(project.startDate);
          const end = formatMonthYear(project.endDate);
          const period = start || end ? `(${[start, end].filter(Boolean).join(" – ")}). ` : "";
          const title = project.title.replace(/\.+$/, "");
          docChildren.push(item([
            ...(period ? [G(period)] : []),
            B(title),
            ...(project.isIP ? [Tc(" [PI]")] : []),
            N(". "),
            It(project.funder),
            N("."),
          ]));
        });
      }

      if (swIdx.size > 0) {
        docChildren.push(h2("Software", swIdx.size, allSoftware.length));
        allSoftware.forEach((software, i) => {
          if (!swIdx.has(i)) return;
          const title = stripTrailingPeriods(software.title);
          const description = stripTrailingPeriods(software.description);
          const link = software.link?.trim();
          docChildren.push(item([
            ...(link ? [new TextRun({ text: title, size: SZ, bold: true, color: TEAL })] : [B(title)]),
            ...(description ? [N(`. ${description}`)] : []),
            ...(link ? [N(`. Link: ${link}`)] : []),
            N("."),
          ]));
        });
      }

      if (wgProjIdx.size > 0) {
        docChildren.push(h2("Working Groups, Standardisation Bodies, and Industry", wgProjIdx.size, allWgProjects.length));
        allWgProjects.forEach((group, i) => {
          if (!wgProjIdx.has(i)) return;
          const title = group.title.replace(/\.+$/, "");
          docChildren.push(item([
            B(title),
            ...(group.funder ? [N(". "), It(group.funder)] : []),
            ...(group.year ? [G(` (${group.year})`)] : []),
            N("."),
          ]));
        });
      }
    }
  }

  {
    const courseIdx = selectedIndices(selectedItems, "course");
    const tprojIdx = selectedIndices(selectedItems, "tproject");
    const phdIdx = selectedIndices(selectedItems, "phd");
    const masterIdx = selectedIndices(selectedItems, "master");
    const bachelorIdx = selectedIndices(selectedItems, "bachelor");
    const supIdx = selectedIndices(selectedItems, "supervision");
    const extIdx = selectedIndices(selectedItems, "extcourse");
    const hasAny = courseIdx.size > 0 || tprojIdx.size > 0 || phdIdx.size > 0 || masterIdx.size > 0 || bachelorIdx.size > 0 || supIdx.size > 0 || extIdx.size > 0;

    if (hasAny) {
      docChildren.push(h1(
        "Teaching",
        courseIdx.size + tprojIdx.size + phdIdx.size + masterIdx.size + bachelorIdx.size + supIdx.size + extIdx.size,
        allCourses.length + allTProjects.length + allPhD.length + allMaster.length + allBachelor.length + allSupervisions.length + allExtCourses.length,
      ));

      if (courseIdx.size > 0) {
        docChildren.push(h2("Courses", courseIdx.size, allCourses.length));
        allCourses.forEach((course, i) => {
          if (!courseIdx.has(i)) return;
          docChildren.push(item([
            B(course.title),
            ...(course.isCoordinator ? [Tc(" [Course Coordinator]")] : []),
            ...(course.program ? [N(`. ${course.program}`)] : []),
            ...(course.levelAndCourse ? [N(" – "), BoldIt(course.levelAndCourse)] : []),
            ...(course.centro ? [N(`. ${course.centro}.`)] : [N(".")]),
            ...(course.year ? [G(` (${course.year})`)] : []),
          ]));
        });
      }

      if (tprojIdx.size > 0) {
        docChildren.push(h2("Teaching Innovation Projects", tprojIdx.size, allTProjects.length));
        allTProjects.forEach((project, i) => {
          if (!tprojIdx.has(i)) return;
          const title = project.title.replace(/\.+$/, "");
          docChildren.push(item([
            B(title),
            ...(project.isPI ? [Tc(" [PI]")] : []),
            ...(project.funder ? [N(". "), It(project.funder), N(".")] : [N(".")]),
            ...(project.year ? [G(` (${project.year})`)] : []),
          ]));
        });
      }

      const hasSupervision = phdIdx.size > 0 || masterIdx.size > 0 || bachelorIdx.size > 0 || supIdx.size > 0;
      if (hasSupervision) {
        docChildren.push(h2(
          "Supervision",
          phdIdx.size + masterIdx.size + bachelorIdx.size + supIdx.size,
          allPhD.length + allMaster.length + allBachelor.length + allSupervisions.length,
        ));

        const thesisItem = (thesis: { title: string; author: string; degree?: string; year?: number }) => item([
          B(thesis.title.replace(/\.+$/, "")),
          N(`. ${thesis.author}`),
          ...(thesis.degree ? [G(`. ${thesis.degree}`)] : []),
          ...(thesis.year && !Number.isNaN(thesis.year) ? [G(` (${thesis.year})`)] : []),
          N("."),
        ]);

        if (phdIdx.size > 0) {
          docChildren.push(h3("PhD Thesis", phdIdx.size, allPhD.length));
          allPhD.forEach((thesis, i) => {
            if (phdIdx.has(i)) docChildren.push(thesisItem(thesis));
          });
        }
        if (masterIdx.size > 0) {
          docChildren.push(h3("Master Thesis", masterIdx.size, allMaster.length));
          allMaster.forEach((thesis, i) => {
            if (masterIdx.has(i)) docChildren.push(thesisItem(thesis));
          });
        }
        if (bachelorIdx.size > 0) {
          docChildren.push(h3("Bachelor Thesis", bachelorIdx.size, allBachelor.length));
          allBachelor.forEach((thesis, i) => {
            if (bachelorIdx.has(i)) docChildren.push(thesisItem(thesis));
          });
        }
        if (supIdx.size > 0) {
          docChildren.push(h3("Student Supervision", supIdx.size, allSupervisions.length));
          allSupervisions.forEach((thesis, i) => {
            if (supIdx.has(i)) docChildren.push(thesisItem(thesis));
          });
        }
      }

      if (extIdx.size > 0) {
        docChildren.push(h2("External Courses", extIdx.size, allExtCourses.length));
        allExtCourses.forEach((course, i) => {
          if (!extIdx.has(i)) return;
          docChildren.push(item([
            B(course.title),
            ...(course.program ? [G(`. ${course.program}`)] : []),
            ...(course.year ? [G(` (${course.year})`)] : []),
            N("."),
          ]));
        });
      }
    }
  }

  {
    const visitIdx = selectedIndices(selectedItems, "visit");
    const awardIdx = selectedIndices(selectedItems, "award");
    const wgIntlIdx = selectedIndices(selectedItems, "wg-intl");
    const lectureIdx = selectedIndices(selectedItems, "lecture");
    const eventIdx = selectedIndices(selectedItems, "event");
    const hasAny = visitIdx.size > 0 || awardIdx.size > 0 || wgIntlIdx.size > 0 || lectureIdx.size > 0 || eventIdx.size > 0;

    if (hasAny) {
      docChildren.push(h1(
        "International",
        visitIdx.size + awardIdx.size + wgIntlIdx.size + lectureIdx.size + eventIdx.size,
        allVisits.length + allAwards.length + allWgProjects.length + allLectures.length + allEvents.length,
      ));

      if (visitIdx.size > 0) {
        docChildren.push(h2("Research Visits", visitIdx.size, allVisits.length));
        allVisits.forEach((visit, i) => {
          if (!visitIdx.has(i)) return;
          const title = visit.title.replace(/\.+$/, "");
          docChildren.push(item([
            B(title),
            ...(visit.location ? [N(". "), Tc(visit.location.replace(/\.+$/, ""))] : []),
            ...((visit.year != null || visit.duration) ? [G(` (${[visit.year, visit.duration].filter(Boolean).join(" – ")})`)] : []),
            N("."),
          ]));
        });
      }

      if (awardIdx.size > 0) {
        docChildren.push(h2("Awards", awardIdx.size, allAwards.length));
        allAwards.forEach((award, i) => {
          if (!awardIdx.has(i)) return;
          const title = award.title.replace(/\.+$/, "");
          const organization = award.organization ? award.organization.replace(/\.+$/, "") : "";
          docChildren.push(item([
            B(title),
            ...(organization ? [N(`. ${organization}`)] : []),
            ...(award.year != null ? [G(` (${award.year})`)] : []),
            ...(award.tipo ? [N(" – "), Tc(award.tipo)] : []),
            N("."),
          ]));
        });
      }

      if (wgIntlIdx.size > 0) {
        docChildren.push(h2("Working Groups, Standardisation Bodies, and Industry", wgIntlIdx.size, allWgProjects.length));
        allWgProjects.forEach((group, i) => {
          if (!wgIntlIdx.has(i)) return;
          const title = group.title.replace(/\.+$/, "");
          docChildren.push(item([
            B(title),
            ...(group.funder ? [N(". "), It(group.funder)] : []),
            ...(group.year ? [G(` (${group.year})`)] : []),
            N("."),
          ]));
        });
      }

      if (lectureIdx.size > 0) {
        docChildren.push(h2("Invited Lectures", lectureIdx.size, allLectures.length));
        allLectures.forEach((lecture, i) => {
          if (!lectureIdx.has(i)) return;
          const title = lecture.title.replace(/\.+$/, "");
          docChildren.push(item([
            B(title),
            ...(lecture.program ? [N(". "), Tc(lecture.program)] : []),
            ...(lecture.location ? [G(`. ${lecture.location.replace(/\.+$/, "")}`)] : []),
            ...(lecture.year != null ? [G(` (${lecture.year})`)] : []),
            N("."),
          ]));
        });
      }

      if (eventIdx.size > 0) {
        docChildren.push(h2("Events", eventIdx.size, allEvents.length));
        allEvents.forEach((event, i) => {
          if (!eventIdx.has(i)) return;
          const title = event.title.replace(/\.+$/, "");
          docChildren.push(item([
            B(title),
            ...(event.rol ? [N(" ["), Tc(event.rol), N("]")] : []),
            ...(event.program ? [G(`. ${event.program}`)] : []),
            ...(event.location ? [G(`. ${event.location.replace(/\.+$/, "")}.`)] : [N(".")]),
            ...(event.year != null ? [G(` (${event.year}).`)] : []),
          ]));
        });
      }
    }
  }

  return new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: SZ, color: BLACK },
        },
      },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: "Calibri", size: SZ_H1, bold: true, color: DARK },
          paragraph: {
            spacing: { before: SP_BEFORE_H1, after: SP_AFTER_H1 },
            border: {
              bottom: { color: TEAL, space: 1, style: BorderStyle.SINGLE, size: 8 },
            },
          },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: "Calibri", size: SZ_H2, bold: true, color: TEAL },
          paragraph: { spacing: { before: SP_BEFORE_H2, after: SP_AFTER_H2 } },
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: "Calibri", size: SZ_H3, bold: true, color: TEAL },
          paragraph: { spacing: { before: SP_BEFORE_H3, after: SP_AFTER_H3 } },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.5),
              right: convertInchesToTwip(0.2),
              bottom: convertInchesToTwip(0.5),
              left: convertInchesToTwip(0.2),
            },
          },
        },
        children: docChildren.length > 0 ? docChildren : [new Paragraph({ children: [N("No items selected.")] })],
      },
    ],
  });
}

export async function generateCVBlob(selectedItems: string[], cvData: CVData): Promise<Blob> {
  const doc = buildDocument(selectedItems, cvData);
  return Packer.toBlob(doc);
}