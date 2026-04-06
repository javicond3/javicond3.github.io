import { FaGithub, FaLinkedin, FaResearchgate, FaOrcid, FaXTwitter } from "react-icons/fa6";

function GoogleScholarIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M12 24a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm0-24L0 9.5l4.838 3.94A8 8 0 0 1 12 10a8 8 0 0 1 7.162 3.44L24 9.5 12 0z" />
    </svg>
  );
}

const links = [
  { label: "Google Scholar", href: "https://scholar.google.es/citations?user=2e_XTLcAAAAJ&hl", icon: <GoogleScholarIcon size={18} /> },
  { label: "ORCID",         href: "https://orcid.org/0000-0002-5304-0626",          icon: <FaOrcid size={18} /> },
  { label: "ResearchGate",  href: "https://www.researchgate.net/profile/Javier-Conde-4",   icon: <FaResearchgate size={18} /> },
  { label: "LinkedIn",      href: "https://www.linkedin.com/in/javier-conde-diaz/",       icon: <FaLinkedin size={18} /> },
  { label: "X",             href: "https://x.com/JaviConD3",              icon: <FaXTwitter size={18} /> },
  { label: "GitHub",        href: "https://github.com/javicond3",         icon: <FaGithub size={18} /> },
];

const now = new Date();
const copyright = `© ${now.toLocaleString("en-EU", { month: "short" })} ${now.getFullYear()}`;

export default function Footer() {
  return (
    <footer
      className="sticky bottom-0 z-40 py-2"
      style={{ backgroundColor: "#1c2d2d" }}
    >
      <div className="px-6 lg:px-24 flex items-center justify-between">
        {/* Copyright — bottom right */}
        <p className="text-[11px] text-gray-500 capitalize">{copyright}</p>
                {/* Social icons */}
        <div className="flex gap-4">
          {links.map(({ label, href, icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="text-gray-400 transition-colors hover:text-[#2ecfba]"
            >
              {icon}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
