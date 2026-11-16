import { normalizeSearchText } from "./normalizeSearch";
import { tagTest } from "./tags";

/**
 * One query language for every search box of the site (nav search, dashboard, co-author network):
 *
 *   words            all of them must appear                 llm benchmark
 *   "exact text"     the text exactly as written, anywhere   "escape room"   (also after a field: inst:"carlos iii")
 *   AND  OR  NOT     with parentheses and the usual order of operations: NOT binds first,
 *                    then AND, then OR. A space is an AND; "-x" / "!x" is NOT x; "|" is OR, "&" is AND.
 *                    (jcr:q1 OR sjr:q1) AND year>2023 AND NOT llm
 *   type:  jcr:  sjr:  core:   publication type / quartile / CORE rank ("none" = unranked)
 *   year>2023  year:2024       also >=, <, <=
 *   person:  (= author:)       a person: authors of a paper, a student, a co-author...   person:reviriego
 *   inst:  country:            affiliation of a co-author (co-author network)
 *   topic:  keyword: (= kw:)   topic / keyword of a paper or a project   topic:data   keyword:llm   topic:"artificial intelligence"
 *   project:                   only projects, by any word of theirs   project:fiware   project:"digital twin"
 *   h>10  papers>3  cit>50     h-index, shared papers, citations (co-author network)
 *   project:competitive  project:private  call:  pi:yes    project type / call type / only projects where I am PI
 *
 * A term that makes no sense for what is being filtered (jcr:q1 on an award, h>10 on a project)
 * is ignored there instead of hiding it.
 *
 * The filter chips of the dashboard are just another way of writing part of the query:
 * see chipsFromQuery / setChips at the bottom.
 */
export const SEARCH_PLACEHOLDER =
  'Search: words, "exact text", (a OR b) AND c, NOT d, person:reviriego, project:fiware, topic:data, keyword:llm, type:journal, jcr:q1, sjr:q1, year>2023, inst:oxford, country:spain, h>10';

export type Term =
  | { kind: "text"; value: string }
  | { kind: "field"; field: "type" | "jcr" | "sjr" | "core" | "author" | "inst" | "country" | "project" | "call" | "pi" | "topic" | "keyword"; value: string }
  | { kind: "num"; field: "year" | "h" | "papers" | "cit"; op: string; n: number };

export type Node =
  | { op: "term"; term: Term }
  | { op: "not"; item: Node }
  | { op: "and" | "or"; items: Node[] };

const FIELD_ALIASES: Record<string, string> = {
  type: "type", tipo: "type",
  jcr: "jcr", sjr: "sjr", core: "core",
  author: "author", autor: "author", name: "author", person: "author", persona: "author",
  inst: "inst", institution: "inst",
  country: "country", pais: "country",
  project: "project", proyecto: "project",
  topic: "topic", topics: "topic", area: "topic", tema: "topic",
  keyword: "keyword", keywords: "keyword", kw: "keyword", tag: "keyword",
  call: "call", scope: "call",
  pi: "pi", ip: "pi",
  year: "year", y: "year",
  h: "h", hindex: "h",
  papers: "papers", p: "papers",
  cit: "cit", cites: "cit", citations: "cit", citas: "cit",
};
const NUM_FIELDS = new Set(["year", "h", "papers", "cit"]);

/* ---------- tokens ---------- */

/** Raw tokens, as typed: parentheses, operators and terms (a quoted value stays in one token). */
export function tokenize(query: string): string[] {
  return query.match(/[-!](?=\()|[-!]?(?:[^\s():"]+:)?"[^"]*"?|[()]|\|\||&&|[|&]|[^\s()|&]+/g) || [];
}

type TokKind = "(" | ")" | "or" | "and" | "not" | "term";
function kindOf(tok: string): TokKind {
  const t = tok.toLowerCase();
  if (t === "(" || t === ")") return t;
  if (t === "or" || t === "|" || t === "||") return "or";
  if (t === "and" || t === "&" || t === "&&") return "and";
  if (t === "not" || t === "-" || t === "!") return "not";
  return "term";
}

/** One term token -> its meaning (`neg` for the "-x" / "!x" shorthand). */
export function parseTerm(raw: string): { neg: boolean; term: Term } | null {
  const norm = normalizeSearchText(raw);
  const neg = norm.length > 1 && (norm[0] === "-" || norm[0] === "!");
  const tok = neg ? norm.slice(1) : norm;
  const unquote = (s: string) => s.replace(/"/g, "").trim();
  const num = tok.match(/^([a-z]+)(>=|<=|>|<|=|:)(\d+)$/);
  const fld = tok.match(/^([a-z]+):(.+)$/);
  if (num && NUM_FIELDS.has(FIELD_ALIASES[num[1]])) {
    return { neg, term: { kind: "num", field: FIELD_ALIASES[num[1]] as "year", op: num[2] === ":" ? "=" : num[2], n: parseInt(num[3], 10) } };
  }
  if (fld && FIELD_ALIASES[fld[1]] && !NUM_FIELDS.has(FIELD_ALIASES[fld[1]]) && unquote(fld[2])) {
    return { neg, term: { kind: "field", field: FIELD_ALIASES[fld[1]] as "type", value: unquote(fld[2]) } };
  }
  return unquote(tok) ? { neg, term: { kind: "text", value: unquote(tok) } } : null;
}

/* ---------- parser: NOT > AND (explicit or a space) > OR, parentheses group ---------- */

function parseTokens(tokens: string[]): Node | null {
  let i = 0;
  const peek = () => (i < tokens.length ? kindOf(tokens[i]) : null);

  const unary = (): Node | null => {
    const k = peek();
    if (k === "not") {
      i++;
      const item = unary();
      return item ? { op: "not", item } : null;
    }
    if (k === "(") {
      i++;
      const inner = or();
      if (peek() === ")") i++;
      return inner;
    }
    if (k === "term") {
      const parsed = parseTerm(tokens[i++]);
      if (!parsed) return null;
      const node: Node = { op: "term", term: parsed.term };
      return parsed.neg ? { op: "not", item: node } : node;
    }
    return null;
  };
  const and = (): Node | null => {
    const items: Node[] = [];
    for (;;) {
      const k = peek();
      if (k === null || k === ")" || k === "or") break;
      if (k === "and") {
        i++;
        continue;
      }
      const before = i;
      const n = unary();
      if (n) items.push(n);
      if (i === before) i++; // never loop on a token that could not be read
    }
    return items.length === 0 ? null : items.length === 1 ? items[0] : { op: "and", items };
  };
  const or = (): Node | null => {
    const items: Node[] = [];
    for (;;) {
      const n = and();
      if (n) items.push(n);
      if (peek() === "or") {
        i++;
        continue;
      }
      break;
    }
    return items.length === 0 ? null : items.length === 1 ? items[0] : { op: "or", items };
  };

  const items: Node[] = [];
  while (i < tokens.length) {
    const n = or();
    if (n) items.push(n);
    if (peek() === ")") i++; // stray closing parenthesis
  }
  return items.length === 0 ? null : items.length === 1 ? items[0] : { op: "and", items };
}

/** The query as a tree; null when it is blank. */
export const parseQuery = (query: string): Node | null => parseTokens(tokenize(query));

export const compare = (v: number, op: string, n: number): boolean =>
  op === ">" ? v > n : op === "<" ? v < n : op === ">=" ? v >= n : op === "<=" ? v <= n : v === n;

/**
 * Evaluates the tree. `test` answers each term with true / false, or null when the term does not
 * apply to the thing being filtered: such terms are left out of the AND / OR they sit in.
 */
function evalNode(node: Node, test: (t: Term) => boolean | null): boolean | null {
  if (node.op === "term") return test(node.term);
  if (node.op === "not") {
    const r = evalNode(node.item, test);
    return r === null ? null : !r;
  }
  const rs = node.items.map((n) => evalNode(n, test)).filter((r): r is boolean => r !== null);
  if (rs.length === 0) return null;
  return node.op === "and" ? rs.every(Boolean) : rs.some(Boolean);
}
export const matches = (node: Node, test: (t: Term) => boolean | null): boolean => evalNode(node, test) !== false;

/* ---------- publication fields, shared by the main page and the co-author network ---------- */

const isQuartile = (s: string) => /^q[1-4]$/.test(s);
export function paperFieldTest(field: "type" | "jcr" | "sjr" | "core", value: string, p: { type?: string | null; jcr?: string | null; sjr?: string | null }): boolean {
  const type = normalizeSearchText(p.type || "");
  const jcr = normalizeSearchText(p.jcr || "");
  const sjr = normalizeSearchText(p.sjr || "");
  const none = value === "none" || value === "other";
  if (field === "type") return type.includes(value);
  if (field === "jcr") return none ? type === "journal" && !isQuartile(jcr) : jcr.includes(value);
  if (field === "sjr") return none ? type === "journal" && !isQuartile(sjr) : sjr.includes(value);
  return none ? type === "conference" && !jcr.startsWith("core") : jcr === `core ${value}`;
}

export interface SearchAttrs {
  pub?: boolean; // the item is a publication: type / jcr / sjr / core apply to it
  project?: boolean; // the item is a project: project:<words> looks at it
  type?: string | null;
  jcr?: string | null;
  sjr?: string | null;
  yearStart?: number | null;
  yearEnd?: number | null;
}

/** Matcher for the items of the main page (already-normalized search text + a few attributes). */
export function compileTextQuery(query: string, tagsOnly = false): ((text: string, attrs?: SearchAttrs) => boolean) | null {
  const ast = parseQuery(query);
  if (!ast) return null;
  return (text, attrs) =>
    matches(ast, (t) => {
      if (t.kind === "field" && (t.field === "topic" || t.field === "keyword")) {
        const r = tagTest(text, t.field === "topic" ? "topic" : "kw", t.value);
        return r === null && (attrs?.pub || attrs?.project) ? false : r; // papers and projects without that tag are out
      }
      if (tagsOnly) return null;
      if (t.kind === "text") return text.includes(t.value);
      if (t.kind === "field") {
        if (t.field === "author") return text.includes(t.value);
        if (t.field === "type" || t.field === "jcr" || t.field === "sjr" || t.field === "core") {
          return attrs?.pub ? paperFieldTest(t.field, t.value, attrs) : null;
        }
        // project:<words> keeps only the projects that contain them (competitive / private act through the chips)
        if (t.field === "project" && t.value !== "competitive" && t.value !== "private") return !!attrs?.project && text.includes(t.value);
        return null; // inst: / country: are for co-authors; call: / pi: act through the chips
      }
      if (t.field === "year") {
        const s = attrs?.yearStart;
        const e = attrs?.yearEnd ?? s;
        if (s == null || e == null) return null;
        return t.op === "=" ? s <= t.n && t.n <= e : t.op === ">" || t.op === ">=" ? compare(e, t.op, t.n) : compare(s, t.op, t.n);
      }
      return null; // h / papers / cit
    });
}

/** Only the topic: / keyword: terms of the query, for data that carries tags but no other text (project charts). */
export const compileTagQuery = (query: string) => compileTextQuery(query, true);

/* ---------- query text <-> filter chips ---------- */

export type ChipFamily = "years" | "papers" | "projects" | "pi" | "topics" | "keywords";
export interface ChipState {
  years: string[]; // "2024"
  papers: string[]; // "Journal", "Q1", "JCR-Other", "SJR-Q1", "CORE A*", "CORE-Other"...
  projects: string[]; // "Competitive", "Private" or a (normalized) call type
  pi: boolean;
  topics: string[]; // normalized topic names
  keywords: string[]; // normalized keywords
}

const CORE_CHIPS = ["CORE A*", "CORE A", "CORE B", "CORE C", "CORE Multiconference"];

function termChip(t: Term): { family: ChipFamily; value: string } | null {
  if (t.kind === "num") return t.field === "year" && t.op === "=" ? { family: "years", value: String(t.n) } : null;
  if (t.kind !== "field") return null;
  const none = t.value === "none" || t.value === "other";
  if (t.field === "type") {
    const v = ["Journal", "Conference", "Book"].find((x) => x.toLowerCase() === t.value);
    return v ? { family: "papers", value: v } : null;
  }
  if (t.field === "jcr") return none ? { family: "papers", value: "JCR-Other" } : isQuartile(t.value) ? { family: "papers", value: t.value.toUpperCase() } : null;
  if (t.field === "sjr") return none ? { family: "papers", value: "SJR-Other" } : isQuartile(t.value) ? { family: "papers", value: `SJR-${t.value.toUpperCase()}` } : null;
  if (t.field === "core") {
    if (none) return { family: "papers", value: "CORE-Other" };
    const v = CORE_CHIPS.find((x) => x.toLowerCase() === `core ${t.value}`);
    return v ? { family: "papers", value: v } : null;
  }
  if (t.field === "project") {
    const v = ["Competitive", "Private"].find((x) => x.toLowerCase() === t.value);
    return v ? { family: "projects", value: v } : null;
  }
  if (t.field === "call") return { family: "projects", value: t.value };
  if (t.field === "topic") return { family: "topics", value: t.value };
  if (t.field === "keyword") return { family: "keywords", value: t.value };
  if (t.field === "pi") return ["yes", "si", "true", "1"].includes(t.value) ? { family: "pi", value: "yes" } : null;
  return null;
}

const quoted = (v: string) => (/[\s()|&]/.test(v) ? `"${v}"` : v);
function chipTerm(family: ChipFamily, value: string): string {
  if (family === "years") return `year:${value}`;
  if (family === "pi") return "pi:yes";
  if (family === "topics") return `topic:${quoted(normalizeSearchText(value))}`;
  if (family === "keywords") return `keyword:${quoted(normalizeSearchText(value))}`;
  if (family === "projects") return value === "Competitive" || value === "Private" ? `project:${value.toLowerCase()}` : `call:${quoted(normalizeSearchText(value))}`;
  if (["Journal", "Conference", "Book"].includes(value)) return `type:${value.toLowerCase()}`;
  if (value === "JCR-Other") return "jcr:none";
  if (value === "SJR-Other") return "sjr:none";
  if (value === "CORE-Other") return "core:none";
  if (value.startsWith("SJR-")) return `sjr:${value.slice(4).toLowerCase()}`;
  if (value.startsWith("CORE ")) return `core:${quoted(value.slice(5).toLowerCase())}`;
  return `jcr:${value.toLowerCase()}`;
}

const joinTokens = (tokens: string[]) => tokens.join(" ").replace(/\( /g, "(").replace(/ \)/g, ")");

interface Conjunct {
  text: string;
  family: ChipFamily | null;
  values: string[];
  hasOr: boolean;
}

/** The parts of the query that are AND-ed at the top level; each may be exactly one chip group. */
function conjuncts(query: string): Conjunct[] {
  const tokens = tokenize(query);
  const groups: string[][] = [];
  let depth = 0;
  let topOr = false;
  for (const t of tokens) {
    const k = kindOf(t);
    if (k === "(") depth++;
    else if (k === ")") depth = Math.max(0, depth - 1);
    else if (k === "or" && depth === 0) topOr = true;
  }
  if (topOr) groups.push(tokens);
  else {
    let cur: string[] = [];
    depth = 0;
    for (const t of tokens) {
      const k = kindOf(t);
      if (depth === 0 && k === "and") continue;
      cur.push(t);
      if (k === "(") depth++;
      else if (k === ")") depth = Math.max(0, depth - 1);
      if (depth === 0 && k !== "not") {
        groups.push(cur);
        cur = [];
      }
    }
    if (cur.length) groups.push(cur);
  }
  return groups
    .filter((g) => g.length > 0)
    .map((g) => {
      const node = parseTokens(g);
      const terms = !node ? [] : node.op === "term" ? [node] : node.op === "or" && node.items.every((n) => n.op === "term") ? node.items : [];
      const chips = terms.map((n) => (n.op === "term" ? termChip(n.term) : null));
      const family = chips.length > 0 && chips.every((c) => c && c.family === chips[0]!.family) ? chips[0]!.family : null;
      return { text: joinTokens(g), family, values: family ? [...new Set(chips.map((c) => c!.value))] : [], hasOr: topOr };
    });
}

/** Which chips the query lights up. A family split over several AND-ed groups is not a chip selection. */
export function chipsFromQuery(query: string): ChipState {
  const cs = conjuncts(query);
  const of = (family: ChipFamily) => {
    const found = cs.filter((c) => c.family === family);
    return found.length === 1 ? found[0].values : [];
  };
  return { years: of("years"), papers: of("papers"), projects: of("projects"), pi: cs.some((c) => c.family === "pi"), topics: of("topics"), keywords: of("keywords") };
}

/** The query with one chip family set to `values` (OR-ed in one group), everything else untouched. */
export function setChips(query: string, family: ChipFamily, values: string[]): string {
  const group = values.length === 0 ? "" : values.length === 1 ? chipTerm(family, values[0]) : `(${values.map((v) => chipTerm(family, v)).join(" OR ")})`;
  const cs = conjuncts(query);
  const parts: string[] = [];
  let placed = false;
  for (const c of cs) {
    if (c.family === family) {
      if (!placed && group) parts.push(group);
      placed = true;
    } else parts.push(c.hasOr ? `(${c.text})` : c.text);
  }
  if (!placed && group) parts.push(group);
  // a lone "a OR b" needs no parentheses
  if (parts.length === 1 && cs.length === 1 && cs[0].hasOr && cs[0].family !== family) return cs[0].text;
  return parts.join(" ");
}
