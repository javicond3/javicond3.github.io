/**
 * Navigates to a hash anchor, first firing hashchange (so toggle components
 * can expand), then scrolling to the element after a short delay so that
 * React has time to re-render the expanded content.
 */
export function navigateToHash(href: string) {
  // Update the hash – this fires hashchange which expands the toggle
  window.location.hash = href;
  // Wait for the next paint so the section is rendered before scrolling
  setTimeout(() => {
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, 80);
}
