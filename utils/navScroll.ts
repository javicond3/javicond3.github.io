/**
 * Navigates to a hash anchor, first firing hashchange (so toggle components
 * can expand), then scrolling to the element after a short delay so that
 * React has time to re-render the expanded content.
 */
export function navigateToHash(href: string) {
  // The sections only exist on the home page: from any other page (/network, /admin)
  // go there first; the browser then scrolls to the anchor on load.
  const path = window.location.pathname.replace(/\/+$/, "");
  if (path !== "") {
    window.location.assign("/" + href);
    return;
  }
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
