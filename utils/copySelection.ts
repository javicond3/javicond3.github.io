// Items picked with the "Add" / "Ref" buttons, to be copied together. Kept in memory only:
// reloading the page empties the selection.
function makeStore() {
  let items: string[] = [];
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  return {
    subscribe(l: () => void) {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    get: () => items,
    toggle(text: string) {
      items = items.includes(text) ? items.filter((t) => t !== text) : [...items, text];
      emit();
    },
    clear() {
      items = [];
      emit();
    },
  };
}

export const copySelection = makeStore(); // texts picked with "Add"
export const refSelection = makeStore(); // links picked with "Ref"

// What each picked link points to, to list them by name in the bottom bar.
export const refLabels = new Map<string, string>();

const EMPTY: string[] = [];
export const getServerSelection = () => EMPTY;

/** Stable short id for an item, derived from its text: the anchor of its shareable link. */
export function refId(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return `ref-${h.toString(36)}`;
}
