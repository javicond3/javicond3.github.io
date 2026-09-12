import { IconType } from "react-icons";
import {
  FaUniversity,
  FaFlask,
  FaBookOpen,
  FaDatabase,
  FaNewspaper,
  FaLinkedin,
  FaExternalLinkAlt,
} from "react-icons/fa";
import { SiArxiv, SiResearchgate, SiDoi, SiZenodo, SiGithub, SiX, SiOrcid } from "react-icons/si";

export interface LinkMeta {
  icon: IconType;
  label: string;
  /** true when the icon alone is recognizable enough that the label can be hidden */
  recognized?: boolean;
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function baseClassify(url: string): LinkMeta | null {
  const host = hostname(url);
  if (host.includes("arxiv.org")) return { icon: SiArxiv, label: "arXiv", recognized: true };
  if (host.includes("techrxiv.org")) return { icon: FaFlask, label: "TechRxiv" };
  if (host.includes("oa.upm.es")) return { icon: FaUniversity, label: "Archivo Digital UPM" };
  if (host.includes("researchgate.net")) return { icon: SiResearchgate, label: "ResearchGate", recognized: true };
  if (host.includes("mdpi.com")) return { icon: FaBookOpen, label: "MDPI" };
  if (host.includes("github.com")) return { icon: SiGithub, label: "GitHub", recognized: true };
  if (host.includes("zenodo.org") || url.includes("10.5281")) return { icon: SiZenodo, label: "Zenodo", recognized: true };
  if (host.includes("x.com") || host.includes("twitter.com")) return { icon: SiX, label: "X", recognized: true };
  if (host.includes("linkedin.com")) return { icon: FaLinkedin, label: "LinkedIn", recognized: true };
  if (host.includes("consorciomadrono.es") || host.includes("edatos")) return { icon: FaDatabase, label: "eDatos" };
  if (host.includes("doi.org")) return { icon: SiDoi, label: "DOI", recognized: true };
  return null;
}

/** Icon/label for the "original" paper link (the Link/DOI column). */
export function originalLinkMeta(): LinkMeta {
  return { icon: SiOrcid, label: "Original" };
}

/** Icon/label for a link from the "Open Access" (or UPM repo) column. */
export function openAccessLinkMeta(url: string): LinkMeta {
  return baseClassify(url) ?? { icon: FaExternalLinkAlt, label: "Open Access" };
}

/** Icon/label for a link from the "Datos/Repos" (data & code) column. */
export function dataRepoLinkMeta(url: string): LinkMeta {
  return baseClassify(url) ?? { icon: FaDatabase, label: hostname(url) };
}

/** Icon/label for a link from the "Noticias/Posts" (diffusion) column. */
export function diffusionLinkMeta(url: string): LinkMeta {
  return baseClassify(url) ?? { icon: FaNewspaper, label: hostname(url) };
}
