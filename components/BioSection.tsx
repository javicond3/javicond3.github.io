"use client";

import { useState } from "react";
import { BioStats } from "@/data/bioStats";

interface Props {
  stats: BioStats;
}

export default function BioSection({ stats }: Props) {
  const [expanded, setExpanded] = useState(false);

  const {
    progdocYears,
    totalPapers,
    journalCount,
    journalQ1,
    journalQ1D1,
    journalQ2,
    journalQ3,
    journalQ4,
    bookCount,
    conferenceCount,
    totalProjects,
    competitiveProjects,
    privateProjects,
    piCompetitiveProjects,
    piPrivateProjects,
    researchMonths,
    invitedTalks,
    externalCourses,
    totalSubjects,
    coordinatedSubjects,
    totalTeachingHours,
    totalInnovationProjects,
    coordinatedInnovationProjects,
    supervisionStudents,
    bachelorTheses,
    masterTheses,
    phdStudents,
    reviewerJournalCount,
    reviewerConferenceCount,
    reviewerBookCount,
    moocCount,
  } = stats;

  const G = ({ children }: { children: React.ReactNode }) => (
    <span className="font-semibold">{children}</span>
  );

  return (
    <div className="space-y-3">
      <div
        className={`text-sm leading-relaxed text-gray-600 text-justify space-y-4 overflow-hidden transition-all duration-300`}
        style={expanded ? {} : { display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}
      >
        <span>
          In <G>2018</G> and <G>2020</G>, I obtained my <span className="font-semibold">Bachelor's and Master's degrees in Telecommunications Engineering</span> from the <span className="font-semibold">Universidad Politécnica de Madrid (UPM)</span>. My professional, teaching, and research experience began during the final year of my undergraduate studies. In this initial stage, I worked at <span className="font-semibold">SENER</span>, developing tools for the aerospace sector. Thanks to my academic achievements, having the <span className="font-semibold">highest grades in Telematics and in the Master's in Telecommunications Engineering</span>, I received the <span className="font-semibold">Ángel Barbero Scholarship</span>, which allowed me to join the <span className="font-semibold">Digital Integration Group (GID)</span>. In this group, I actively participated in the <span className="font-semibold">digital transformation of the University</span>, resulting in impactful outcomes such as the <span className="font-semibold">teaching schedule management tool at ETSIT</span>, which has been in operation for more than <G>{progdocYears}</G> years.{" "}
        </span>
        <span>
          In September <G>2020</G>, I started my <span className="font-semibold">PhD in Telematics Engineering</span> at UPM within the <span className="font-semibold">Next Generation Internet Group</span>, with a predoctoral contract obtained through a competitive call of the UPM's Own R&D+i Program. My doctoral research focused on <span className="font-semibold">digital twins and open data</span>, carried out within European projects such as <span className="font-semibold">ARPortwin</span> and <span className="font-semibold">YODA</span>. The thesis was awarded the highest distinction, <span className="font-semibold">"Sobresaliente Cum Laude,"</span> and received several honors, including the <span className="font-semibold">Extraordinary PhD Award</span> and the <span className="font-semibold">Margarita Salas Prize</span> in <G>2025</G>.
        </span>
        <span>
          During the final year of my PhD, I combined research with my role as <span className="font-semibold">head of the telecommunications network at ADIF</span> in Aragón, which enabled me to establish strong collaborations between industry and academia.
        </span>
        <br /><br />
        <span>
          Since <G>2023</G>, I have been an <span className="font-semibold">Assistant Professor</span> at the <span className="font-semibold">Universidad Politécnica de Madrid</span>, in the Department of Telematic Systems Engineering. My research focuses on <span className="font-semibold">edge computing, open data, and artificial intelligence</span> applied to <span className="font-semibold">digital twins and education</span>. Within this context, I work on the characterization and detection of <span className="font-semibold">single-bit errors in neural networks</span>, the evaluation and identification of <span className="font-semibold">biases in large and multimodal language models</span>, the design of <span className="font-semibold">agent-based systems</span> to improve student engagement and learning, <span className="font-semibold">model compression</span>, and the generation of <span className="font-semibold">synthetic datasets</span> applied to cognitive science. I have published more than <G>{totalPapers}</G> scientific papers, including <G>{journalCount}</G> journal articles (<G>{journalQ1}</G> JCR Q1 [<G>{journalQ1D1}</G> D1], <G>{journalQ2}</G> JCR Q2, <G>{journalQ3}</G> JCR Q3, <G>{journalQ4}</G> JCR Q4), mostly as first author, in addition to <G>{bookCount}</G> book chapters and <G>{conferenceCount}</G> international conference contributions, maintaining a strong commitment to <span className="font-semibold">Open Science</span> principles. In <G>2024</G>, I was named a <span className="font-semibold">Young Scholar by the US Marconi Society</span>, which recognizes top engineers and researchers in information and communication technologies, becoming the <span className="font-semibold">first Spanish researcher</span> to receive this distinction.
        </span>
        <br /><br />
        <span>
          During this period, I participated in a total of <G>{totalProjects}</G> research projects, <G>{competitiveProjects}</G> funded by <span className="font-semibold">European, national, and regional programs</span>, and <G>{privateProjects}</G> through <span className="font-semibold">private contracts</span>. From these projects I was the <span className="font-semibold">principal investigator</span> in <G>{piCompetitiveProjects}</G> competitive projects and <G>{piPrivateProjects}</G> private contracts, including the European project <span className="font-semibold">Smarty</span>, focused on AI at the edge, the project <span className="font-semibold">Cybertutor</span> on integrating generative AI in education, and the project <span className="font-semibold">Sostenibilidad Generativa</span>, focused on AI and sustainability. Additionally, I am the <span className="font-semibold">director of the ARANGO-UPM Chair</span>, dedicated to knowledge graphs for agent-based systems. Since <G>2024</G>, I have coordinated the <span className="font-semibold">Spanish Local Group on Artificial Intelligence of IEEE</span>.
        </span>
        <br /><br />
        <span>
          In the context of internationalization, I have an extensive <span className="font-semibold">collaboration network</span>, with most of my publications co-authored with researchers from other institutions and countries. I have completed over <G>{researchMonths}</G> months of <span className="font-semibold">research stays abroad</span>, including at the <span className="font-semibold">University of Edinburgh</span>, <span className="font-semibold">Ghent University</span>, and the <span className="font-semibold">University of Eastern Finland</span>. I have actively served as a <span className="font-semibold">reviewer</span> for <G>{reviewerJournalCount}</G> prestigious journals, <G>{reviewerBookCount}</G> books, and <G>{reviewerConferenceCount}</G> conferences such as <span className="font-semibold">ACM TIST</span> and <span className="font-semibold">IEEE TLT</span>, and I have contributed to <span className="font-semibold">open-source initiatives</span> and <span className="font-semibold">standardization organizations</span> such as <span className="font-semibold">FIWARE</span>, <span className="font-semibold">ETSI</span>, and <span className="font-semibold">W3C</span>, including preparing technical reports and defining standards such as <span className="font-semibold">DCAT</span>. I have also been invited to give <G>{invitedTalks}</G> talks at institutions such as <span className="font-semibold">Saint Louis University</span>, <span className="font-semibold">FECYT</span>, and the <span className="font-semibold">Instituto de Ingeniería de España</span>.
        </span>
        <br /><br />
        <span>
          One of the most important aspects of my contributions is their <span className="font-semibold">societal impact</span>. Therefore, my work focuses on <span className="font-semibold">replicability, openness, and technology transfer</span>. For example, work carried out during my early career resulted in <G>4</G> <span className="font-semibold">academic management applications</span> currently used at the Universidad Politécnica de Madrid. I also manage the <span className="font-semibold">Your Open Data portal</span>, developed as part of the European <span className="font-semibold">YODA project</span>, which demonstrated how the publication of open data can be automated while automatically ensuring <span className="font-semibold">FAIR principles</span>. Additionally, I have delivered <G>{externalCourses}</G> <span className="font-semibold">external courses</span>, including training for companies, organizations, and international workshops, among which are courses for companies and teachers on integrating AI into professional activities. Another key aspect is the <span className="font-semibold">dissemination</span> of my work, which has been featured in general media (<span className="font-semibold">Forbes</span>, <span className="font-semibold">El Confidencial</span>, etc.), interviews, and social media posts where I have an active presence. I have also published a <span className="font-semibold">popular science book</span> on using generative AI for non-technical audiences. Continuing education is another of my activities, having participated in <G>{moocCount}</G> <span className="font-semibold">MOOCs</span>, one of which I coordinated on an introduction to generative AI, reaching over <G>1000</G> students.
        </span>
        <br /><br />
        <span>
          In <span className="font-semibold">teaching</span>, I have delivered courses in both undergraduate and master's programs in <G>{totalSubjects}</G> subjects, coordinating <G>{coordinatedSubjects}</G> of them, related to <span className="font-semibold">Big Data, artificial intelligence, and cloud computing</span>, accumulating over <G>{totalTeachingHours}</G> teaching hours with average student evaluations above <G>9</G> out of <G>10</G>. I have also participated in <G>{totalInnovationProjects}</G> <span className="font-semibold">educational innovation projects</span>, coordinating <G>{coordinatedInnovationProjects}</G>, through which <G>18</G> student scholarships were generated. I have supervised <G>{supervisionStudents}</G> internship students and over <G>{bachelorTheses + masterTheses}</G> final degree projects (<G>{bachelorTheses}</G> BSc Thesis, <G>{masterTheses}</G> MSc Thesis), including <G>{phdStudents}</G> PhD student{phdStudents !== 1 ? 's' : ''} (on going). As <span className="font-semibold">director of the ARANGO-UPM Chair</span>, I have led a team of more than <G>10</G> members, including engineers, researchers, and students. Over the years, I have complemented my training as a researcher, engineer, and teacher by completing more than <G>30</G> courses and specializations, including the <G>500</G>-hour <span className="font-semibold">University Teaching Training Program</span>.
        </span>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm font-medium hover:underline"
        style={{ color: "#2ecfba" }}
      >
        {expanded ? "Read less ↑" : "Read more ↓"}
      </button>
    </div>
  );
}
