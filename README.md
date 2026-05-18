# A11y Analyzer — Chrome Extension (MVP)

Analyzes any webpage for ARIA and keyboard accessibility issues.
Designed for designers and developers.

## Screenshots

<table style="table-layout: fixed; width: 100%;">
  <thead>
    <tr>
      <th align="center" style="width: 33.33%;">Screen 1: Dashboard</th>
      <th align="center" style="width: 33.33%;">Screen 2: Scanning</th>
      <th align="center" style="width: 33.33%;">Screen 3: Results</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td valign="top" align="center" style="width: 33.33%;">
        <img src="images/screen1_v2.png" width="100%" style="max-width: 220px; display: block;" alt="Screen 1: Dashboard" />
      </td>
      <td valign="top" align="center" style="width: 33.33%;">
        <img src="images/screen2_v2.png" width="100%" style="max-width: 220px; display: block;" alt="Screen 2: Scanning" />
      </td>
      <td valign="top" align="center" style="width: 33.33%;">
        <img src="images/screen3_v2.png" width="100%" style="max-width: 220px; display: block;" alt="Screen 3: Results" />
      </td>
    </tr>
  </tbody>
</table>

### Generated HTML Report

<p align="center">
  <img src="images/report_v2.png" width="700" alt="Generated HTML Report Screenshot" />
</p>

---

## Setup

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this folder (`a11y-extension/`)
5. The extension icon will appear in your toolbar

---

## How to use

1. Open any website you want to audit
2. Click the A11y Analyzer icon in the toolbar
3. Screen 1 shows basic page info — click **Run Audit**
4. The plugin scrolls the page while analyzing
5. Screen 3 shows a summary with category scores
6. Click **Download Report** to save an HTML report

Open the downloaded `.html` file in any browser.  
To export as PDF: open it → Ctrl+P → Save as PDF.

---

## What it checks

| Category       | Weight | What's analyzed |
|----------------|--------|-----------------|
| Keyboard Nav   | 20%    | tabindex order, skip links, focus indicators, clickable-div traps |
| ARIA           | 20%    | role validity, required attributes, aria-hidden misuse, missing names |
| Landmarks      | 15%    | main, nav, header, footer presence and labeling |
| Forms          | 15%    | label associations, aria-required, fieldset grouping |
| Images         | 15%    | alt attributes, empty vs descriptive alt, SVG labels |
| Headings       | 10%    | h1 presence, heading hierarchy, skipped levels |
| Links/Buttons  | 5%     | generic text, empty links, new-tab disclosure |

---

## Scores

| Range | Grade |
|-------|-------|
| 90–100 | Excellent |
| 75–89  | Good |
| 55–74  | Needs Work |
| 0–54   | Poor |

---

## Notes

- Analysis is heuristic-based. Always supplement with manual testing.
- Test with real screen readers: NVDA/JAWS (Windows), VoiceOver (macOS/iOS).
- Run a dedicated contrast checker (e.g. Colour Contrast Analyser) for color issues.
- This tool does not follow links — it audits the current page only (MVP).

---

## File structure

```
a11y-extension/
├── manifest.json      Chrome extension manifest (MV3)
├── popup.html         Main HTML popup scaffolding (All 3 screens)
├── popup.css          Core application styling (Alabaster, Sand & Indigo)
├── animation.css      Screen 2 high-fidelity scanning animation styles
├── popup.js           Popup state controller & offline HTML report generator
├── content.js         Page analyzer injection engine (14 categorical checks)
├── meta.js            Metadata & helper configurations
├── .gitignore         Git ignore rule configurations
├── README.md          Walkthrough, installation & audit documentation
├── icons/             Extension icon assets
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── images/            Walkthrough & report screenshots for README
│   ├── screen1_v2.png
│   ├── screen2_v2.png
│   ├── screen3_v2.png
│   └── report_v2.png
├── phosphor/          Offline Phosphor icon fonts & stylesheet
│   ├── style.css
│   ├── Phosphor.ttf
│   ├── Phosphor.woff
│   └── Phosphor.woff2
└── design-auditor/    Design Auditor skill file & guidelines
    └── SKILL.md
```
