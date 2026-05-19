// ============================================================
// A11y Analyzer — popup.js
// Controls all 3 screens and communicates with content.js
// ============================================================

"use strict";

// ── DOM refs ─────────────────────────────────────────────────
const screenInfo    = document.getElementById("screen-info");
const screenLoading = document.getElementById("screen-loading");
const screenResults = document.getElementById("screen-results");

const btnAnalyze  = document.getElementById("btn-analyze");
const btnDownload = document.getElementById("btn-download");
const btnRerun    = document.getElementById("btn-rerun");

// Screen 1
const elDomain      = document.getElementById("site-domain");
const elProtoBadge  = document.getElementById("protocol-badge");
const elLang        = document.getElementById("info-lang");
const elInteractive = document.getElementById("info-interactive");
const elImages      = document.getElementById("info-images");
const elHeadings    = document.getElementById("info-headings");
const elViewport    = document.getElementById("info-viewport");
const elHttps       = document.getElementById("info-https");

// Screen 3
const elS3ScoreNumber   = document.getElementById("s3-score-number");
const elS3WebsiteName   = document.getElementById("s3-website-name");
const elS3ReportSummary = document.getElementById("s3-report-summary");
const elS3Tag1          = document.getElementById("s3-tag-1");
const elS3Tag2          = document.getElementById("s3-tag-2");
const elS3InfoLang      = document.getElementById("s3-info-lang");
const elS3InfoInteractive = document.getElementById("s3-info-interactive");
const elS3InfoImages    = document.getElementById("s3-info-images");
const elS3InfoHeadings  = document.getElementById("s3-info-headings");
const elS3InfoViewport  = document.getElementById("s3-info-viewport");
const elS3InfoProtocol  = document.getElementById("s3-info-protocol");

// ── State ────────────────────────────────────────────────────
let activeTab  = null;
var auditData  = null;
const completedSteps = [];

// ── Translations ──────────────────────────────────────────────
const translations = {
  en: {
    headerTitle: "A11Y Analyzer",
    btnAnalyze: "Run Audit",
    btnRerun: "Re-audit",
    btnDownload: "Download Report",
    labelLang: "Language",
    labelInteractive: "Interactive",
    labelImages: "Images",
    labelHeadings: "Headings",
    labelViewport: "Viewport",
    labelProtocol: "Protocol",
    secure: "Secure",
    insecure: "Insecure",
    present: "Present",
    missing: "Missing",
    elements: "elements",
    total: "total",
    loadingScanning: "Scanning page…",
    loadingMeta: "Reading page metadata…",
    loadingLandmarks: "Checking landmark regions…",
    loadingAria: "Auditing ARIA attributes…",
    loadingImages: "Checking images & media…",
    loadingForms: "Analyzing form accessibility…",
    loadingKeyboard: "Testing keyboard support…",
    loadingHeadings: "Auditing heading structure…",
    loadingLinks: "Checking links & buttons…",
    loadingContrast: "Checking color contrast…",
    loadingInlineLang: "Checking inline languages…",
    loadingDuplicateIds: "Checking duplicate element IDs…",
    loadingReducedMotion: "Auditing animations & motion…",
    loadingTouchTargets: "Measuring touch target sizes…",
    loadingAutoplayMedia: "Checking autoplaying media…",
    loadingReflow: "Simulating 400% zoom reflow…",
    errorRestrictedTitle: "Analysis Restricted",
    errorRestrictedDesc: "Standard browser security policies prevent extensions from running audits on system settings, internal pages, or the Web Store.",
    errorRestrictedBtn: "Visit Webpage",
    errorInterruptedTitle: "Connection Interrupted",
    errorInterruptedDesc: "Connection to the page was lost. Please try reloading it first.",
    errorInterruptedBtn: "Reload Tab",
    summaryExcellent: "Excellent accessibility",
    summaryGood: "Good with minor issues",
    summaryNeedsImp: "Needs improvement",
    summaryPoor: "Poor accessibility",
    badgePassing: "Passing",
    badgeFailing: "Failing",
    badgeCritical: "Critical",
    badgeNoCritical: "No Critical"
  },
  ko: {
    headerTitle: "A11Y 분석기",
    btnAnalyze: "정밀 진단 시작",
    btnRerun: "재정밀 진단",
    btnDownload: "보고서 다운로드",
    labelLang: "언어",
    labelInteractive: "대화형 요소",
    labelImages: "이미지",
    labelHeadings: "제목 구조",
    labelViewport: "뷰포트",
    labelProtocol: "프로토콜",
    secure: "안전함",
    insecure: "보안 취약",
    present: "지정됨",
    missing: "누락됨",
    elements: "개",
    total: "개",
    loadingScanning: "페이지 분석 중…",
    loadingMeta: "페이지 메타데이터 분석 중…",
    loadingLandmarks: "랜드마크 영역 검사 중…",
    loadingAria: "ARIA 속성 진단 중…",
    loadingImages: "이미지 및 미디어 검사 중…",
    loadingForms: "폼 접근성 분석 중…",
    loadingKeyboard: "키보드 지원 테스트 중…",
    loadingHeadings: "제목 구조 진단 중…",
    loadingLinks: "링크 및 버튼 검사 중…",
    loadingContrast: "색상 대비 진단 중…",
    loadingInlineLang: "인라인 언어 지정 검사 중…",
    loadingDuplicateIds: "중복 요소 ID 검사 중…",
    loadingReducedMotion: "동적 효과 및 모션 검사 중…",
    loadingTouchTargets: "터치 대상 영역 계측 중…",
    loadingAutoplayMedia: "자동 재생 미디어 체크 중…",
    loadingReflow: "400% 화면 확대 리플로우 시뮬레이션 중…",
    errorRestrictedTitle: "분석 제한됨",
    errorRestrictedDesc: "브라우저 보안 정책으로 인해 시스템 설정, 내부 페이지 또는 확장 프로그램 웹 스토어에서는 접근성 진단을 실행할 수 없습니다.",
    errorRestrictedBtn: "웹페이지 방문",
    errorInterruptedTitle: "연결 오류 발생",
    errorInterruptedDesc: "페이지와의 연결이 원활하지 않습니다. 먼저 페이지를 새로고침한 후 다시 실행해 주세요.",
    errorInterruptedBtn: "탭 새로고침",
    summaryExcellent: "우수한 웹 접근성",
    summaryGood: "보통 (사소한 문제 있음)",
    summaryNeedsImp: "보완 필요 (접근성 취약)",
    summaryPoor: "매우 취약 (개선 시급)",
    badgePassing: "합격",
    badgeFailing: "불합격",
    badgeCritical: "치명적 오류",
    badgeNoCritical: "오류 없음"
  }
};

let currentLang = localStorage.getItem("a11y-lang") || "en";

function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("a11y-lang", lang);

  // Sync data-lang attribute on all switch buttons in DOM
  const switchBtns = document.querySelectorAll(".header-lang-switch");
  switchBtns.forEach(btn => {
    btn.setAttribute("data-lang", lang);
  });

  const t = translations[lang];

  // 1. Headers
  const headerS1 = document.getElementById("header-title-s1");
  const headerS2 = document.getElementById("header-title-s2");
  const headerS3 = document.getElementById("header-title-s3");
  if (headerS1) headerS1.textContent = t.headerTitle;
  if (headerS2) headerS2.textContent = t.headerTitle;
  if (headerS3) headerS3.textContent = t.headerTitle;

  // 2. Screen 1 Static Text
  const lblLang = document.getElementById("info-label-lang");
  const lblInteractive = document.getElementById("info-label-interactive");
  const lblImages = document.getElementById("info-label-images");
  const lblHeadings = document.getElementById("info-label-headings");
  const lblViewport = document.getElementById("info-label-viewport");
  const lblProtocol = document.getElementById("info-label-protocol");
  if (lblLang) lblLang.textContent = t.labelLang;
  if (lblInteractive) lblInteractive.textContent = t.labelInteractive;
  if (lblImages) lblImages.textContent = t.labelImages;
  if (lblHeadings) lblHeadings.textContent = t.labelHeadings;
  if (lblViewport) lblViewport.textContent = t.labelViewport;
  if (lblProtocol) lblProtocol.textContent = t.labelProtocol;

  const btnAnalyzeText = document.getElementById("btn-analyze-text");
  if (btnAnalyzeText) btnAnalyzeText.textContent = t.btnAnalyze;

  // 3. Screen 3 Static Text
  const s3LblLang = document.getElementById("s3-label-lang");
  const s3LblInteractive = document.getElementById("s3-label-interactive");
  const s3LblImages = document.getElementById("s3-label-images");
  const s3LblHeadings = document.getElementById("s3-label-headings");
  const s3LblViewport = document.getElementById("s3-label-viewport");
  const s3LblProtocol = document.getElementById("s3-label-protocol");
  if (s3LblLang) s3LblLang.textContent = t.labelLang;
  if (s3LblInteractive) s3LblInteractive.textContent = t.labelInteractive;
  if (s3LblImages) s3LblImages.textContent = t.labelImages;
  if (s3LblHeadings) s3LblHeadings.textContent = t.labelHeadings;
  if (s3LblViewport) s3LblViewport.textContent = t.labelViewport;
  if (s3LblProtocol) s3LblProtocol.textContent = t.labelProtocol;

  const btnRerunText = document.getElementById("btn-rerun-text");
  const btnDownloadText = document.getElementById("btn-download-text");
  if (btnRerunText) btnRerunText.textContent = t.btnRerun;
  if (btnDownloadText) btnDownloadText.textContent = t.btnDownload;

  // 4. Translate restricted/error views if visible
  const elScannerError = document.getElementById("scanner-error");
  if (elScannerError && elScannerError.style.display !== "none") {
    const elScannerErrorTitle = document.getElementById("scanner-error-title");
    const elScannerErrorDesc  = document.getElementById("scanner-error-desc");
    const elBtnErrorText      = document.getElementById("btn-error-text");
    
    const url = activeTab?.url || "";
    const isRestricted = url.startsWith("chrome://") || 
                         url.startsWith("whale://") || 
                         url.startsWith("edge://") || 
                         url.startsWith("about:") || 
                         url.includes("chromewebstore.google.com") || 
                         url.includes("chrome.google.com/webstore");
                         
    if (isRestricted) {
      if (elScannerErrorTitle) elScannerErrorTitle.textContent = t.errorRestrictedTitle;
      if (elScannerErrorDesc) elScannerErrorDesc.textContent = t.errorRestrictedDesc;
      if (elBtnErrorText) elBtnErrorText.textContent = t.errorRestrictedBtn;
    } else {
      if (elScannerErrorTitle) elScannerErrorTitle.textContent = t.errorInterruptedTitle;
      if (elScannerErrorDesc) elScannerErrorDesc.textContent = t.errorInterruptedDesc;
      if (elBtnErrorText) elBtnErrorText.textContent = t.errorInterruptedBtn;
    }
  }

  // 5. Translate dynamic labels or load page meta again
  if (auditData) {
    renderResults(auditData);
  } else {
    loadPageInfo();
  }
}

function setupLanguageSwitcher() {
  const switchBtns = document.querySelectorAll(".header-lang-switch");
  switchBtns.forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const nextLang = currentLang === "en" ? "ko" : "en";
      applyLanguage(nextLang);
    };
  });
}

// Category display config
const CATEGORIES = [
  {
    key: "keyboard",
    label: "Keyboard Nav",
    icon: `<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M224,48H32A16,16,0,0,0,16,64V192a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V64A16,16,0,0,0,224,48Zm0,144H32V64H224V192Zm-16-64a8,8,0,0,1-8,8H56a8,8,0,0,1,0-16H200A8,8,0,0,1,208,128Zm0-32a8,8,0,0,1-8,8H56a8,8,0,0,1,0-16H200A8,8,0,0,1,208,96ZM72,160a8,8,0,0,1-8,8H56a8,8,0,0,1,0-16h8A8,8,0,0,1,72,160Zm96,0a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,160Zm40,0a8,8,0,0,1-8,8h-8a8,8,0,0,1,0-16h8A8,8,0,0,1,208,160Z"/></svg>`,
  },
  {
    key: "aria",
    label: "ARIA",
    icon: `<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M128,24h0A104,104,0,1,0,232,128,104.12,104.12,0,0,0,128,24Zm88,104a87.61,87.61,0,0,1-3.33,24H174.16a157.44,157.44,0,0,0,0-48h38.51A87.61,87.61,0,0,1,216,128ZM102,168H154a115.11,115.11,0,0,1-26,45A115.27,115.27,0,0,1,102,168Zm-3.9-16a140.84,140.84,0,0,1,0-48h59.88a140.84,140.84,0,0,1,0,48ZM40,128a87.61,87.61,0,0,1,3.33-24H81.84a157.44,157.44,0,0,0,0,48H43.33A87.61,87.61,0,0,1,40,128ZM154,88H102a115.11,115.11,0,0,1,26-45A115.27,115.27,0,0,1,154,88Zm52.33,0H170.71a135.28,135.28,0,0,0-22.3-45.6A88.29,88.29,0,0,1,206.37,88ZM107.59,42.4A135.28,135.28,0,0,0,85.29,88H49.63A88.29,88.29,0,0,1,107.59,42.4ZM49.63,168H85.29a135.28,135.28,0,0,0,22.3,45.6A88.29,88.29,0,0,1,49.63,168Zm98.78,45.6a135.28,135.28,0,0,0,22.3-45.6h35.66A88.29,88.29,0,0,1,148.41,213.6Z"/></svg>`,
  },
  {
    key: "landmarks",
    label: "Landmarks",
    icon: `<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M240,208H224V96a16,16,0,0,0-16-16H144V32a16,16,0,0,0-24.88-13.32L39.12,72A16,16,0,0,0,32,85.34V208H16a8,8,0,0,0,0,16H240a8,8,0,0,0,0-16ZM208,96V208H144V96ZM48,85.34,128,32V208H48ZM112,112v16a8,8,0,0,1-16,0V112a8,8,0,1,1,16,0Zm-32,0v16a8,8,0,0,1-16,0V112a8,8,0,1,1,16,0Zm0,56v16a8,8,0,0,1-16,0V168a8,8,0,0,1,16,0Zm32,0v16a8,8,0,0,1-16,0V168a8,8,0,0,1,16,0Z"/></svg>`,
  },
  {
    key: "forms",
    label: "Forms",
    icon: `<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Zm-32-80a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,136Zm0,32a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,168Z"/></svg>`,
  },
  {
    key: "images",
    label: "Images",
    icon: `<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,16V158.75l-26.07-26.06a16,16,0,0,0-22.63,0l-20,20-44-44a16,16,0,0,0-22.62,0L40,149.37V56ZM40,172l52-52,80,80H40Zm176,28H194.63l-36-36,20-20L216,181.38V200ZM144,100a12,12,0,1,1,12,12A12,12,0,0,1,144,100Z"/></svg>`,
  },
  {
    key: "headings",
    label: "Headings",
    icon: `<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M208,56V200a8,8,0,0,1-16,0V136H64v64a8,8,0,0,1-16,0V56a8,8,0,0,1,16,0v64H192V56a8,8,0,0,1,16,0Z"/></svg>`,
  },
  {
    key: "links",
    label: "Links & Buttons",
    icon: `<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M240,88.23a54.43,54.43,0,0,1-16,37L189.25,160a54.27,54.27,0,0,1-38.63,16h-.05A54.63,54.63,0,0,1,96,119.84a8,8,0,0,1,16,.45A38.62,38.62,0,0,0,150.58,160h0a38.39,38.39,0,0,0,27.31-11.31l34.75-34.75a38.63,38.63,0,0,0-54.63-54.63l-11,11A8,8,0,0,1,135.7,59l11-11A54.65,54.65,0,0,1,224,48,54.86,54.86,0,0,1,240,88.23ZM109,185.66l-11,11A38.41,38.41,0,0,1,70.6,208h0a38.63,38.63,0,0,1-27.29-65.94L78,107.31A38.63,38.63,0,0,1,144,135.71a8,8,0,0,0,16,.45A54.86,54.86,0,0,0,144,96a54.65,54.65,0,0,0-77.27,0L32,130.75A54.62,54.62,0,0,0,70.56,224h0a54.28,54.28,0,0,0,38.64-16l11-11A8,8,0,0,0,109,185.66Z"/></svg>`,
  },
  {
    key: "contrast",
    label: "Contrast",
    icon: `<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM40,128a88,88,0,0,1,88-88V216A88,88,0,0,1,40,128Z"/></svg>`,
  },
  {
    key: "inlineLang",
    label: "Inline Lang",
    icon: `<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-124a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H128A8,8,0,0,1,120,92Zm0,48a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H128A8,8,0,0,1,120,140Z"/></svg>`,
  },
  {
    key: "duplicateIds",
    label: "Duplicate IDs",
    icon: `<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M216,40H88A16,16,0,0,0,72,56V72H56A16,16,0,0,0,40,88V200a16,16,0,0,0,16,16H168a16,16,0,0,0,16-16V184h16a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM168,200H56V88H168V200Zm32-32H184V88a16,16,0,0,0-16-16H88V56H200Z"/></svg>`,
  },
  {
    key: "reducedMotion",
    label: "Reduced Motion",
    icon: `<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M208,40H48A16,16,0,0,0,32,56V200a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V56A16,16,0,0,0,208,40Zm0,160H48V56H208V200ZM173.66,98.34a8,8,0,0,1,0,11.32l-32,32a8,8,0,0,1-11.32-11.32L156.69,104H96a8,8,0,0,1,0-16h60.69l-26.35-26.34a8,8,0,0,1,11.32-11.32ZM93.66,158.34,125.66,190.34a8,8,0,0,1-11.32,11.32L82.34,169.66a8,8,0,0,1,0-11.32l32-32a8,8,0,0,1,11.32,11.32Z"/></svg>`,
  },
  {
    key: "touchTargets",
    label: "Touch Targets",
    icon: `<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M200,80a8,8,0,0,0-8,8v40a8,8,0,0,0,16,0V88A8,8,0,0,0,200,80Zm-40-16a8,8,0,0,0-8,8v56a8,8,0,0,0,16,0V72A8,8,0,0,0,160,64Zm-40-16a8,8,0,0,0-8,8v72a8,8,0,0,0,16,0V56A8,8,0,0,0,120,48ZM80,88V152.6L63.38,131.79a16,16,0,0,0-24.76,20.24L79,203.41A40,40,0,0,0,111.45,216H184a40,40,0,0,0,40-40V136a8,8,0,0,0-16,0v40a24,24,0,0,1-24,24H111.45a24,24,0,0,1-19.47-10L49.91,152.54a8,8,0,0,1,12.38-10.12L80,164.5V88A8,8,0,0,0,80,80ZM120,160h40a8,8,0,0,0,0-16H120a8,8,0,0,0,0,16Z"/></svg>`,
  },
  {
    key: "autoplayMedia",
    label: "Autoplay Media",
    icon: `<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M160,32V224a8,8,0,0,1-12.91,6.31L77.09,176H32a16,16,0,0,1-16-16V96A16,16,0,0,1,32,80H77.09l70-54.31A8,8,0,0,1,160,32Zm-16,21.88L84.91,99.31A8,8,0,0,1,80,101H32v54H80a8,8,0,0,1,4.91,1.69L144,202.12ZM216,128a39.9,39.9,0,0,1-11.72,28.28,8,8,0,1,1-11.31-11.31A23.94,23.94,0,0,0,200,128a23.94,23.94,0,0,0-7.03-17,8,8,0,1,1,11.31-11.31A39.9,39.9,0,0,1,216,128Z"/></svg>`,
  },
  {
    key: "reflow",
    label: "Reflow Zoom",
    icon: `<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M224,48H32A16,16,0,0,0,16,64V192a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V64A16,16,0,0,0,224,48Zm0,144H32V64H224V192Zm-24-72a8,8,0,0,1-8,8H64a8,8,0,0,1,0-16H192A8,8,0,0,1,200,120Z"/></svg>`,
  },
];

// ── Screen transitions ────────────────────────────────────────
function showScreen(screen) {
  [screenInfo, screenLoading, screenResults].forEach((s) => {
    s.classList.remove("active");
    s.setAttribute("aria-hidden", "true");
  });
  screen.classList.add("active");
  screen.removeAttribute("aria-hidden");
}

// ── Page meta loader (Screen 1) ───────────────────────────────
async function loadPageInfo() {
  const t = translations[currentLang];
  if (typeof chrome === "undefined" || !chrome.tabs) {
    elDomain.textContent = "example.com";
    elProtoBadge.textContent = "HTTPS";
    elProtoBadge.setAttribute("data-secure", "true");
    
    elHttps.textContent = t.secure;
    elHttps.setAttribute("data-state", "pass");
    
    elLang.textContent = "en";
    elLang.setAttribute("data-state", "pass");
    
    elInteractive.textContent = `12 ${t.elements}`;
    elInteractive.removeAttribute("data-state");
    
    elImages.textContent = `3 ${t.total}`;
    elImages.removeAttribute("data-state");
    
    elHeadings.textContent = `3 ${t.total}`;
    elHeadings.removeAttribute("data-state");
    
    elViewport.textContent = t.present;
    elViewport.setAttribute("data-state", "pass");

    // Set fallback favicon left of domain
    const fallbackFavicon = `https://www.google.com/s2/favicons?domain=example.com&sz=32`;
    const siteFavicon = document.getElementById("site-favicon");
    const siteFaviconBox = document.getElementById("site-favicon-box");
    if (siteFavicon && siteFaviconBox) {
      siteFavicon.src = fallbackFavicon;
      siteFaviconBox.style.display = "flex";
    }
    return;
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTab = tab;

  const url   = new URL(tab.url);
  const https = url.protocol === "https:";

  elDomain.textContent    = url.hostname;
  elProtoBadge.textContent = https ? "HTTPS" : "HTTP";
  elProtoBadge.setAttribute("data-secure", https ? "true" : "false");
  elHttps.textContent      = https ? t.secure : t.insecure;
  elHttps.setAttribute("data-state", https ? "pass" : "fail");

  // Set active tab's favicon (or reliable Google favicon fallback) left of domain
  const favIconUrl = tab.favIconUrl || `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`;
  const siteFavicon = document.getElementById("site-favicon");
  const siteFaviconBox = document.getElementById("site-favicon-box");
  if (siteFavicon && siteFaviconBox) {
    siteFavicon.src = favIconUrl;
    siteFaviconBox.style.display = "flex";
  }

  const metaPromise = new Promise((resolve) => {
    const handler = (msg) => {
      if (msg.type === "META") {
        chrome.runtime.onMessage.removeListener(handler);
        resolve(msg.data);
      }
    };
    chrome.runtime.onMessage.addListener(handler);
    setTimeout(() => resolve(null), 4000);
  });

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files:  ["meta.js"],
    });
    const m = await metaPromise;
    if (m) {
      elLang.textContent        = m.lang || "None";
      elLang.setAttribute("data-state", m.lang ? "pass" : "fail");
      
      elInteractive.textContent = `${m.interactive} ${t.elements}`;
      elInteractive.removeAttribute("data-state");
      
      elImages.textContent      = `${m.images} ${t.total}`;
      elImages.removeAttribute("data-state");
      
      elHeadings.textContent    = `${m.headings} ${t.total}`;
      elHeadings.removeAttribute("data-state");
      
      elViewport.textContent    = m.viewport ? t.present : t.missing;
      elViewport.setAttribute("data-state", m.viewport ? "pass" : "fail");
    } else {
      throw new Error("timeout");
    }
  } catch {
    elLang.textContent        = "—";
    elLang.removeAttribute("data-state");
    
    elInteractive.textContent = "—";
    elInteractive.removeAttribute("data-state");
    
    elImages.textContent      = "—";
    elImages.removeAttribute("data-state");
    
    elHeadings.textContent    = "—";
    elHeadings.removeAttribute("data-state");
    
    elViewport.textContent    = "—";
    elViewport.removeAttribute("data-state");
  }
}

// ── Progress updates (Screen 2) ───────────────────────────────
const elLoadingStatus = document.getElementById("loading-status");

function updateLoadingStatus(label) {
  if (!elLoadingStatus) return;
  const t = translations[currentLang];
  
  let displayLabel = label;
  if (label === "Scanning page…") displayLabel = t.loadingScanning;
  else if (label === "Reading page metadata…") displayLabel = t.loadingMeta;
  else if (label === "Checking landmark regions…") displayLabel = t.loadingLandmarks;
  else if (label === "Auditing ARIA attributes…") displayLabel = t.loadingAria;
  else if (label === "Checking images & media…") displayLabel = t.loadingImages;
  else if (label === "Analyzing form accessibility…") displayLabel = t.loadingForms;
  else if (label === "Testing keyboard support…") displayLabel = t.loadingKeyboard;
  else if (label === "Auditing heading structure…") displayLabel = t.loadingHeadings;
  else if (label === "Checking links & buttons…") displayLabel = t.loadingLinks;
  else if (label === "Checking color contrast…") displayLabel = t.loadingContrast;
  else if (label === "Checking inline languages…") displayLabel = t.loadingInlineLang;
  else if (label === "Checking duplicate element IDs…") displayLabel = t.loadingDuplicateIds;
  else if (label === "Auditing animations & motion…") displayLabel = t.loadingReducedMotion;
  else if (label === "Measuring touch target sizes…") displayLabel = t.loadingTouchTargets;
  else if (label === "Checking autoplaying media…") displayLabel = t.loadingAutoplayMedia;
  else if (label === "Simulating 400% zoom reflow…") displayLabel = t.loadingReflow;

  elLoadingStatus.textContent = displayLabel;
}

// ── Error state ───────────────────────────────────────────────
function showError(msg) {
  console.error("Analysis failed:", msg);
  const t = translations[currentLang];
  
  const activeView = document.getElementById("scanner-active");
  if (activeView) activeView.style.display = "none";
  
  const elScannerError      = document.getElementById("scanner-error");
  const elScannerErrorTitle = document.getElementById("scanner-error-title");
  const elScannerErrorDesc  = document.getElementById("scanner-error-desc");
  const elScannerErrorIcon  = document.getElementById("scanner-error-icon");
  const elBtnErrorAction    = document.getElementById("btn-error-action");
  const elBtnErrorText      = document.getElementById("btn-error-text");
  const elIconBox           = document.getElementById("scanner-error-icon-box");

  const url = activeTab?.url || "";
  const isRestricted = url.startsWith("chrome://") || 
                       url.startsWith("whale://") || 
                       url.startsWith("edge://") || 
                       url.startsWith("about:") || 
                       url.includes("chromewebstore.google.com") || 
                       url.includes("chrome.google.com/webstore");

  if (elScannerError) {
    elScannerError.style.display = "flex";
    
    if (isRestricted) {
      if (elScannerErrorTitle) elScannerErrorTitle.textContent = t.errorRestrictedTitle;
      if (elScannerErrorDesc) elScannerErrorDesc.textContent = t.errorRestrictedDesc;
      
      if (elIconBox) elIconBox.className = "s2-error-icon-box warning-icon";
      if (elScannerErrorIcon) elScannerErrorIcon.className = "ph ph-prohibit";
      if (elBtnErrorText) elBtnErrorText.textContent = t.errorRestrictedBtn;
      
      if (elBtnErrorAction) {
        elBtnErrorAction.onclick = () => {
          if (typeof chrome !== "undefined" && chrome.tabs) {
            chrome.tabs.create({ url: "https://www.google.com" });
          }
          window.close();
        };
      }
    } else {
      if (elScannerErrorTitle) elScannerErrorTitle.textContent = t.errorInterruptedTitle;
      if (elScannerErrorDesc) {
        let displayError = msg;
        if (!msg || msg.includes("lost") || msg.includes("disconnect")) {
          displayError = t.errorInterruptedDesc;
        }
        elScannerErrorDesc.textContent = displayError;
      }
      
      if (elIconBox) elIconBox.className = "s2-error-icon-box";
      if (elScannerErrorIcon) elScannerErrorIcon.className = "ph ph-warning-circle";
      if (elBtnErrorText) elBtnErrorText.textContent = t.errorInterruptedBtn;
      
      if (elBtnErrorAction) {
        elBtnErrorAction.onclick = async () => {
          if (typeof chrome !== "undefined" && chrome.tabs && activeTab) {
            try {
              await chrome.tabs.reload(activeTab.id);
            } catch (_) {}
          }
          window.close();
        };
      }
    }
  }
}

async function startAnalysis() {
  const activeView = document.getElementById("scanner-active");
  if (activeView) activeView.style.display = "";
  
  const scannerError = document.getElementById("scanner-error");
  if (scannerError) scannerError.style.display = "none";

  const icon = document.querySelector(".scanner-status__icon");
  if (icon) {
    icon.className = "ph ph-circle-notch spinner-anim scanner-status__icon";
    icon.style.color = "";
  }
  if (elLoadingStatus) {
    elLoadingStatus.textContent = translations[currentLang].loadingScanning;
    elLoadingStatus.style.color = "";
  }

  showScreen(screenLoading);

  if (typeof chrome === "undefined" || !chrome.tabs || !activeTab) {
    // Standalone Web Browser Mock Demo Mode
    const labels = [
      "Scanning page…",
      "Reading page metadata…",
      "Checking landmark regions…",
      "Auditing ARIA attributes…",
      "Checking images & media…",
      "Analyzing form accessibility…",
      "Testing keyboard support…",
      "Auditing heading structure…",
      "Checking links & buttons…",
      "Checking color contrast…",
      "Checking inline languages…",
      "Checking duplicate element IDs…",
      "Auditing animations & motion…",
      "Measuring touch target sizes…",
      "Checking autoplaying media…",
      "Simulating 400% zoom reflow…"
    ];
    for (let i = 0; i < labels.length; i++) {
      updateLoadingStatus(labels[i]);
      await new Promise((r) => setTimeout(r, 120));
    }
    const mockData = {
      scores: {
        overall: 84,
        keyboard: 80,
        aria: 70,
        landmarks: 100,
        forms: 90,
        images: 85,
        headings: 90,
        links: 95,
        contrast: 85,
        inlineLang: 100,
        duplicateIds: 85,
        reducedMotion: 100,
        touchTargets: 75,
        autoplayMedia: 100,
        reflow: 90
      },
      summary: {
        critical: 0,
        warning: 4,
        info: 2,
        total: 6
      },
      meta: {
        domain: "example.com",
        url: "https://example.com",
        title: "Example Domain",
        lang: "en",
        https: true
      },
      foundCounts: {
        interactive: 12,
        images: 3,
        headings: 3,
        forms: 2,
        links: 5,
        landmarks: 4,
        keyboard: 12,
        contrast: 15,
        inlineLang: 1,
        duplicateIds: 2,
        reducedMotion: 0,
        touchTargets: 4,
        autoplayMedia: 0,
        reflow: 0
      },
      issues: [
        { severity: "warning", message: "Button is missing explicit type attribute", wcag: "4.1.2", element: "button", category: "forms" },
        { severity: "warning", message: "Image is missing alt description", wcag: "1.1.1", element: "img", category: "images" },
        { severity: "warning", message: "Touch target size is too small (32x28px)", wcag: "2.5.5", element: "a.nav-link", category: "touchTargets" },
        { severity: "warning", message: "Duplicate ID \"search-input\" detected (2 occurrences)", wcag: "4.1.1", element: "input#search-input", category: "duplicateIds" },
        { severity: "info", message: "No skip navigation link found", wcag: "2.4.1", element: "body", category: "keyboard" },
        { severity: "info", message: "Skipped 2 elements due to unparseable color formats", wcag: "1.4.3", element: "Contrast Checker", category: "contrast" }
      ]
    };
    auditData = mockData;
    renderResults(mockData);
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      files:  ["content.js"],
    });
  } catch (e) {
    // fine
  }

  await new Promise((r) => setTimeout(r, 200));

  let port;
  try {
    port = chrome.tabs.connect(activeTab.id, { name: "a11y-analysis" });
  } catch (e) {
    showError("Could not connect to the page. Try reloading it first.");
    return;
  }

  let settled = false;
  const timeout = setTimeout(() => {
    if (!settled) {
      settled = true;
      try { port.disconnect(); } catch (_) {}
      showError("Analysis timed out. Try reloading the page.");
    }
  }, 30000);

  port.onMessage.addListener((msg) => {
    if (msg.type === "PROGRESS" && msg.label) {
      updateLoadingStatus(msg.label);
    }
    if (msg.type === "RESULT") {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      port.disconnect();
      auditData = msg.data;
      renderResults(msg.data);
    }
  });

  port.onDisconnect.addListener(() => {
    if (!settled) {
      settled = true;
      clearTimeout(timeout);
      showError("Connection to page was lost. Try reloading it first.");
    }
  });

  try {
    port.postMessage({ type: "START_ANALYSIS" });
  } catch (e) {
    if (!settled) {
      settled = true;
      clearTimeout(timeout);
      showError("Could not start analysis. Try reloading the page.");
    }
  }
}

// ── Render results (Screen 3) ─────────────────────────────────
function renderResults(data) {
  const { scores, summary, meta, foundCounts } = data;
  const t = translations[currentLang];

  showScreen(screenResults);

  // Animate score number
  animateCount(elS3ScoreNumber, 0, scores.overall, 800);

  // Set score grade for CSS-driven coloring
  const scoreIcon = document.getElementById("s3-score-icon");
  const grade =
    scores.overall >= 90 ? "excellent" :
    scores.overall >= 75 ? "good" :
    scores.overall >= 55 ? "needs-work" :
                           "poor";
  if (scoreIcon) {
    scoreIcon.setAttribute("data-grade", grade);
    requestAnimationFrame(() => {
      scoreIcon.style.setProperty('--score-pct', scores.overall);
      const ringProgress = scoreIcon.querySelector('.s3-score-ring__progress');
      if (ringProgress) {
        const circumference = 153.94;
        const offset = circumference - (scores.overall / 100) * circumference;
        ringProgress.style.strokeDashoffset = offset;
      }
    });
  }

  elS3WebsiteName.textContent = meta.domain;

  const summaryText =
    scores.overall >= 90 ? t.summaryExcellent :
    scores.overall >= 75 ? t.summaryGood :
    scores.overall >= 55 ? t.summaryNeedsImp :
                           t.summaryPoor;
  elS3ReportSummary.textContent = summaryText;

  const tag1Text = scores.overall >= 75 ? t.badgePassing : t.badgeFailing;
  const tag2Text = summary.critical > 0 
    ? (currentLang === "ko" ? `${summary.critical}개 ${t.badgeCritical}` : `${summary.critical} ${t.badgeCritical}`)
    : t.badgeNoCritical;
  elS3Tag1.textContent = tag1Text;
  elS3Tag2.textContent = tag2Text;
  elS3Tag1.setAttribute("data-severity", scores.overall >= 75 ? "pass" : "fail");
  elS3Tag2.setAttribute("data-severity", summary.critical > 0 ? "critical" : "none");

  elS3InfoLang.textContent = meta.lang || t.missing;
  if (meta.lang) {
    elS3InfoLang.setAttribute("data-state", "pass");
  } else {
    elS3InfoLang.setAttribute("data-state", "fail");
  }

  elS3InfoInteractive.textContent = `${meta.interactiveCount ?? 0} ${t.elements}`;
  elS3InfoInteractive.removeAttribute("data-state");

  elS3InfoImages.textContent = `${foundCounts?.images?.total ?? 0} ${t.total}`;
  elS3InfoImages.removeAttribute("data-state");

  elS3InfoHeadings.textContent = `${foundCounts?.headings?.total ?? 0} ${t.total}`;
  elS3InfoHeadings.removeAttribute("data-state");

  elS3InfoViewport.textContent = meta.viewport ? t.present : t.missing;
  elS3InfoViewport.setAttribute("data-state", meta.viewport ? "pass" : "fail");

  elS3InfoProtocol.textContent = meta.https ? "HTTPS" : "HTTP";
  elS3InfoProtocol.setAttribute("data-state", meta.https ? "pass" : "fail");

  const atText = currentLang === "ko"
    ? `진단 완료. 종합 점수: 100점 만점에 ${scores.overall}점. 치명적 오류 ${summary.critical}개, 경고 ${summary.warning}개.`
    : `Audit complete. Overall score: ${scores.overall} out of 100. ${summary.critical} critical issues, ${summary.warning} warnings.`;
  document.getElementById("at-announce").textContent = atText;
}

// ── Report generation ─────────────────────────────────────────
function generateReport(data) {
  const { meta, scores, issues, summary, foundCounts } = data;
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const severityOrder = { critical: 0, warning: 1, info: 2 };
  const sorted = [...issues].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const badgeColor = { critical: "var(--c-critical)", warning: "var(--c-warning)", info: "var(--c-info)" };
  const badgeBg    = { critical: "var(--c-critical-bg)", warning: "var(--c-warning-bg)", info: "var(--c-info-bg)" };

  const categoryRows = CATEGORIES.map(({ key, label, icon }) => {
    const pct  = scores[key] ?? 100;
    const color = pct >= 75 ? "var(--c-pass)" : pct >= 50 ? "var(--c-warning)" : "var(--c-critical)";
    return `
      <tr>
        <td style="font-weight:700;color:var(--c-text);vertical-align:middle;display:flex;align-items:center;gap:12px;padding:16px 20px;">
          <span style="display:inline-flex;align-items:center;justify-content:center;color:var(--c-text);width:28px;height:28px;background:#FFFFFF;border:1.5px solid var(--c-primary);border-radius:6px;flex-shrink:0;">
            ${icon}
          </span>
          <span class="t-cat-name" data-cat-key="${key}">${label}</span>
        </td>
        <td style="vertical-align:middle;padding:16px 20px;">
          <div style="background:var(--c-surface);border:1.5px solid var(--c-primary);border-radius:6px;height:12px;overflow:hidden;width:100%;position:relative;">
            <div style="width:${pct}%;background:${color};height:100%;border-radius:4px 0 0 4px;"></div>
          </div>
        </td>
        <td style="color:${color};font-weight:800;font-family:monospace;font-size:15px;text-align:right;vertical-align:middle;padding:16px 20px;">${pct}%</td>
      </tr>`;
  }).join("");

  const issueRows = sorted.map((issue) => `
    <tr>
      <td style="vertical-align:middle;padding:16px 20px;">
        <span class="pill t-pill-severity" data-severity="${issue.severity}" style="background:${badgeBg[issue.severity]};color:${badgeColor[issue.severity]};border:1px solid ${issue.severity === "critical" ? "rgba(220, 38, 38, 0.15)" : issue.severity === "warning" ? "rgba(217, 119, 6, 0.15)" : "rgba(37, 99, 235, 0.15)"}; font-weight: 700;">
          ${issue.severity.toUpperCase()}
        </span>
      </td>
      <td style="text-transform:capitalize;font-weight:700;color:var(--c-text);vertical-align:middle;padding:16px 20px;"><span class="t-cat-name" data-cat-key="${issue.category}">${issue.category}</span></td>
      <td class="t-issue-msg" data-original-msg="${issue.message}" style="color:var(--c-text);vertical-align:middle;font-weight:600;padding:16px 20px;">${issue.message}</td>
      <td style="vertical-align:middle;padding:16px 20px;">
        ${issue.element ? `
          <code style="font-family:monospace;font-size:11px;background:#FFFFFF;border:1.5px solid var(--c-primary);padding:6px 10px;border-radius:6px;color:var(--c-text);word-break:break-all;display:inline-block;max-width:100%;">
            ${issue.element.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}
          </code>` : `<span style="color:var(--c-text-secondary);">—</span>`}
        ${issue.snippet ? `
          <div style="margin-top:10px; min-width: 240px; max-width: 320px;">
            <div class="t-key" data-t-key="codeSnippet" style="font-size:9px;font-weight:800;text-transform:uppercase;color:var(--c-text-secondary);margin-bottom:4px;letter-spacing:0.06em;">Code Snippet</div>
            <pre style="margin:0;padding:8px 12px;background:var(--c-surface);border:1px solid var(--c-border-subtle);border-radius:6px;font-family:monospace;font-size:10.5px;color:var(--c-text);overflow-x:auto;white-space:pre-wrap;word-break:break-all;box-shadow:inset 0 1px 2px rgba(0,0,0,0.02);line-height:1.4;"><code>${issue.snippet.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>
          </div>` : ""}
      </td>
      <td style="font-family:monospace;font-size:12px;color:var(--c-text-secondary);vertical-align:middle;font-weight:700;padding:16px 20px;">${issue.wcag ? `WCAG ${issue.wcag}` : "—"}</td>
    </tr>`).join("");

  const overallColor =
    scores.overall >= 90 ? "var(--c-pass)" : scores.overall >= 75 ? "var(--c-primary)" : scores.overall >= 55 ? "var(--c-warning)" : "var(--c-critical)";

  const circumference = 276.46;
  const offset = circumference - (scores.overall / 100) * circumference;

  const overallMetaEN = (() => {
    const s = scores.overall;
    const c = summary.critical;
    const w = summary.warning;
    if (s >= 90) return `This page demonstrates strong accessibility fundamentals. The structure is well-formed, ARIA is used correctly, and keyboard users can navigate effectively. ${c === 0 ? "No critical issues were found." : `${c} critical issue${c > 1 ? "s" : ""} remain${c === 1 ? "s" : ""} and should still be addressed.`}`;
    if (s >= 75) return `This page has solid accessibility support with a few gaps. ${c > 0 ? `${c} critical issue${c > 1 ? "s" : ""} require${c === 1 ? "s" : ""} immediate attention — these directly block screen reader or keyboard users.` : "No critical blockers were found."} ${w > 0 ? `${w} warning${w > 1 ? "s" : ""} indicate areas that could cause confusion or friction.` : ""}`;
    if (s >= 55) return `This page has meaningful accessibility gaps that would create barriers for screen reader and keyboard users. ${c > 0 ? `${c} critical issue${c > 1 ? "s" : ""} are blocking — users relying on assistive technology may be unable to complete key tasks.` : ""} Prioritise fixing critical issues before warnings.`;
    return `This page has significant accessibility barriers. ${c > 0 ? `${c} critical issue${c > 1 ? "s" : ""} were found — many users relying on keyboards or assistive technology will encounter direct blockers.` : ""} A structured remediation plan is strongly recommended. Consider involving an accessibility specialist.`;
  })();

  const overallMetaKO = (() => {
    const s = scores.overall;
    const c = summary.critical;
    const w = summary.warning;
    if (s >= 90) return `이 페이지는 우수한 웹 접근성을 제공합니다. 구조가 바르게 형성되어 있으며 ARIA 속성이 올바르게 정의되어 있고, 키보드 단독 탐색도 원활합니다. ${c === 0 ? "치명적 오류가 존재하지 않습니다." : `다만 ${c}개의 치명적 접근성 오류를 수정해야 합니다.`}`;
    if (s >= 75) return `이 페이지는 기본적으로 양호한 웹 접근성을 지원하지만 보완할 영역이 존재합니다. ${c > 0 ? `치명적 오류 ${c}개는 스크린 리더나 키보드 탐색 사용자의 원활한 이용을 저해하므로 시급히 검토해야 합니다.` : "치명적 장벽은 탐지되지 않았습니다."} ${w > 0 ? `또한 사용자의 사용성을 떨어뜨릴 수 있는 경고 항목 ${w}개가 발견되었습니다.` : ""}`;
    if (s >= 55) return `이 페이지는 웹 접근성 보완이 요구되며 스크린 리더나 키보드 탐색 장치 사용 시 상당한 이용 제약이 발생합니다. ${c > 0 ? `특히 치명적 오류 ${c}개는 주요 서비스나 기능을 이용하는 데 물리적 차단을 유발하므로 최우선 조치가 필요합니다.` : ""} 경고 사항에 앞서 치명적인 장벽을 먼저 해결해 주세요.`;
    return `이 페이지는 웹 접근성에 치명적인 제약이 아주 많이 발견되었습니다. ${c > 0 ? `총 ${c}개의 치명적 오류가 탐지되었으며, 보조기기나 키보드에만 의존하는 사용자들은 본 페이지 이용이 전면 불가능할 수 있습니다.` : ""} 체계적인 접근성 개선 대책 및 수정 작업을 강력히 권장합니다.`;
  })();

  const REPORT_TRANSLATIONS = {
    en: {
      reportTitle: "Accessibility Audit Report",
      auditBadge: "Accessibility Audit",
      labelPage: "Page:",
      labelGenerated: "Generated:",
      labelLang: "Language",
      labelProtocol: "Protocol",
      overallScoreTitle: "Overall Score",
      pageStatsTitle: "Page Statistics",
      statInteractive: "Interactive Elements",
      metaInteractive: "Total focusable items",
      statImages: "Images Audited",
      statForms: "Form Inputs",
      statHeadings: "Headings",
      statLinks: "Anchors & Links",
      statSkip: "Skip Keyboard Link",
      statSkipMeta: "Bypasses repetitive content",
      statViewport: "Viewport Meta",
      statViewportMeta: "Supports pinch and zoom",
      statLang: "HTML Language",
      statLangMeta: "Defines page language",
      categoryTitle: "Category Scores",
      colCategory: "Category",
      colScore: "Score",
      colSeverity: "Severity",
      colIssue: "Issue",
      colElement: "Element",
      colWcag: "WCAG",
      allIssuesTitle: "All Issues",
      noIssuesFound: "No issues found — excellent work! 🎉",
      keyRecsTitle: "Key Recommendations",
      colRec: "Recommendation",
      colImpact: "Impact",
      present: "Present",
      missing: "Missing",
      notSet: "Not Set",
      secure: "HTTPS ✓",
      insecure: "HTTP (insecure)",
      critical: "Critical",
      warning: "Warning",
      info: "Info",
      high: "High",
      medium: "Medium",
      low: "Low",
      noCritical: "No critical issues — review warnings next.",
      footerAudit: "Generated by A11y Analyzer  ·  Results are heuristic-based and should be supplemented with manual testing and real assistive technology testing.",
      footerWcag: "For full WCAG compliance, also test with NVDA/JAWS (Windows) or VoiceOver (macOS/iOS) and run a contrast checker.",
      codeSnippet: "Code Snippet",
      // Categories
      catKeyboard: "Keyboard Nav",
      catAria: "ARIA",
      catLandmarks: "Landmarks",
      catForms: "Forms",
      catImages: "Images",
      catHeadings: "Headings",
      catLinks: "Links & Buttons",
      catContrast: "Contrast",
      catInlineLang: "Inline Lang",
      catDuplicateIds: "Duplicate IDs",
      catReducedMotion: "Reduced Motion",
      catTouchTargets: "Touch Targets",
      catAutoplayMedia: "Autoplay Media",
      catReflow: "Reflow Zoom"
    },
    ko: {
      reportTitle: "웹 접근성 정밀 진단 보고서",
      auditBadge: "접근성 정밀 진단",
      labelPage: "대상 페이지:",
      labelGenerated: "진단 일시:",
      labelLang: "HTML 언어",
      labelProtocol: "연결 프로토콜",
      overallScoreTitle: "종합 접근성 점수",
      pageStatsTitle: "페이지 주요 통계",
      statInteractive: "대화형 요소 개수",
      metaInteractive: "초점 이동이 가능한 대화형 요소 총합",
      statImages: "검사된 이미지 수",
      statForms: "폼 입력 양식 수",
      statHeadings: "제목 태그 수",
      statLinks: "링크 및 버튼 수",
      statSkip: "키보드 건너뛰기 링크",
      statSkipMeta: "반복 탐색을 줄이는 건너뛰기 링크",
      statViewport: "뷰포트 설정 여부",
      statViewportMeta: "모바일 장치 핀치 줌 기능 지원 여부",
      statLang: "HTML 기본 언어",
      statLangMeta: "문서의 기본 자연어 설정 여부",
      categoryTitle: "카테고리별 세부 점수",
      colCategory: "카테고리",
      colScore: "점수",
      colSeverity: "심각도",
      colIssue: "진단 결과 및 세부 내용",
      colElement: "대상 요소",
      colWcag: "WCAG 기준",
      allIssuesTitle: "탐지된 접근성 오류 내역",
      noIssuesFound: "발견된 접근성 오류가 없습니다 — 훌륭합니다! 🎉",
      keyRecsTitle: "핵심 권장 개선 사항",
      colRec: "권장 개선 방안",
      colImpact: "영향도",
      present: "지정됨",
      missing: "누락됨",
      notSet: "미지정",
      secure: "HTTPS ✓ (안전)",
      insecure: "HTTP (보안 취약)",
      critical: "치명적",
      warning: "경고",
      info: "정보",
      high: "높음",
      medium: "중간",
      low: "낮음",
      noCritical: "치명적인 문제점이 없습니다 — 다음 경고 항목을 검토해 주세요.",
      footerAudit: "A11y Analyzer 정밀 보고서  ·  본 진단은 휴리스틱 분석 결과물로써 스크린 리더 및 보조기기를 활용한 사용자 실조작 테스트를 병행할 것을 권장합니다.",
      footerWcag: "완전한 WCAG 규격 충족을 위해 NVDA/JAWS(Windows) 또는 VoiceOver(macOS/iOS) 스크린 리더 검증 및 색상 대비 검사를 정기적으로 수행하세요.",
      codeSnippet: "HTML 코드 스니펫",
      // Categories
      catKeyboard: "키보드 탐색",
      catAria: "ARIA 속성",
      catLandmarks: "랜드마크 영역",
      catForms: "폼 양식 및 입력",
      catImages: "이미지 대체 텍스트",
      catHeadings: "제목 구조 계층",
      catLinks: "링크 및 버튼 라벨",
      catContrast: "색상 대비",
      catInlineLang: "인라인 언어 지정",
      catDuplicateIds: "중복 ID 검사",
      catReducedMotion: "동적 효과 제한",
      catTouchTargets: "터치 및 클릭 대상",
      catAutoplayMedia: "자동 재생 미디어",
      catReflow: "반응형 리플로우"
    }
  };

  const ISSUE_TRANSLATIONS = {
    "No <main> landmark found. Screen readers use this to skip directly to main content.": "페이지 내 <main> landmark를 찾을 수 없습니다. 스크린 리더가 본문으로 직접 도달하는 데 필수적인 영역입니다.",
    "No <nav> landmark found. Navigation regions help keyboard users orient on the page.": "페이지의 주요 탐색을 돕는 <nav> landmark가 누락되었습니다.",
    "No <header> (banner) landmark found. Landmark regions aid navigation.": "<header> (banner) landmark 영역을 찾을 수 없습니다.",
    "No <footer> (contentinfo) landmark found.": "<footer> (contentinfo) landmark 영역을 찾을 수 없습니다.",
    "aria-hidden='true' is set on an element containing focusable children. Sighted keyboard users can reach them but they are hidden from screen readers.": "초점 이동이 가능한 하위 요소가 있음에도 상위 노드에 aria-hidden='true'가 설정되어 있습니다. 키보드 사용자는 도달할 수 있으나 시각장애인 스크린 리더에서는 전면 누락되는 장벽입니다.",
    "Interactive element has no accessible name. Screen readers will read the tag or filename.": "대화형 제어 요소(버튼, 입력창 등)에 이름 정의가 제공되지 않았습니다.",
    "Typo found in aria attribute: did you mean 'aria-labelledby' with two 'l's?": "ARIA 속성 표기 내에 오타가 탐지되었습니다 ('aria-labelledby'를 두 개의 'l'로 선언했는지 확인하세요).",
    "Image is missing alt attribute entirely. Screen readers will read the filename.": "이미지에 alt(대체 텍스트) 속성이 전면 누락되었습니다. 스크린 리더 사용자는 파일명만 인지하게 됩니다.",
    "Image has empty alt text. Meaningful elements should have a description; empty alt is only for decorative images.": "의미 있는 정보성 이미지에 대체 텍스트가 빈값(alt=\"\")으로 선언되어 무시됩니다. 장식용이 아닌 경우 내용을 설명해야 합니다.",
    "SVG element has no accessible name (no <title> child or aria-label). Add one if this conveys meaning.": "의미 있는 정보가 담긴 SVG 요소에 이름 선언(<title> 또는 aria-label)이 존재하지 않습니다.",
    "Input uses only placeholder as a label. Placeholders vanish on focus and are not reliably read by screen readers.": "입력창에 레이블(<label>) 없이 placeholder만 사용되었습니다. 초점이 생기면 텍스트가 사라지고 스크린 리더 호환성이 현저히 낮습니다.",
    "Form control has no associated label. Screen readers cannot identify this field's purpose.": "폼 입력 요소에 연결된 라벨(<label>) 정보가 누락되어 목적성을 파악할 수 없습니다.",
    "Required field uses HTML 'required' attribute but not 'aria-required=\"true\"'. Older screen readers might miss it.": "필수 입력창에 HTML 'required' 속성만 부여되고 'aria-required=\"true\"' 선언이 생략되어 구형 스크린 리더가 이를 놓칠 수 있습니다.",
    "Form has no submit button. Standard submit buttons are crucial for native keyboard form submission.": "폼 양식 영역 내에 전송(submit) 버튼이 없습니다. 엔터 키를 활용한 키보드 입력을 위해 표준 제출 버튼이 권장됩니다.",
    "No skip navigation link found. Keyboard users must tab through all navigation elements repeatedly.": "페이지 본문으로 직접 건너뛰는 링크(skip navigation link)가 누락되어 키보드 사용자가 불필요한 탐색을 반복하게 됩니다.",
    "Non-native interactive element lacks keyboard support. Add tabindex=\"0\" and keydown/keyup event listeners.": "비표준 대화형 요소에 키보드 조작 지원이 생략되어 있습니다. tabindex=\"0\"과 적절한 키보드 이벤트 처리가 추가되어야 합니다.",
    "No headings found. Headings structure page segments for quick navigational jumps.": "페이지 전체 구조를 나타내는 제목(heading) 계층이 존재하지 않습니다.",
    "No <h1> found. Every page must contain exactly one <h1> representing the main page topic.": "H1 제목이 누락되었습니다. 모든 웹페이지는 문서의 가장 핵심 주제를 지목하는 단 하나의 H1 태그를 정의해야 합니다.",
    "Empty heading element. Screen readers will read structural level with no contents.": "내용이 비어있는 Heading 태그가 존재합니다. 스크린 리더는 구조적 영역만 알릴 뿐 정작 알맹이가 없어 혼란을 야기합니다.",
    "Link has no accessible name. Screen readers will skip or read the URL string.": "링크 요소에 접근 가능한 대체 이름이 부여되지 않아 스크럼 리더는 URL이나 단순 앵커 정보만 인지하게 됩니다.",
    "Element has both href and role='button'. This conflict confuses screen readers and search engines.": "동일한 요소에 href 속성과 role='button' 속성이 동시에 지정되어 의미 충돌을 일으킵니다.",
    "Button has no accessible text. Screen readers cannot tell what it does.": "버튼의 쓰임새와 용도를 인지할 수 있는 대체 텍스트가 부재합니다."
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>A11y Audit Report — ${meta.domain}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Ubuntu+Condensed&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    :root {
      --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Ubuntu Condensed', sans-serif;
      --c-bg: #FDFDFB; /* Alabaster canvas */
      --c-surface: #FAF9F6; /* Soft Ivory Sand cards */
      --c-text: #181816; /* Charcoal Ink */
      --c-text-secondary: #51514C; /* Charcoal Taupe */
      --c-border: #EBEAE4; /* Crisp Clay */
      
      --c-primary: #181816; /* Brand Charcoal */
      --c-pass: #059669;
      --c-pass-bg: #ECFDF5;
      --c-warning: #D97706;
      --c-warning-bg: #FFFBEB;
      --c-critical: #DC2626;
      --c-critical-bg: #FEF2F2;
      --c-info: #2563EB;
      --c-info-bg: #EFF6FF;
    }
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: var(--font-sans);
      font-size: 14px;
      color: var(--c-text);
      background: #FAF9F5; /* Warm creamy ivory paper */
      line-height: 1.6;
      padding: 60px 24px;
      -webkit-font-smoothing: antialiased;
    }
    
    .page {
      max-width: 960px;
      margin: 0 auto;
    }
    
    /* Top accent paper stripe */
    .top-stripe {
      height: 6px;
      background: linear-gradient(90deg, var(--c-primary), var(--c-text-secondary));
      margin-bottom: 40px;
      border-radius: 3px;
      border: 1.5px solid var(--c-primary);
    }
    
    .header {
      border: 1.5px solid var(--c-primary);
      background: #FFFFFF;
      padding: 40px;
      border-radius: 12px;
      margin-bottom: 40px;
      position: relative;
    }
    
    .header__eyebrow {
      font-family: var(--font-display);
      font-size: 12px;
      font-weight: 700;
      color: var(--c-text-secondary);
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    
    .header__title {
      font-family: var(--font-display);
      font-size: 38px;
      font-weight: 800;
      color: var(--c-text);
      letter-spacing: 0.02em;
      line-height: 1.1;
      text-transform: uppercase;
    }
    
    .header__meta {
      font-size: 13px;
      color: var(--c-text-secondary);
      margin-top: 20px;
      line-height: 1.6;
      border-top: 1.5px solid var(--c-border);
      padding-top: 16px;
    }
    
    .header__meta a {
      color: var(--c-text);
      font-weight: 700;
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    
    .section {
      margin-bottom: 48px;
    }
    
    .section-title {
      font-family: var(--font-display);
      font-size: 22px;
      font-weight: 800;
      color: var(--c-text);
      margin-bottom: 24px;
      padding-bottom: 10px;
      border-bottom: 1.5px solid var(--c-primary);
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    
    .score-block {
      display: flex;
      align-items: center;
      gap: 40px;
      background: #FFFFFF;
      border: 1.5px solid var(--c-primary);
      border-radius: 12px;
      padding: 40px;
    }
    
    /* SVG Circular progress dial */
    .score-dial {
      position: relative;
      width: 100px;
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: #FFFFFF;
      border-radius: 50%;
    }
    
    .score-dial__ring {
      position: absolute;
      top: 0;
      left: 0;
      width: 100px;
      height: 100px;
    }
    
    .score-dial__number {
      position: absolute;
      z-index: 1;
      font-family: var(--font-display);
      font-size: 36px;
      font-weight: 900;
      color: var(--c-text);
      letter-spacing: -0.01em;
    }
    
    .score-label {
      font-family: var(--font-display);
      font-size: 26px;
      font-weight: 800;
      color: var(--c-text);
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    
    .score-meta {
      font-size: 14px;
      color: var(--c-text-secondary);
      margin-top: 8px;
      line-height: 1.6;
      word-break: keep-all;
    }
    
    .pills {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 20px;
    }
    
    .pill {
      display: inline-flex;
      align-items: center;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }
    
    .stat-card {
      background: #FFFFFF;
      border: 1.5px solid var(--c-primary);
      border-radius: 8px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .stat-card__header {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .stat-card__icon {
      color: var(--c-text-secondary);
      flex-shrink: 0;
    }
    
    .stat-card__title {
      font-family: var(--font-display);
      font-size: 12px;
      font-weight: 700;
      color: var(--c-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .stat-card__value {
      font-family: var(--font-display);
      font-size: 32px;
      font-weight: 900;
      color: var(--c-text);
      line-height: 1;
    }
    
    .stat-card__value.pass {
      color: var(--c-pass);
    }
    
    .stat-card__value.fail {
      color: var(--c-critical);
    }
    
    .stat-card__meta {
      font-size: 12px;
      color: var(--c-text-secondary);
      line-height: 1.4;
      border-top: 1px solid var(--c-border);
      padding-top: 10px;
      margin-top: auto;
      word-break: keep-all;
    }
    
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 13px;
      border: 1.5px solid var(--c-primary);
      border-radius: 10px;
      overflow: hidden;
      background: #FFFFFF;
    }
    
    th {
      background: var(--c-primary);
      text-align: left;
      padding: 16px 20px;
      font-family: var(--font-display);
      font-size: 12px;
      color: #FAF9F6;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      border-bottom: 1.5px solid var(--c-primary);
    }
    
    td {
      padding: 14px 20px;
      border-bottom: 1px solid var(--c-border);
      vertical-align: top;
      background: #FFFFFF;
      color: var(--c-text-secondary);
    }
    
    tr:last-child td {
      border-bottom: none;
    }
    
    .category-table td, .category-table th {
      vertical-align: middle;
    }
    
    .category-table td svg {
      width: 16px;
      height: 16px;
      display: block;
    }
    
    .footer {
      margin-top: 64px;
      padding-top: 32px;
      border-top: 1.5px solid var(--c-primary);
      font-size: 12px;
      color: var(--c-text-secondary);
      line-height: 1.7;
    }
    
    @media print {
      body { font-size: 12px; padding: 24px; background: #FFFFFF; }
      .page { padding: 0; }
      .header, .score-block, table { box-shadow: none; border-radius: 0; }
      tr { page-break-inside: avoid; }
    }
  </style>
  <script>
    const REPORT_TRANSLATIONS = ${JSON.stringify(REPORT_TRANSLATIONS, null, 2)};
    const ISSUE_TRANSLATIONS = ${JSON.stringify(ISSUE_TRANSLATIONS, null, 2)};
    
    let reportLang = "${currentLang}";
    
    const OVERALL_META_EN = ${JSON.stringify(overallMetaEN)};
    const OVERALL_META_KO = ${JSON.stringify(overallMetaKO)};
    
    const OVERALL_GRADE_EN = "${scores.overall >= 90 ? "Excellent" : scores.overall >= 75 ? "Good" : scores.overall >= 55 ? "Needs Work" : "Poor"}";
    const OVERALL_GRADE_KO = "${scores.overall >= 90 ? "우수" : scores.overall >= 75 ? "보통" : scores.overall >= 55 ? "보완 필요" : "취약"}";
    
    const MISSING_ALT = ${foundCounts?.images?.missingAlt ?? 0};
    const UNLABELED_FORMS = ${foundCounts?.forms?.unlabeled ?? 0};
    const H1_COUNT = ${foundCounts?.headings?.h1Count ?? 0};
    const SKIPPED_LEVELS = ${foundCounts?.headings?.skippedLevels ?? 0};
    const HAS_SKIP_LINK = ${!!foundCounts?.keyboard?.skipLinks};
    const HAS_VIEWPORT = ${!!meta.viewport};
    const LANG_VAL = ${meta.lang ? JSON.stringify(meta.lang) : "null"};
    const GENERIC_LINKS = ${foundCounts?.links?.genericText ?? 0};
    
    function getKoreanIssueMessage(msg) {
      if (ISSUE_TRANSLATIONS[msg]) return ISSUE_TRANSLATIONS[msg];
      
      if (msg.indexOf("Multiple <main> landmarks") !== -1) {
        var match = msg.match(/\\((\\d+)\\)/);
        var count = match ? match[1] : "여러 개";
        return "복수의 <main> landmark 영역(" + count + "개)이 탐지되었습니다. 메인 본문 영역은 페이지당 단 하나만 존재해야 합니다.";
      }
      if (msg.indexOf("Multiple <nav> elements found but not all are labeled") !== -1) {
        return "여러 개의 <nav> 영역이 존재하나 일부 영역에 이름 정의가 누락되었습니다. 'aria-label'이나 'aria-labelledby'를 부여하세요.";
      }
      if (msg.indexOf("Nested <main> landmark detected") !== -1) {
        return "중첩된 <main> landmark가 감지되었습니다. 본문 랜드마크는 서로 중첩되어서는 안 됩니다.";
      }
      if (msg.indexOf("Duplicate ID") !== -1) {
        var match = msg.match(/"([^"]+)"/);
        var id = match ? match[1] : "";
        return "중복된 ID 요소 \\"" + id + "\\"가 DOM 내에서 탐지되었습니다. 접근성 레이블 연결 및 웹 표준 참조가 올바르게 작동하지 않습니다.";
      }
      if (msg.indexOf("Invalid ARIA role") !== -1) {
        var match = msg.match(/"([^"]+)"/);
        var role = match ? match[1] : "";
        return "올바르지 않은 ARIA role 속성이 사용되었습니다: \\"" + role + "\\"";
      }
      if (msg.indexOf("Attribute") !== -1 && msg.indexOf("references non-existent ID") !== -1) {
        return "지정된 속성이 존재하지 않는 참조 ID를 호출하고 있습니다.";
      }
      if (msg.indexOf("Role") !== -1 && msg.indexOf("is missing required attribute") !== -1) {
        return "해당 ARIA role 속성에서 요구하는 필수 특성이 생략되었습니다.";
      }
      if (msg.indexOf("Alt text") !== -1 && msg.indexOf("appears to be a filename or generic tag") !== -1) {
        return "이미지 대체 텍스트가 설명글이 아닌 파일명이나 단순 무의미한 키워드로 채워져 있습니다.";
      }
      if (msg.indexOf("Alt text contains redundant phrase") !== -1) {
        return "대체 텍스트 내에 불필요한 단어가 포함되었습니다 ('이미지/사진' 단어 중복 기재 등). 스크린 리더는 이미 이미지라고 먼저 공지합니다.";
      }
      if (msg.indexOf("Multiple label elements point to the same input ID") !== -1) {
        return "하나의 ID 입력 요소에 중복된 복수의 라벨 요소들이 지정되어 있습니다.";
      }
      if (msg.indexOf("input is not inside a <fieldset> group") !== -1) {
        return "관련 입력 폼 양식이 <fieldset> 그룹으로 묶여있지 않아 정보 구분이 어렵습니다.";
      }
      if (msg.indexOf("tabindex=") !== -1 && msg.indexOf("disrupts natural focus order") !== -1) {
        return "임의 지정된 tabindex 값이 표준 키보드 순서를 교란하고 있습니다. 표준 탐색 순서는 브라우저의 자연스러운 흐름을 활용해야 합니다.";
      }
      if (msg.indexOf("focusable elements have no focus styling") !== -1) {
        var match = msg.match(/^(\\d+) of (\\d+)/);
        var count = match ? match[1] : "";
        var total = match ? match[2] : "";
        return "페이지 내 일부 대화형 요소들(" + total + "개 샘플 중 " + count + "개)에 키보드 초점 링(outline) 설정이 강제 삭제되어 시각적 추적이 불가능합니다.";
      }
      if (msg.indexOf("elements found. Keep exactly one per page") !== -1) {
        var match = msg.match(/^(\\d+)/);
        var count = match ? match[1] : "";
        return "복수의 H1 요소(" + count + "개)가 탐지되었습니다. 명확한 문서 인덱싱과 표준 구조 유지를 위해 페이지당 1개만 사용하는 것이 바람직합니다.";
      }
      if (msg.indexOf("Page starts with a low-level heading") !== -1) {
        return "페이지 내 첫 Heading 태그가 너무 낮은 레벨부터 사용되었습니다. 표준은 H1 또는 H2부터 내림차순으로 논리적 흐름을 타야 합니다.";
      }
      if (msg.indexOf("Heading level jumps from") !== -1) {
        return "제목 태그 단계가 순차적이지 않고 중간 단계를 건너뛰고 비정상적으로 도약하여 문서 계층이 깨졌습니다.";
      }
      if (msg.indexOf("Overly long heading text") !== -1) {
        return "제목 태그 글자가 비정상적으로 너무 깁니다. Heading 요소는 단순 요약 레이블이어야 하며, 본문 단락을 감싸는 스타일 포맷용으로 써선 안 됩니다.";
      }
      if (msg.indexOf("Link with generic text") !== -1) {
        var match = msg.match(/"([^"]+)"/);
        var txt = match ? match[1] : "";
        return "컨텍스트가 빠진 단순 모호한 지칭 레이블(\\"" + txt + "\\")을 사용하는 링크입니다.";
      }
      if (msg.indexOf("Link opens in a new tab") !== -1) {
        return "새 창이나 새 탭(target=\\"_blank\\")을 여는 링크이지만, 사용자에게 이에 대한 사전 접근성 인지 정보가 생략되었습니다.";
      }
      if (msg.indexOf("Adjacent links point to identical destination URL") !== -1) {
        return "서로 맞닿아 있는 연속된 다수 링크가 완전히 똑같은 목적지 주소를 바라보고 있으므로 하나로 결합하는 것을 권장합니다.";
      }
      if (msg.indexOf("Low text color contrast ratio") !== -1) {
        var match = msg.match(/Low text color contrast ratio \\(([^)]+)\\)\\. Minimum required for this text size is ([^:]+):1\\. Check foreground ([^ ]+) on background ([^.]+)\\./);
        if (match) {
          return "글자 색상 대비가 낮습니다 (" + match[1] + ":1). 해당 글자 크기 기준 요구되는 최소 대비는 " + match[2] + ":1 입니다. (전경색 " + match[3] + " / 배경색 " + match[4] + ")";
        }
        return "텍스트 색상 대비가 최소 접근성 기준(4.5:1 / 3:1)보다 낮아 가독성이 떨어집니다.";
      }
      if (msg.indexOf("Image alt attribute contains only placeholder spaces or punctuation characters") !== -1) {
        return "이미지 대체 텍스트가 의미 없는 공백이나 마침표/문장부호로만 이루어져 있어, 스크린 리더 사용자가 그림의 쓰임새를 파악할 수 없습니다.";
      }
      if (msg.indexOf("Adjacent images have identical alt text") !== -1) {
        var match = msg.match(/"([^"]+)"/);
        var alt = match ? match[1] : "";
        return "인접한 연속된 이미지들이 완전히 중복된 대체 텍스트(\\"" + alt + "\\")를 사용하고 있어 시각장애인에게 동일한 낭독이 반복 전달됩니다.";
      }
      if (msg.indexOf("Video element is missing standard captions or subtitles tracks") !== -1) {
        return "비디오 요소에 청각 장애인을 위한 캡션(자막) 또는 한글/영문 자막 track 정보가 생략되었습니다.";
      }
      if (msg.indexOf("Audio element lacks caption tracks or associated text transcripts") !== -1) {
        return "오디오 콘텐츠에 표준 캡션 track 또는 본문 텍스트 설명 및 전사글(transcript)이 누락되었습니다.";
      }
      if (msg.indexOf("Element with role='tablist' contains no children with role='tab'") !== -1) {
        return "role='tablist' 요소 안에 속해 있는 실제 탭 버튼(role='tab')을 찾을 수 없습니다.";
      }
      if (msg.indexOf("Element with role='tab' is missing 'aria-selected'") !== -1) {
        return "탭 항목(role='tab')에 현재 활성화 여부를 나타내는 'aria-selected' 속성이 누락되었습니다.";
      }
      if (msg.indexOf("Element with role='tab' is not grouped inside a parent role='tablist'") !== -1) {
        return "탭 버튼(role='tab')이 상위 탭 목록 컨테이너(role='tablist') 영역 내부로 적절히 그룹화되어 있지 않습니다.";
      }
      if (msg.indexOf("Orphan content detected") !== -1) {
        return "외톨이(Orphan) 본문 콘텐츠가 발견되었습니다. 시각장애인이 본문으로 직접 건너뛸 수 있도록 이 요소를 적절한 landmark 영역(<main>, <nav> 등) 내부로 이동시켜야 합니다.";
      }
      if (msg.indexOf("Presentational role conflict") !== -1) {
        return "프레젠테이션 역할 충돌이 감지되었습니다. role='presentation' 또는 'none' 속성으로 꾸밈 요소로 선언되어 스크린 리더가 생략하는 요소가 키보드 초점(tabindex='0' 등)을 받아 조작 혼란을 야기합니다.";
      }
      if (msg.indexOf("aria-activedescendant") !== -1 && msg.indexOf("references non-existent ID") !== -1) {
        var match = msg.match(/"([^"]+)"/);
        var id = match ? match[1] : "";
        return "aria-activedescendant 속성이 존재하지 않는 DOM 요소 ID(\\"" + id + "\\")를 참조하고 있어 포커스 추적이 실패합니다.";
      }
      if (msg.indexOf("Duplicate accesskey attribute value") !== -1) {
        var match = msg.match(/"([^"]+)"/);
        var key = match ? match[1] : "";
        return "중복된 accesskey 단축키 특성값(\\"" + key + "\\")이 페이지 내의 여러 요소에 중복 할당되어 단축키 충돌이 발생합니다.";
      }
      if (msg.indexOf("Pointer events conflict") !== -1) {
        return "포인터 이벤트 접근성 충돌이 감지되었습니다. 키보드 탭 순서(Focusable)에 포함된 요소이지만, CSS pointer-events: none 스타일이 적용되어 있어 마우스/터치 클릭 동작이 불가능합니다.";
      }
      if (msg.indexOf("Autocomplete missing on personal identify field") !== -1) {
        return "개인식별(이메일, 비밀번호 등) 입력 서식에 자동완성(autocomplete) 속성이 누락되었습니다. 폼 자동완성을 설정하면 인지장애 또는 지체장애인의 입력 편의를 크게 향상시킵니다.";
      }
      if (msg.indexOf("CSS Background Image lacks alternative text") !== -1) {
        return "CSS background-image 배경 이미지에 대한 대체 텍스트(설명글)가 생략되었습니다. 정보 전달용 큰 배경 배너에는 aria-label 또는 title 설명 속성이 제공되어야 합니다.";
      }
      if (msg.indexOf("Mock link behaves as an interactive action") !== -1) {
        return "가짜 링크(# 또는 javascript 호출)가 감지되었습니다. 실제 페이지 이동이 아닌 동적 조작을 하는 요소는 <a> 태그 대신 role='button' 또는 <button> 요소를 사용하여 표현해야 스크린 리더 및 검색엔진이 혼동하지 않습니다.";
      }
      if (msg.indexOf("Low text color contrast ratio") !== -1) {
        var ratioMatch = msg.match(/ratio \((\d+\.?\d*):1\)/);
        var reqMatch = msg.match(/is (\d+\.?\d*):1/);
        var ratio = ratioMatch ? ratioMatch[1] : "";
        var req = reqMatch ? reqMatch[1] : "";
        return "텍스트 색상 대비가 낮습니다 (현재 비율 " + ratio + ":1). 본 텍스트 크기의 권장 최소 대비 비율은 " + req + ":1 입니다. 텍스트와 배경의 명도 대비를 높여 시각 장애인 및 저시력자가 내용을 읽을 수 있도록 조치하세요.";
      }
      return msg;
    }
    
    function setReportLang(lang) {
      reportLang = lang;
      document.documentElement.lang = lang;
      
      const dict = REPORT_TRANSLATIONS[lang];
      
      // Update standard translations
      document.querySelectorAll(".t-key").forEach(el => {
        const key = el.getAttribute("data-t-key");
        if (dict[key]) {
          el.textContent = dict[key];
        }
      });
      
      // Update overall score metadata
      const overallMetaEl = document.getElementById("overall-meta-desc");
      if (overallMetaEl) {
        overallMetaEl.textContent = lang === "ko" ? OVERALL_META_KO : OVERALL_META_EN;
      }
      
      // Update overall score grade label
      const overallScoreLabel = document.getElementById("overall-score-label");
      if (overallScoreLabel) {
        overallScoreLabel.textContent = lang === "ko" ? OVERALL_GRADE_KO : OVERALL_GRADE_EN;
      }
      
      // Update Category rows
      document.querySelectorAll(".t-cat-name").forEach(el => {
        const catKey = el.getAttribute("data-cat-key");
        const lookup = "cat" + catKey.charAt(0).toUpperCase() + catKey.slice(1);
        if (dict[lookup]) {
          el.textContent = dict[lookup];
        }
      });
      
      // Update dynamic severity and impact pills
      document.querySelectorAll(".t-key-severity").forEach(el => {
        const sev = el.getAttribute("data-severity");
        if (dict[sev]) {
          el.textContent = dict[sev];
        }
      });
      
      document.querySelectorAll(".t-pill-severity").forEach(el => {
        const sev = el.getAttribute("data-severity");
        if (dict[sev]) {
          el.textContent = dict[sev].toUpperCase();
        }
      });
      
      // Update Metadata header variables
      const langValEl = document.getElementById("report-meta-lang-val");
      if (langValEl) {
        const origVal = langValEl.getAttribute("data-lang-val");
        langValEl.textContent = origVal ? '"' + origVal + '"' : dict["notSet"];
      }
      
      const protoValEl = document.getElementById("report-meta-proto-val");
      if (protoValEl) {
        const key = protoValEl.getAttribute("data-proto-val");
        if (dict[key]) {
          protoValEl.textContent = dict[key];
        }
      }
      
      // Update Page Statistics card metadata
      const metaImagesEl = document.getElementById("meta-images-desc");
      if (metaImagesEl) {
        metaImagesEl.textContent = lang === "ko" 
          ? MISSING_ALT + "개 대체 텍스트 누락" 
          : MISSING_ALT + " missing Alt tags";
      }
      const metaFormsEl = document.getElementById("meta-forms-desc");
      if (metaFormsEl) {
        metaFormsEl.textContent = lang === "ko" 
          ? UNLABELED_FORMS + "개 라벨 누락 입력창" 
          : UNLABELED_FORMS + " unlabeled inputs";
      }
      const metaHeadingsEl = document.getElementById("meta-headings-desc");
      if (metaHeadingsEl) {
        metaHeadingsEl.textContent = lang === "ko" 
          ? H1_COUNT + "개 H1, " + SKIPPED_LEVELS + "개 건너뜀" 
          : H1_COUNT + " H1, " + SKIPPED_LEVELS + " skipped";
      }
      const metaLinksEl = document.getElementById("meta-links-desc");
      if (metaLinksEl) {
        metaLinksEl.textContent = lang === "ko" 
          ? GENERIC_LINKS + "개 모호한 링크명" 
          : GENERIC_LINKS + " generic labels";
      }
      
      const skipValEl = document.getElementById("val-skip-link");
      if (skipValEl) {
        skipValEl.textContent = HAS_SKIP_LINK ? dict["present"] : dict["missing"];
      }
      
      const viewportValEl = document.getElementById("val-viewport");
      if (viewportValEl) {
        viewportValEl.textContent = HAS_VIEWPORT ? dict["present"] : dict["missing"];
      }
      
      const langValCardEl = document.getElementById("val-lang");
      if (langValCardEl) {
        langValCardEl.textContent = LANG_VAL ? '"' + LANG_VAL + '"' : dict["notSet"];
      }
      
      // Update Issue list messages
      document.querySelectorAll(".t-issue-msg").forEach(el => {
        const origMsg = el.getAttribute("data-original-msg");
        el.textContent = lang === "ko" ? getKoreanIssueMessage(origMsg) : origMsg;
      });
      
      // Toggle Switcher button active styling
      const btn = document.getElementById("report-lang-toggle");
      if (btn) {
        btn.textContent = lang === "en" ? "KOR" : "ENG";
      }
    }
    
    function toggleLanguage() {
      const target = reportLang === "en" ? "ko" : "en";
      setReportLang(target);
    }
    
    window.addEventListener("DOMContentLoaded", () => {
      setReportLang(reportLang);
    });
  </script>
</head>
<body>
  <div class="page">
    <div class="top-stripe"></div>

    <div class="header">
      <div style="position:absolute;top:32px;right:32px;display:flex;gap:12px;align-items:center;">
        <button id="report-lang-toggle" onclick="toggleLanguage()" style="background:var(--c-primary);border:1.5px solid var(--c-primary);border-radius:4px;color:#FFFFFF;font-family:var(--font-display);font-size:11px;font-weight:700;padding:4px 12px;cursor:pointer;letter-spacing:0.08em;text-transform:uppercase;outline:none;">
          ${currentLang === "en" ? "KOR" : "ENG"}
        </button>
      </div>
      <p class="header__eyebrow t-key" data-t-key="reportTitle">Accessibility Audit Report</p>
      <h1 class="header__title">${meta.domain}</h1>
      <p class="header__meta">
        <span class="t-key" data-t-key="labelPage">Page:</span> <a href="${meta.url}" target="_blank" rel="noopener">${meta.title}</a><br/>
        <span class="t-key" data-t-key="labelGenerated">Generated:</span> ${date} &nbsp;·&nbsp; <span class="t-key" data-t-key="labelLang">Language</span>: <span id="report-meta-lang-val" data-lang-val="${meta.lang || ""}">${meta.lang ? `"${meta.lang}"` : "Not Set"}</span> &nbsp;·&nbsp; <span class="t-key" data-t-key="labelProtocol">Protocol</span>: <span id="report-meta-proto-val" data-proto-val="${meta.https ? "secure" : "insecure"}">${meta.https ? "HTTPS ✓" : "HTTP (insecure)"}</span>
      </p>
    </div>

    <!-- Overall Score -->
    <div class="section">
      <h2 class="section-title t-key" data-t-key="overallScoreTitle">Overall Score</h2>
      <div class="score-block">
        <div class="score-dial">
          <svg class="score-dial__ring" width="100" height="100" viewBox="0 0 100 100">
            <!-- Track -->
            <circle cx="50" cy="50" r="44" fill="#FFFFFF" stroke="var(--c-border)" stroke-width="8" />
            <!-- Progress stroke -->
            <circle cx="50" cy="50" r="44" fill="none" stroke="${overallColor}" stroke-width="8" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="square" transform="rotate(-90 50 50)" />
          </svg>
          <span class="score-dial__number">${scores.overall}</span>
        </div>
        <div style="flex:1;">
          <p id="overall-score-label" class="score-label">${
            scores.overall >= 90 ? "Excellent" :
            scores.overall >= 75 ? "Good"      :
            scores.overall >= 55 ? "Needs Work": "Poor"
          }</p>
          <p id="overall-meta-desc" class="score-meta">${(() => {
            const s = scores.overall;
            const c = summary.critical;
            const w = summary.warning;
            if (s >= 90) return `This page demonstrates strong accessibility fundamentals. The structure is well-formed, ARIA is used correctly, and keyboard users can navigate effectively. ${c === 0 ? "No critical issues were found." : `${c} critical issue${c > 1 ? "s" : ""} remain${c === 1 ? "s" : ""} and should still be addressed.`}`;
            if (s >= 75) return `This page has solid accessibility support with a few gaps. ${c > 0 ? `${c} critical issue${c > 1 ? "s" : ""} require${c === 1 ? "s" : ""} immediate attention — these directly block screen reader or keyboard users.` : "No critical blockers were found."} ${w > 0 ? `${w} warning${w > 1 ? "s" : ""} indicate areas that could cause confusion or friction.` : ""}`;
            if (s >= 55) return `This page has meaningful accessibility gaps that would create barriers for screen reader and keyboard users. ${c > 0 ? `${c} critical issue${c > 1 ? "s" : ""} are blocking — users relying on assistive technology may be unable to complete key tasks.` : ""} Prioritise fixing critical issues before warnings.`;
            return `This page has significant accessibility barriers. ${c > 0 ? `${c} critical issue${c > 1 ? "s" : ""} were found — many users relying on keyboards or assistive technology will encounter direct blockers.` : ""} A structured remediation plan is strongly recommended. Consider involving an accessibility specialist.`;
          })()}</p>
          <div class="pills">
            <span class="pill" style="background:var(--c-critical-bg);color:var(--c-critical);border:1.5px solid rgba(220, 38, 38, 0.25);">${summary.critical} <span class="t-key-severity" data-severity="critical">Critical</span></span>
            <span class="pill" style="background:var(--c-warning-bg);color:var(--c-warning);border:1.5px solid rgba(217, 119, 6, 0.25);">${summary.warning} <span class="t-key-severity" data-severity="warning">Warning</span></span>
            <span class="pill" style="background:var(--c-info-bg);color:var(--c-info);border:1.5px solid rgba(37, 99, 235, 0.25);">${summary.info} <span class="t-key-severity" data-severity="info">Info</span></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Page Statistics -->
    <div class="section">
      <h2 class="section-title t-key" data-t-key="pageStatsTitle">Page Statistics</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-card__header">
            <svg class="stat-card__icon" viewBox="0 0 256 256" width="20" height="20" fill="currentColor">
              <path d="M216,116v36a80,80,0,0,1-80,80c-44.18,0-55.81-24-93.32-90a20,20,0,0,1,34.64-20L96,152V44a20,20,0,0,1,40,0v56a20,20,0,0,1,40,0v16a20,20,0,0,1,40,0Z" opacity="0.2"/>
              <path d="M196,88a27.86,27.86,0,0,0-13.35,3.39A28,28,0,0,0,144,74.7V44a28,28,0,0,0-56,0v80l-3.82-6.13A28,28,0,0,0,35.73,146l4.67,8.23C74.81,214.89,89.05,240,136,240a88.1,88.1,0,0,0,88-88V116A28,28,0,0,0,196,88Zm12,64a72.08,72.08,0,0,1-72,72c-37.63,0-47.84-18-81.68-77.68l-4.69-8.27,0-.05A12,12,0,0,1,54,121.61a11.88,11.88,0,0,1,6-1.6,12,12,0,0,1,10.41,6,1.76,1.76,0,0,0,.14.23l18.67,30A8,8,0,0,0,104,152V44a12,12,0,0,1,24,0v68a8,8,0,0,0,16,0V100a12,12,0,0,1,24,0v20a8,8,0,0,0,16,0v-4a12,12,0,0,1,24,0Z"/>
            </svg>
            <span class="stat-card__title t-key" data-t-key="statInteractive">Interactive Elements</span>
          </div>
          <div class="stat-card__value">${meta.interactiveCount ?? 0}</div>
          <div class="stat-card__meta t-key" data-t-key="metaInteractive">Total focusable items</div>
        </div>

        <div class="stat-card">
          <div class="stat-card__header">
            <svg class="stat-card__icon" viewBox="0 0 256 256" width="20" height="20" fill="currentColor">
              <path d="M224,56V178.06l-39.72-39.72a8,8,0,0,0-14.31,0L147.31,164,97.66,114.34a8,8,0,0,0-11.32,0L32,168.69V56a8,8,0,0,1,8-8H216A8,8,0,0,1,224,56Z" opacity="0.2"/>
              <path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,16V158.75l-26.07-26.06a16,16,0,0,0-22.63,0l-20,20-44-44a16,16,0,0,0-22.62,0L40,149.37V56ZM40,172l52-52,80,80H40Zm176,28H194.63l-36-36,20-20L216,181.38V200ZM144,100a12,12,0,1,1,12,12A12,12,0,0,1,144,100Z"/>
            </svg>
            <span class="stat-card__title t-key" data-t-key="statImages">Images Audited</span>
          </div>
          <div class="stat-card__value">${foundCounts?.images?.total ?? 0}</div>
          <div id="meta-images-desc" class="stat-card__meta">${foundCounts?.images?.missingAlt ?? 0} missing Alt tags</div>
        </div>

        <div class="stat-card">
          <div class="stat-card__header">
            <svg class="stat-card__icon" viewBox="0 0 256 256" width="20" height="20" fill="currentColor">
              <path d="M240,80v96a8,8,0,0,1-8,8H24a8,8,0,0,1-8-8V80a8,8,0,0,1,8-8H232A8,8,0,0,1,240,80Z" opacity="0.2"/>
              <path d="M112,40a8,8,0,0,0-8,8V64H24A16,16,0,0,0,8,80v96a16,16,0,0,0,16,16h80v16a8,8,0,0,0,16,0V48A8,8,0,0,0,112,40ZM24,176V80h80v96ZM248,80v96a16,16,0,0,1-16,16H144a8,8,0,0,1,0-16h88V80H144a8,8,0,0,1,0-16h88A16,16,0,0,1,248,80ZM88,112a8,8,0,0,1-8,8H72v24a8,8,0,0,1-16,0V120H48a8,8,0,0,1,0-16H80A8,8,0,0,1,88,112Z"/>
            </svg>
            <span class="stat-card__title t-key" data-t-key="statForms">Form Inputs</span>
          </div>
          <div class="stat-card__value">${foundCounts?.forms?.inputs ?? 0}</div>
          <div id="meta-forms-desc" class="stat-card__meta">${foundCounts?.forms?.unlabeled ?? 0} unlabeled inputs</div>
        </div>

        <div class="stat-card">
          <div class="stat-card__header">
            <svg class="stat-card__icon" viewBox="0 0 256 256" width="20" height="20" fill="currentColor">
              <path d="M200,56V200H56V56Z" opacity="0.2"/>
              <path d="M208,56V200a8,8,0,0,1-16,0V136H64v64a8,8,0,0,1-16,0V56a8,8,0,0,1,16,0Z"/>
            </svg>
            <span class="stat-card__title t-key" data-t-key="statHeadings">Headings</span>
          </div>
          <div class="stat-card__value">${foundCounts?.headings?.total ?? 0}</div>
          <div id="meta-headings-desc" class="stat-card__meta">${foundCounts?.headings?.h1Count ?? 0} H1, ${foundCounts?.headings?.skippedLevels ?? 0} skipped</div>
        </div>

        <div class="stat-card">
          <div class="stat-card__header">
            <svg class="stat-card__icon" viewBox="0 0 256 256" width="20" height="20" fill="currentColor">
              <path d="M218.34,119.6,183.6,154.34a46.58,46.58,0,0,1-44.31,12.26c-.31.34-.62.67-.95,1L103.6,202.34A46.63,46.63,0,1,1,37.66,136.4L72.4,101.66A46.6,46.6,0,0,1,116.71,89.4c.31-.34.62-.67,1-1L152.4,53.66a46.63,46.63,0,0,1,65.94,65.94Z" opacity="0.2"/>
              <path d="M240,88.23a54.43,54.43,0,0,1-16,37L189.25,160a54.27,54.27,0,0,1-38.63,16h-.05A54.63,54.63,0,0,1,96,119.84a8,8,0,0,1,16,.45A38.62,38.62,0,0,0,150.58,160h0a38.39,38.39,0,0,0,27.31-11.31l34.75-34.75a38.63,38.63,0,0,0-54.63-54.63l-11,11A8,8,0,0,1,135.7,59l11-11A54.65,54.65,0,0,1,224,48,54.86,54.86,0,0,1,240,88.23ZM109,185.66l-11,11A38.41,38.41,0,0,1,70.6,208h0a38.63,38.63,0,0,1-27.29-65.94L78,107.31A38.63,38.63,0,0,1,144,135.71a8,8,0,0,0,7.78,8.22H152a8,8,0,0,0,8-7.78A54.86,54.86,0,0,0,144,96a54.65,54.65,0,0,0-77.27,0L32,130.75A54.62,54.62,0,0,0,70.56,224h0a54.28,54.28,0,0,0,38.64-16l11-11A8,8,0,0,0,109,185.66Z"/>
            </svg>
            <span class="stat-card__title t-key" data-t-key="statLinks">Anchors & Links</span>
          </div>
          <div class="stat-card__value">${foundCounts?.links?.links ?? 0}</div>
          <div id="meta-links-desc" class="stat-card__meta">${foundCounts?.links?.genericText ?? 0} generic labels</div>
        </div>

        <div class="stat-card">
          <div class="stat-card__header">
            <svg class="stat-card__icon" viewBox="0 0 256 256" width="20" height="20" fill="currentColor">
              <path d="M232,64V192a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V64a8,8,0,0,1,8-8H224A8,8,0,0,1,232,64Z" opacity="0.2"/>
              <path d="M224,48H32A16,16,0,0,0,16,64V192a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V64A16,16,0,0,0,224,48Zm0,144H32V64H224V192Zm-16-64a8,8,0,0,1-8,8H56a8,8,0,0,1,0-16H200A8,8,0,0,1,208,128Zm0-32a8,8,0,0,1-8,8H56a8,8,0,0,1,0-16H200A8,8,0,0,1,208,96ZM72,160a8,8,0,0,1-8,8H56a8,8,0,0,1,0-16h8A8,8,0,0,1,72,160Zm96,0a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,160Zm40,0a8,8,0,0,1-8,8h-8a8,8,0,0,1,0-16h8A8,8,0,0,1,208,160Z"/>
            </svg>
            <span class="stat-card__title t-key" data-t-key="statSkip">Skip Keyboard Link</span>
          </div>
          <div id="val-skip-link" class="stat-card__value ${foundCounts?.keyboard?.skipLinks ? 'pass' : 'fail'}">${foundCounts?.keyboard?.skipLinks ? "Present" : "Missing"}</div>
          <div class="stat-card__meta t-key" data-t-key="statSkipMeta">Bypasses repetitive content</div>
        </div>

        <div class="stat-card">
          <div class="stat-card__header">
            <svg class="stat-card__icon" viewBox="0 0 256 256" width="20" height="20" fill="currentColor">
              <path d="M208,48V208H48V48Z" opacity="0.2"/>
              <path d="M216,48V88a8,8,0,0,1-16,0V56H168a8,8,0,0,1,0-16h40A8,8,0,0,1,216,48ZM88,200H56V168a8,8,0,0,0-16,0v40a8,8,0,0,0,8,8H88a8,8,0,0,0,0-16Zm120-40a8,8,0,0,0-8,8v32H168a8,8,0,0,0,0,16h40a8,8,0,0,0,8-8V168A8,8,0,0,0,208,160ZM88,40H48a8,8,0,0,0-8,8V88a8,8,0,0,0,16,0V56H88a8,8,0,0,0,0-16Z"/>
            </svg>
            <span class="stat-card__title t-key" data-t-key="statViewport">Viewport Meta</span>
          </div>
          <div id="val-viewport" class="stat-card__value ${meta.viewport ? 'pass' : 'fail'}">${meta.viewport ? "Present" : "Missing"}</div>
          <div class="stat-card__meta t-key" data-t-key="statViewportMeta">Supports pinch and zoom</div>
        </div>

        <div class="stat-card">
          <div class="stat-card__header">
            <svg class="stat-card__icon" viewBox="0 0 256 256" width="20" height="20" fill="currentColor">
              <path d="M224,184H144l40-80ZM96,127.56h0A95.78,95.78,0,0,0,128,56H64A95.78,95.78,0,0,0,96,127.56Z" opacity="0.2"/>
              <path d="M247.15,212.42l-56-112a8,8,0,0,0-14.31,0l-21.71,43.43A88,88,0,0,1,108,126.93,103.65,103.65,0,0,0,135.69,64H160a8,8,0,0,0,0-16H104V32a8,8,0,0,0-16,0V48H32a8,8,0,0,0,0,16h87.63A87.7,87.7,0,0,1,96,116.35a87.74,87.74,0,0,1-19-31,8,8,0,1,0-15.08,5.34A103.63,103.63,0,0,0,84,127a87.55,87.55,0,0,1-52,17,8,8,0,0,0,0,16,103.46,103.46,0,0,0,64-22.08,104.18,104.18,0,0,0,51.44,21.31l-26.6,53.19a8,8,0,0,0,14.31,7.16L148.94,192h70.11l13.79,27.58A8,8,0,0,0,240,224a8,8,0,0,0,7.15-11.58ZM156.94,176,184,121.89,211.05,176Z"/>
            </svg>
            <span class="stat-card__title t-key" data-t-key="statLang">HTML Language</span>
          </div>
          <div id="val-lang" class="stat-card__value ${meta.lang ? 'pass' : 'fail'}">${meta.lang ? `"${meta.lang}"` : "Not Set"}</div>
          <div class="stat-card__meta t-key" data-t-key="statLangMeta">Defines page language</div>
        </div>
      </div>
    </div>

    <!-- Category Breakdown -->
    <div class="section">
      <h2 class="section-title t-key" data-t-key="categoryTitle">Category Scores</h2>
      <table class="category-table">
        <thead><tr><th style="width:30%;" class="t-key" data-t-key="colCategory">Category</th><th style="width:55%;" class="t-key" data-t-key="colScore">Score</th><th style="width:15%;text-align:right;">%</th></tr></thead>
        <tbody>${categoryRows}</tbody>
      </table>
    </div>

    <!-- Issues -->
    <div class="section">
      <h2 class="section-title"><span class="t-key" data-t-key="allIssuesTitle">All Issues</span> (${issues.length})</h2>
      ${issues.length === 0
        ? `<p class="t-key" data-t-key="noIssuesFound" style="color:var(--c-pass);font-weight:700;background:var(--c-pass-bg);border:1.5px solid var(--c-primary);padding:24px;border-radius:12px;text-align:center;font-size:16px;">No issues found — excellent work! 🎉</p>`
        : `<table>
          <thead><tr><th style="width:12%;" class="t-key" data-t-key="colSeverity">Severity</th><th style="width:15%;" class="t-key" data-t-key="colCategory">Category</th><th style="width:38%;" class="t-key" data-t-key="colIssue">Issue</th><th style="width:25%;" class="t-key" data-t-key="colElement">Element</th><th style="width:10%;" class="t-key" data-t-key="colWcag">WCAG</th></tr></thead>
          <tbody>${issueRows}</tbody>
        </table>`
      }
    </div>

    <!-- Recommendations -->
    <div class="section">
      <h2 class="section-title t-key" data-t-key="keyRecsTitle">Key Recommendations</h2>
      <table>
        <thead><tr><th style="width:10%;">#</th><th style="width:75%;" class="t-key" data-t-key="colRec">Recommendation</th><th style="width:15%;" class="t-key" data-t-key="colImpact">Impact</th></tr></thead>
        <tbody>
          ${(() => {
            const seen = new Set();
            const unique = sorted
              .filter(i => i.severity === "critical")
              .filter(i => { if (seen.has(i.message)) return false; seen.add(i.message); return true; })
              .slice(0, 5);
            return unique.length
              ? unique.map((issue, idx) => `
            <tr>
              <td style="font-weight:800;color:var(--c-text);vertical-align:middle;padding:16px 20px;">${idx + 1}</td>
              <td class="t-issue-msg" data-original-msg="${issue.message}" style="color:var(--c-text);font-weight:600;vertical-align:middle;padding:16px 20px;">${issue.message}</td>
              <td style="vertical-align:middle;padding:16px 20px;">
                <span class="pill t-key" data-t-key="high" style="background:var(--c-critical-bg);color:var(--c-critical);border:1.5px solid rgba(220, 38, 38, 0.25);font-weight:700;">High</span>
              </td>
            </tr>`).join("")
              : `<tr><td colspan="3" class="t-key" data-t-key="noCritical" style="color:var(--c-pass);font-weight:700;padding:20px;text-align:center;">No critical issues — review warnings next.</td></tr>`;
          })()}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p class="t-key" data-t-key="footerAudit">Generated by A11y Analyzer &nbsp;·&nbsp; Results are heuristic-based and should be supplemented with manual testing and real assistive technology testing.</p>
      <p class="t-key" data-t-key="footerWcag" style="margin-top:6px;">For full WCAG compliance, also test with NVDA/JAWS (Windows) or VoiceOver (macOS/iOS) and run a contrast checker.</p>
    </div>

  </div>
</body>
</html>`;

  return html;
}

// ── Number counter animation ──────────────────────────────────
function animateCount(el, from, to, duration) {
  const start = performance.now();
  function update(ts) {
    const p = Math.min((ts - start) / duration, 1);
    el.textContent = Math.round(from + (to - from) * easeOut(p));
    if (p < 1) requestAnimationFrame(update);
  }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  requestAnimationFrame(update);
}

// ── Download handler ──────────────────────────────────────────
function downloadReport() {
  if (!auditData) return;
  const html = generateReport(auditData);
  const blob  = new Blob([html], { type: "text/html" });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement("a");
  const domain = auditData.meta?.domain?.replace(/[^a-z0-9]/gi, "-") || "site";
  a.href     = url;
  a.download = `a11y-report-${domain}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Event listeners ───────────────────────────────────────────
btnAnalyze.addEventListener("click",  startAnalysis);
btnDownload.addEventListener("click", downloadReport);
if (btnRerun) {
  btnRerun.addEventListener("click", startAnalysis);
}

// ── Init ──────────────────────────────────────────────────────
setupLanguageSwitcher();
applyLanguage(currentLang);
