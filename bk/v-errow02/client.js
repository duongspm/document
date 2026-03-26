// ============================================================
//  client.js  —  Public client page
// ============================================================
import { listenDocuments, getDocument }
  // from "../shared/firebase.js";
  from "./connection.js";


// ── State ────────────────────────────────────────────────────
let allDocs    = [];
let activeTag  = "all";
let searchQ    = "";

// ── Init ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  setupSearch();
  setupScrollHeader();
  setupMobileMenu();
  setupOverlayClose();
  listenDocuments(docs => {
    allDocs = docs;
    updateHeroStats();
    buildTagBar();
    renderGrid();
  });
});

// ── Hero stats ────────────────────────────────────────────────
function updateHeroStats() {
  document.getElementById("hs-total").textContent =
    allDocs.length + " tài liệu";
  document.getElementById("hs-tags").textContent =
    [...new Set(allDocs.flatMap(d => parseTags(d.tags)))].length + " tags";
  document.getElementById("hs-demo").textContent =
    allDocs.filter(d => d.hasCode).length + " có demo";
}

// ── Tag bar ───────────────────────────────────────────────────
function buildTagBar() {
  const types = [...new Set(allDocs.map(d => d.type).filter(Boolean))];
  const tags  = [...new Set(allDocs.flatMap(d => parseTags(d.tags)))].sort();
  const all   = [...new Set([...types, ...tags])].slice(0, 24);

  const bar = document.getElementById("tagBarInner");
  bar.innerHTML = `<button class="tag-btn ${activeTag === "all" ? "active" : ""}"
    onclick="setClientFilter('all',this)">✦ Tất cả</button>`;
  all.forEach(t => {
    bar.innerHTML += `<button class="tag-btn ${activeTag === t ? "active" : ""}"
      onclick="setClientFilter('${t}',this)">${t}</button>`;
  });
}

function setClientFilter(tag, el) {
  activeTag = tag;
  document.querySelectorAll(".tag-btn").forEach(b => b.classList.remove("active"));
  el?.classList.add("active");
  renderGrid();
  document.getElementById("siteBody").scrollIntoView({ behavior: "smooth" });
}
window.setClientFilter = setClientFilter;

function filterAll() {
  setClientFilter("all", document.querySelector('.tag-btn[onclick*="\'all\'"]'));
}
window.filterAll = filterAll;

// ── Render grid ───────────────────────────────────────────────
function renderGrid() {
  let filtered = allDocs;

  if (activeTag !== "all") {
    filtered = allDocs.filter(d =>
      d.type === activeTag ||
      parseTags(d.tags).includes(activeTag)
    );
  }
  if (searchQ) {
    const q = searchQ.toLowerCase();
    filtered = filtered.filter(d =>
      d.title?.toLowerCase().includes(q) ||
      d.desc?.toLowerCase().includes(q)  ||
      d.tags?.toLowerCase().includes(q)
    );
  }

  const info = document.getElementById("resultsInfo");
  info.textContent = filtered.length === allDocs.length
    ? `${allDocs.length} tài liệu`
    : `${filtered.length} trong ${allDocs.length} tài liệu`;

  const grid = document.getElementById("clientGrid");
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="client-empty">
        <div class="ce-icon">${searchQ ? "🔍" : "📭"}</div>
        <div class="ce-title">${searchQ ? "Không tìm thấy" : "Chưa có tài liệu"}</div>
        <div class="ce-desc">${searchQ ? `Thử từ khoá khác cho "${searchQ}"` : "Quay lại sau nhé!"}</div>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map((doc, i) => clientCardHTML(doc, i)).join("");
}

// ── Card HTML ─────────────────────────────────────────────────
const TYPE_META = {
  guide:     { icon: "📖", cls: "guide"     },
  api:       { icon: "⚡", cls: "api"       },
  tutorial:  { icon: "🎯", cls: "tutorial"  },
  component: { icon: "🧩", cls: "component" },
  snippet:   { icon: "✂️", cls: "snippet"   },
  release:   { icon: "🚀", cls: "release"   },
  design:    { icon: "🎨", cls: "design"    },
};
const TYPE_NAMES = {
  guide:"Hướng dẫn", api:"API", tutorial:"Tutorial",
  component:"Component", snippet:"Snippet", release:"Release", design:"Design"
};

function clientCardHTML(doc, idx) {
  const meta  = TYPE_META[doc.type] || { icon: "📄", cls: "guide" };
  const date  = doc.createdAt?.seconds
    ? new Date(doc.createdAt.seconds * 1000).toLocaleDateString("vi-VN")
    : "";
  const tags  = parseTags(doc.tags).slice(0, 5)
    .map(t => `<span class="ctag" onclick="event.stopPropagation();tagClick('${t}')">${t}</span>`)
    .join("");
  const demoIndicator = doc.hasCode
    ? `<div class="demo-indicator">▶ Demo</div>` : "";

  return `
  <div class="client-card" onclick="openDetail('${doc.id}')" style="animation-delay:${idx*0.04}s">
    <div class="client-card-thumb cthumb-${meta.cls}">
      ${meta.icon}
      ${demoIndicator}
    </div>
    <div class="client-card-body">
      <span class="cbadge cbadge-${meta.cls}">${meta.icon} ${TYPE_NAMES[doc.type] || doc.type}</span>
      <div class="client-card-title">${escHtml(doc.title)}</div>
      <div class="client-card-desc">${escHtml((doc.desc || "").slice(0, 90) + ((doc.desc||"").length > 90 ? "…" : ""))}</div>
      <div class="client-card-footer">
        ${date ? `<div class="client-card-meta">📅 ${date}</div>` : ""}
        ${tags ? `<div class="client-tags">${tags}</div>` : ""}
      </div>
    </div>
  </div>`;
}

function tagClick(tag) {
  activeTag = tag;
  buildTagBar();
  renderGrid();
  document.getElementById("siteBody").scrollIntoView({ behavior: "smooth" });
}
window.tagClick = tagClick;

// ── Detail overlay ────────────────────────────────────────────
async function openDetail(id) {
  const overlay = document.getElementById("detailOverlay");
  const scroll  = document.getElementById("detailScroll");

  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
  scroll.innerHTML = `<div class="detail-loading"><div class="loader"></div><p>Đang tải…</p></div>`;

  const snap = await getDocument(id);
  if (!snap.exists()) {
    scroll.innerHTML = `<div class="detail-loading"><p>Không tìm thấy tài liệu.</p></div>`;
    return;
  }
  const doc  = { id: snap.id, ...snap.data() };
  const meta = TYPE_META[doc.type] || { icon: "📄", cls: "guide" };
  const date = doc.createdAt?.seconds
    ? new Date(doc.createdAt.seconds * 1000).toLocaleDateString("vi-VN") : "";
  const tags = parseTags(doc.tags)
    .map(t => `<span class="ctag" onclick="tagClick('${t}')">${t}</span>`).join("");

  const demoSection = doc.hasCode ? buildDetailDemo(doc) : "";

  scroll.innerHTML = `
    <div class="detail-hero">
      <span class="detail-type-icon">${meta.icon}</span>
      <div class="detail-title">${escHtml(doc.title)}</div>
      <div class="detail-meta">
        <span class="cbadge cbadge-${meta.cls}">${meta.icon} ${TYPE_NAMES[doc.type] || doc.type}</span>
        ${date ? `<span>📅 ${date}</span>` : ""}
        ${doc.author ? `<span>👤 ${escHtml(doc.author)}</span>` : ""}
        ${doc.hasCode ? `<span style="color:var(--acc3)">▶ Có Live Demo</span>` : ""}
      </div>
      ${tags ? `<div class="detail-tags-row">${tags}</div>` : ""}
    </div>

    <div class="detail-body">${renderMarkdown(doc.content || "")}</div>
    ${demoSection}
  `;

  // Inject iframe after render
  if (doc.hasCode) setTimeout(() => injectDetailFrame(doc), 80);
}
window.openDetail = openDetail;

function buildDetailDemo(doc) {
  const h = escHtml(doc.codeHtml || "");
  const c = escHtml(doc.codeCss  || "");
  const j = escHtml(doc.codeJs   || "");

  return `
  <div class="detail-demo">
    <div class="dd-header">
      <div class="dd-title">▶ LIVE DEMO</div>
      <div class="dd-tabs">
        <button class="dd-tab active" onclick="switchDDTab(event,'dd-preview')">Preview</button>
        <button class="dd-tab" onclick="switchDDTab(event,'dd-html')">HTML</button>
        <button class="dd-tab" onclick="switchDDTab(event,'dd-css')">CSS</button>
        <button class="dd-tab" onclick="switchDDTab(event,'dd-js')">JS</button>
      </div>
    </div>
    <div class="dd-pane active" id="dd-preview">
      <iframe class="dd-frame" id="detailFrame" sandbox="allow-scripts allow-same-origin"></iframe>
    </div>
    <div class="dd-pane" id="dd-html">
      <pre class="dd-code">${h || "<!-- Không có HTML -->"}</pre>
      <button class="dd-copy" onclick="ddCopy('${btoa(unescape(encodeURIComponent(doc.codeHtml||'')))}')">📋 Copy HTML</button>
    </div>
    <div class="dd-pane" id="dd-css">
      <pre class="dd-code">${c || "/* Không có CSS */"}</pre>
      <button class="dd-copy" onclick="ddCopy('${btoa(unescape(encodeURIComponent(doc.codeCss||'')))}')">📋 Copy CSS</button>
    </div>
    <div class="dd-pane" id="dd-js">
      <pre class="dd-code">${j || "// Không có JS"}</pre>
      <button class="dd-copy" onclick="ddCopy('${btoa(unescape(encodeURIComponent(doc.codeJs||'')))}')">📋 Copy JS</button>
    </div>
  </div>`;
}

function injectDetailFrame(doc) {
  const frame = document.getElementById("detailFrame");
  if (!frame) return;
  frame.srcdoc = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    *{box-sizing:border-box}body{margin:0;padding:16px;font-family:sans-serif}
    ${doc.codeCss || ""}
  </style></head><body>${doc.codeHtml || ""}<script>${doc.codeJs || ""}<\/script></body></html>`;
}

function switchDDTab(e, paneId) {
  const demo = e.target.closest(".detail-demo");
  demo.querySelectorAll(".dd-tab").forEach(t => t.classList.remove("active"));
  demo.querySelectorAll(".dd-pane").forEach(p => p.classList.remove("active"));
  e.target.classList.add("active");
  demo.querySelector("#" + paneId)?.classList.add("active");
}
window.switchDDTab = switchDDTab;

function ddCopy(b64) {
  try {
    const text = decodeURIComponent(escape(atob(b64)));
    navigator.clipboard.writeText(text).then(() => showFloatToast("✅ Đã copy!"));
  } catch { showFloatToast("❌ Không copy được"); }
}
window.ddCopy = ddCopy;

function closeDetail() {
  document.getElementById("detailOverlay").classList.remove("open");
  document.body.style.overflow = "";
}
window.closeDetail = closeDetail;

function setupOverlayClose() {
  document.getElementById("detailOverlay").addEventListener("click", e => {
    if (e.target === document.getElementById("detailOverlay")) closeDetail();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeDetail();
  });
}

// ── Search ────────────────────────────────────────────────────
function setupSearch() {
  const input = document.getElementById("heroSearch");
  let timer;
  input.addEventListener("input", e => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      searchQ = e.target.value.trim();
      renderGrid();
      if (searchQ) document.getElementById("siteBody").scrollIntoView({ behavior: "smooth" });
    }, 280);
  });
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      clearTimeout(timer);
      searchQ = e.target.value.trim();
      renderGrid();
      document.getElementById("siteBody").scrollIntoView({ behavior: "smooth" });
    }
  });
}

// ── Scroll header ─────────────────────────────────────────────
function setupScrollHeader() {
  window.addEventListener("scroll", () => {
    document.getElementById("siteHeader").classList.toggle("scrolled", window.scrollY > 40);
  });
}

// ── Mobile menu ───────────────────────────────────────────────
function setupMobileMenu() {
  document.getElementById("mobileMenuBtn").onclick = () => {
    document.getElementById("mobileMenu").classList.toggle("open");
  };
}
function closeMobileMenu() {
  document.getElementById("mobileMenu").classList.remove("open");
}
window.closeMobileMenu = closeMobileMenu;

// ── Float toast ───────────────────────────────────────────────
function showFloatToast(msg) {
  const el = document.createElement("div");
  el.textContent = msg;
  Object.assign(el.style, {
    position: "fixed", bottom: "28px", left: "50%", transform: "translateX(-50%)",
    background: "#1c1c32", border: "1px solid rgba(255,255,255,.1)",
    color: "#f2f2ff", padding: "10px 20px", borderRadius: "20px",
    fontSize: "13px", zIndex: "999", boxShadow: "0 8px 30px rgba(0,0,0,.5)",
    animation: "badgePop .3s ease",
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

// ── Utilities ─────────────────────────────────────────────────
function parseTags(tags) {
  return (tags || "").split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
}

function escHtml(s) {
  return (s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function renderMarkdown(text) {
  if (!text) return "<em style='color:var(--muted)'>Không có nội dung</em>";
  let html = text
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_,lang,code) =>
      `<pre><code>${code.trim()}</code></pre>`)
    .replace(/`([^`]+)`/g,"<code>$1</code>")
    .replace(/^### (.+)$/gm,"<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm,  "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,   "<em>$1</em>")
    .replace(/^> (.+)$/gm,   "<blockquote>$1</blockquote>")
    .replace(/^[-*] (.+)$/gm,"<li>$1</li>")
    .replace(/^\d+\. (.+)$/gm,"<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>\s*)+/g, m => `<ul>${m}</ul>`)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/^---$/gm,"<hr>")
    .replace(/\n\n/g,"</p><p>");
  return "<p>" + html + "</p>";
}


const DARK_START  = 18;  // 18:00 (6 chiều)
const DARK_END    = 7;   // 07:00 (7 sáng)
let   _themeAuto  = true;  // true = chế độ tự động
let   _lastAutoTheme = null;

function initTheme() {
  const saved = localStorage.getItem("dv_theme");
  if (saved) {
    setTheme(saved, false);
    _themeAuto = false;
  } else {
    applyAutoTheme(false);
  }
  // Kiểm tra mỗi phút
  setInterval(checkAutoTheme, 60 * 1000);
}

function getScheduledTheme() {
  const h = new Date().getHours();
  // Tối: 18:00 - 23:59 hoặc 00:00 - 07:00
  return (h >= DARK_START || h < DARK_END) ? "dark" : "light";
}

function applyAutoTheme(notify = true) {
  const theme = getScheduledTheme();
  setTheme(theme, false);
  if (notify && _lastAutoTheme !== null && _lastAutoTheme !== theme) {
    const msgs = {
      dark:  `🌙 Đã chuyển sang chế độ tối vào lúc hoàng hôn`,
      light: `☀️ Đã chuyển sang chế độ sáng vào lúc bình minh`,
    };
    showThemeNotification(msgs[theme]);
  }
  _lastAutoTheme = theme;
}

function checkAutoTheme() {
  if (!_themeAuto) return;
  applyAutoTheme(true);
}

function setTheme(theme, saveLocal = true) {
  document.body.setAttribute("data-theme", theme);
  const icon = document.getElementById("themeIcon");
  if (icon) icon.textContent = theme === "dark" ? "🌙" : "☀️";
  if (saveLocal) localStorage.setItem("dv_theme", theme);
}

function manualToggleTheme() {
  const current = document.body.getAttribute("data-theme") || "dark";
  const next    = current === "dark" ? "light" : "dark";
  setTheme(next, true);
  _themeAuto = false;  // Tắt auto khi user chỉnh tay
  showToast(`${next === "dark" ? "🌙" : "☀️"} Đã chuyển sang chế độ ${next === "dark" ? "tối" : "sáng"}`, "info");
}
window.manualToggleTheme = manualToggleTheme;

function showThemeNotification(msg) {
  const el = document.getElementById("themeToastFixed");
  const msgEl = document.getElementById("themeToastMsg");
  if (!el || !msgEl) return;
  msgEl.textContent = msg;
  el.style.display = "flex";
  setTimeout(() => el.style.display = "none", 5000);
}

// Khởi động — gọi trong DOMContentLoaded:
// initTheme();
// (Tìm dòng document.addEventListener("DOMContentLoaded", () => { ... })
//  Thêm initTheme(); vào trong đó)

// ════════════════════════════════════════════
//  RELATED DOCS (thêm vào cuối client.js)
// ════════════════════════════════════════════

function renderRelatedDocs(currentDoc) {
  const scroll = document.getElementById("detailScroll");
  if (!scroll) return;

  // Tìm bài liên quan: cùng type HOẶC có chung tag
  const currentTags = parseTags(currentDoc.tags);
  const related = allDocs
    .filter(d => d.id !== currentDoc.id)
    .map(d => {
      const dTags   = parseTags(d.tags);
      const tagMatch = currentTags.filter(t => dTags.includes(t)).length;
      const typeMatch = d.type === currentDoc.type ? 2 : 0;
      return { ...d, score: tagMatch + typeMatch };
    })
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  if (related.length === 0) return;

  const typeIcons = { guide:"📖", api:"⚡", tutorial:"🎯", component:"🧩", snippet:"✂️", release:"🚀", design:"🎨" };
  const typeNames = { guide:"Hướng dẫn", api:"API", tutorial:"Tutorial", component:"Component", snippet:"Snippet", release:"Release", design:"Design" };

  const cardsHTML = related.map(d => {
    const icon = typeIcons[d.type] || "📄";
    const tags = parseTags(d.tags).slice(0,3).map(t =>
      `<span class="related-card-tag">${t}</span>`).join("");
    return `
    <div class="related-card" onclick="openDetail('${d.id}')">
      <div class="related-card-icon">${icon}</div>
      <div class="related-card-type">${typeNames[d.type] || d.type}</div>
      <div class="related-card-title">${escHtml(d.title)}</div>
      ${tags ? `<div class="related-card-tags">${tags}</div>` : ""}
    </div>`;
  }).join("");

  const html = `
  <div class="related-section" id="relatedSection">
    <div class="related-title">Bài viết liên quan</div>
    <div class="related-grid">${cardsHTML}</div>
  </div>`;

  // Thêm vào trước comment section hoặc ở cuối
  const cmtSection = document.getElementById("commentSection");
  if (cmtSection) {
    cmtSection.insertAdjacentHTML("beforebegin", html);
  } else {
    scroll.insertAdjacentHTML("beforeend", html);
  }
}
window.renderRelatedDocs = renderRelatedDocs;
