"use client";

import { useState } from "react";
import { FaChevronDown } from "react-icons/fa";
import EntryBullet, { SelectableProps } from "./EntryBullet";
import CopyButton from "./CopyButton";

interface ProjectLike {
  title: string;
  funder: string;
  scope: string;
  tipo: "Competitive" | "Private";
  startDate: Date | string | null;
  endDate: Date | string | null;
  money?: number;
  isIP: boolean;
  link?: string;
  convocatoria?: string;
}

function formatMonthYear(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatMoney(amount: number): string {
  return amount.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

export default function ProjectCard({ project, selectable }: { project: ProjectLike; selectable?: SelectableProps }) {
  const [open, setOpen] = useState(false);
  const hasDetails = !!project.convocatoria;

  const dateRange = [formatMonthYear(project.startDate), formatMonthYear(project.endDate)]
    .filter(Boolean)
    .join(' – ');

  const title = project.title.replace(/\.+$/, '');
  const funder = project.funder?.replace(/\.+$/, '') ?? '';
  const hasScope = project.tipo === 'Competitive' && !!project.scope;
  const copyText = [
    dateRange && `(${dateRange})`,
    title + (project.isIP ? ' [PI]' : ''),
    funder,
    hasScope && `${project.scope} project`,
    project.money != null && formatMoney(project.money),
  ].filter(Boolean).join('. ') + '.';

  return (
    <div className="flex gap-0 items-start group">
      <EntryBullet selectable={selectable} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[0.95rem] leading-snug text-gray-800">
          {dateRange && (
            <span className="text-gray-500">({dateRange}). </span>
          )}
          {(() => {
            const title = project.title.replace(/\.+$/, '');
            return project.link ? (
              <a
                href={project.link}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline"
                style={{ color: 'inherit' }}
              >
                {title}
              </a>
            ) : (
              <span className="font-semibold">{title}</span>
            );
          })()}
          {project.isIP && (
            <span className="ml-1 font-semibold" style={{ color: '#2ecfba' }}>[PI]</span>
          )}
          {(() => {
            const funder = project.funder?.replace(/\.+$/, '') ?? '';
            const hasScope = project.tipo === 'Competitive' && !!project.scope;
            const hasMoney = project.money != null;
            return (
              <>
                {funder && <span>. <em>{funder}</em></span>}
                {hasScope && <span style={{ color: '#2ecfba' }}>. {project.scope} project</span>}
                {hasMoney && <span style={{ color: '#2ecfba' }}>{hasScope ? ' - ' : '. '}{formatMoney(project.money!)}</span>}
                .
              </>
            );
          })()}
          <CopyButton text={copyText} />
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

        {open && project.convocatoria && (
          <div className="mt-2 space-y-1">
            <p className="text-sm leading-relaxed text-gray-700 text-justify">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 mr-1">Call:</span>
              {project.convocatoria}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
