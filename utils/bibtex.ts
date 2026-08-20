import { Publication } from "@/data/publications";

const ENTRY_TYPE_BY_TYPE: Record<string, string> = {
  Journal: "article",
  Conference: "inproceedings",
  Book: "book",
};

function slugPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "");
}

function buildCiteKey(pub: Publication): string {
  const firstAuthor = pub.authors.split(/,|;/)[0] || pub.highlightAuthor;
  const surname = slugPart(firstAuthor.split(" ").pop() || "ref") || "ref";
  const firstTitleWord = slugPart((pub.title.match(/[A-Za-z0-9]+/) || ["ref"])[0]);
  return `${surname}${pub.year || ""}${firstTitleWord}`;
}

function formatAuthorsForBibtex(authors: string): string {
  return authors
    .split(/,|;/)
    .map((a) => a.trim())
    .filter(Boolean)
    .join(" and ");
}

export function publicationToBibtex(pub: Publication): string {
  const entryType = ENTRY_TYPE_BY_TYPE[pub.type] || "misc";
  const citeKey = buildCiteKey(pub);

  const fields: [string, string | undefined][] = [
    ["author", formatAuthorsForBibtex(pub.authors)],
    ["title", pub.title],
    entryType === "article"
      ? ["journal", pub.journal || undefined]
      : entryType === "inproceedings"
      ? ["booktitle", pub.journal || undefined]
      : ["publisher", pub.publisher || pub.journal || undefined],
    ["year", pub.year ? String(pub.year) : undefined],
    ["publisher", entryType !== "misc" && entryType !== "book" ? pub.publisher : undefined],
    ["address", pub.location],
    ["doi", pub.doi ? pub.doi.replace(/^https?:\/\/doi\.org\//, "") : undefined],
    ["note", pub.status],
  ];

  const seen = new Set<string>();
  const body = fields
    .filter(([key, value]) => {
      if (!value) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(([key, value]) => `  ${key} = {${value}}`)
    .join(",\n");

  return `@${entryType}{${citeKey},\n${body}\n}`;
}
