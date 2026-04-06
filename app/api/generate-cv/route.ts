import { NextRequest, NextResponse } from "next/server";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
} from "docx";

import { getPublications, getConferencePublications, getBookPublications, getOtherPublications } from "@/data/publications";
import { getCompetitiveProjects, getPrivateContracts, getSoftwareProjects, getWorkingGroups, formatMonthYear } from "@/data/projects";
import { getCourses, getTeachingProjects, getPhDTheses, getMasterTheses, getBachelorTheses, getSupervisions, getExternalCourses, getInvitedLectures, getEvents } from "@/data/tutor";
import { getPositions, getEducation, getCertificates, getInstitutionalRoles } from "@/data/about";
import { getAwards, getResearchVisits } from "@/data/awards";
import { getBioStats } from "@/data/bioStats";

// ── Constants ────────────────────────────────────────────────────────────────
const SZ = 18;          // 9pt in half-points
const SZ_H1 = 26;       // 13pt
const SZ_H2 = 22;       // 11pt
const SZ_H3 = 20;       // 10pt
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

// ── TextRun helpers ──────────────────────────────────────────────────────────
const N  = (text: string) => new TextRun({ text, size: SZ, color: BLACK });
const B  = (text: string) => new TextRun({ text, size: SZ, bold: true, color: BLACK });
const It = (text: string) => new TextRun({ text, size: SZ, italics: true, color: BLACK });
const G  = (text: string) => new TextRun({ text, size: SZ, color: GRAY });
const Tc = (text: string) => new TextRun({ text, size: SZ, color: TEAL });
const BoldIt = (text: string) => new TextRun({ text, size: SZ, bold: true, italics: true, color: BLACK });

// ── Paragraph helpers ────────────────────────────────────────────────────────
function h1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: SP_BEFORE_H1, after: SP_AFTER_H1 },
    children: [new TextRun({ text, size: SZ_H1, bold: true, color: DARK })],
  });
}

function h2(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: SP_BEFORE_H2, after: SP_AFTER_H2 },
    children: [new TextRun({ text, size: SZ_H2, bold: true, color: TEAL })],
  });
}

function h3(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: SP_BEFORE_H3, after: SP_AFTER_H3 },
    children: [new TextRun({ text, size: SZ_H3, bold: true, color: TEAL })],
  });
}

/** Bullet paragraph with colored • matching the site */
function item(runs: TextRun[]): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: "• ", size: SZ, color: TEAL }),
      ...runs,
    ],
    spacing: { after: SP_AFTER_ITEM },
    indent: { left: 200, hanging: 200 },
  });
}

/** Plain text paragraph (for bio) */
function para(runs: TextRun[], spaceAfter = 80): Paragraph {
  return new Paragraph({
    children: runs,
    spacing: { after: spaceAfter },
    alignment: AlignmentType.JUSTIFIED,
  });
}

// ── Bio ───────────────────────────────────────────────────────────────────────
function buildBio(): Paragraph[] {
  const s = getBioStats();
  const paras: Paragraph[] = [];

  paras.push(para([
    N("In "), B("2018"), N(" and "), B("2020"),
    N(", I obtained my "),
    B("Bachelor\u2019s and Master\u2019s degrees in Telecommunications Engineering"),
    N(" from the "), B("Universidad Polit\u00e9cnica de Madrid (UPM)"),
    N(". My professional, teaching, and research experience began during the final year of my undergraduate studies. In this initial stage, I worked at "),
    B("SENER"), N(", developing tools for the aerospace sector. Thanks to my academic achievements, having the "),
    B("highest grades in Telematics and in the Master\u2019s in Telecommunications Engineering"),
    N(", I received the "), B("\u00c1ngel Barbero Scholarship"),
    N(", which allowed me to join the "), B("Digital Integration Group (GID)"),
    N(". In this group, I actively participated in the "), B("digital transformation of the University"),
    N(", resulting in impactful outcomes such as the "), B("teaching schedule management tool at ETSIT"),
    N(`, which has been in operation for more than `), B(String(s.progdocYears)), N(` years.`),
  ], 60));

  paras.push(para([
    N("In September "), B("2020"),
    N(", I started my "), B("PhD in Telematics Engineering"),
    N(" at UPM within the "), B("Next Generation Internet Group"),
    N(", with a predoctoral contract obtained through a competitive call of the UPM\u2019s Own R&D+i Program. My doctoral research focused on "),
    B("digital twins and open data"), N(", carried out within European projects such as "),
    B("ARPortwin"), N(" and "), B("YODA"),
    N(". The thesis was awarded the highest distinction, "), B("\u201cSobresaliente Cum Laude,\u201d"),
    N(" and received several honors, including the "), B("Extraordinary PhD Award"),
    N(" and the "), B("Margarita Salas Prize"), N(" in "), B("2025"), N("."),
  ], 60));

  paras.push(para([
    N("During the final year of my PhD, I combined research with my role as "),
    B("head of the telecommunications network at ADIF"),
    N(" in Arag\u00f3n, which enabled me to establish strong collaborations between industry and academia."),
  ], 60));

  paras.push(para([
    N("Since "), B("2023"), N(", I have been an "), B("Assistant Professor"),
    N(" at the "), B("Universidad Polit\u00e9cnica de Madrid"),
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
    B("FECYT"), N(", and the "), B("Instituto de Ingenier\u00eda de Espa\u00f1a"), N("."),
  ], 60));

  paras.push(para([
    N("One of the most important aspects of my contributions is their "), B("societal impact"),
    N(". Therefore, my work focuses on "), B("replicability, openness, and technology transfer"),
    N(". For example, work carried out during my early career resulted in "), B("4"),
    N(" "), B("academic management applications"), N(" currently used at the Universidad Polit\u00e9cnica de Madrid. I also manage the "),
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
    N("In "), B("teaching"), N(", I have delivered courses in both undergraduate and master\u2019s programs in "),
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
    N("-hour "), B("University Teaching Training Program"), N("."),
  ], 60));

  return paras;
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const selectedItems: string[] = body.selectedItems ?? [];
    const itemSet = new Set<string>(selectedItems);

    const selectedIndices = (prefix: string): Set<number> => {
      const indices = new Set<number>();
      for (const key of selectedItems) {
        const p = prefix + "-";
        if (key.startsWith(p)) {
          const idx = parseInt(key.slice(p.length), 10);
          if (!isNaN(idx)) indices.add(idx);
        }
      }
      return indices;
    };

    const docChildren: Paragraph[] = [];

    // ── Bio ─────────────────────────────────────────────────────────────────
    if (itemSet.has("bio")) {
      docChildren.push(h1("Javier Conde"));
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: "Assistant Professor · Universidad Politécnica de Madrid", size: SZ, italics: true, color: GRAY })],
          spacing: { after: 100 },
        })
      );
      docChildren.push(...buildBio());
    }

    // ── Position and Education ───────────────────────────────────────────────
    {
      const posIdx = selectedIndices("position");
      const instIdx = selectedIndices("institutional");
      const eduIdx = selectedIndices("education");
      const certIdx = selectedIndices("certificate");
      const hasAny = posIdx.size > 0 || instIdx.size > 0 || eduIdx.size > 0 || certIdx.size > 0;

      if (hasAny) {
        docChildren.push(h1("Position and Education"));

        if (posIdx.size > 0) {
          docChildren.push(h2("Position"));
          getPositions().forEach((p, i) => {
            if (!posIdx.has(i)) return;
            const t = p.title.replace(/\.+$/, "");
            docChildren.push(item([
              B(t),
              ...(p.organization ? [N(". "), It(p.organization)] : []),
              ...(p.year ? [G(` (${p.year})`)] : []),
              ...(p.note ? [Tc(` \u2014 ${p.note}`)] : []),
              N("."),
            ]));
          });
        }

        if (instIdx.size > 0) {
          docChildren.push(h2("Other Institutional Roles"));
          getInstitutionalRoles().forEach((r, i) => {
            if (!instIdx.has(i)) return;
            const t = r.title.replace(/\.+$/, "");
            docChildren.push(item([
              B(t),
              ...(r.organization ? [N(". "), It(r.organization)] : []),
              ...(r.year ? [G(` (${r.year})`)] : []),
              N("."),
            ]));
          });
        }

        if (eduIdx.size > 0) {
          docChildren.push(h2("Education"));
          getEducation().forEach((e, i) => {
            if (!eduIdx.has(i)) return;
            const t = e.title.replace(/\.+$/, "");
            docChildren.push(item([
              B(t),
              ...(e.organization ? [N(". "), It(e.organization)] : []),
              ...(e.year ? [G(` (${e.year})`)] : []),
              ...(e.note ? [Tc(` \u2014 ${e.note}`)] : []),
              N("."),
            ]));
          });
        }

        if (certIdx.size > 0) {
          docChildren.push(h2("Certificates"));
          getCertificates().forEach((c, i) => {
            if (!certIdx.has(i)) return;
            const t = c.title.replace(/\.+$/, "");
            docChildren.push(item([
              B(t),
              ...(c.year ? [G(` (${c.year})`)] : []),
              N("."),
            ]));
          });
        }
      }
    }

    // ── Publications ─────────────────────────────────────────────────────────
    {
      const journalIdx = selectedIndices("journal");
      const confIdx    = selectedIndices("conference");
      const bookIdx    = selectedIndices("book");
      const otherIdx   = selectedIndices("other");
      const hasAny = journalIdx.size > 0 || confIdx.size > 0 || bookIdx.size > 0 || otherIdx.size > 0;

      if (hasAny) {
        docChildren.push(h1("Publications"));

        // Journal
        if (journalIdx.size > 0) {
          docChildren.push(h2("Journal Publications"));
          getPublications().forEach((p, i) => {
            if (!journalIdx.has(i)) return;
            const authors = p.authors.replace("J. Conde", "\x01J. Conde\x01");
            const authorRuns = authors.split("\x01").map((seg, si) =>
              si % 2 === 1 ? B(seg) : N(seg)
            );
            docChildren.push(item([
              N(`\u201c${p.title}\u201d. `),
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

        // Conference
        if (confIdx.size > 0) {
          docChildren.push(h2("Conference Papers"));
          getConferencePublications().forEach((p, i) => {
            if (!confIdx.has(i)) return;
            const authors = p.authors.replace("J. Conde", "\x01J. Conde\x01");
            const authorRuns = authors.split("\x01").map((seg, si) =>
              si % 2 === 1 ? B(seg) : N(seg)
            );
            docChildren.push(item([
              N(`\u201c${p.title}\u201d. `),
              G(`(${p.year}). `),
              ...authorRuns,
              N(". "),
              It(p.journal),
              ...(p.location ? [G(`, ${p.location}`)] : []),
              ...(p.jcr ? [G(` (${p.jcr}).`)] : [N(".")]),
            ]));
          });
        }

        // Books
        if (bookIdx.size > 0) {
          docChildren.push(h2("Books"));
          getBookPublications().forEach((p, i) => {
            if (!bookIdx.has(i)) return;
            const authors = p.authors.replace("J. Conde", "\x01J. Conde\x01");
            const authorRuns = authors.split("\x01").map((seg, si) =>
              si % 2 === 1 ? B(seg) : N(seg)
            );
            docChildren.push(item([
              N(`\u201c${p.title}\u201d. `),
              G(`(${p.year}). `),
              ...authorRuns,
              N(". "),
              It(p.journal),
              N("."),
            ]));
          });
        }

        // Other
        if (otherIdx.size > 0) {
          docChildren.push(h2("Other Publications"));
          getOtherPublications().forEach((p, i) => {
            if (!otherIdx.has(i)) return;
            const authors = p.authors.replace("J. Conde", "\x01J. Conde\x01");
            const authorRuns = authors.split("\x01").map((seg, si) =>
              si % 2 === 1 ? B(seg) : N(seg)
            );
            docChildren.push(item([
              N(`\u201c${p.title}\u201d. `),
              G(`(${p.year}). `),
              ...authorRuns,
              N(". "),
              It(p.journal),
              N("."),
            ]));
          });
        }
      }
    }

    // ── Research Projects ────────────────────────────────────────────────────
    {
      const compIdx    = selectedIndices("competitive");
      const privIdx    = selectedIndices("private");
      const swIdx      = selectedIndices("software");
      const wgProjIdx  = selectedIndices("wg-project");
      const hasAny = compIdx.size > 0 || privIdx.size > 0 || swIdx.size > 0 || wgProjIdx.size > 0;

      if (hasAny) {
        docChildren.push(h1("Research Projects"));

        if (compIdx.size > 0) {
          docChildren.push(h2("Competitive Projects"));
          getCompetitiveProjects().forEach((p, i) => {
            if (!compIdx.has(i)) return;
            const start = formatMonthYear(p.startDate);
            const end   = formatMonthYear(p.endDate);
            const period = (start || end) ? `(${[start, end].filter(Boolean).join(" \u2013 ")}). ` : "";
            const t = p.title.replace(/\.+$/, "");
            docChildren.push(item([
              ...(period ? [G(period)] : []),
              B(t),
              ...(p.isIP ? [Tc(" [PI]")] : []),
              N(". "),
              It(p.funder),
              N("."),
              ...(p.scope ? [N(" "), Tc(p.scope), Tc(" project.")] : []),
              ...(p.money != null ? [N(" "), Tc(`\u20ac${p.money.toLocaleString("es-ES")}`), N(".")] : []),
            ]));
          });
        }

        if (privIdx.size > 0) {
          docChildren.push(h2("Private Contracts"));
          getPrivateContracts().forEach((p, i) => {
            if (!privIdx.has(i)) return;
            const start = formatMonthYear(p.startDate);
            const end   = formatMonthYear(p.endDate);
            const period = (start || end) ? `(${[start, end].filter(Boolean).join(" \u2013 ")}). ` : "";
            const t = p.title.replace(/\.+$/, "");
            docChildren.push(item([
              ...(period ? [G(period)] : []),
              B(t),
              ...(p.isIP ? [Tc(" [PI]")] : []),
              N(". "),
              It(p.funder),
              N("."),
            ]));
          });
        }

        if (swIdx.size > 0) {
          docChildren.push(h2("Software"));
          getSoftwareProjects().forEach((s, i) => {
            if (!swIdx.has(i)) return;
            const t = s.title.replace(/\.+$/, "");
            docChildren.push(item([
              ...(s.link ? [new TextRun({ text: t, size: SZ, bold: true, color: TEAL })] : [B(t)]),
              ...(s.description ? [N(`. ${s.description}`)] : []),
              N("."),
            ]));
          });
        }

        if (wgProjIdx.size > 0) {
          docChildren.push(h2("Working Groups, Standardisation Bodies, and Industry"));
          getWorkingGroups().forEach((wg, i) => {
            if (!wgProjIdx.has(i)) return;
            const t = wg.title.replace(/\.+$/, "");
            docChildren.push(item([
              B(t),
              ...(wg.funder ? [N(". "), It(wg.funder)] : []),
              ...(wg.year ? [G(` (${wg.year})`)] : []),
              N("."),
            ]));
          });
        }
      }
    }

    // ── Teaching ─────────────────────────────────────────────────────────────
    {
      const courseIdx   = selectedIndices("course");
      const tprojIdx    = selectedIndices("tproject");
      const phdIdx      = selectedIndices("phd");
      const masterIdx   = selectedIndices("master");
      const bachelorIdx = selectedIndices("bachelor");
      const supIdx      = selectedIndices("supervision");
      const extIdx      = selectedIndices("extcourse");
      const hasAny = courseIdx.size > 0 || tprojIdx.size > 0 || phdIdx.size > 0 ||
                     masterIdx.size > 0 || bachelorIdx.size > 0 || supIdx.size > 0 || extIdx.size > 0;

      if (hasAny) {
        docChildren.push(h1("Teaching"));

        if (courseIdx.size > 0) {
          docChildren.push(h2("Courses"));
          getCourses().forEach((c, i) => {
            if (!courseIdx.has(i)) return;
            docChildren.push(item([
              B(c.title),
              ...(c.isCoordinator ? [Tc(" [Course Coordinator]")] : []),
              ...(c.program ? [N(`. ${c.program}`)] : []),
              ...(c.levelAndCourse ? [N(" \u2013 "), BoldIt(c.levelAndCourse)] : []),
              ...(c.centro ? [N(`. ${c.centro}.`)] : [N(".")]),
              ...(c.year ? [G(` (${c.year})`)] : []),
            ]));
          });
        }

        if (tprojIdx.size > 0) {
          docChildren.push(h2("Teaching Innovation Projects"));
          getTeachingProjects().forEach((tp, i) => {
            if (!tprojIdx.has(i)) return;
            const t = tp.title.replace(/\.+$/, "");
            docChildren.push(item([
              B(t),
              ...(tp.isPI ? [Tc(" [PI]")] : []),
              ...(tp.funder ? [N(". "), It(tp.funder), N(".")] : [N(".")]),
              ...(tp.year ? [G(` (${tp.year})`)] : []),
            ]));
          });
        }

        const hasSupervision = phdIdx.size > 0 || masterIdx.size > 0 || bachelorIdx.size > 0 || supIdx.size > 0;
        if (hasSupervision) {
          docChildren.push(h2("Supervision"));

          const thesisItem = (t: { title: string; author: string; degree?: string; year?: number }) => item([
            B(t.title.replace(/\.+$/, "")),
            N(`. ${t.author}`),
            ...(t.degree ? [G(`. ${t.degree}`)] : []),
            ...(t.year && !isNaN(t.year) ? [G(` (${t.year})`)] : []),
            N("."),
          ]);

          if (phdIdx.size > 0) {
            docChildren.push(h3("PhD Thesis"));
            getPhDTheses().forEach((t, i) => { if (phdIdx.has(i)) docChildren.push(thesisItem(t)); });
          }
          if (masterIdx.size > 0) {
            docChildren.push(h3("Master Thesis"));
            getMasterTheses().forEach((t, i) => { if (masterIdx.has(i)) docChildren.push(thesisItem(t)); });
          }
          if (bachelorIdx.size > 0) {
            docChildren.push(h3("Bachelor Thesis"));
            getBachelorTheses().forEach((t, i) => { if (bachelorIdx.has(i)) docChildren.push(thesisItem(t)); });
          }
          if (supIdx.size > 0) {
            docChildren.push(h3("Student Supervision"));
            getSupervisions().forEach((t, i) => { if (supIdx.has(i)) docChildren.push(thesisItem(t)); });
          }
        }

        if (extIdx.size > 0) {
          docChildren.push(h2("External Courses"));
          getExternalCourses().forEach((c, i) => {
            if (!extIdx.has(i)) return;
            docChildren.push(item([
              B(c.title),
              ...(c.program ? [G(`. ${c.program}`)] : []),
              ...(c.year ? [G(` (${c.year})`)] : []),
              N("."),
            ]));
          });
        }
      }
    }

    // ── International ────────────────────────────────────────────────────────
    {
      const visitIdx   = selectedIndices("visit");
      const awardIdx   = selectedIndices("award");
      const wgIntlIdx  = selectedIndices("wg-intl");
      const lectureIdx = selectedIndices("lecture");
      const eventIdx   = selectedIndices("event");
      const hasAny = visitIdx.size > 0 || awardIdx.size > 0 || wgIntlIdx.size > 0 || lectureIdx.size > 0 || eventIdx.size > 0;

      if (hasAny) {
        docChildren.push(h1("International"));

        if (visitIdx.size > 0) {
          docChildren.push(h2("Research Visits"));
          getResearchVisits().forEach((v, i) => {
            if (!visitIdx.has(i)) return;
            const t = v.title.replace(/\.+$/, "");
            docChildren.push(item([
              B(t),
              ...(v.location ? [N(". "), Tc(v.location.replace(/\.+$/, ""))] : []),
              ...((v.year != null || v.duration)
                ? [G(` (${[v.year, v.duration].filter(Boolean).join(" \u2013 ")})`)]
                : []),
              N("."),
            ]));
          });
        }

        if (awardIdx.size > 0) {
          docChildren.push(h2("Awards"));
          getAwards().forEach((a, i) => {
            if (!awardIdx.has(i)) return;
            const t = a.title.replace(/\.+$/, "");
            const org = a.organization ? a.organization.replace(/\.+$/, "") : "";
            docChildren.push(item([
              B(t),
              ...(org ? [N(`. ${org}`)] : []),
              ...(a.year != null ? [G(` (${a.year})`)] : []),
              ...(a.tipo ? [N(" \u2013 "), Tc(a.tipo)] : []),
              N("."),
            ]));
          });
        }

        if (wgIntlIdx.size > 0) {
          docChildren.push(h2("Working Groups, Standardisation Bodies, and Industry"));
          getWorkingGroups().forEach((wg, i) => {
            if (!wgIntlIdx.has(i)) return;
            const t = wg.title.replace(/\.+$/, "");
            docChildren.push(item([
              B(t),
              ...(wg.funder ? [N(". "), It(wg.funder)] : []),
              ...(wg.year ? [G(` (${wg.year})`)] : []),
              N("."),
            ]));
          });
        }

        if (lectureIdx.size > 0) {
          docChildren.push(h2("Invited Lectures"));
          getInvitedLectures().forEach((l, i) => {
            if (!lectureIdx.has(i)) return;
            const t = l.title.replace(/\.+$/, "");
            docChildren.push(item([
              B(t),
              ...(l.program ? [N(". "), Tc(l.program)] : []),
              ...(l.location ? [G(`. ${l.location.replace(/\.+$/, "")}`) ] : []),
              ...(l.year != null ? [G(` (${l.year})`)] : []),
              N("."),
            ]));
          });
        }

        if (eventIdx.size > 0) {
          docChildren.push(h2("Events"));
          getEvents().forEach((e, i) => {
            if (!eventIdx.has(i)) return;
            const t = e.title.replace(/\.+$/, "");
            docChildren.push(item([
              B(t),
              ...(e.rol ? [N(" ["), Tc(e.rol), N("]")] : []),
              ...(e.program ? [G(`. ${e.program}`)] : []),
              ...(e.location ? [G(`. ${e.location.replace(/\.+$/, "")}.`)] : [N(".")]),
              ...(e.year != null ? [G(` (${e.year}).`)] : []),
            ]));
          });
        }
      }
    }

    // ── Build document ───────────────────────────────────────────────────────
    const doc = new Document({
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
          children: docChildren.length > 0
            ? docChildren
            : [new Paragraph({ children: [N("No items selected.")] })],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="javier-conde-cv.docx"',
        "Content-Length": buffer.byteLength.toString(),
      },
    });
  } catch (err: unknown) {
    console.error("[generate-cv] Error:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return new NextResponse(message, { status: 500 });
  }
}
