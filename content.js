// ============================================================
// A11y Analyzer — Content Script (Analysis Engine)
// Injected into the active tab. Runs all checks, sends
// progress + results back to popup.js via chrome.runtime.
// ============================================================

(function () {
  "use strict";

  // ── Helpers ─────────────────────────────────────────────

  function getSelector(el) {
    if (!el) return "unknown";
    if (el.id) return `#${el.id}`;
    const tag = el.tagName.toLowerCase();
    const cls = [...el.classList].slice(0, 2).join(".");
    const text = el.textContent?.trim().slice(0, 30);
    if (cls) return `${tag}.${cls}`;
    if (text) return `${tag} "${text}"`;
    return tag;
  }

  function getHtmlSnippet(el) {
    if (!el) return "";
    try {
      if (el.children.length === 0) {
        const outer = el.outerHTML;
        return outer.length > 250 ? outer.slice(0, 247) + "..." : outer;
      }
      const clone = el.cloneNode(false);
      const outerEmpty = clone.outerHTML;
      const tagLower = el.tagName.toLowerCase();
      const closingTag = `</${tagLower}>`;
      if (outerEmpty.endsWith(closingTag)) {
        const openingTag = outerEmpty.substring(0, outerEmpty.length - closingTag.length);
        return `${openingTag}\n  <!-- ... nested children ... -->\n${closingTag}`;
      }
      return outerEmpty.length > 250 ? outerEmpty.slice(0, 247) + "..." : outerEmpty;
    } catch (_) {
      return el.tagName ? `<${el.tagName.toLowerCase()}>` : "";
    }
  }

  function getAccessibleName(el) {
    if (!el || isHiddenFromAT(el)) return null;
    if (el.getAttribute("aria-label")?.trim()) {
      return el.getAttribute("aria-label").trim();
    }
    const labelledby = el.getAttribute("aria-labelledby");
    if (labelledby) {
      const ids = labelledby.split(/\s+/);
      const parts = ids.map(id => document.getElementById(id)?.textContent?.trim()).filter(Boolean);
      if (parts.length > 0) return parts.join(" ");
    }
    
    // Title attribute
    if (el.getAttribute("title")?.trim()) {
      return el.getAttribute("title").trim();
    }
    
    // Alt attribute
    if (el.getAttribute("alt")?.trim()) {
      return el.getAttribute("alt").trim();
    }
    
    // Recursive Child Evaluation for nested graphics/elements
    let text = "";
    if (el.childNodes && el.childNodes.length > 0) {
      for (const child of el.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          text += child.textContent;
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          if (isHiddenFromAT(child)) continue;
          if (child.tagName.toLowerCase() === "img") {
            text += " " + (child.getAttribute("alt") || child.getAttribute("title") || "");
          } else if (child.tagName.toLowerCase() === "svg") {
            text += " " + (child.querySelector("title")?.textContent || child.getAttribute("aria-label") || "");
          } else {
            text += " " + getAccessibleName(child);
          }
        }
      }
    } else {
      text = el.textContent || "";
    }
    
    text = text.trim();
    if (text) return text;
    
    // Placeholder attribute (as fallback)
    if (el.getAttribute("placeholder")?.trim()) {
      return el.getAttribute("placeholder").trim();
    }
    return null;
  }

  function isFocusable(el) {
    if (el.disabled) return false;
    const tabindex = el.getAttribute("tabindex");
    if (tabindex !== null && parseInt(tabindex) < 0) return false;
    const nativelyFocusable = ["a[href]", "button", "input", "select", "textarea", "[tabindex]"];
    return nativelyFocusable.some((sel) => el.matches(sel));
  }

  function isHiddenFromAT(el) {
    let node = el;
    while (node && node !== document.body) {
      if (node.getAttribute("aria-hidden") === "true") return true;
      if (getComputedStyle(node).display === "none") return true;
      if (getComputedStyle(node).visibility === "hidden") return true;
      node = node.parentElement;
    }
    return false;
  }

  // ── Contrast Helpers ─────────────────────────────────────
  function getLuminance(r, g, b) {
    const a = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  function getContrastRatio(rgb1, rgb2) {
    const l1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
    const l2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  function isInViewport(el) {
    const rect = el.getBoundingClientRect();
    const vHeight = window.innerHeight || document.documentElement.clientHeight;
    const vWidth = window.innerWidth || document.documentElement.clientWidth;
    return (
      rect.top < vHeight &&
      rect.bottom > 0 &&
      rect.left < vWidth &&
      rect.right > 0 &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  function getPlaceholderColor(el) {
    const uniqueId = "placeholder-audit-" + Math.random().toString(36).slice(2, 9);
    el.setAttribute("data-placeholder-check", uniqueId);
    
    const style = document.createElement("style");
    style.textContent = `
      [data-placeholder-check="${uniqueId}"]::placeholder {
        content: "detect";
      }
      [data-placeholder-check="${uniqueId}"]::-webkit-input-placeholder {
        content: "detect";
      }
    `;
    document.head.appendChild(style);
    
    let color = null;
    try {
      const comp = window.getComputedStyle(el, "::placeholder");
      if (comp && comp.color) {
        color = comp.color;
      }
    } catch (_) {}
    
    style.remove();
    el.removeAttribute("data-placeholder-check");
    return color;
  }

  function getElementBgColor(el) {
    const path = [];
    let node = el;
    while (node) {
      path.push(node);
      node = node.parentElement;
    }
    
    let r = 255, g = 255, b = 255;
    
    for (let i = path.length - 1; i >= 0; i--) {
      const current = path[i];
      const style = getComputedStyle(current);
      const bg = style.backgroundColor;
      let opacity = parseFloat(style.opacity);
      if (isNaN(opacity)) opacity = 1.0;
      
      if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
        const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d?\.\d+|\d+))?/);
        if (match) {
          const layerR = parseInt(match[1], 10);
          const layerG = parseInt(match[2], 10);
          const layerB = parseInt(match[3], 10);
          const layerA = match[4] !== undefined ? parseFloat(match[4]) : 1.0;
          
          const alpha = layerA * opacity;
          
          if (alpha > 0) {
            r = Math.round(layerR * alpha + r * (1 - alpha));
            g = Math.round(layerG * alpha + g * (1 - alpha));
            b = Math.round(layerB * alpha + b * (1 - alpha));
          }
        }
      } else if (opacity < 1.0) {
        r = Math.round(r * opacity + 255 * (1 - opacity));
        g = Math.round(g * opacity + 255 * (1 - opacity));
        b = Math.round(b * opacity + 255 * (1 - opacity));
      }
    }
    return [r, g, b];
  }

  // ── Checks ───────────────────────────────────────────────

  // 1. Landmark Regions (weight 15)
  function checkLandmarks() {
    const issues = [];
    const landmarks = {
      main: document.querySelectorAll("main, [role='main']"),
      nav: document.querySelectorAll("nav, [role='navigation']"),
      header: document.querySelectorAll("header, [role='banner']"),
      footer: document.querySelectorAll("footer, [role='contentinfo']"),
      aside: document.querySelectorAll("aside, [role='complementary']"),
      section: document.querySelectorAll("section, [role='region']"),
    };

    let score = 100;
    let deductions = 0;

    if (landmarks.main.length === 0) {
      issues.push({ severity: "critical", message: "No <main> landmark found. Screen readers use this to skip directly to main content.", wcag: "1.3.6", element: "<body>", snippet: "<body>" });
      deductions += 30;
    }
    if (landmarks.main.length > 1) {
      issues.push({ severity: "warning", message: `Multiple <main> landmarks (${landmarks.main.length}) found. Only one main landmark should exist per page.`, wcag: "1.3.6", element: "main", snippet: "multiple main elements" });
      deductions += 10;
    }
    if (landmarks.nav.length === 0) {
      issues.push({ severity: "warning", message: "No <nav> landmark found. Navigation regions help keyboard users orient on the page.", wcag: "1.3.6", element: "<body>", snippet: "<body>" });
      deductions += 15;
    }
    if (landmarks.nav.length > 1) {
      landmarks.nav.forEach((nav) => {
        const label = nav.getAttribute("aria-label") || nav.getAttribute("aria-labelledby");
        if (!label) {
          issues.push({ severity: "warning", message: "Multiple <nav> elements found but not all are labeled. Add 'aria-label' or 'aria-labelledby' to distinguish them.", wcag: "1.3.6", element: getSelector(nav), snippet: getHtmlSnippet(nav) });
          deductions += 8;
        }
      });
    }
    if (landmarks.header.length === 0) {
      issues.push({ severity: "info", message: "No <header> (banner) landmark found. Landmark regions aid navigation.", wcag: "1.3.6", element: "<body>", snippet: "<body>" });
      deductions += 5;
    }
    if (landmarks.footer.length === 0) {
      issues.push({ severity: "info", message: "No <footer> (contentinfo) landmark found.", wcag: "1.3.6", element: "<body>", snippet: "<body>" });
      deductions += 5;
    }

    // Check for nested structural landmarks which confuse screen readers (e.g. main inside main)
    landmarks.main.forEach((main) => {
      if (main.querySelector("main, [role='main']")) {
        issues.push({ severity: "warning", message: "Nested <main> landmark detected. Landmark regions should not be nested within landmarks of the same type.", wcag: "1.3.6", element: getSelector(main), snippet: getHtmlSnippet(main) });
        deductions += 10;
      }
    });

    // Orphan Content Detector (WCAG 1.3.1)
    const contentElements = Array.from(document.querySelectorAll("p, table, ul, ol, h1, h2, h3, h4, h5, h6, article, [role='article']"));
    let orphanCount = 0;
    
    contentElements.forEach((el) => {
      if (isHiddenFromAT(el)) return;
      const text = el.textContent?.trim();
      if (!text || text.length < 5) return;
      
      const insideLandmark = el.closest("main, [role='main'], nav, [role='navigation'], header, [role='banner'], footer, [role='contentinfo'], aside, [role='complementary'], section, [role='region'], form, [role='form']");
      if (!insideLandmark) {
        orphanCount++;
        if (orphanCount <= 5) { // Cap at 5 issues to prevent spamming
          issues.push({ severity: "info", message: "Orphan content detected. Element is placed outside of any navigational landmark regions.", wcag: "1.3.1", element: getSelector(el), snippet: getHtmlSnippet(el) });
          deductions += 3;
        }
      }
    });

    score = Math.max(0, 100 - deductions);
    return { score, issues, found: { main: landmarks.main.length, nav: landmarks.nav.length, header: landmarks.header.length, footer: landmarks.footer.length, aside: landmarks.aside.length, section: landmarks.section.length } };
  }

  // 2. ARIA Attributes (weight 20)
  const VALID_ROLES = new Set(["alert","alertdialog","application","article","banner","button","cell","checkbox","columnheader","combobox","complementary","contentinfo","definition","dialog","directory","document","feed","figure","form","grid","gridcell","group","heading","img","link","list","listbox","listitem","log","main","marquee","math","menu","menubar","menuitem","menuitemcheckbox","menuitemradio","navigation","none","note","option","presentation","progressbar","radio","radiogroup","region","row","rowgroup","rowheader","scrollbar","search","searchbox","separator","slider","spinbutton","status","switch","tab","table","tablist","tabpanel","term","textbox","timer","toolbar","tooltip","tree","treegrid","treeitem"]);

  function checkARIA() {
    const issues = [];
    let score = 100;
    let deductions = 0;
    const counts = { invalidRoles: 0, missingNames: 0, hiddenFocusable: 0, missingRequired: 0, brokenReferences: 0, duplicateIds: 0 };

    // 1. Duplicate IDs
    const idMap = new Map();
    document.querySelectorAll("[id]").forEach((el) => {
      const id = el.getAttribute("id").trim();
      if (id) {
        if (idMap.has(id)) {
          idMap.get(id).push(el);
        } else {
          idMap.set(id, [el]);
        }
      }
    });
    for (const [id, els] of idMap.entries()) {
      if (els.length > 1) {
        counts.duplicateIds++;
        issues.push({ severity: "critical", message: `Duplicate ID "${id}" found in DOM. This breaks aria references and form labels.`, wcag: "4.1.1", element: `#${id} (${els.length} instances)`, snippet: getHtmlSnippet(els[0]) });
        deductions += 10;
      }
    }

    // 2. Invalid roles
    document.querySelectorAll("[role]").forEach((el) => {
      const roles = el.getAttribute("role").split(" ").map((r) => r.trim());
      roles.forEach((role) => {
        if (!VALID_ROLES.has(role)) {
          counts.invalidRoles++;
          issues.push({ severity: "critical", message: `Invalid ARIA role: "${role}"`, wcag: "4.1.2", element: getSelector(el), snippet: getHtmlSnippet(el) });
          deductions += 8;
        }
      });
    });

    // 3. aria-hidden on focusable elements
    document.querySelectorAll("[aria-hidden='true']").forEach((el) => {
      const focusable = el.querySelectorAll("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])");
      if (focusable.length > 0) {
        counts.hiddenFocusable++;
        issues.push({ severity: "critical", message: "aria-hidden='true' is set on an element containing focusable children. Sighted keyboard users can reach them but they are hidden from screen readers.", wcag: "1.3.1", element: getSelector(el), snippet: getHtmlSnippet(el) });
        deductions += 12;
      }
    });

    // 4. Interactive elements missing accessible names (excluding those in aria-hidden)
    document.querySelectorAll("button, a[href], [role='button'], [role='link']").forEach((el) => {
      if (isHiddenFromAT(el)) return;
      const name = getAccessibleName(el);
      if (!name || name.trim().length === 0) {
        counts.missingNames++;
        issues.push({ severity: "critical", message: `Interactive element has no accessible name. Screen readers will read the tag or filename.`, wcag: "4.1.2", element: getSelector(el), snippet: getHtmlSnippet(el) });
        deductions += 10;
      }
    });

    // 5. Broken ID references
    const refAttrs = ["aria-labelledby", "aria-describedby", "aria-controls", "aria-owns"];
    refAttrs.forEach((attr) => {
      document.querySelectorAll(`[${attr}]`).forEach((el) => {
        const val = el.getAttribute(attr).split(/\s+/);
        val.forEach((refId) => {
          if (refId && !document.getElementById(refId)) {
            counts.brokenReferences++;
            issues.push({ severity: "warning", message: `Attribute "${attr}" references non-existent ID "${refId}".`, wcag: "1.3.1", element: getSelector(el), snippet: getHtmlSnippet(el) });
            deductions += 6;
          }
        });
      });
    });

    // 6. Typo check in ARIA attribute names
    document.querySelectorAll("*").forEach(el => {
      for (let i = 0; i < el.attributes.length; i++) {
        const name = el.attributes[i].name;
        if (name.startsWith("aria-")) {
          if (name === "aria-labeledby") {
            issues.push({ severity: "critical", message: "Typo found in aria attribute: did you mean 'aria-labelledby' with two 'l's?", wcag: "4.1.2", element: getSelector(el), snippet: getHtmlSnippet(el) });
            deductions += 8;
          }
        }
      }
    });

    // 7. aria-required roles missing required attributes
    const roleRequirements = {
      checkbox: ["aria-checked"],
      radio: ["aria-checked"],
      slider: ["aria-valuenow", "aria-valuemin", "aria-valuemax"],
      scrollbar: ["aria-valuenow", "aria-valuemin", "aria-valuemax"],
      combobox: ["aria-expanded"],
    };
    document.querySelectorAll("[role]").forEach((el) => {
      const role = el.getAttribute("role");
      const required = roleRequirements[role];
      if (required) {
        required.forEach((attr) => {
          if (!el.hasAttribute(attr)) {
            counts.missingRequired++;
            issues.push({ severity: "warning", message: `Role "${role}" is missing required attribute "${attr}".`, wcag: "4.1.2", element: getSelector(el), snippet: getHtmlSnippet(el) });
            deductions += 5;
          }
        });
      }
    });

    // 8. Tab & Tablist interactive state checks
    document.querySelectorAll("[role='tablist']").forEach((tablist) => {
      const tabs = tablist.querySelectorAll("[role='tab']");
      if (tabs.length === 0) {
        issues.push({ severity: "warning", message: "Element with role='tablist' contains no children with role='tab'. A tablist must group actual tabs.", wcag: "1.3.1", element: getSelector(tablist), snippet: getHtmlSnippet(tablist) });
        deductions += 6;
      }
    });

    document.querySelectorAll("[role='tab']").forEach((tab) => {
      if (!tab.hasAttribute("aria-selected")) {
        issues.push({ severity: "warning", message: "Element with role='tab' is missing 'aria-selected' attribute to convey its active state.", wcag: "4.1.2", element: getSelector(tab), snippet: getHtmlSnippet(tab) });
        deductions += 5;
      }
      if (!tab.closest("[role='tablist']")) {
        issues.push({ severity: "info", message: "Element with role='tab' is not grouped inside a parent role='tablist' element.", wcag: "1.3.1", element: getSelector(tab), snippet: getHtmlSnippet(tab) });
        deductions += 2;
      }
    });

    // 9. Presentational Role Conflict (WCAG 4.1.2)
    document.querySelectorAll("[role='presentation'], [role='none']").forEach((el) => {
      if (isFocusable(el)) {
        issues.push({ severity: "critical", message: "Presentational role conflict. Element has role='presentation' or 'none' but is still keyboard focusable.", wcag: "4.1.2", element: getSelector(el), snippet: getHtmlSnippet(el) });
        deductions += 8;
      }
    });

    // 10. Broken Active Descendant (WCAG 1.3.1)
    document.querySelectorAll("[aria-activedescendant]").forEach((el) => {
      const refId = el.getAttribute("aria-activedescendant")?.trim();
      if (refId && !document.getElementById(refId)) {
        issues.push({ severity: "warning", message: `Attribute "aria-activedescendant" references non-existent ID "${refId}".`, wcag: "1.3.1", element: getSelector(el), snippet: getHtmlSnippet(el) });
        deductions += 6;
      }
    });

    score = Math.max(0, 100 - deductions);
    return { score, issues, counts };
  }

  // 3. Images & Media (weight 15)
  function checkImages() {
    const issues = [];
    let score = 100;
    let deductions = 0;
    const counts = { total: 0, missingAlt: 0, emptyAlt: 0, suspiciousAlt: 0, redundantAlt: 0 };

    const suspiciousPatterns = [/\.(jpe?g|png|gif|webp|svg|bmp)$/i, /^image\s*\d*$/i, /^img\s*\d*$/i, /^photo$/i, /^picture$/i, /^banner$/i, /^logo$/i];
    const redundantWords = ["image of", "photo of", "graphic of", "picture of", "logo of", "icon of"];

    const imgList = Array.from(document.querySelectorAll("img"));
    imgList.forEach((img, index) => {
      counts.total++;
      if (!img.hasAttribute("alt")) {
        counts.missingAlt++;
        issues.push({ severity: "critical", message: "Image is missing alt attribute entirely. Screen readers will read the filename.", wcag: "1.1.1", element: getSelector(img), snippet: getHtmlSnippet(img) });
        deductions += 10;
      } else {
        const rawAlt = img.getAttribute("alt");
        const altText = rawAlt.trim();
        
        // Check for whitespace-only or single punctuation disguised empty alt
        if (rawAlt !== "" && (altText === "" || altText === "." || altText === "-" || altText === "_")) {
          counts.missingAlt++;
          issues.push({ severity: "critical", message: "Image alt attribute contains only placeholder spaces or punctuation characters. Treat as missing alt.", wcag: "1.1.1", element: getSelector(img), snippet: getHtmlSnippet(img) });
          deductions += 10;
        } else if (altText === "") {
          const isDecorativeContext = img.closest("[aria-hidden='true']") || img.getAttribute("role") === "presentation";
          if (!isDecorativeContext && (img.width > 100 || img.height > 100)) {
            counts.emptyAlt++;
            issues.push({ severity: "warning", message: "Image has empty alt text. Meaningful elements should have a description; empty alt is only for decorative images.", wcag: "1.1.1", element: getSelector(img), snippet: getHtmlSnippet(img) });
            deductions += 4;
          }
        } else {
          if (suspiciousPatterns.some((p) => p.test(altText))) {
            counts.suspiciousAlt++;
            issues.push({ severity: "warning", message: `Alt text "${altText}" appears to be a filename or generic tag rather than a description.`, wcag: "1.1.1", element: getSelector(img), snippet: getHtmlSnippet(img) });
            deductions += 6;
          }
          if (redundantWords.some((word) => altText.toLowerCase().startsWith(word))) {
            counts.redundantAlt++;
            issues.push({ severity: "info", message: `Alt text contains redundant phrase: "${altText}". Screen readers already announce the element as an image.`, wcag: "1.1.1", element: getSelector(img), snippet: getHtmlSnippet(img) });
            deductions += 3;
          }
          
          // Check for adjacent duplicate alt text (echo check)
          if (index > 0) {
            const prevImg = imgList[index - 1];
            if (prevImg.hasAttribute("alt") && prevImg.getAttribute("alt").trim() === altText && !isHiddenFromAT(prevImg)) {
              issues.push({ severity: "info", message: `Adjacent images have identical alt text: "${altText}". This duplicates screen reader announcements.`, wcag: "1.1.1", element: getSelector(img), snippet: getHtmlSnippet(img) });
              deductions += 2;
            }
          }
        }
      }
    });

    // SVGs without accessible names
    document.querySelectorAll("svg").forEach((svg) => {
      if (isHiddenFromAT(svg)) return;
      if (svg.getAttribute("role") === "presentation" || svg.getAttribute("aria-hidden") === "true") return;
      const hasTitle = svg.querySelector("title");
      const hasAriaLabel = svg.getAttribute("aria-label") || svg.getAttribute("aria-labelledby");
      if (!hasTitle && !hasAriaLabel) {
        issues.push({ severity: "info", message: "SVG element has no accessible name (no <title> child or aria-label). Add one if this conveys meaning.", wcag: "1.1.1", element: getSelector(svg), snippet: getHtmlSnippet(svg) });
        deductions += 3;
      }
    });

    // Video and Audio tags (WCAG 1.2 Captions / Subtitles)
    document.querySelectorAll("video").forEach((video) => {
      if (isHiddenFromAT(video)) return;
      const tracks = video.querySelectorAll("track[kind='captions'], track[kind='subtitles']");
      if (tracks.length === 0) {
        issues.push({ severity: "warning", message: "Video element is missing standard captions or subtitles tracks. Deaf or hard-of-hearing users cannot consume this media.", wcag: "1.2.2", element: getSelector(video), snippet: getHtmlSnippet(video) });
        deductions += 10;
      }
    });

    document.querySelectorAll("audio").forEach((audio) => {
      if (isHiddenFromAT(audio)) return;
      const tracks = audio.querySelectorAll("track[kind='captions'], track[kind='subtitles']");
      if (tracks.length === 0 && !audio.getAttribute("aria-describedby")) {
        issues.push({ severity: "info", message: "Audio element lacks caption tracks or associated text transcripts.", wcag: "1.2.1", element: getSelector(audio), snippet: getHtmlSnippet(audio) });
        deductions += 4;
      }
    });

    // CSS Background Banners alternative text check (WCAG 1.1.1)
    const allElements = document.querySelectorAll("div, section, header, a, [role='banner']");
    let bgImageIssueCount = 0;
    allElements.forEach((el) => {
      if (isHiddenFromAT(el)) return;
      
      const style = getComputedStyle(el);
      const bgImg = style.backgroundImage;
      if (bgImg && bgImg !== "none" && bgImg.includes("url(")) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 150 && rect.height > 150) {
          const hasDesc = el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.getAttribute("title") || el.textContent?.trim();
          if (!hasDesc) {
            bgImageIssueCount++;
            if (bgImageIssueCount <= 5) {
              issues.push({ severity: "info", message: "CSS Background Image lacks alternative text. Large graphic containers styled with background images should contain accessible text descriptions.", wcag: "1.1.1", element: getSelector(el), snippet: getHtmlSnippet(el) });
              deductions += 4;
            }
          }
        }
      }
    });

    score = Math.max(0, 100 - deductions);
    return { score, issues, counts };
  }

  // 4. Forms (weight 15)
  function checkForms() {
    const issues = [];
    let score = 100;
    let deductions = 0;
    const counts = { inputs: 0, unlabeled: 0, missingRequired: 0, ungrouped: 0, missingSubmit: 0 };

    document.querySelectorAll("input:not([type='hidden']), select, textarea").forEach((input) => {
      if (isHiddenFromAT(input)) return;
      counts.inputs++;

      // Check for associated label
      const id = input.getAttribute("id");
      const label = id ? document.querySelector(`label[for='${id}']`) : null;
      const ariaLabel = input.getAttribute("aria-label");
      const ariaLabelledby = input.getAttribute("aria-labelledby");
      const wrappingLabel = input.closest("label");
      const placeholder = input.getAttribute("placeholder");

      if (!label && !ariaLabel && !ariaLabelledby && !wrappingLabel) {
        counts.unlabeled++;
        if (placeholder) {
          issues.push({ severity: "warning", message: `Input uses only placeholder as a label. Placeholders vanish on focus and are not reliably read by screen readers.`, wcag: "1.3.1", element: getSelector(input), snippet: getHtmlSnippet(input) });
          deductions += 6;
        } else {
          issues.push({ severity: "critical", message: `Form control has no associated label. Screen readers cannot identify this field's purpose.`, wcag: "1.3.1", element: getSelector(input), snippet: getHtmlSnippet(input) });
          deductions += 12;
        }
      }

      // Check for duplicate labels pointing to the same element ID
      if (id) {
        const labels = document.querySelectorAll(`label[for='${id}']`);
        if (labels.length > 1) {
          issues.push({ severity: "info", message: `Multiple label elements point to the same input ID "${id}". Use a single label element instead.`, wcag: "1.3.1", element: getSelector(input), snippet: getHtmlSnippet(input) });
          deductions += 2;
        }
      }

      // Required fields
      if (input.required || input.getAttribute("aria-required") === "true") {
        const hasRequiredIndicator = input.getAttribute("aria-required") === "true";
        if (!hasRequiredIndicator) {
          counts.missingRequired++;
          issues.push({ severity: "warning", message: "Required field uses HTML 'required' attribute but not 'aria-required=\"true\"'. Older screen readers might miss it.", wcag: "3.3.2", element: getSelector(input), snippet: getHtmlSnippet(input) });
          deductions += 4;
        }
      }

      // Autocomplete token check (WCAG 1.3.5)
      const sensitiveKeys = ["email", "mail", "password", "pass", "username", "uname", "phone", "tel", "zip", "postal", "address", "addr"];
      const attrName = (input.getAttribute("name") || "").toLowerCase();
      const attrId = (input.getAttribute("id") || "").toLowerCase();
      const isSensitive = sensitiveKeys.some(k => attrName.includes(k) || attrId.includes(k));
      if (isSensitive) {
        const hasAutocomplete = input.hasAttribute("autocomplete") && input.getAttribute("autocomplete").trim() !== "";
        if (!hasAutocomplete) {
          issues.push({ severity: "info", message: "Autocomplete missing on personal identify field. Adding appropriate autocomplete tokens assists cognitive-disability and motor-impaired users.", wcag: "1.3.5", element: getSelector(input), snippet: getHtmlSnippet(input) });
          deductions += 3;
        }
      }
    });

    // Check for submit button in forms
    document.querySelectorAll("form").forEach((form) => {
      const submitBtn = form.querySelector("button[type='submit'], input[type='submit']");
      if (!submitBtn) {
        counts.missingSubmit++;
        issues.push({ severity: "warning", message: "Form has no submit button. Standard submit buttons are crucial for native keyboard form submission.", wcag: "2.1.1", element: getSelector(form), snippet: getHtmlSnippet(form) });
        deductions += 8;
      }
    });

    // Fieldsets for radio/checkbox groups
    document.querySelectorAll("input[type='radio'], input[type='checkbox']").forEach((input) => {
      if (!input.closest("fieldset")) {
        counts.ungrouped++;
        issues.push({ severity: "warning", message: `${input.type} input is not inside a <fieldset> group. Groups of interactive controls need a container and legend label.`, wcag: "1.3.1", element: getSelector(input), snippet: getHtmlSnippet(input) });
        deductions += 5;
      }
    });

    score = Math.max(0, 100 - deductions);
    return { score, issues, counts };
  }

  // 5. Keyboard Navigation (weight 20)
  function checkKeyboard() {
    const issues = [];
    let score = 100;
    let deductions = 0;
    const counts = { positiveTabindex: 0, skipLinks: 0, nonNativeInteractive: 0, missingFocusStyle: 0 };

    // Positive tabindex — disrupts natural focus order
    document.querySelectorAll("[tabindex]").forEach((el) => {
      const val = parseInt(el.getAttribute("tabindex"), 10);
      if (val > 0) {
        counts.positiveTabindex++;
        issues.push({ severity: "warning", message: `tabindex="${val}" disrupts natural focus order. Use 0 for focusable elements, or -1 to manage dynamically.`, wcag: "2.4.3", element: getSelector(el), snippet: getHtmlSnippet(el) });
        deductions += 8;
      }
    });

    // Skip links
    const firstLinks = Array.from(document.querySelectorAll("a[href]")).slice(0, 5);
    const hasSkipLink = firstLinks.some((a) => {
      const href = a.getAttribute("href") || "";
      const text = a.textContent?.toLowerCase() || "";
      return href.startsWith("#") && (text.includes("skip") || text.includes("jump") || text.includes("main"));
    });
    if (hasSkipLink) {
      counts.skipLinks = 1;
    } else {
      issues.push({ severity: "warning", message: "No skip navigation link found. Keyboard users must tab through all navigation elements repeatedly.", wcag: "2.4.1", element: "<body>", snippet: "<body>" });
      deductions += 15;
    }

    // Non-native interactive elements without keyboard support
    document.querySelectorAll("[onclick]:not(a):not(button):not(input):not(select):not(textarea), [role='button']:not(button), [role='link']:not(a)").forEach((el) => {
      if (isHiddenFromAT(el)) return;
      const tabindex = el.getAttribute("tabindex");
      if (tabindex === null || parseInt(tabindex) < 0) {
        counts.nonNativeInteractive++;
        issues.push({ severity: "critical", message: "Non-native interactive element lacks keyboard support. Add tabindex=\"0\" and keydown/keyup event listeners.", wcag: "2.1.1", element: getSelector(el), snippet: getHtmlSnippet(el) });
        deductions += 10;
      }
    });

    // Focus style check (heuristic — checks if BOTH outline and box-shadow are absent)
    const allFocusable = document.querySelectorAll("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex='0']");
    let noOutlineCount = 0;
    const sample = Array.from(allFocusable).slice(0, 20);
    sample.forEach((el) => {
      const style = getComputedStyle(el);
      const outline = style.outlineWidth;
      const outlineStyle = style.outlineStyle;
      const boxShadow = style.boxShadow;
      const hasNoOutline = outlineStyle === "none" || outline === "0px";
      const hasNoBoxShadow = !boxShadow || boxShadow === "none" || boxShadow.includes("0px 0px 0px") || boxShadow === "0px 0px 0px 0px rgb(0, 0, 0)";
      if (hasNoOutline && hasNoBoxShadow) {
        noOutlineCount++;
      }
    });
    if (noOutlineCount > sample.length * 0.5 && sample.length > 0) {
      counts.missingFocusStyle = noOutlineCount;
      issues.push({ severity: "critical", message: `${noOutlineCount} of ${sample.length} sampled focusable elements have no focus styling (outline and box-shadow removed). This makes keyboard navigation invisible.`, wcag: "2.4.7", element: "Global CSS", snippet: "global styles" });
      deductions += 20;
    }

    // Duplicate Accesskey Check (WCAG 2.4.1)
    const accesskeys = document.querySelectorAll("[accesskey]");
    const keyMap = new Map();
    accesskeys.forEach((el) => {
      const key = el.getAttribute("accesskey").trim().toLowerCase();
      if (key) {
        if (keyMap.has(key)) {
          keyMap.get(key).push(el);
        } else {
          keyMap.set(key, [el]);
        }
      }
    });
    keyMap.forEach((elements, key) => {
      if (elements.length > 1) {
        issues.push({ severity: "warning", message: `Duplicate accesskey attribute value "${key}" is defined across multiple elements, causing keyboard shortcuts collision.`, wcag: "2.4.1", element: getSelector(elements[0]), snippet: getHtmlSnippet(elements[0]) });
        deductions += 5;
      }
    });

    // Pointer Events Keyboard Conflict (WCAG 2.1.1)
    const focusableEls = document.querySelectorAll("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex='0']");
    let pointerEventsIssueCount = 0;
    focusableEls.forEach((el) => {
      if (isHiddenFromAT(el)) return;
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const style = getComputedStyle(el);
        if (style.pointerEvents === "none") {
          pointerEventsIssueCount++;
          if (pointerEventsIssueCount <= 5) {
            issues.push({ severity: "warning", message: "Pointer events conflict. Focusable element is in keyboard tab order but styled with CSS pointer-events: none, blocking pointer interaction.", wcag: "2.1.1", element: getSelector(el), snippet: getHtmlSnippet(el) });
            deductions += 5;
          }
        }
      }
    });

    score = Math.max(0, 100 - deductions);
    return { score, issues, counts };
  }

  // 6. Heading Structure (weight 10)
  function checkHeadings() {
    const issues = [];
    let score = 100;
    let deductions = 0;

    const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"));
    const levels = headings.map((h) => parseInt(h.tagName[1]));

    if (headings.length === 0) {
      issues.push({ severity: "critical", message: "No headings found. Headings structure page segments for quick navigational jumps.", wcag: "1.3.1", element: "<body>", snippet: "<body>" });
      return { score: 0, issues, counts: { total: 0, h1Count: 0, skippedLevels: 0 } };
    }

    const h1s = headings.filter((h) => h.tagName === "H1");
    if (h1s.length === 0) {
      issues.push({ severity: "critical", message: "No <h1> found. Every page must contain exactly one <h1> representing the main page topic.", wcag: "1.3.1", element: "<body>", snippet: "<body>" });
      deductions += 25;
    } else if (h1s.length > 1) {
      issues.push({ severity: "warning", message: `${h1s.length} <h1> elements found. Keep exactly one per page for clean indexing.`, wcag: "1.3.1", element: "h1", snippet: "multiple h1 tags" });
      deductions += 12;
    }

    // Check if the page starts with a nested heading (e.g. h3 or h4) before h1/h2
    if (levels.length > 0 && levels[0] > 2) {
      issues.push({ severity: "warning", message: `Page starts with a low-level heading: <h${levels[0]}>. Document outline should flow downward starting with h1 or h2.`, wcag: "1.3.1", element: getSelector(headings[0]), snippet: getHtmlSnippet(headings[0]) });
      deductions += 8;
    }

    // Skipped levels
    let skipped = 0;
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] > levels[i - 1] + 1) {
        skipped++;
        issues.push({ severity: "warning", message: `Heading level jumps from <h${levels[i - 1]}> to <h${levels[i]}>, skipping levels. Breaks document hierarchy outline.`, wcag: "1.3.1", element: getSelector(headings[i]), snippet: getHtmlSnippet(headings[i]) });
        deductions += 8;
      }
    }

    // Empty headings and overly long headings
    headings.forEach((h) => {
      const text = getAccessibleName(h)?.trim() || "";
      if (!text) {
        issues.push({ severity: "critical", message: "Empty heading element. Screen readers will read structural level with no contents.", wcag: "1.3.1", element: getSelector(h), snippet: getHtmlSnippet(h) });
        deductions += 10;
      } else if (text.length > 150) {
        issues.push({ severity: "warning", message: `Overly long heading text (${text.length} chars). Heading tags should be brief labels; do not use them to format full body text paragraphs.`, wcag: "1.3.1", element: getSelector(h), snippet: getHtmlSnippet(h) });
        deductions += 6;
      }
    });

    score = Math.max(0, 100 - deductions);
    return { score, issues, counts: { total: headings.length, h1Count: h1s.length, skippedLevels: skipped } };
  }

  // 7. Links & Buttons (weight 5)
  function checkLinksButtons() {
    const issues = [];
    let score = 100;
    let deductions = 0;
    const counts = { links: 0, buttons: 0, genericText: 0, newWindowUnmarked: 0, empty: 0, redundantLinks: 0, contrastFailures: 0 };
    const genericPhrases = ["click here", "here", "read more", "more", "learn more", "this", "link", "button", "continue", "go"];

    const linksList = Array.from(document.querySelectorAll("a[href]"));

    linksList.forEach((a, index) => {
      if (isHiddenFromAT(a)) return;
      counts.links++;
      const text = getAccessibleName(a)?.toLowerCase().trim() || "";
      if (!text) {
        counts.empty++;
        issues.push({ severity: "critical", message: "Link has no accessible name. Screen readers will skip or read the URL string.", wcag: "2.4.4", element: getSelector(a), snippet: getHtmlSnippet(a) });
        deductions += 10;
      } else if (genericPhrases.includes(text)) {
        counts.genericText++;
        issues.push({ severity: "warning", message: `Link with generic text: "${text}". Out of context, this offers no clues about destination.`, wcag: "2.4.4", element: getSelector(a), snippet: getHtmlSnippet(a) });
        deductions += 5;
      }

      if (a.getAttribute("target") === "_blank") {
        const indicator = a.getAttribute("aria-label")?.includes("new") || a.querySelector("[aria-label]") || a.textContent?.toLowerCase().includes("new window");
        if (!indicator) {
          counts.newWindowUnmarked++;
          issues.push({ severity: "info", message: `Link opens in a new tab (target="_blank") but lacks text/aria warnings.`, wcag: "3.2.2", element: getSelector(a), snippet: getHtmlSnippet(a) });
          deductions += 3;
        }
      }

      // Vague Anchor Traps (WCAG 2.4.4)
      const hrefVal = (a.getAttribute("href") || "").trim().toLowerCase();
      if (hrefVal === "#" || hrefVal.startsWith("javascript:")) {
        const roleVal = a.getAttribute("role");
        if (roleVal !== "button") {
          issues.push({ severity: "warning", message: "Mock link behaves as an interactive action but lacks role='button' and proper button aesthetics.", wcag: "2.4.4", element: getSelector(a), snippet: getHtmlSnippet(a) });
          deductions += 4;
        }
      }

      if (a.getAttribute("role") === "button" && a.hasAttribute("href") && a.getAttribute("href") !== "#" && a.getAttribute("href") !== "javascript:void(0)") {
        issues.push({ severity: "warning", message: "Element has both href and role='button'. This conflict confuses screen readers and search engines.", wcag: "4.1.2", element: getSelector(a), snippet: getHtmlSnippet(a) });
        deductions += 4;
      }

      if (index > 0) {
        const prev = linksList[index - 1];
        const currentHref = a.getAttribute("href");
        const prevHref = prev.getAttribute("href");
        if (currentHref && prevHref && currentHref === prevHref && !isHiddenFromAT(prev)) {
          counts.redundantLinks++;
          issues.push({ severity: "info", message: `Adjacent links point to identical destination URL: "${currentHref}". Consider combining into one element.`, wcag: "2.4.4", element: getSelector(a), snippet: getHtmlSnippet(a) });
          deductions += 2;
        }
      }
    });

    document.querySelectorAll("button").forEach((btn) => {
      if (isHiddenFromAT(btn)) return;
      counts.buttons++;
      const text = getAccessibleName(btn)?.trim() || "";
      if (!text) {
        counts.empty++;
        issues.push({ severity: "critical", message: "Button has no accessible text. Screen readers cannot tell what it does.", wcag: "4.1.2", element: getSelector(btn), snippet: getHtmlSnippet(btn) });
        deductions += 10;
      }
    });

    score = Math.max(0, 100 - deductions);
    return { score, issues, counts };
  }

  // 8. Color Contrast Auditing (weight 10)
  function checkContrast() {
    const issues = [];
    let score = 100;
    let deductions = 0;
    let textTested = 0;
    let contrastFailures = 0;
    let skippedElements = 0;

    const textElements = Array.from(document.querySelectorAll("p, li, label, td, th, h1, h2, h3, h4, h5, h6, a[href], button"));
    
    // Filter visible elements
    const visibleTextElements = textElements.filter(el => {
      if (isHiddenFromAT(el)) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    // Partition by viewport status
    const inViewport = [];
    const outViewport = [];
    visibleTextElements.forEach(el => {
      if (isInViewport(el)) {
        inViewport.push(el);
      } else {
        outViewport.push(el);
      }
    });

    // Take up to 100 visible text elements prioritizing in-viewport elements
    const sampledElements = [...inViewport, ...outViewport].slice(0, 100);

    sampledElements.forEach((el) => {
      try {
        const style = getComputedStyle(el);
        const color = style.color;
        
        const fgMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d?\.\d+|\d+))?/);
        if (fgMatch) {
          const rawFgR = parseInt(fgMatch[1], 10);
          const rawFgG = parseInt(fgMatch[2], 10);
          const rawFgB = parseInt(fgMatch[3], 10);
          const rawFgA = fgMatch[4] !== undefined ? parseFloat(fgMatch[4]) : 1.0;
          
          const bgRgb = getElementBgColor(el);
          
          // Blend foreground against background if foreground is semi-transparent
          let fgRgb = [rawFgR, rawFgG, rawFgB];
          if (rawFgA < 1.0) {
            fgRgb = [
              Math.round(rawFgR * rawFgA + bgRgb[0] * (1 - rawFgA)),
              Math.round(rawFgG * rawFgA + bgRgb[1] * (1 - rawFgA)),
              Math.round(rawFgB * rawFgA + bgRgb[2] * (1 - rawFgA))
            ];
          }
          
          const ratio = getContrastRatio(fgRgb, bgRgb);
          textTested++;
          
          // Determine threshold based on size
          const fontSizeStr = style.fontSize;
          const fontSizePx = parseFloat(fontSizeStr);
          const fontWeight = style.fontWeight;
          const isBold = fontWeight === "bold" || parseInt(fontWeight, 10) >= 700;
          
          // WCAG Large text: >= 24px (18pt) or bold >= 18.5px (14pt)
          const isLarge = fontSizePx >= 24 || (fontSizePx >= 18.5 && isBold);
          const threshold = isLarge ? 3.0 : 4.5;
          
          if (ratio < threshold) {
            contrastFailures++;
            const roundedRatio = Math.round(ratio * 100) / 100;
            issues.push({
              severity: ratio < 3.0 ? "critical" : "warning",
              message: `Low text color contrast ratio (${roundedRatio}:1). Minimum required for this text size is ${threshold}:1. Check foreground ${color} on background rgb(${bgRgb.join(",")}).`,
              wcag: "1.4.3",
              element: getSelector(el),
              snippet: getHtmlSnippet(el)
            });
            deductions += ratio < 3.0 ? 8 : 4;
          }
        } else {
          skippedElements++;
        }
      } catch (_) {
        skippedElements++;
      }
    });

    // Check placeholder contrast for visible inputs and textareas
    const placeholders = Array.from(document.querySelectorAll("input[placeholder], textarea[placeholder]")).filter(el => {
      if (isHiddenFromAT(el)) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    placeholders.slice(0, 30).forEach((input) => {
      try {
        const color = getPlaceholderColor(input);
        if (color) {
          const fgMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d?\.\d+|\d+))?/);
          if (fgMatch) {
            const rawFgR = parseInt(fgMatch[1], 10);
            const rawFgG = parseInt(fgMatch[2], 10);
            const rawFgB = parseInt(fgMatch[3], 10);
            const rawFgA = fgMatch[4] !== undefined ? parseFloat(fgMatch[4]) : 1.0;
            
            const bgRgb = getElementBgColor(input);
            
            let fgRgb = [rawFgR, rawFgG, rawFgB];
            if (rawFgA < 1.0) {
              fgRgb = [
                Math.round(rawFgR * rawFgA + bgRgb[0] * (1 - rawFgA)),
                Math.round(rawFgG * rawFgA + bgRgb[1] * (1 - rawFgA)),
                Math.round(rawFgB * rawFgA + bgRgb[2] * (1 - rawFgA))
              ];
            }
            
            const ratio = getContrastRatio(fgRgb, bgRgb);
            
            // Standard placeholder text threshold: 4.5:1
            if (ratio < 4.5) {
              const roundedRatio = Math.round(ratio * 100) / 100;
              issues.push({
                severity: "warning",
                message: `Low contrast ratio on form placeholder text (${roundedRatio}:1). Minimum required for placeholders is 4.5:1.`,
                wcag: "1.4.3",
                element: getSelector(input),
                snippet: getHtmlSnippet(input)
              });
              deductions += 4;
            }
          }
        }
      } catch (_) {}
    });

    const totalSampled = textTested + skippedElements;
    if (skippedElements > 0.1 * totalSampled && totalSampled > 0) {
      issues.push({
        severity: "info",
        message: `Skipped ${skippedElements} elements due to unparseable color formats (e.g. color-mix() or relative CSS color values). Consider checking color contrast manually for these nodes.`,
        wcag: "1.4.3",
        element: "Contrast Checker",
        snippet: "N/A"
      });
    }

    score = Math.max(0, 100 - deductions);
    return { score, issues, counts: { textTested, contrastFailures } };
  }

  // 9. Inline Language Check (weight 5)
  function checkInlineLang() {
    const issues = [];
    let score = 100;
    let deductions = 0;
    const counts = { totalChecked: 0, inlineMismatches: 0 };

    const elements = Array.from(document.querySelectorAll("p, span, blockquote, q, cite, li, td, dt, dd")).filter(el => {
      if (isHiddenFromAT(el)) return false;
      const text = el.textContent || "";
      return text.trim().length >= 15;
    });

    const pageLang = (document.documentElement.getAttribute("lang") || "en").trim().toLowerCase().split("-")[0];

    function getClosestLang(el) {
      let node = el;
      while (node) {
        if (node.hasAttribute("lang")) {
          return node.getAttribute("lang").trim().toLowerCase();
        }
        node = node.parentElement;
      }
      return "";
    }

    const langSignatures = {
      fr: {
        words: new Set(["le", "la", "les", "des", "dans", "une", "pour", "avec", "est", "sont", "cette", "mais"]),
        diacritics: /[éèàùçâêîôûëïœæ]/i
      },
      de: {
        words: new Set(["und", "das", "der", "die", "den", "dem", "ein", "eine", "mit", "von", "ist", "sind", "nicht", "auch"]),
        diacritics: /[äöüß]/i
      },
      es: {
        words: new Set(["el", "los", "las", "del", "por", "para", "con", "una", "como", "esta", "pero"]),
        diacritics: /[ñáéíóúü¿¡]/i
      },
      pt: {
        words: new Set(["os", "as", "dos", "das", "uma", "com", "para", "por", "esta", "mais", "como"]),
        diacritics: /[ãõçáéíóúâêô]/i
      },
      it: {
        words: new Set(["il", "lo", "gli", "uno", "per", "con", "su", "come", "questo", "sono", "ma", "anche"]),
        diacritics: /[àèìòù]/i
      }
    };

    elements.forEach(el => {
      const text = el.textContent;
      const inheritedLangAttr = getClosestLang(el);
      
      if (el.hasAttribute("lang")) return;

      const inheritedLang = (inheritedLangAttr || pageLang).split("-")[0];
      const words = text.toLowerCase().match(/\b[a-z]{2,8}\b/g) || [];
      if (words.length === 0) return;

      counts.totalChecked++;

      let bestLang = null;
      let maxScore = 0;

      for (const [lang, sig] of Object.entries(langSignatures)) {
        let score = 0;
        words.forEach(w => {
          if (sig.words.has(w)) score += 3;
        });
        
        const diacritics = text.match(new RegExp(sig.diacritics, "gi"));
        if (diacritics) {
          score += diacritics.length * 2;
        }

        if (score > maxScore) {
          maxScore = score;
          bestLang = lang;
        }
      }

      if (maxScore >= 6 && bestLang && bestLang !== inheritedLang) {
        counts.inlineMismatches++;
        issues.push({
          severity: "warning",
          message: `Text appears to be in ${bestLang.toUpperCase()} but is inherited as "${inheritedLang}". Provide an explicit lang="${bestLang}" attribute so assistive technologies switch voice synthesis engine correctly.`,
          wcag: "3.1.2",
          element: getSelector(el),
          snippet: getHtmlSnippet(el)
        });
        deductions += 4;
      }
    });

    score = Math.max(0, 100 - deductions);
    return { score, issues, counts };
  }

  // 10. Duplicate IDs Check (weight 5)
  function checkDuplicateIds() {
    const issues = [];
    let score = 100;
    let deductions = 0;
    const counts = { totalIds: 0, duplicates: 0, escalated: 0 };
    
    const idMap = new Map();
    document.querySelectorAll("[id]").forEach((el) => {
      const id = el.getAttribute("id").trim();
      if (!id) return;
      counts.totalIds++;
      if (idMap.has(id)) {
        idMap.get(id).push(el);
      } else {
        idMap.set(id, [el]);
      }
    });
    
    idMap.forEach((elements, id) => {
      if (elements.length > 1) {
        counts.duplicates++;
        const isReferenced = 
          document.querySelector(`[aria-labelledby~="${id}"], [aria-describedby~="${id}"], label[for="${id}"], a[href="#${id}"]`) !== null;
          
        const severity = isReferenced ? "critical" : "warning";
        if (severity === "critical") counts.escalated++;
        
        issues.push({
          severity,
          message: `Duplicate ID "${id}" detected (${elements.length} occurrences).${isReferenced ? " Escalated to critical as this ID is actively referenced by accessibility or navigation controls." : ""}`,
          wcag: "4.1.1",
          element: `[id="${id}"]`,
          snippet: getHtmlSnippet(elements[0])
        });
        
        deductions += severity === "critical" ? 15 : 6;
      }
    });
    
    score = Math.max(0, 100 - Math.min(deductions, 100));
    return { score, issues, counts };
  }

  // 11. Reduced Motion Check (weight 6)
  function checkReducedMotion() {
    const issues = [];
    let score = 100;
    let deductions = 0;
    const counts = { animatedElements: 0, overridden: 0 };
    
    let siteSupportsReducedMotion = false;
    try {
      for (const sheet of document.styleSheets) {
        try {
          const rules = sheet.cssRules || sheet.rules;
          if (!rules) continue;
          for (const rule of rules) {
            if (rule.media && rule.media.mediaText.includes("prefers-reduced-motion")) {
              siteSupportsReducedMotion = true;
              break;
            }
          }
        } catch (_) {}
        if (siteSupportsReducedMotion) break;
      }
    } catch (_) {}
    
    if (!siteSupportsReducedMotion) {
      document.querySelectorAll("style").forEach((styleNode) => {
        if (styleNode.textContent.includes("prefers-reduced-motion")) {
          siteSupportsReducedMotion = true;
        }
      });
    }
    
    const candidates = [];
    document.querySelectorAll("*").forEach((el) => {
      if (candidates.length >= 60) return;
      if (isHiddenFromAT(el)) return;
      
      const style = getComputedStyle(el);
      const animName = style.animationName;
      const animDur = style.animationDuration;
      const transProp = style.transitionProperty;
      const transDur = style.transitionDuration;
      
      const hasAnim = animName && animName !== "none" && parseFloat(animDur) > 0;
      const hasTrans = transProp && transProp !== "none" && transProp !== "all 0s" && parseFloat(transDur) > 0;
      
      if (hasAnim || hasTrans) {
        candidates.push({ el, hasAnim, hasTrans });
      }
    });
    
    counts.animatedElements = candidates.length;
    
    if (candidates.length > 0 && !siteSupportsReducedMotion) {
      candidates.forEach(({ el }) => {
        issues.push({
          severity: "warning",
          message: "Element has active CSS animations or transitions, but the site lacks support for prefers-reduced-motion. High motion triggers vestibular disorders in sensitive users.",
          wcag: "2.3.3",
          element: getSelector(el),
          snippet: getHtmlSnippet(el)
        });
        deductions += 5;
      });
    }
    
    score = Math.max(0, 100 - Math.min(deductions, 100));
    return { score, issues, counts };
  }

  // 12. Touch Targets Check (weight 8)
  function checkTouchTargets() {
    const issues = [];
    let score = 100;
    let deductions = 0;
    const counts = { totalInteractive: 0, failures: 0 };
    
    const selectors = 'a[href], button, input, select, textarea, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [tabindex]';
    document.querySelectorAll(selectors).forEach((el) => {
      if (isHiddenFromAT(el)) return;
      
      const rect = el.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      
      if (width === 0 && height === 0) return;
      
      counts.totalInteractive++;
      
      if (width < 44 || height < 44) {
        counts.failures++;
        const minDimension = Math.min(width, height);
        const severity = minDimension < 24 ? "critical" : "warning";
        
        issues.push({
          severity,
          message: `Touch target size is too small (${width}x${height}px). Target sizes should be at least 44x44px for reliable touch activation.`,
          wcag: "2.5.5",
          element: getSelector(el),
          snippet: getHtmlSnippet(el)
        });
        
        deductions += severity === "critical" ? 8 : 4;
      }
    });
    
    score = Math.max(0, 100 - Math.min(deductions, 100));
    return { score, issues, counts };
  }

  // 13. Autoplay Media Check (weight 5)
  function checkAutoplayMedia() {
    const issues = [];
    let score = 100;
    let deductions = 0;
    const counts = { totalMedia: 0, autoplaying: 0, unmutedAutoplay: 0, mutedNoControls: 0 };
    
    document.querySelectorAll("video, audio").forEach((media) => {
      counts.totalMedia++;
      
      const hasAutoplay = media.hasAttribute("autoplay") || media.autoplay === true;
      const isMuted = media.hasAttribute("muted") || media.muted === true;
      
      if (hasAutoplay) {
        counts.autoplaying++;
        
        if (!isMuted) {
          counts.unmutedAutoplay++;
          issues.push({
            severity: "critical",
            message: `${media.tagName.toLowerCase()} element autoplays audio without being muted. Sound playing automatically can disrupt screen reader users.`,
            wcag: "1.4.2",
            element: getSelector(media),
            snippet: getHtmlSnippet(media)
          });
          deductions += 15;
        } else {
          const hasControls = media.hasAttribute("controls") || media.controls === true;
          const ariaLabel = media.getAttribute("aria-label");
          const ariaLabelledby = media.getAttribute("aria-labelledby");
          const hasAccessibleControls = hasControls || ariaLabel || ariaLabelledby;
          
          if (!hasAccessibleControls) {
            counts.mutedNoControls++;
            issues.push({
              severity: "info",
              message: `${media.tagName.toLowerCase()} element autoplays while muted, but lacks accessible controls. Users must be able to pause or stop motion.`,
              wcag: "1.4.2",
              element: getSelector(media),
              snippet: getHtmlSnippet(media)
            });
            deductions += 3;
          }
        }
      }
    });
    
    score = Math.max(0, 100 - Math.min(deductions, 100));
    return { score, issues, counts };
  }

  // 14. Reflow Check (weight 5)
  async function checkReflow() {
    const issues = [];
    let score = 100;
    let deductions = 0;
    const counts = { overflow: 0, disappeared: 0 };

    const originalFontSize = document.documentElement.style.fontSize;
    const viewportMeta = document.querySelector("meta[name='viewport']");
    const originalViewportContent = viewportMeta ? viewportMeta.getAttribute("content") : null;

    const textEls = Array.from(document.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li")).filter(el => {
      if (isHiddenFromAT(el)) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }).slice(0, 20);

    const preZoomRects = textEls.map(el => {
      const rect = el.getBoundingClientRect();
      return { el, width: rect.width, height: rect.height, top: rect.top };
    });

    document.documentElement.style.fontSize = "400%";
    
    let tempMeta = null;
    if (viewportMeta) {
      viewportMeta.setAttribute("content", "width=320");
    } else {
      tempMeta = document.createElement("meta");
      tempMeta.name = "viewport";
      tempMeta.content = "width=320";
      document.head.appendChild(tempMeta);
    }

    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));

    try {
      const scrollWidth = document.documentElement.scrollWidth;
      const innerWidth = window.innerWidth;
      if (scrollWidth > innerWidth + 2) {
        counts.overflow++;
        issues.push({
          severity: "critical",
          message: `[Experimental] Horizontal scrolling detected (${scrollWidth}px vs viewport ${innerWidth}px) during simulated 400% zoom reflow. Pages must reflow without requiring horizontal scrolling.`,
          wcag: "1.4.10",
          element: "<body>",
          snippet: "<body>"
        });
        deductions += 20;
      }

      preZoomRects.forEach(({ el }) => {
        const rect = el.getBoundingClientRect();
        const disappeared = rect.width === 0 || rect.height === 0 || rect.top > window.innerHeight * 4;
        if (disappeared) {
          counts.disappeared++;
          issues.push({
            severity: "warning",
            message: `[Experimental] Text element became hidden or pushed extremely far off-screen during simulated 400% zoom reflow. Content should reflow cleanly without disappearing.`,
            wcag: "1.4.10",
            element: getSelector(el),
            snippet: getHtmlSnippet(el)
          });
          deductions += 8;
        }
      });

    } finally {
      document.documentElement.style.fontSize = originalFontSize;
      if (viewportMeta) {
        if (originalViewportContent !== null) {
          viewportMeta.setAttribute("content", originalViewportContent);
        } else {
          viewportMeta.removeAttribute("content");
        }
      } else if (tempMeta) {
        tempMeta.remove();
      }
      
      await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
    }

    score = Math.max(0, 100 - Math.min(deductions, 100));
    return { score, issues, counts };
  }

  // ── Page metadata ────────────────────────────────────────
  function getPageMeta() {
    const interactiveEls = document.querySelectorAll("a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1']), [role='button'], [role='link']");
    const images = document.querySelectorAll("img");
    const langAttr = document.documentElement.getAttribute("lang");
    const viewport = document.querySelector("meta[name='viewport']");

    return {
      title: document.title || "(no title)",
      url: window.location.href,
      domain: window.location.hostname,
      lang: langAttr || null,
      https: window.location.protocol === "https:",
      viewport: !!viewport,
      interactiveCount: interactiveEls.length,
      imageCount: images.length,
      headingCount: document.querySelectorAll("h1,h2,h3,h4,h5,h6").length,
    };
  }

  // 15. Reading Level Check (weight 5)
  function countWordSyllables(word) {
    word = word.toLowerCase().replace(/[^a-z]/g, "");
    if (word.length <= 2) return 1;
    
    // Count vowel groups
    const vowels = /[aeiouy]+/g;
    const matches = word.match(vowels);
    let count = matches ? matches.length : 0;
    
    // Subtract silent e at end of word
    if (word.endsWith("e")) {
      const beforeE = word.slice(-2, -1);
      if (!"aeiouy".includes(beforeE)) {
        count--;
      }
    }
    
    return Math.max(1, count);
  }

  async function checkReadingLevel() {
    const issues = [];
    let score = 100;
    let deductions = 0;
    const counts = { wordCount: 0, sentenceCount: 0, syllableCount: 0, fkgl: 0 };

    const textElements = Array.from(document.querySelectorAll("p, li, td, dd")).filter(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || isHiddenFromAT(el)) return false;
      
      let parent = el.parentElement;
      while (parent) {
        const tag = parent.tagName.toLowerCase();
        if (tag === "nav" || tag === "header" || tag === "footer") return false;
        parent = parent.parentElement;
      }
      return true;
    });

    const texts = textElements.map(el => el.textContent || "").join(" ").trim();
    const words = texts.split(/\s+/).filter(w => w.length > 0);
    
    if (words.length < 50) {
      issues.push({
        severity: "info",
        message: `Not enough body text to score (found ${words.length} words; minimum 50 words required).`,
        wcag: "3.1.5",
        element: "body"
      });
      return { score, issues, counts };
    }

    const sentences = texts.split(/[.!?](?:\s+|$)/).filter(s => s.trim().length > 0);
    const sentenceCount = Math.max(1, sentences.length);
    const wordCount = words.length;

    let totalSyllables = 0;
    words.forEach(word => {
      totalSyllables += countWordSyllables(word);
    });

    const fkgl = 0.39 * (wordCount / sentenceCount) + 11.8 * (totalSyllables / wordCount) - 15.59;
    const roundedFkgl = Math.round(fkgl * 10) / 10;

    counts.wordCount = wordCount;
    counts.sentenceCount = sentenceCount;
    counts.syllableCount = totalSyllables;
    counts.fkgl = roundedFkgl;

    if (fkgl <= 8) {
      score = 100;
    } else if (fkgl <= 11) {
      score = 85;
      deductions = 15;
      issues.push({
        severity: "warning",
        message: `Reading level is approximately Grade ${roundedFkgl} (FKGL score: ${roundedFkgl}, words: ${wordCount}). Aim for Grade 8 or below for broad accessibility.`,
        wcag: "3.1.5",
        element: "body"
      });
    } else if (fkgl <= 14) {
      score = 70;
      deductions = 30;
      issues.push({
        severity: "warning",
        message: `Reading level is approximately Grade ${roundedFkgl} (FKGL score: ${roundedFkgl}, words: ${wordCount}). Aim for Grade 8 or below for broad accessibility.`,
        wcag: "3.1.5",
        element: "body"
      });
    } else {
      score = 50;
      deductions = 50;
      issues.push({
        severity: "critical",
        message: `Reading level is approximately Grade ${roundedFkgl} (FKGL score: ${roundedFkgl}, words: ${wordCount}). Aim for Grade 8 or below for broad accessibility.`,
        wcag: "3.1.5",
        element: "body"
      });
    }

    score = Math.max(0, 100 - Math.min(deductions, 100));
    return { score, issues, counts };
  }

  // ── Focus Visualizer overlay states ──────────────────────
  let focusOverlayActive = false;
  let inferredFocusOrder = [];

  function startFocusOverlay(port) {
    focusOverlayActive = true;
    inferredFocusOrder = [];
    
    let overlay = document.getElementById("a11y-focus-overlay");
    if (overlay) overlay.remove();
    
    overlay = document.createElement("div");
    overlay.id = "a11y-focus-overlay";
    overlay.style.position = "absolute";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "999999";
    
    const bodyStyle = window.getComputedStyle(document.body);
    if (bodyStyle.position === "static") {
      document.body.style.position = "relative";
    }
    
    document.body.appendChild(overlay);
    
    const focusable = Array.from(document.querySelectorAll(
      `a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [role="button"], [role="link"]`
    )).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && !isHiddenFromAT(el);
    });
    
    const elementsWithIndex = focusable.map((el, index) => ({ el, index }));
    elementsWithIndex.sort((a, b) => {
      const tabA = parseInt(a.el.getAttribute("tabindex") || "0", 10);
      const tabB = parseInt(b.el.getAttribute("tabindex") || "0", 10);
      
      const hasPosA = tabA > 0;
      const hasPosB = tabB > 0;
      
      if (hasPosA && !hasPosB) return -1;
      if (!hasPosA && hasPosB) return 1;
      if (hasPosA && hasPosB) {
        if (tabA !== tabB) return tabA - tabB;
      }
      return a.index - b.index;
    });
    
    inferredFocusOrder = elementsWithIndex.map(x => x.el);
    
    inferredFocusOrder.forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      const top = rect.top + window.pageYOffset;
      const left = rect.left + window.pageXOffset;
      
      const badge = document.createElement("div");
      badge.textContent = index + 1;
      badge.className = "a11y-focus-badge";
      badge.style.position = "absolute";
      badge.style.top = `${top}px`;
      badge.style.left = `${left}px`;
      badge.style.width = "20px";
      badge.style.height = "20px";
      badge.style.borderRadius = "50%";
      badge.style.backgroundColor = "#3730A3";
      badge.style.color = "#FFFFFF";
      badge.style.fontSize = "11px";
      badge.style.fontFamily = "monospace";
      badge.style.fontWeight = "bold";
      badge.style.display = "flex";
      badge.style.alignItems = "center";
      badge.style.justifyContent = "center";
      badge.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
      badge.style.transform = "translate(-50%, -50%)";
      badge.style.zIndex = "999999";
      
      overlay.appendChild(badge);
    });
    
    let currentIndex = 0;
    function animateScroll() {
      if (!focusOverlayActive || currentIndex >= inferredFocusOrder.length) {
        if (port) {
          try {
            port.postMessage({ type: "FOCUS_OVERLAY_DONE", count: inferredFocusOrder.length });
          } catch (_) {}
        }
        return;
      }
      
      const el = inferredFocusOrder[currentIndex];
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      
      currentIndex++;
      setTimeout(animateScroll, 300);
    }
    
    animateScroll();
  }

  async function startTabSimulation(port) {
    const issues = [];
    const actualFocusOrder = [];
    
    function onFocusCapture(e) {
      if (e.target && e.target !== document && e.target !== window && e.target !== document.body && e.target !== document.documentElement) {
        if (!actualFocusOrder.includes(e.target)) {
          actualFocusOrder.push(e.target);
        }
      }
    }
    
    document.addEventListener("focus", onFocusCapture, true);
    
    if (inferredFocusOrder.length > 0) {
      inferredFocusOrder[0].focus();
      actualFocusOrder.push(inferredFocusOrder[0]);
    }
    
    let simulatedSteps = 0;
    const maxSteps = Math.min(50, inferredFocusOrder.length);
    
    for (let i = 0; i < maxSteps; i++) {
      const currentActive = document.activeElement;
      
      const keydownEvent = new KeyboardEvent("keydown", {
        key: "Tab",
        code: "Tab",
        keyCode: 9,
        which: 9,
        bubbles: true,
        cancelable: true
      });
      
      if (currentActive) {
        currentActive.dispatchEvent(keydownEvent);
      }
      
      await new Promise(r => setTimeout(r, 150));
      
      if (document.activeElement === currentActive) {
        const nextIndex = inferredFocusOrder.indexOf(currentActive) + 1;
        if (nextIndex < inferredFocusOrder.length) {
          inferredFocusOrder[nextIndex].focus();
        }
      }
    }
    
    document.removeEventListener("focus", onFocusCapture, true);
    
    let discrepancies = 0;
    actualFocusOrder.forEach((el, index) => {
      const inferredIdx = inferredFocusOrder.indexOf(el);
      if (inferredIdx === -1) {
        discrepancies++;
        issues.push({
          severity: "warning",
          message: `Simulated focus reached element ${getSelector(el)} which was not found in DOM-inferred focus order.`,
          wcag: "2.4.3",
          element: getSelector(el)
        });
      } else if (inferredIdx !== index) {
        discrepancies++;
        issues.push({
          severity: "warning",
          message: `Focus sequence mismatch: simulated order placed ${getSelector(el)} at position ${index + 1}, but DOM-inferred order expected it at position ${inferredIdx + 1}.`,
          wcag: "2.4.3",
          element: getSelector(el)
        });
      }
    });
    
    if (port) {
      try {
        port.postMessage({
          type: "TAB_SIMULATION_DONE",
          issues: issues,
          discrepancies: discrepancies
        });
      } catch (_) {}
    }
  }

  // ── Main runner ──────────────────────────────────────────
  async function runAnalysis(port) {
    const steps = [
      { id: "meta",          label: "Reading page metadata…",       pct: 4,  fn: getPageMeta },
      { id: "landmarks",     label: "Checking landmark regions…",   pct: 10, fn: checkLandmarks },
      { id: "aria",          label: "Auditing ARIA attributes…",    pct: 16, fn: checkARIA },
      { id: "images",        label: "Checking images & media…",     pct: 22, fn: checkImages },
      { id: "forms",         label: "Analyzing form accessibility…", pct: 28, fn: checkForms },
      { id: "keyboard",      label: "Testing keyboard support…",    pct: 34, fn: checkKeyboard },
      { id: "headings",      label: "Auditing heading structure…",  pct: 40, fn: checkHeadings },
      { id: "links",         label: "Checking links & buttons…",    pct: 46, fn: checkLinksButtons },
      { id: "contrast",      label: "Checking color contrast…",    pct: 52, fn: checkContrast },
      { id: "inlineLang",     label: "Checking inline languages…",   pct: 58, fn: checkInlineLang },
      { id: "duplicateIds",   label: "Checking duplicate element IDs…", pct: 64, fn: checkDuplicateIds },
      { id: "reducedMotion",  label: "Auditing animations & motion…",  pct: 70, fn: checkReducedMotion },
      { id: "touchTargets",   label: "Measuring touch target sizes…", pct: 76, fn: checkTouchTargets },
      { id: "autoplayMedia",  label: "Checking autoplaying media…",  pct: 82, fn: checkAutoplayMedia },
      { id: "reflow",         label: "Simulating 400% zoom reflow…",  pct: 88, fn: checkReflow },
      { id: "readingLevel",   label: "Analyzing reading level…",      pct: 95, fn: checkReadingLevel },
    ];

    const results = {};

    for (const step of steps) {
      try { port.postMessage({ type: "PROGRESS", step: step.id, label: step.label, pct: step.pct }); } catch (_) {}
      await new Promise((r) => setTimeout(r, 280));
      results[step.id] = await step.fn();
    }

    // ── Weighted score calculation ──────────────────────────
    // Suggested Rebalanced Weight Table (Sums to 100):
    // landmarks (8), aria (9), images (8), forms (9), keyboard (9), headings (6), links (4), contrast (9)
    // inlineLang (5), duplicateIds (5), reducedMotion (6), touchTargets (7), autoplayMedia (5), reflow (5), readingLevel (5)
    const weights = {
      landmarks: 8,
      aria: 9,
      images: 8,
      forms: 9,
      keyboard: 9,
      headings: 6,
      links: 4,
      contrast: 9,
      inlineLang: 5,
      duplicateIds: 5,
      reducedMotion: 6,
      touchTargets: 7,
      autoplayMedia: 5,
      reflow: 5,
      readingLevel: 5
    };
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    const weightedScore = Object.entries(weights).reduce((acc, [key, w]) => {
      return acc + (results[key]?.score ?? 100) * (w / totalWeight);
    }, 0);

    // ── Flatten all issues ──────────────────────────────────
    const allIssues = [];
    for (const [cat, data] of Object.entries(results)) {
      if (cat === "meta") continue;
      (data.issues || []).forEach((issue) => {
        allIssues.push({ ...issue, category: cat });
      });
    }

    const criticalCount = allIssues.filter((i) => i.severity === "critical").length;
    const warningCount  = allIssues.filter((i) => i.severity === "warning").length;
    const infoCount     = allIssues.filter((i) => i.severity === "info").length;

    try {
      port.postMessage({
        type: "RESULT",
        data: {
          meta: results.meta,
          scores: {
            overall:        Math.round(weightedScore),
            landmarks:      results.landmarks.score,
            aria:           results.aria.score,
            images:         results.images.score,
            forms:          results.forms.score,
            keyboard:       results.keyboard.score,
            headings:       results.headings.score,
            links:          results.links.score,
            contrast:       results.contrast.score,
            inlineLang:     results.inlineLang.score,
            duplicateIds:   results.duplicateIds.score,
            reducedMotion:  results.reducedMotion.score,
            touchTargets:   results.touchTargets.score,
            autoplayMedia:  results.autoplayMedia.score,
            reflow:         results.reflow.score,
            readingLevel:   results.readingLevel.score,
          },
          issues: allIssues,
          summary: { critical: criticalCount, warning: warningCount, info: infoCount, total: allIssues.length },
          foundCounts: {
            landmarks:      results.landmarks.found,
            images:         results.images.counts,
            forms:          results.forms.counts,
            keyboard:       results.keyboard.counts,
            headings:       results.headings.counts,
            links:          results.links.counts,
            contrast:       results.contrast.counts,
            inlineLang:     results.inlineLang.counts,
            duplicateIds:   results.duplicateIds.counts,
            reducedMotion:  results.reducedMotion.counts,
            touchTargets:   results.touchTargets.counts,
            autoplayMedia:  results.autoplayMedia.counts,
            reflow:         results.reflow.counts,
            readingLevel:   results.readingLevel.counts,
          },
        },
      });
    } catch (_) {}
  }

  // ── Port-based listener ───────────────────────────────────
  // Using long-lived ports instead of runtime.sendMessage so
  // messages reliably reach the popup without a service worker.
  if (window.__a11yAnalyzerPort) {
    try { window.__a11yAnalyzerPort.disconnect(); } catch (_) {}
  }

  chrome.runtime.onConnect.addListener(function onConnect(port) {
    if (port.name !== "a11y-analysis") return;
    window.__a11yAnalyzerPort = port;

    port.onMessage.addListener((msg) => {
      if (msg.type === "START_ANALYSIS") {
        runAnalysis(port);
      } else if (msg.type === "START_FOCUS_OVERLAY") {
        startFocusOverlay(port);
      } else if (msg.type === "START_TAB_SIMULATION") {
        startTabSimulation(port);
      } else if (msg.type === "CLEAR_FOCUS_OVERLAY") {
        focusOverlayActive = false;
        const overlay = document.getElementById("a11y-focus-overlay");
        if (overlay) overlay.remove();
        try { port.postMessage({ type: "FOCUS_OVERLAY_CLEARED" }); } catch (_) {}
      }
    });

    port.onDisconnect.addListener(() => {
      focusOverlayActive = false;
      const overlay = document.getElementById("a11y-focus-overlay");
      if (overlay) overlay.remove();
    });
  });

})();
