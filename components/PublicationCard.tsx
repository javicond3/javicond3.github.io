"use client";

import { useState } from "react";
import { FaChevronDown, FaQuoteLeft } from "react-icons/fa";
import { Publication } from "@/data/publications";
import EntryBullet, { SelectableProps } from "./EntryBullet";
import CopyButton from "./CopyButton";
import { publicationToBibtex } from "@/utils/bibtex";
import { originalLinkMeta, openAccessLinkMeta, dataRepoLinkMeta, diffusionLinkMeta, LinkMeta } from "@/utils/linkIcons";

interface Props {
  publication: Publication;
  selectable?: SelectableProps;
}

function LinkIcon({ url, meta }: { url: string; meta: LinkMeta }) {
  const Icon = meta.icon;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={meta.label}
      aria-label={meta.label}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center justify-center w-5 h-5 rounded-md border text-gray-500 hover:text-white transition-colors"
      style={{ borderColor: "#d1d5db" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = "#2ecfba";
        (e.currentTarget as HTMLElement).style.borderColor = "#2ecfba";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
        (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db";
      }}
    >
      <Icon size={12} />
    </a>
  );
}

function LinkListRow({ title, links, meta }: { title: string; links: string[]; meta: (url: string) => LinkMeta }) {
  if (!links || links.length === 0) return null;
  return (
    <div className="flex items-start gap-2 flex-wrap">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 mt-1">{title}</span>
      <div className="flex items-center gap-2 flex-wrap">
        {links.map((url, i) => {
          const m = meta(url);
          return (
            <a
              key={`${url}-${i}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title={m.recognized ? m.label : undefined}
              aria-label={m.label}
              className={`inline-flex items-center gap-1.5 rounded-md border text-xs text-gray-600 hover:text-white hover:border-transparent transition-colors ${
                m.recognized ? "justify-center w-7 h-7" : "px-2 py-1"
              }`}
              style={{ borderColor: "#d1d5db" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "#2ecfba")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")}
            >
              <m.icon size={12} />
              {!m.recognized && m.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}

function formatAuthors(authors: string, highlight: string) {
  const parts = authors.split(highlight);
  if (parts.length === 1) return <span>{authors}</span>;
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && <strong>{highlight}</strong>}
        </span>
      ))}
    </>
  );
}

export default function PublicationCard({ publication, selectable }: Props) {
  const [open, setOpen] = useState(false);

  const originalUrl = publication.doi
    ? (publication.doi.startsWith('http') ? publication.doi : `https://doi.org/${publication.doi}`)
    : undefined;
  const diffusionLinks = publication.diffusion || [];
  const dataRepoLinks = publication.dataRepos || [];
  const openAccessUrls = Array.from(
    new Set([...(publication.openAccess || []), ...(publication.upmRepo ? [publication.upmRepo] : [])])
  ).filter((url) => url !== originalUrl);
  const hasSourceIcons = !!originalUrl || openAccessUrls.length > 0;

  const hasDetails =
    !!publication.abstract ||
    (publication.keywords && publication.keywords.length > 0) ||
    diffusionLinks.length > 0 ||
    dataRepoLinks.length > 0;

  const copyText = [
    `“${publication.title}”.`,
    `(${publication.year}).`,
    `${publication.authors}.`,
    publication.journal && `${publication.journal}${publication.status ? ` (${publication.status})` : ''}${publication.location ? `, ${publication.location}` : ''}${publication.type === 'Preprint' ? ' [Preprint]' : ''}.`,
    publication.doi && `doi: ${publication.doi.startsWith('http') ? publication.doi : `https://doi.org/${publication.doi}`}.`,
    publication.jcr && `(${publication.type === 'Conference' ? '' : 'JCR '}${publication.jcr}).`,
  ].filter(Boolean).join(' ');

  return (
    <div className="flex gap-0 items-start group">
      <EntryBullet selectable={selectable} />
      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Citation line */}
        <p className="text-[0.95rem] leading-snug text-gray-800">
          <span>“{publication.title}”.</span>{" "}
          ({publication.year}).{" "}
          {formatAuthors(publication.authors, publication.highlightAuthor)}.{" "}
          <em>{publication.journal}</em>
          {publication.status && (
            <span className="text-gray-500"> ({publication.status})</span>
          )}
          {publication.location && (
            <span className="text-gray-600">, {publication.location}</span>
          )}
          {publication.type && publication.type === "Preprint" && (
            <span className="text-gray-600 italic">[{publication.type}]</span>
          )}
          {publication.doi && (
            <>
              {". doi: "}
              <a
                href={publication.doi.startsWith('http') ? publication.doi : `https://doi.org/${publication.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline break-all" style={{ color: '#2ecfba' }}
              >
                {publication.doi}
              </a>
              {"."}
            </>
          )}
          {publication.jcr && (
            <span className="text-gray-600"> ({publication.type === 'Conference' ? '' : 'JCR '}{publication.jcr}).</span>
          )}
          {publication.citations !== undefined && (
            <span
              className="inline-flex items-center gap-1 ml-2 text-xs text-gray-500 align-middle"
              title="Citations (Google Scholar, including self-citations)"
            >
              <FaQuoteLeft size={9} />
              {publication.citations}
            </span>
          )}
          <CopyButton text={copyText} />
          <CopyButton text={publicationToBibtex(publication)} label=".bib" />
          {hasSourceIcons && (
            <span className="inline-flex items-center gap-1.5 ml-2 align-middle">
              {originalUrl && <LinkIcon url={originalUrl} meta={originalLinkMeta()} />}
              {openAccessUrls.map((url, i) => (
                <LinkIcon key={`${url}-${i}`} url={url} meta={openAccessLinkMeta(url)} />
              ))}
            </span>
          )}
          {hasDetails && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? "Hide details" : "Show details"}
              className="inline-flex align-middle items-center justify-center w-5 h-5 rounded-md border ml-1 text-gray-500 hover:text-white transition-colors"
              style={{ borderColor: "#d1d5db" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "#2ecfba";
                (e.currentTarget as HTMLElement).style.borderColor = "#2ecfba";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db";
              }}
            >
              <FaChevronDown size={9} className={`transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
          )}
        </p>

        {/* Expanded details */}
        {open && (
          <div className="mt-3 space-y-3">
            {publication.abstract && (
              <p className="text-sm leading-relaxed text-gray-700 text-justify">
                {publication.abstract}
              </p>
            )}
            <LinkListRow title="Diffusion" links={diffusionLinks} meta={diffusionLinkMeta} />
            <LinkListRow title="Data & Code" links={dataRepoLinks} meta={dataRepoLinkMeta} />
            {/* Keywords */}
            {publication.keywords && publication.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {publication.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="px-3 py-1 rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: "#1c2d2d" }}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
