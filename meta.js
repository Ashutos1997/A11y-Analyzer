// ── meta.js — injected via files: (CSP-safe) ─────────────────
// Collects page metadata and sends it back to the popup.
// Runs in the extension's isolated world, not the page's world,
// so it is never blocked by the site's Content-Security-Policy.
(function () {
  const interactiveEls = document.querySelectorAll(
    "a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1']), [role='button'], [role='link']"
  );

  chrome.runtime.sendMessage({
    type: "META",
    data: {
      lang:        document.documentElement.getAttribute("lang"),
      interactive: interactiveEls.length,
      images:      document.querySelectorAll("img").length,
      headings:    document.querySelectorAll("h1,h2,h3,h4,h5,h6").length,
      viewport:    !!document.querySelector("meta[name='viewport']"),
    },
  });
})();
