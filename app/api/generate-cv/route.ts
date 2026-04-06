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

// ── Data imports ────────────────────────────────────────────────────────────
import { getPublications, getConferencePublications, getBookPublications, getOtherPublications } from "@/data/publications";
import { getCompetitiveProjects, getPrivateContracts, getSoftwareProjects, getWorkingGroups, formatMonthYear } from "@/data/projects";
import { getCourses, getTeachingProjects, getPhDTheses, getMasterTheses, getBachelorTheses, getSupervisions, getExternalCourses, getInvitedLectures, getEvents } from "@/data/tutor";
import { getPositions, getEducation, getCertificates, getInstitutionalRoles } from "@/data/about";
import { getAwards, getResearchVisits } from "@/data/awards";

// ── Styles helpers ───────────────────────────────────────────────────────────

function h1(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 120 },
  });
}

function h2(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 80 },
  });
}

function h3(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 60 },
  });
}

function bullet(runs: TextRun[]): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    children: runs,
    spacing: { after: 60 },
  });
}

function plainBullet(text: string): Paragraph {
  return bullet([new TextRun({ text })]);
}

// ── Bio text ──────────────────────────────────────────────────────────────

function buildBioParagraph(): Paragraph[] {
  const bioText =
    `Javier Conde is an Assistant Professor at the Universidad Politécnica de Madrid (UPM), Department of Telematic Systems Engineering. ` +
    `In 2018 and 2020, he obtained his Bachelor's and Master's degrees in Telecommunications Engineering from UPM. ` +
    `He received the Ángel Barbero Scholarship for having the highest grades in Telematics and in the Master's in Telecommunications Engineering, ` +
    `which allowed him to join the Digital Integration Group (GID). ` +
    `In September 2020, he started his PhD in Telematics Engineering at UPM within the Next Generation Internet Group. ` +
    `His doctoral research focused on digital twins and open data within European projects such as ARPortwin and YODA. ` +
    `The thesis was awarded the highest distinction "Sobresaliente Cum Laude" and received the Extraordinary PhD Award and the Margarita Salas Prize in 2025. ` +
    `Since 2023, he has been an Assistant Professor at UPM. His research focuses on edge computing, open data, and artificial intelligence applied to digital twins and education. ` +
    `In 2024, he was named a Young Scholar by the US Marconi Society, becoming the first Spanish researcher to receive this distinction.`;

  return [
    new Paragraph({
      children: [new TextRun({ text: bioText })],
      spacing: { after: 120 },
    }),
  ];
}

// ── Route handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const selectedItems: string[] = body.selectedItems ?? [];
    const itemSet = new Set<string>(selectedItems);

    // Helper: check if any item from a prefix is selected
    const hasPrefix = (prefix: string) => {
      if (prefix === "bio") return itemSet.has("bio");
      return selectedItems.some((k) => k.startsWith(prefix + "-"));
    };

    // Helper: get selected indices for a prefix
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

    // ── Bio ──────────────────────────────────────────────────────────────
    if (itemSet.has("bio")) {
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: "Javier Conde", bold: true, size: 48 })],
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 80 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "Assistant Professor · Universidad Politécnica de Madrid", italics: true })],
          spacing: { after: 200 },
        }),
        ...buildBioParagraph(),
      );
    }

    // ── Position and Education ───────────────────────────────────────────
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
          const positions = getPositions();
          positions.forEach((p, i) => {
            if (!posIdx.has(i)) return;
            const parts: string[] = [];
            if (p.title) parts.push(p.title);
            if (p.organization) parts.push(p.organization);
            if (p.year) parts.push(p.year);
            if (p.location) parts.push(p.location);
            docChildren.push(bullet([new TextRun({ text: parts.join(". ") })]));
          });
        }

        if (instIdx.size > 0) {
          docChildren.push(h2("Other Institutional Roles"));
          const roles = getInstitutionalRoles();
          roles.forEach((r, i) => {
            if (!instIdx.has(i)) return;
            const parts: string[] = [];
            if (r.title) parts.push(r.title);
            if (r.organization) parts.push(r.organization);
            if (r.year) parts.push(r.year);
            docChildren.push(bullet([new TextRun({ text: parts.join(". ") })]));
          });
        }

        if (eduIdx.size > 0) {
          docChildren.push(h2("Education"));
          const edu = getEducation();
          edu.forEach((e, i) => {
            if (!eduIdx.has(i)) return;
            const parts: string[] = [];
            if (e.title) parts.push(e.title);
            if (e.organization) parts.push(e.organization);
            if (e.year) parts.push(e.year);
            if (e.location) parts.push(e.location);
            docChildren.push(bullet([new TextRun({ text: parts.join(". ") })]));
          });
        }

        if (certIdx.size > 0) {
          docChildren.push(h2("Certificates"));
          const certs = getCertificates();
          certs.forEach((c, i) => {
            if (!certIdx.has(i)) return;
            const parts: string[] = [];
            if (c.title) parts.push(c.title);
            if (c.organization) parts.push(c.organization);
            if (c.year) parts.push(c.year);
            if (c.note) parts.push(c.note);
            docChildren.push(bullet([new TextRun({ text: parts.join(". ") })]));
          });
        }
      }
    }

    // ── Publications ─────────────────────────────────────────────────────
    {
      const journalIdx = selectedIndices("journal");
      const confIdx = selectedIndices("conference");
      const bookIdx = selectedIndices("book");
      const otherIdx = selectedIndices("other");
      const hasAny = journalIdx.size > 0 || confIdx.size > 0 || bookIdx.size > 0 || otherIdx.size > 0;

      if (hasAny) {
        docChildren.push(h1("Publications"));

        if (journalIdx.size > 0) {
          docChildren.push(h2("Journal Publications"));
          const pubs = getPublications();
          pubs.forEach((p, i) => {
            if (!journalIdx.has(i)) return;
            const jcr = p.jcr ? ` [${p.jcr}]` : "";
            docChildren.push(bullet([
              new TextRun({ text: p.authors ? `${p.authors}. ` : "" }),
              new TextRun({ text: `"${p.title}". `, bold: true }),
              new TextRun({ text: p.journal ? `${p.journal}` : "", italics: true }),
              new TextRun({ text: ` (${p.year})${jcr}.` }),
              ...(p.doi ? [new TextRun({ text: ` ${p.doi}` })] : []),
            ]));
          });
        }

        if (confIdx.size > 0) {
          docChildren.push(h2("Conference Papers"));
          const confs = getConferencePublications();
          confs.forEach((p, i) => {
            if (!confIdx.has(i)) return;
            docChildren.push(bullet([
              new TextRun({ text: p.authors ? `${p.authors}. ` : "" }),
              new TextRun({ text: `"${p.title}". `, bold: true }),
              new TextRun({ text: p.journal ? `${p.journal}` : "", italics: true }),
              new TextRun({ text: ` (${p.year}).` }),
              ...(p.location ? [new TextRun({ text: ` ${p.location}.` })] : []),
            ]));
          });
        }

        if (bookIdx.size > 0) {
          docChildren.push(h2("Books"));
          const books = getBookPublications();
          books.forEach((p, i) => {
            if (!bookIdx.has(i)) return;
            docChildren.push(bullet([
              new TextRun({ text: p.authors ? `${p.authors}. ` : "" }),
              new TextRun({ text: `"${p.title}". `, bold: true }),
              new TextRun({ text: p.journal ? `${p.journal}` : "", italics: true }),
              new TextRun({ text: ` (${p.year}).` }),
            ]));
          });
        }

        if (otherIdx.size > 0) {
          docChildren.push(h2("Other Publications"));
          const others = getOtherPublications();
          others.forEach((p, i) => {
            if (!otherIdx.has(i)) return;
            docChildren.push(bullet([
              new TextRun({ text: p.authors ? `${p.authors}. ` : "" }),
              new TextRun({ text: `"${p.title}". `, bold: true }),
              new TextRun({ text: p.journal ? `${p.journal}` : "", italics: true }),
              new TextRun({ text: ` (${p.year}).` }),
              ...(p.type ? [new TextRun({ text: ` [${p.type}]` })] : []),
            ]));
          });
        }
      }
    }

    // ── Research Projects ────────────────────────────────────────────────
    {
      const compIdx = selectedIndices("competitive");
      const privIdx = selectedIndices("private");
      const swIdx = selectedIndices("software");
      const wgProjIdx = selectedIndices("wg-project");
      const hasAny = compIdx.size > 0 || privIdx.size > 0 || swIdx.size > 0 || wgProjIdx.size > 0;

      if (hasAny) {
        docChildren.push(h1("Research Projects"));

        if (compIdx.size > 0) {
          docChildren.push(h2("Competitive Projects"));
          const projects = getCompetitiveProjects();
          projects.forEach((p, i) => {
            if (!compIdx.has(i)) return;
            const start = formatMonthYear(p.startDate);
            const end = formatMonthYear(p.endDate);
            const period = start || end ? ` (${[start, end].filter(Boolean).join(" – ")})` : "";
            const ip = p.isIP ? " [PI]" : "";
            docChildren.push(bullet([
              new TextRun({ text: p.title, bold: true }),
              new TextRun({ text: `${period}. ${p.funder}${ip}.` }),
              ...(p.scope ? [new TextRun({ text: ` ${p.scope}.` })] : []),
            ]));
          });
        }

        if (privIdx.size > 0) {
          docChildren.push(h2("Private Contracts"));
          const contracts = getPrivateContracts();
          contracts.forEach((p, i) => {
            if (!privIdx.has(i)) return;
            const start = formatMonthYear(p.startDate);
            const end = formatMonthYear(p.endDate);
            const period = start || end ? ` (${[start, end].filter(Boolean).join(" – ")})` : "";
            const ip = p.isIP ? " [PI]" : "";
            docChildren.push(bullet([
              new TextRun({ text: p.title, bold: true }),
              new TextRun({ text: `${period}. ${p.funder}${ip}.` }),
            ]));
          });
        }

        if (swIdx.size > 0) {
          docChildren.push(h2("Software"));
          const sw = getSoftwareProjects();
          sw.forEach((s, i) => {
            if (!swIdx.has(i)) return;
            const link = s.link ? ` ${s.link}` : "";
            const desc = s.description ? ` – ${s.description}` : "";
            docChildren.push(bullet([
              new TextRun({ text: s.title, bold: true }),
              new TextRun({ text: `${desc}${link}` }),
            ]));
          });
        }

        if (wgProjIdx.size > 0) {
          docChildren.push(h2("Working Groups, Standardisation Bodies, and Industry"));
          const wgs = getWorkingGroups();
          wgs.forEach((wg, i) => {
            if (!wgProjIdx.has(i)) return;
            const year = wg.year ? ` (${wg.year})` : "";
            const funder = wg.funder ? `. ${wg.funder}` : "";
            docChildren.push(bullet([
              new TextRun({ text: wg.title, bold: true }),
              new TextRun({ text: `${year}${funder}.` }),
            ]));
          });
        }
      }
    }

    // ── Teaching ─────────────────────────────────────────────────────────
    {
      const courseIdx = selectedIndices("course");
      const tprojIdx = selectedIndices("tproject");
      const phdIdx = selectedIndices("phd");
      const masterIdx = selectedIndices("master");
      const bachelorIdx = selectedIndices("bachelor");
      const supIdx = selectedIndices("supervision");
      const extIdx = selectedIndices("extcourse");
      const hasAny = courseIdx.size > 0 || tprojIdx.size > 0 || phdIdx.size > 0 || masterIdx.size > 0 || bachelorIdx.size > 0 || supIdx.size > 0 || extIdx.size > 0;

      if (hasAny) {
        docChildren.push(h1("Teaching"));

        if (courseIdx.size > 0) {
          docChildren.push(h2("Courses"));
          const courses = getCourses();
          courses.forEach((c, i) => {
            if (!courseIdx.has(i)) return;
            const coordinator = c.isCoordinator ? " [Coordinator]" : "";
            const program = c.program ? ` – ${c.program}` : "";
            const year = c.year ? ` (${c.year})` : "";
            const centro = c.centro ? `. ${c.centro}` : "";
            docChildren.push(bullet([
              new TextRun({ text: c.title, bold: true }),
              new TextRun({ text: `${coordinator}${program}${year}${centro}.` }),
              ...(c.levelAndCourse ? [new TextRun({ text: ` ${c.levelAndCourse}` })] : []),
            ]));
          });
        }

        if (tprojIdx.size > 0) {
          docChildren.push(h2("Teaching Innovation Projects"));
          const tprojects = getTeachingProjects();
          tprojects.forEach((tp, i) => {
            if (!tprojIdx.has(i)) return;
            const ip = tp.isPI ? " [PI]" : "";
            const funder = tp.funder ? `. ${tp.funder}` : "";
            const year = tp.year ? ` (${tp.year})` : "";
            docChildren.push(bullet([
              new TextRun({ text: tp.title, bold: true }),
              new TextRun({ text: `${ip}${funder}${year}.` }),
            ]));
          });
        }

        const hasSupervision = phdIdx.size > 0 || masterIdx.size > 0 || bachelorIdx.size > 0 || supIdx.size > 0;
        if (hasSupervision) {
          docChildren.push(h2("Supervision"));

          if (phdIdx.size > 0) {
            docChildren.push(h3("PhD Thesis"));
            const phds = getPhDTheses();
            phds.forEach((t, i) => {
              if (!phdIdx.has(i)) return;
              const year = t.year ? ` (${t.year})` : "";
              const degree = t.degree ? `. ${t.degree}` : "";
              docChildren.push(bullet([
                new TextRun({ text: `"${t.title}". `, bold: true }),
                new TextRun({ text: `${t.author}${year}${degree}.` }),
              ]));
            });
          }

          if (masterIdx.size > 0) {
            docChildren.push(h3("Master Thesis"));
            const masters = getMasterTheses();
            masters.forEach((t, i) => {
              if (!masterIdx.has(i)) return;
              const year = t.year ? ` (${t.year})` : "";
              const degree = t.degree ? `. ${t.degree}` : "";
              docChildren.push(bullet([
                new TextRun({ text: `"${t.title}". `, bold: true }),
                new TextRun({ text: `${t.author}${year}${degree}.` }),
              ]));
            });
          }

          if (bachelorIdx.size > 0) {
            docChildren.push(h3("Bachelor Thesis"));
            const bachelors = getBachelorTheses();
            bachelors.forEach((t, i) => {
              if (!bachelorIdx.has(i)) return;
              const year = t.year ? ` (${t.year})` : "";
              const degree = t.degree ? `. ${t.degree}` : "";
              docChildren.push(bullet([
                new TextRun({ text: `"${t.title}". `, bold: true }),
                new TextRun({ text: `${t.author}${year}${degree}.` }),
              ]));
            });
          }

          if (supIdx.size > 0) {
            docChildren.push(h3("Student Supervision"));
            const supervisions = getSupervisions();
            supervisions.forEach((t, i) => {
              if (!supIdx.has(i)) return;
              const year = t.year ? ` (${t.year})` : "";
              const degree = t.degree ? `. ${t.degree}` : "";
              docChildren.push(bullet([
                new TextRun({ text: `"${t.title}". `, bold: true }),
                new TextRun({ text: `${t.author}${year}${degree}.` }),
              ]));
            });
          }
        }

        if (extIdx.size > 0) {
          docChildren.push(h2("External Courses"));
          const ext = getExternalCourses();
          ext.forEach((c, i) => {
            if (!extIdx.has(i)) return;
            const year = c.year ? ` (${c.year})` : "";
            const program = c.program ? `. ${c.program}` : "";
            docChildren.push(bullet([
              new TextRun({ text: c.title, bold: true }),
              new TextRun({ text: `${year}${program}.` }),
            ]));
          });
        }
      }
    }

    // ── International ─────────────────────────────────────────────────────
    {
      const visitIdx = selectedIndices("visit");
      const awardIdx = selectedIndices("award");
      const wgIntlIdx = selectedIndices("wg-intl");
      const lectureIdx = selectedIndices("lecture");
      const eventIdx = selectedIndices("event");
      const hasAny = visitIdx.size > 0 || awardIdx.size > 0 || wgIntlIdx.size > 0 || lectureIdx.size > 0 || eventIdx.size > 0;

      if (hasAny) {
        docChildren.push(h1("International"));

        if (visitIdx.size > 0) {
          docChildren.push(h2("Research Visits"));
          const visits = getResearchVisits();
          visits.forEach((v, i) => {
            if (!visitIdx.has(i)) return;
            const year = v.year ? ` (${v.year})` : "";
            const location = v.location ? `. ${v.location}` : "";
            const duration = v.duration ? `. ${v.duration}` : "";
            docChildren.push(bullet([
              new TextRun({ text: v.title, bold: true }),
              new TextRun({ text: `${year}${location}${duration}.` }),
            ]));
          });
        }

        if (awardIdx.size > 0) {
          docChildren.push(h2("Awards"));
          const awards = getAwards();
          awards.forEach((a, i) => {
            if (!awardIdx.has(i)) return;
            const year = a.year ? ` (${a.year})` : "";
            const org = a.organization ? `. ${a.organization}` : "";
            docChildren.push(bullet([
              new TextRun({ text: a.title, bold: true }),
              new TextRun({ text: `${year}${org}.` }),
            ]));
          });
        }

        if (wgIntlIdx.size > 0) {
          docChildren.push(h2("Working Groups, Standardisation Bodies, and Industry"));
          const wgs = getWorkingGroups();
          wgs.forEach((wg, i) => {
            if (!wgIntlIdx.has(i)) return;
            const year = wg.year ? ` (${wg.year})` : "";
            const funder = wg.funder ? `. ${wg.funder}` : "";
            docChildren.push(bullet([
              new TextRun({ text: wg.title, bold: true }),
              new TextRun({ text: `${year}${funder}.` }),
            ]));
          });
        }

        if (lectureIdx.size > 0) {
          docChildren.push(h2("Invited Lectures"));
          const lectures = getInvitedLectures();
          lectures.forEach((l, i) => {
            if (!lectureIdx.has(i)) return;
            const year = l.year != null ? ` (${l.year})` : "";
            const location = l.location ? `. ${l.location}` : "";
            const program = l.program ? `. ${l.program}` : "";
            docChildren.push(bullet([
              new TextRun({ text: l.title, bold: true }),
              new TextRun({ text: `${year}${location}${program}.` }),
            ]));
          });
        }

        if (eventIdx.size > 0) {
          docChildren.push(h2("Events"));
          const events = getEvents();
          events.forEach((e, i) => {
            if (!eventIdx.has(i)) return;
            const year = e.year != null ? ` (${e.year})` : "";
            const location = e.location ? `. ${e.location}` : "";
            const program = e.program ? `. ${e.program}` : "";
            const rol = e.rol ? ` [${e.rol}]` : "";
            docChildren.push(bullet([
              new TextRun({ text: e.title, bold: true }),
              new TextRun({ text: `${year}${rol}${location}${program}.` }),
            ]));
          });
        }
      }
    }

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: "Calibri",
              size: 22, // 11pt
            },
          },
        },
        paragraphStyles: [
          {
            id: "Heading1",
            name: "Heading 1",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: {
              font: "Calibri",
              size: 32,
              bold: true,
              color: "1c2d2d",
            },
            paragraph: {
              spacing: { before: 320, after: 120 },
              border: {
                bottom: {
                  color: "2ecfba",
                  space: 1,
                  style: BorderStyle.SINGLE,
                  size: 6,
                },
              },
            },
          },
          {
            id: "Heading2",
            name: "Heading 2",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: {
              font: "Calibri",
              size: 26,
              bold: true,
              color: "1c2d2d",
            },
            paragraph: {
              spacing: { before: 240, after: 80 },
            },
          },
          {
            id: "Heading3",
            name: "Heading 3",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: {
              font: "Calibri",
              size: 24,
              bold: true,
              italics: true,
              color: "2c3e50",
            },
            paragraph: {
              spacing: { before: 200, after: 60 },
            },
          },
        ],
      },
      numbering: {
        config: [
          {
            reference: "default-bullets",
            levels: [
              {
                level: 0,
                format: "bullet",
                text: "\u2022",
                alignment: AlignmentType.LEFT,
                style: {
                  paragraph: {
                    indent: {
                      left: convertInchesToTwip(0.25),
                      hanging: convertInchesToTwip(0.25),
                    },
                  },
                },
              },
            ],
          },
        ],
      },
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(1),
                right: convertInchesToTwip(1),
                bottom: convertInchesToTwip(1),
                left: convertInchesToTwip(1),
              },
            },
          },
          children: docChildren.length > 0 ? docChildren : [new Paragraph({ text: "No items selected." })],
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
