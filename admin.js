// ============================================================
//  admin.js  —  Admin panel logic (ES Module)
// ============================================================
import { addDocument, updateDocument, deleteDocument,
         getDocument, listenDocuments }
  // from "../shared/firebase.js";
  from "connection.js";


// ── State ────────────────────────────────────────────────────
let allDocs        = [];
let currentPage    = "dashboard";
let previousPage   = "dashboard";
let editingId      = null;
let viewingId      = null;
let activeFilter   = "all";
let searchQuery    = "";

// ── Init ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  setupSearch();
  setupHamburger();
  startFirebaseListener();
});

function startFirebaseListener() {
  listenDocuments(docs => {
    allDocs = docs;
    document.getElementById("connStatus").className = "conn-status ok";
    document.getElementById("connStatus").innerHTML = '<span class="conn-dot"></span> Firebase ✓';
    renderAll();
  });
}

// ── Navigation ───────────────────────────────────────────────
function showPage(name) {
  previousPage = currentPage;
  currentPage  = name;

  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item[data-page]").forEach(n => n.classList.remove("active"));

  const el  = document.getElementById("page-" + name);
  const nav = document.querySelector(`.nav-item[data-page="${name}"]`);
  if (el)  el.classList.add("active");
  if (nav) nav.classList.add("active");

  if (name === "dashboard")  renderDashboard();
  if (name === "documents")  renderDocuments();
  if (name === "add")        prepareAddForm();

  if (window.innerWidth <= 768) closeSidebar();
}
window.showPage = showPage;

function goBack() {
  showPage(previousPage === "view" ? "documents" : previousPage);
}
window.goBack = goBack;

// ── Render all (called on data update) ───────────────────────
function renderAll() {
  updateNavCount();
  buildFilterTabs();
  if (currentPage === "dashboard")  renderDashboard();
  if (currentPage === "documents")  renderDocuments();
}

function updateNavCount() {
  document.getElementById("navCount").textContent = allDocs.length;
}

// ── Dashboard ─────────────────────────────────────────────────
function renderDashboard() {
  // Stats
  const total   = allDocs.length;
  const withCode = allDocs.filter(d => d.hasCode).length;
  const allTags = [...new Set(allDocs.flatMap(d => parseTags(d.tags)))].length;
  const today   = allDocs.filter(d => {
    if (!d.createdAt?.seconds) return false;
    const dd = new Date(d.createdAt.seconds * 1000);
    const now = new Date();
    return dd.toDateString() === now.toDateString();
  }).length;

  document.querySelector("#sc-total .stat-num").textContent    = total;
  document.querySelector("#sc-code .stat-num").textContent     = withCode;
  document.querySelector("#sc-tags .stat-num").textContent     = allTags;
  document.querySelector("#sc-today .stat-num").textContent    = today;

  // Recent 6 docs
  const grid = document.getElementById("dashGrid");
  const recent = allDocs.slice(0, 6);
  if (recent.length === 0) {
    grid.innerHTML = emptyHTML("📭", "Chưa có tài liệu", 'Bấm "+ Thêm tài liệu" để bắt đầu');
    return;
  }
  grid.innerHTML = recent.map(docCardHTML).join("");
  animateCards(grid);
}

// ── Documents page ────────────────────────────────────────────
function renderDocuments() {
  let filtered = allDocs;
  if (activeFilter !== "all") {
    filtered = allDocs.filter(d => parseTags(d.tags).includes(activeFilter) || d.type === activeFilter);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(d =>
      d.title?.toLowerCase().includes(q) ||
      d.desc?.toLowerCase().includes(q)  ||
      d.tags?.toLowerCase().includes(q)
    );
  }

  document.getElementById("docsCount").textContent = `${filtered.length} tài liệu`;

  const grid = document.getElementById("allDocsGrid");
  if (filtered.length === 0) {
    grid.innerHTML = emptyHTML(searchQuery ? "🔍" : "📭",
      searchQuery ? "Không tìm thấy kết quả" : "Chưa có tài liệu",
      searchQuery ? "Thử từ khoá khác" : 'Bấm "+ Thêm tài liệu" để tạo mới');
    return;
  }
  grid.innerHTML = filtered.map(docCardHTML).join("");
  animateCards(grid);
}

// ── Filter tabs (built from all tags) ─────────────────────────
function buildFilterTabs() {
  const tags   = [...new Set(allDocs.flatMap(d => parseTags(d.tags)))].sort();
  const types  = [...new Set(allDocs.map(d => d.type).filter(Boolean))];
  const combined = [...new Set([...types, ...tags])].slice(0, 18);

  const container = document.getElementById("filterTabs");
  container.innerHTML = `<button class="ftab ${activeFilter === "all" ? "active" : ""}" data-tag="all" onclick="setFilter('all',this)">Tất cả</button>`;
  combined.forEach(t => {
    container.innerHTML += `<button class="ftab ${activeFilter === t ? "active" : ""}" data-tag="${t}" onclick="setFilter('${t}',this)">${t}</button>`;
  });
}

function setFilter(tag, el) {
  activeFilter = tag;
  document.querySelectorAll(".ftab").forEach(b => b.classList.remove("active"));
  el.classList.add("active");
  renderDocuments();
}
window.setFilter = setFilter;

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

function docCardHTML(doc) {
  const meta = TYPE_META[doc.type] || { icon: "📄", cls: "guide" };
  const date = doc.createdAt?.seconds
    ? new Date(doc.createdAt.seconds * 1000).toLocaleDateString("vi-VN")
    : "—";
  const tags = parseTags(doc.tags).slice(0, 4).map(t =>
    `<span class="tag-pill">${t}</span>`).join("");
  const codeBadge = doc.hasCode
    ? `<span class="code-badge">▶ Demo</span>` : "";

  return `
  <div class="doc-card" onclick="viewDoc('${doc.id}')">
    <div class="doc-card-thumb thumb-${meta.cls}">
      ${meta.icon}
      ${doc.hasCode ? '<span style="position:absolute;bottom:8px;right:10px;font-size:11px;opacity:.6;font-family:Fira Code,monospace">&lt;/&gt;</span>' : ''}
    </div>
    <div class="doc-card-body">
      <span class="doc-badge badge-${meta.cls}">${meta.icon} ${TYPE_NAMES[doc.type] || doc.type}</span>
      <div class="doc-card-title">${escHtml(doc.title)}</div>
      <div class="doc-card-desc">${escHtml((doc.desc || "").slice(0, 85) + ((doc.desc||"").length > 85 ? "…" : ""))}</div>
      <div class="doc-card-meta">
        <span>📅 ${date}</span>
        ${doc.author ? `<span>· 👤 ${escHtml(doc.author)}</span>` : ""}
        ${codeBadge}
      </div>
      ${tags ? `<div class="doc-card-tags">${tags}</div>` : ""}
      <div class="doc-card-actions">
        <button class="dca-btn prim" onclick="event.stopPropagation();viewDoc('${doc.id}')">👁 Xem</button>
        <button class="dca-btn"      onclick="event.stopPropagation();startEdit('${doc.id}')">✏️</button>
        <button class="dca-btn del"  onclick="event.stopPropagation();confirmDelete('${doc.id}','${escHtml(doc.title)}')">🗑️</button>
      </div>
    </div>
  </div>`;
}

// ── View doc detail ────────────────────────────────────────────
async function viewDoc(id) {
  viewingId = id;
  showPage("view");

  const wrap = document.getElementById("viewContent");
  wrap.innerHTML = loadingHTML();

  const snap = await getDocument(id);
  if (!snap.exists()) { wrap.innerHTML = emptyHTML("❌", "Không tìm thấy", "Tài liệu đã bị xoá"); return; }
  const doc = { id: snap.id, ...snap.data() };

  const meta  = TYPE_META[doc.type] || { icon: "📄", cls: "guide" };
  const date  = doc.createdAt?.seconds
    ? new Date(doc.createdAt.seconds * 1000).toLocaleDateString("vi-VN")
    : "—";
  const tags  = parseTags(doc.tags).map(t => `<span class="tag-pill">${t}</span>`).join("");
  const demoBlock = doc.hasCode ? buildDemoBlock(doc) : "";

  wrap.innerHTML = `
    <div class="view-hero">
      <div class="view-badge">
        <span class="doc-badge badge-${meta.cls}">${meta.icon} ${TYPE_NAMES[doc.type] || doc.type}</span>
      </div>
      <div class="view-title">${escHtml(doc.title)}</div>
      <div class="view-meta">
        <span>📅 ${date}</span>
        ${doc.author ? `<span>👤 ${escHtml(doc.author)}</span>` : ""}
        ${doc.hasCode ? `<span style="color:var(--a3)">▶ Có demo</span>` : ""}
      </div>
      ${tags ? `<div class="view-tags">${tags}</div>` : ""}
    </div>

    <div class="view-content">${renderMarkdown(doc.content || "")}</div>
    ${demoBlock}
  `;
}
window.viewDoc = viewDoc;

function buildDemoBlock(doc) {
  const h = escHtml(doc.codeHtml || "");
  const c = escHtml(doc.codeCss  || "");
  const j = escHtml(doc.codeJs   || "");

  return `
  <div class="demo-block">
    <div class="demo-header">
      <div class="demo-title">▶ Live Demo</div>
      <div class="demo-tabs">
        <button class="demo-tab active" onclick="switchDemoTab(event,'demo-preview')">Preview</button>
        <button class="demo-tab" onclick="switchDemoTab(event,'demo-html')">HTML</button>
        <button class="demo-tab" onclick="switchDemoTab(event,'demo-css')">CSS</button>
        <button class="demo-tab" onclick="switchDemoTab(event,'demo-js')">JS</button>
      </div>
    </div>

    <div class="demo-preview-pane active" id="demo-preview">
      <iframe id="demoFrame" sandbox="allow-scripts allow-same-origin"></iframe>
    </div>
    <div class="demo-code-pane" id="demo-html">
      <pre class="demo-code">${h || "<em>Không có HTML</em>"}</pre>
      <button class="copy-btn" onclick="copyCode('${btoa(unescape(encodeURIComponent(doc.codeHtml||'')))}')">Copy</button>
    </div>
    <div class="demo-code-pane" id="demo-css">
      <pre class="demo-code">${c || "<em>Không có CSS</em>"}</pre>
      <button class="copy-btn" onclick="copyCode('${btoa(unescape(encodeURIComponent(doc.codeCss||'')))}')">Copy</button>
    </div>
    <div class="demo-code-pane" id="demo-js">
      <pre class="demo-code">${j || "<em>Không có JS</em>"}</pre>
      <button class="copy-btn" onclick="copyCode('${btoa(unescape(encodeURIComponent(doc.codeJs||'')))}')">Copy</button>
    </div>
  </div>`;
}

// Inject iframe after DOM update
document.addEventListener("click", e => {
  if (e.target.closest("#page-view")) {
    setTimeout(injectPreview, 100);
  }
});

function injectPreview() {
  const frame = document.getElementById("demoFrame");
  if (!frame || frame.dataset.loaded) return;
  const doc = allDocs.find(d => d.id === viewingId);
  if (!doc?.hasCode) return;
  const srcdoc = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${doc.codeCss||""}</style></head><body>${doc.codeHtml||""}<script>${doc.codeJs||""}<\/script></body></html>`;
  frame.srcdoc = srcdoc;
  frame.dataset.loaded = "1";
}

function switchDemoTab(e, paneId) {
  const block = e.target.closest(".demo-block");
  block.querySelectorAll(".demo-tab").forEach(t => t.classList.remove("active"));
  block.querySelectorAll(".demo-code-pane, .demo-preview-pane").forEach(p => p.classList.remove("active"));
  e.target.classList.add("active");
  block.querySelector("#" + paneId)?.classList.add("active");
  if (paneId === "demo-preview") injectPreview();
}
window.switchDemoTab = switchDemoTab;

function copyCode(b64) {
  try {
    const text = decodeURIComponent(escape(atob(b64)));
    navigator.clipboard.writeText(text).then(() => toast("✅ Đã copy!", "ok"));
  } catch { toast("❌ Không copy được", "err"); }
}
window.copyCode = copyCode;

// ── ADD / EDIT FORM ───────────────────────────────────────────
function prepareAddForm() {
  editingId = null;
  document.getElementById("formTitle").textContent    = "Thêm tài liệu mới";
  document.getElementById("editId").value             = "";
  document.getElementById("fTitle").value             = "";
  document.getElementById("fType").value              = "guide";
  document.getElementById("fAuthor").value            = "";
  document.getElementById("fDesc").value              = "";
  document.getElementById("fTags").value              = "";
  document.getElementById("fContent").value           = "";
  document.getElementById("codeHtml").value           = "";
  document.getElementById("codeCss").value            = "";
  document.getElementById("codeJs").value             = "";
  document.getElementById("hasCode").checked          = false;
  document.getElementById("codeEditors").style.display = "none";
  document.getElementById("submitBtn").textContent    = "💾 Lưu tài liệu";
  // Reset editor tabs
  document.querySelectorAll(".etab").forEach((t,i) => t.classList.toggle("active", i===0));
  document.getElementById("fContent").style.display = "";
  document.getElementById("mdPreview").style.display = "none";
  // Reset code pane
  switchCodeTab("html");
  document.getElementById("codePreviewWrap").style.display = "none";
}

async function startEdit(id) {
  editingId = id;
  const snap = await getDocument(id);
  if (!snap.exists()) return;
  const d = snap.data();

  document.getElementById("formTitle").textContent    = "Chỉnh sửa tài liệu";
  document.getElementById("editId").value             = id;
  document.getElementById("fTitle").value             = d.title    || "";
  document.getElementById("fType").value              = d.type     || "guide";
  document.getElementById("fAuthor").value            = d.author   || "";
  document.getElementById("fDesc").value              = d.desc     || "";
  document.getElementById("fTags").value              = d.tags     || "";
  document.getElementById("fContent").value           = d.content  || "";
  document.getElementById("codeHtml").value           = d.codeHtml || "";
  document.getElementById("codeCss").value            = d.codeCss  || "";
  document.getElementById("codeJs").value             = d.codeJs   || "";
  document.getElementById("hasCode").checked          = !!d.hasCode;
  document.getElementById("codeEditors").style.display = d.hasCode ? "" : "none";
  document.getElementById("submitBtn").textContent    = "💾 Cập nhật";
  showPage("add");
}
window.startEdit = startEdit;

async function handleSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.textContent = "Đang lưu…";

  const hasCode = document.getElementById("hasCode").checked;
  const data = {
    title:    document.getElementById("fTitle").value.trim(),
    type:     document.getElementById("fType").value,
    author:   document.getElementById("fAuthor").value.trim(),
    desc:     document.getElementById("fDesc").value.trim(),
    tags:     document.getElementById("fTags").value.trim(),
    content:  document.getElementById("fContent").value.trim(),
    hasCode,
    codeHtml: hasCode ? document.getElementById("codeHtml").value : "",
    codeCss:  hasCode ? document.getElementById("codeCss").value  : "",
    codeJs:   hasCode ? document.getElementById("codeJs").value   : "",
  };

  try {
    if (editingId) {
      await updateDocument(editingId, data);
      toast("✅ Đã cập nhật tài liệu", "ok");
    } else {
      await addDocument(data);
      toast("✅ Đã thêm tài liệu mới", "ok");
    }
    showPage("documents");
  } catch (err) {
    toast("❌ Lỗi: " + err.message, "err");
  } finally {
    btn.disabled = false;
    btn.textContent = editingId ? "💾 Cập nhật" : "💾 Lưu tài liệu";
  }
}
window.handleSubmit = handleSubmit;

function cancelEdit() {
  showPage(previousPage === "add" ? "documents" : previousPage);
}
window.cancelEdit = cancelEdit;

// ── Delete ────────────────────────────────────────────────────
function confirmDelete(id, title) {
  if (!confirm(`Xoá tài liệu "${title}"?\nHành động này không thể hoàn tác.`)) return;
  deleteDocument(id)
    .then(() => { toast("🗑️ Đã xoá", "ok"); if (currentPage === "view") showPage("documents"); })
    .catch(err => toast("❌ Lỗi: " + err.message, "err"));
}
window.confirmDelete = confirmDelete;

function deleteCurrentDoc() {
  const doc = allDocs.find(d => d.id === viewingId);
  if (doc) confirmDelete(doc.id, doc.title);
}
window.deleteCurrentDoc = deleteCurrentDoc;

function editCurrentDoc() {
  if (viewingId) startEdit(viewingId);
}
window.editCurrentDoc = editCurrentDoc;

// ── Editor helpers ────────────────────────────────────────────
function switchEditorTab(tab) {
  document.querySelectorAll(".etab").forEach(t => t.classList.remove("active"));
  document.querySelector(`.etab[onclick*="${tab}"]`)?.classList.add("active");

  const textarea = document.getElementById("fContent");
  const preview  = document.getElementById("mdPreview");

  if (tab === "write") {
    textarea.style.display = "";
    preview.style.display  = "none";
  } else {
    textarea.style.display = "none";
    preview.style.display  = "";
    preview.innerHTML = renderMarkdown(textarea.value);
  }
}
window.switchEditorTab = switchEditorTab;

function toggleCodeSection(on) {
  document.getElementById("codeEditors").style.display = on ? "" : "none";
}
window.toggleCodeSection = toggleCodeSection;

function switchCodeTab(tab) {
  document.querySelectorAll(".ctab:not(.preview-btn)").forEach(t => t.classList.remove("active"));
  document.querySelector(`.ctab[onclick*="'${tab}'"]`)?.classList.add("active");
  document.querySelectorAll(".code-pane").forEach(p => p.classList.remove("active"));
  document.getElementById("pane-" + tab)?.classList.add("active");
}
window.switchCodeTab = switchCodeTab;

function previewCode() {
  const wrap  = document.getElementById("codePreviewWrap");
  const frame = document.getElementById("codePreviewFrame");
  const h = document.getElementById("codeHtml").value;
  const c = document.getElementById("codeCss").value;
  const j = document.getElementById("codeJs").value;
  frame.srcdoc = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${c}</style></head><body>${h}<script>${j}<\/script></body></html>`;
  wrap.style.display = "";
  wrap.scrollIntoView({ behavior: "smooth" });
}
window.previewCode = previewCode;

// ── Search ────────────────────────────────────────────────────
function setupSearch() {
  document.getElementById("searchInput").addEventListener("input", e => {
    searchQuery = e.target.value.trim();
    if (currentPage !== "documents") showPage("documents");
    else renderDocuments();
  });
}

// ── Sidebar (mobile) ──────────────────────────────────────────
function setupHamburger() {
  document.getElementById("hamburger").onclick = toggleSidebar;
  document.getElementById("sidebarOverlay").onclick = closeSidebar;
}
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("sidebarOverlay").classList.toggle("show");
}
function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebarOverlay").classList.remove("show");
}

// ── Toast ─────────────────────────────────────────────────────
function toast(msg, type = "ok") {
  const stack = document.getElementById("toastStack");
  const el    = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.animation = "toastOut .25s ease forwards";
    setTimeout(() => el.remove(), 250);
  }, 2600);
}

// ── Utilities ─────────────────────────────────────────────────
function parseTags(tags) {
  return (tags || "").split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
}

function escHtml(s) {
  return (s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function animateCards(grid) {
  grid.querySelectorAll(".doc-card").forEach((c, i) => {
    c.style.animationDelay = (i * 0.045) + "s";
  });
}

function emptyHTML(icon, title, desc) {
  return `<div class="empty" style="grid-column:1/-1">
    <div class="empty-ico">${icon}</div>
    <div class="empty-t">${title}</div>
    <div class="empty-d">${desc}</div>
  </div>`;
}

function loadingHTML() {
  return `<div class="loading"><div class="spinner"></div>Đang tải…</div>`;
}

// ── Markdown renderer ─────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return "<em style='color:var(--muted)'>Không có nội dung</em>";
  let html = text
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_,lang,code) =>
      `<pre><code class="lang-${lang}">${code.trim()}</code></pre>`)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^#{3} (.+)$/gm,"<h3>$1</h3>")
    .replace(/^#{2} (.+)$/gm,"<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,  "<em>$1</em>")
    .replace(/^> (.+)$/gm,  "<blockquote>$1</blockquote>")
    .replace(/^\|(.+)\|$/gm, row => {
      const cells = row.split("|").filter(Boolean);
      return "<tr>" + cells.map(c => `<td>${c.trim()}</td>`).join("") + "</tr>";
    })
    .replace(/(<tr>.*<\/tr>\s*)+/gs, m => `<table>${m}</table>`)
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    .replace(/^\d+\. (.+)$/gm,"<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>\s*)+/g, m => `<ul>${m}</ul>`)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank">$1</a>')
    .replace(/^---$/gm,"<hr>")
    .replace(/\n\n/g,"</p><p>");
  return "<p>" + html + "</p>";
}
