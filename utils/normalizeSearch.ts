const DIACRITICS_REGEX = /[\u0300-\u036f]/g;

export function normalizeSearchText(text: string): string {
  return text
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .toLowerCase()
    .trim();
}
