"use client";

import { useState } from "react";
import { Publication } from "@/data/publications";

interface Props {
  publication: Publication;
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

export default function PublicationCard({ publication }: Props) {
  const [open, setOpen] = useState(false);
  const hasDetails = !!publication.abstract || (publication.keywords && publication.keywords.length > 0);

  return (
    <div className="flex gap-0 items-start">
      {/* Bullet */}
      <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full ml-4 mr-2" style={{ backgroundColor: '#2ecfba', marginTop: '5.5px' }} />
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
            </>
          )}
          {publication.jcr && (
            <span className="text-gray-600"> ({publication.type === 'Conference' ? '' : 'JCR '}{publication.jcr}).</span>
          )}
        </p>

        {/* Expanded abstract */}
        {open && (
          <div className="mt-3 space-y-1">
            {publication.abstract && (
              <p className="text-sm leading-relaxed text-gray-700 text-justify">
                {publication.abstract}
              </p>
            )}
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
