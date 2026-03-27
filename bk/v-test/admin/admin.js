// ============================================================
//  admin.js  —  DocVault Admin (đầy đủ tính năng)
//  Features: CRUD docs, comments moderation, analytics charts,
//            confirm modal, realtime listeners
// ============================================================
import {
  addDocument, updateDocument, deleteDocument,
  getDocument, listenDocumentsAdmin,
  listenAllComments, flagComment, hardDeleteComment, updateComment,
  addComment, updateCommentCount,
  getAnalytics, recordPageView,
  COL
} from "../shared/firebase.js";
import { toast }                                      from "../shared/toast.js";
import { escHtml, parseTags, formatDateTime, timeAgo,
         renderMarkdown, getTypeMeta, buildSrcdoc,
         copyToClipboard, debounce }                  from "../shared/utils.js";

// ── State ─────────────────────────────────────────────────────
let allDocs      = [];
let allComments  = [];
let currentPage  = "dashboard";
let prevPage     = "dashboard";
let editingId    = null;
let viewingId    = null;
let activeFilter = "all";
let cmtFilter    = "all";
let searchQ      = "";
let chartInst    = null;   // Chart.js instance
let _confirmCb   = null;   // confirm modal callback

// ── Init ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  setupSearch();
  setupHamburger();
  recordPageView("admin");

  listenDocumentsAdmin(docs => {
    allDocs = docs;
    document.getElementById("connStatus").className = "conn-status ok";
    document.getElementById("connStatus").innerHTML = '<span class="conn-dot"></span> Firebase ✓';
    onDocsUpdate();
  });

  listenAllComments(cmts => {
    allComments = cmts;
    document.getElementById("navCommentCount").textContent = cmts.filter(c => !c.deleted).length;
    if (currentPage === "comments")  renderCommentTable();
    if (currentPage === "dashboard") renderDashboardStats();
  });
});

function onDocsUpdate() {
  updateNavCount();
  buildFilterTabs();
  if (currentPage === "dashboard")  renderDashboard();
  if (currentPage === "documents")  renderDocuments();
}

// ── Navigation ────────────────────────────────────────────────
function showPage(name) {
  prevPage    = currentPage;
  currentPage = name;

  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item[data-page]").forEach(n => n.classList.remove("active"));

  const el  = document.getElementById("page-" + name);
  const nav = document.querySelector(`.nav-item[data-page="${name}"]`);
  if (el)  el.classList.add("active");
  if (nav) nav.classList.add("active");

  const handlers = {
    dashboard:  renderDashboard,
    documents:  renderDocuments,
    add:        prepareAddForm,
    comments:   renderCommentTable,
    analytics:  loadAnalytics,
  };
  handlers[name]?.();

  if (window.innerWidth <= 768) closeSidebar();
}
window.showPage = showPage;

function goBack() {
  showPage(prevPage === "view" ? "documents" : prevPage);
}
window.goBack = goBack;

// ── Dashboard ─────────────────────────────────────────────────
function renderDashboard() {
  renderDashboardStats();
  const grid   = document.getElementById("dashGrid");
  const recent = allDocs.slice(0, 6);
  if (recent.length === 0) {
    grid.innerHTML = emptyHTML("📭","Chưa có tài liệu",'Bấm "+ Tài liệu mới" để bắt đầu');
    return;
  }
  grid.innerHTML = recent.map(docCardHTML).join("");
  animateCards(grid);
}

function renderDashboardStats() {
  const total   = allDocs.length;
  const withCode = allDocs.filter(d => d.hasCode).length;
  const cmtCount = allComments.filter(c => !c.deleted).length;
  const today   = allDocs.filter(d => {
    if (!d.createdAt?.seconds) return false;
    return new Date(d.createdAt.seconds * 1000).toDateString() === new Date().toDateString();
  }).length;

  document.querySelector("#sc-total .stat-num").textContent    = total;
  document.querySelector("#sc-code .stat-num").textContent     = withCode;
  document.querySelector("#sc-comments .stat-num").textContent = cmtCount;
  document.querySelector("#sc-today .stat-num").textContent    = today;
}

// ── Documents page ────────────────────────────────────────────
function renderDocuments() {
  let filtered = allDocs;
  if (activeFilter !== "all") {
    filtered = allDocs.filter(d =>
      d.type === activeFilter || parseTags(d.tags).includes(activeFilter)
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

  document.getElementById("docsCount").textContent = `${filtered.length} tài liệu`;
  const grid = document.getElementById("allDocsGrid");

  if (filtered.length === 0) {
    grid.innerHTML = emptyHTML(searchQ ? "🔍":"📭",
      searchQ ? "Không tìm thấy" : "Chưa có tài liệu",
      searchQ ? "Thử từ khoá khác" : "Bấm "+ "Thêm mới");
    return;
  }
  grid.innerHTML = filtered.map(docCardHTML).join("");
  animateCards(grid);
}

// ── Filter tabs ───────────────────────────────────────────────
function buildFilterTabs() {
  const tags  = [...new Set(allDocs.flatMap(d => parseTags(d.tags)))].sort();
  const types = [...new Set(allDocs.map(d => d.type).filter(Boolean))];
  const combined = [...new Set([...types, ...tags])].slice(0, 18);
  const container = document.getElementById("filterTabs");
  container.innerHTML =
    `<button class="ftab ${activeFilter==="all"?"active":""}" onclick="setFilter('all',this)">Tất cả</button>` +
    combined.map(t =>
      `<button class="ftab ${activeFilter===t?"active":""}" onclick="setFilter('${escHtml(t)}',this)">${escHtml(t)}</button>`
    ).join("");
}

function setFilter(tag, el) {
  activeFilter = tag;
  document.querySelectorAll(".ftab").forEach(b => b.classList.remove("active"));
  el.classList.add("active");
  renderDocuments();
}
window.setFilter = setFilter;

function updateNavCount() {
  document.getElementById("navCount").textContent = allDocs.length;
}

// ── Card HTML ─────────────────────────────────────────────────
function docCardHTML(doc) {
  const meta = getTypeMeta(doc.type);
  const date = doc.createdAt?.seconds
    ? new Date(doc.createdAt.seconds * 1000).toLocaleDateString("vi-VN") : "—";
  const tags = parseTags(doc.tags).slice(0, 4)
    .map(t => `<span class="tag-pill">${escHtml(t)}</span>`).join("");
  const codeBadge = doc.hasCode ? `<span class="code-badge">▶ Demo</span>` : "";
  const likes     = doc.likes    || 0;
  const views     = doc.views    || 0;
  const comments  = doc.commentCount || 0;

  return `
  <div class="doc-card" onclick="viewDoc('${doc.id}')">
    <div class="doc-card-thumb thumb-${meta.cls}">${meta.icon}</div>
    <div class="doc-card-body">
      <span class="doc-badge badge-${meta.cls}">${meta.icon} ${meta.label}</span>
      <div class="doc-card-title">${escHtml(doc.title)}</div>
      <div class="doc-card-desc">${escHtml((doc.desc||"").slice(0,80)+(doc.desc?.length>80?"…":""))}</div>
      <div class="doc-card-meta">
        <span>📅 ${date}</span>
        ${doc.author?`<span>· 👤 ${escHtml(doc.author)}</span>`:""}
        <span>· 👍 ${likes}</span>
        <span>· 👁 ${views}</span>
        <span>· 💬 ${comments}</span>
        ${codeBadge}
      </div>
      ${tags ? `<div class="doc-card-tags">${tags}</div>` : ""}
      <div class="doc-card-actions">
        <button class="dca-btn prim" onclick="event.stopPropagation();viewDoc('${doc.id}')">👁</button>
        <button class="dca-btn"      onclick="event.stopPropagation();startEdit('${doc.id}')">✏️ Sửa</button>
        <button class="dca-btn del"  onclick="event.stopPropagation();confirmDeleteDoc('${doc.id}','${escHtml(doc.title)}')">🗑️</button>
      </div>
    </div>
  </div>`;
}

// ── View detail ───────────────────────────────────────────────
async function viewDoc(id) {
  viewingId = id;
  showPage("view");
  const wrap = document.getElementById("viewContent");
  wrap.innerHTML = loadingHTML();

  const snap = await getDocument(id);
  if (!snap.exists()) { wrap.innerHTML = emptyHTML("❌","Không tìm thấy","Đã bị xoá"); return; }
  const doc  = { id: snap.id, ...snap.data() };
  const meta = getTypeMeta(doc.type);
  const date = doc.createdAt?.seconds
    ? new Date(doc.createdAt.seconds * 1000).toLocaleDateString("vi-VN") : "—";
  const tags = parseTags(doc.tags).map(t => `<span class="tag-pill">${escHtml(t)}</span>`).join("");

  const demoBlock = doc.hasCode ? buildAdminDemoBlock(doc) : "";

  wrap.innerHTML = `
    <div class="view-hero">
      <span class="doc-badge badge-${meta.cls}">${meta.icon} ${meta.label}</span>
      <div class="view-title" style="margin-top:10px">${escHtml(doc.title)}</div>
      <div class="view-meta">
        <span>📅 ${date}</span>
        ${doc.author?`<span>👤 ${escHtml(doc.author)}</span>`:""}
        <span>👍 ${doc.likes||0} likes</span>
        <span>👁 ${doc.views||0} views</span>
        <span>💬 ${doc.commentCount||0} bình luận</span>
      </div>
      ${tags ? `<div class="doc-card-tags">${tags}</div>` : ""}
    </div>
    <div class="view-content">${renderMarkdown(doc.content||"")}</div>
    ${demoBlock}
  `;
  if (doc.hasCode) setTimeout(() => injectAdminPreview(doc), 80);
}
window.viewDoc = viewDoc;

function buildAdminDemoBlock(doc) {
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
      <iframe id="adminDemoFrame" sandbox="allow-scripts allow-same-origin"></iframe>
    </div>
    <div class="demo-code-pane" id="demo-html">
      <pre class="demo-code">${h||"<!-- Trống -->"}</pre>
      <button class="copy-btn" onclick="admCopy(${JSON.stringify(doc.codeHtml||'')})">Copy</button>
    </div>
    <div class="demo-code-pane" id="demo-css">
      <pre class="demo-code">${c||"/* Trống */"}</pre>
      <button class="copy-btn" onclick="admCopy(${JSON.stringify(doc.codeCss||'')})">Copy</button>
    </div>
    <div class="demo-code-pane" id="demo-js">
      <pre class="demo-code">${j||"// Trống"}</pre>
      <button class="copy-btn" onclick="admCopy(${JSON.stringify(doc.codeJs||'')})">Copy</button>
    </div>
  </div>`;
}

function injectAdminPreview(doc) {
  const f = document.getElementById("adminDemoFrame");
  if (f) f.srcdoc = buildSrcdoc(doc.codeHtml, doc.codeCss, doc.codeJs);
}

function switchDemoTab(e, paneId) {
  const block = e.target.closest(".demo-block");
  block.querySelectorAll(".demo-tab").forEach(t => t.classList.remove("active"));
  block.querySelectorAll(".demo-code-pane,.demo-preview-pane").forEach(p => p.classList.remove("active"));
  e.target.classList.add("active");
  block.querySelector("#" + paneId)?.classList.add("active");
  if (paneId === "demo-preview") injectAdminPreview(allDocs.find(d => d.id === viewingId)||{});
}
window.switchDemoTab = switchDemoTab;

async function admCopy(text) {
  await copyToClipboard(text);
  toast.success("Đã copy! 📋");
}
window.admCopy = admCopy;

// ── ADD / EDIT FORM ───────────────────────────────────────────
function prepareAddForm() {
  editingId = null;
  document.getElementById("formTitle").textContent    = "Thêm tài liệu mới";
  document.getElementById("editId").value             = "";
  ["fTitle","fDesc","fAuthor","fTags","fContent","codeHtml","codeCss","codeJs"]
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
  document.getElementById("fType").value              = "guide";
  document.getElementById("hasCode").checked          = false;
  document.getElementById("codeEditors").style.display = "none";
  document.getElementById("submitBtn").textContent    = "💾 Lưu tài liệu";
  document.getElementById("codePreviewWrap").style.display = "none";
  switchEditorTab("write");
  switchCodeTab("html");
}
// async function startEdit(id) {
//   try {
//     editingId = id;
//     const snap = await getDocument(id);
//     if (!snap.exists()) { toast.error("Không tìm thấy"); return; }
    
//     const d = snap.data();
//     // Thử log dữ liệu để chắc chắn Firebase trả về đúng
//     console.log("Dữ liệu từ Firebase:", d);

//     document.getElementById("fTitle").value = d.title || "";
//     // ... các dòng gán khác
//     console.log("Dữ liệu từ Firebase:", d.title);
//     showPage("add");
//   } catch (err) {
//     console.error("Lỗi chi tiết trong startEdit:", err);
//     toast.error("Lỗi hệ thống: " + err.message);
//   }
// }
async function startEdit(id) {
  toast.success("Đã chạy đến đây Đã cập nhật tài liệu sss✏️");
  console.log("Đang bắt đầu sửa tài liệu ID:", id); // Thêm dòng này
  editingId = id;
  const snap = await getDocument(id);
  if (!snap.exists()) { toast.error("Không tìm thấy tài liệu"); return; }
  const d = snap.data();
  showPage("add");

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
}
window.startEdit = startEdit;

async function handleSubmit(e) {

  
  e.preventDefault();

  // Lấy ID từ input ẩn để chắc chắn không bị nhầm lẫn
  const currentId = document.getElementById("editId").value;
  console.log("ID đang thao tác:", currentId)


  const btn     = document.getElementById("submitBtn");
  btn.disabled  = true;
  btn.textContent = editingId ? "Đang cập nhật…" : "Đang lưu…";

  const hasCode = document.getElementById("hasCode").checked;
  const data    = {
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
    if (currentId && currentId.trim() !== "") {
      // Nếu có ID -> Thực hiện UPDATE
      await updateDocument(currentId, data);
    // if (editingId) {
    //   await updateDocument(editingId, data);
      toast.success("Đã cập nhật tài liệu ✏️");
    } else {
      await addDocument(data);
      toast.success("Đã thêm tài liệu mới ✓");
    }
    showPage("documents");
  } catch (err) {
    toast.error("Lỗi ✗", err.message);
  } finally {
    btn.disabled    = false;
    btn.textContent = editingId ? "💾 Cập nhật" : "💾 Lưu tài liệu";
  }
}
window.handleSubmit = handleSubmit;

function cancelEdit() {
  showPage(prevPage === "add" ? "documents" : prevPage);
}
window.cancelEdit = cancelEdit;

// ── Delete document (với confirm modal) ───────────────────────
function confirmDeleteDoc(id, title) {
  openConfirmModal(
    "🗑️ Xoá tài liệu",
    `Bạn chắc chắn muốn xoá "<strong>${escHtml(title)}</strong>"?<br>Hành động này không thể hoàn tác.`,
    async () => {
      try {
        await deleteDocument(id);
        toast.success("Đã xoá tài liệu");
        if (currentPage === "view") showPage("documents");
      } catch (err) { toast.error("Lỗi", err.message); }
    }
  );
}
window.confirmDeleteDoc = confirmDeleteDoc;

function deleteCurrentDoc() {
  const doc = allDocs.find(d => d.id === viewingId);
  if (doc) confirmDeleteDoc(doc.id, doc.title);
}
window.deleteCurrentDoc = deleteCurrentDoc;

function editCurrentDoc() {
  if (viewingId) startEdit(viewingId);
}
window.editCurrentDoc = editCurrentDoc;

// ── COMMENTS MODERATION ───────────────────────────────────────
function setCmtFilter(val) {
  cmtFilter = val;
  renderCommentTable();
}
window.setCmtFilter = setCmtFilter;

function renderCommentTable() {
  let filtered = allComments;
  if (cmtFilter === "flagged") filtered = filtered.filter(c => c.flagged);
  if (cmtFilter === "deleted") filtered = filtered.filter(c => c.deleted);

  document.getElementById("cmtPageSub").textContent =
    `${filtered.length} bình luận${cmtFilter !== "all" ? ` (${cmtFilter})` : ""}`;

  const tbody = document.getElementById("cmtTableBody");
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--muted)">Không có bình luận nào</td></tr>`;
    return;
  }

  // Lấy tên document để hiển thị
  const docMap = Object.fromEntries(allDocs.map(d => [d.id, d.title || d.id]));

  tbody.innerHTML = filtered.map((c, i) => {
    const statusCls  = c.deleted ? "status-deleted" : c.flagged ? "status-flagged" : "status-ok";
    const statusText = c.deleted ? "🗑 Đã xoá"      : c.flagged ? "⚠ Gắn cờ"      : "✓ Bình thường";
    const docTitle   = docMap[c.docId] || c.docId || "—";
    const isParent   = !c.parentId;

    return `
    <tr class="${c.flagged ? "cmt-row-flagged" : ""} ${c.deleted ? "cmt-row-deleted" : ""}">
      <td style="color:var(--dim);font-size:12px">${i + 1}</td>
      <td>
        <div class="cmt-user-cell">
          <div class="cmt-avatar" style="background:${c.userColor||'#6c5ce7'}">${escHtml(c.userAvatar||"?")}</div>
          <span style="font-size:12.5px">${escHtml(c.userName||"Ẩn danh")}</span>
        </div>
      </td>
      <td>
        <div class="cmt-text-cell" title="${escHtml(c.text)}">
          ${!isParent ? `<span style="font-size:10px;color:var(--acc);margin-right:4px">↳ Reply</span>` : ""}
          ${escHtml((c.text||"").slice(0, 80))}${c.text?.length > 80 ? "…" : ""}
        </div>
        <div style="font-size:11px;color:var(--dim);margin-top:3px">👍 ${c.likes||0}</div>
      </td>
      <td style="font-size:12px;color:var(--muted);max-width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
        ${escHtml(docTitle.slice(0,30))}
      </td>
      <td style="font-size:12px;color:var(--dim);white-space:nowrap">${timeAgo(c.createdAt)}</td>
      <td><span class="cmt-status-badge ${statusCls}">${statusText}</span></td>
      <td>
        <div class="cmt-actions-cell">
          ${!c.deleted ? `
            <button class="btn btn-sm ${c.flagged ? "btn-ghost" : "btn-warn"}"
              onclick="adminFlagCmt('${c.id}',${!c.flagged})">
              ${c.flagged ? "✓ Bỏ cờ" : "⚠ Gắn cờ"}
            </button>
            <button class="btn btn-sm btn-danger" onclick="adminDeleteCmt('${c.id}')">🗑️</button>
            <button class="btn btn-sm btn-ghost"  onclick="adminReplyCmt('${c.id}','${escHtml(c.userName||"?")}','${c.docId}')">💬</button>
          ` : `
            <button class="btn btn-sm btn-danger" onclick="adminHardDelete('${c.id}')">Xoá hẳn</button>
          `}
        </div>
      </td>
    </tr>`;
  }).join("");
}

async function adminFlagCmt(id, flagged) {
  try {
    await flagComment(id, flagged);
    toast.success(flagged ? "⚠ Đã gắn cờ bình luận" : "✓ Đã bỏ gắn cờ");
  } catch (e) { toast.error("Lỗi", e.message); }
}
window.adminFlagCmt = adminFlagCmt;

function adminDeleteCmt(id) {
  openConfirmModal("🗑️ Xoá bình luận", "Xoá mềm bình luận này? (Vẫn còn trong database)", async () => {
    try {
      await hardDeleteComment(id);
      toast.success("Đã xoá bình luận");
    } catch (e) { toast.error("Lỗi", e.message); }
  });
}
window.adminDeleteCmt = adminDeleteCmt;

function adminHardDelete(id) {
  openConfirmModal("⚠️ Xoá vĩnh viễn", "Xoá hoàn toàn bình luận này khỏi database?", async () => {
    try {
      // import hardDelete
      const { hardDeleteComment } = await import("../shared/firebase.js");
      await hardDeleteComment(id);
      toast.success("Đã xoá vĩnh viễn");
    } catch (e) { toast.error("Lỗi", e.message); }
  });
}
window.adminHardDelete = adminHardDelete;

function adminReplyCmt(cmtId, userName, docId) {
  const text = prompt(`Trả lời bình luận của ${userName}:`);
  if (!text?.trim()) return;
  addComment({
    docId,
    parentId:   cmtId,
    text:       text.trim(),
    userId:     "admin",
    userName:   "Admin",
    userColor:  "#6c5ce7",
    userAvatar: "AD",
  }).then(() => {
    updateCommentCount(docId, 1).catch(()=>{});
    toast.success("Đã trả lời bình luận ✓");
  }).catch(e => toast.error("Lỗi", e.message));
}
window.adminReplyCmt = adminReplyCmt;

// ── ANALYTICS ─────────────────────────────────────────────────
async function loadAnalytics() {
  document.getElementById("topLikedDocs").innerHTML  = loadingHTML(true);
  document.getElementById("topViewedDocs").innerHTML = loadingHTML(true);

  // Top liked / viewed docs
  const topLiked  = [...allDocs].sort((a,b) => (b.likes||0) - (a.likes||0)).slice(0, 5);
  const topViewed = [...allDocs].sort((a,b) => (b.views||0) - (a.views||0)).slice(0, 5);

  document.getElementById("topLikedDocs").innerHTML = topLiked.length === 0
    ? `<div style="color:var(--muted);font-size:13px">Chưa có dữ liệu</div>`
    : topLiked.map((d, i) => `
      <div class="top-doc-item">
        <div class="top-doc-rank">${["🥇","🥈","🥉","4️⃣","5️⃣"][i]}</div>
        <div class="top-doc-info">
          <div class="top-doc-title">${escHtml(d.title)}</div>
          <div class="top-doc-count">👍 ${d.likes||0} likes · 👁 ${d.views||0} views</div>
        </div>
      </div>`).join("");

  document.getElementById("topViewedDocs").innerHTML = topViewed.length === 0
    ? `<div style="color:var(--muted);font-size:13px">Chưa có dữ liệu</div>`
    : topViewed.map((d, i) => `
      <div class="top-doc-item">
        <div class="top-doc-rank">${["🥇","🥈","🥉","4️⃣","5️⃣"][i]}</div>
        <div class="top-doc-info">
          <div class="top-doc-title">${escHtml(d.title)}</div>
          <div class="top-doc-count">👁 ${d.views||0} views · 👍 ${d.likes||0} likes</div>
        </div>
      </div>`).join("");

  // Type breakdown
  const typeColors = {
    guide:"#6c63ff",api:"#ff63a5",tutorial:"#63ffc8",
    component:"#63c8ff",snippet:"#ffb563",release:"#ff9563",design:"#c863ff"
  };
  const typeCounts = {};
  allDocs.forEach(d => { typeCounts[d.type] = (typeCounts[d.type]||0) + 1; });
  const maxCount = Math.max(...Object.values(typeCounts), 1);
  const breakdownEl = document.getElementById("typeBreakdown");
  const { getTypeMeta: gtm } = await import("../shared/utils.js");
  breakdownEl.innerHTML = Object.entries(typeCounts)
    .sort((a,b) => b[1]-a[1])
    .map(([type, count]) => {
      const meta = gtm(type);
      const pct  = Math.round((count / maxCount) * 100);
      const color = typeColors[type] || "#6c63ff";
      return `
      <div class="tb-row">
        <div class="tb-label">${meta.icon} ${meta.label}</div>
        <div class="tb-bar-wrap">
          <div class="tb-bar" style="width:${pct}%;background:${color}"></div>
        </div>
        <div class="tb-count">${count}</div>
      </div>`;
    }).join("");

  // Chart.js views chart
  const analyticsData = await getAnalytics();
  renderViewsChart(analyticsData);
}
window.loadAnalytics = loadAnalytics;

function renderViewsChart(data) {
  const ctx = document.getElementById("viewsChart");
  if (!ctx) return;

  if (chartInst) chartInst.destroy();

  // Generate last 14 days
  const days   = [];
  const values = [];
  for (let i = 13; i >= 0; i--) {
    const d   = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push(key.slice(5));  // "MM-DD"
    const entry = data.find(e => e.id === key);
    values.push(entry?.total || 0);
  }

  chartInst = new Chart(ctx, {
    type: "bar",
    data: {
      labels: days,
      datasets: [{
        label: "Lượt truy cập",
        data: values,
        backgroundColor: "rgba(108,99,255,.35)",
        borderColor:     "rgba(108,99,255,.9)",
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#1e1e30",
          titleColor: "#eeeef8",
          bodyColor: "#7878a0",
          borderColor: "rgba(255,255,255,.06)",
          borderWidth: 1,
        }
      },
      scales: {
        x: { grid: { color: "rgba(255,255,255,.04)" }, ticks: { color: "#3c3c5c" } },
        y: { grid: { color: "rgba(255,255,255,.04)" }, ticks: { color: "#3c3c5c" }, beginAtZero: true }
      }
    }
  });
}

// ── CONFIRM MODAL ─────────────────────────────────────────────
function openConfirmModal(title, body, onOk) {
  _confirmCb = onOk;
  document.getElementById("confirmTitle").textContent = title;
  document.getElementById("confirmBody").innerHTML    = body;
  document.getElementById("confirmOkBtn").onclick     = () => { confirmCancel(); onOk?.(); };
  document.getElementById("confirmOverlay").classList.add("open");
}
window.openConfirmModal = openConfirmModal;

function confirmCancel() {
  document.getElementById("confirmOverlay").classList.remove("open");
  _confirmCb = null;
}
window.confirmCancel = confirmCancel;

// ── FORM EDITOR HELPERS ───────────────────────────────────────
function switchEditorTab(tab) {
  document.querySelectorAll(".etab").forEach(t => t.classList.remove("active"));
  document.querySelector(`.etab[onclick*="${tab}"]`)?.classList.add("active");
  const textarea = document.getElementById("fContent");
  const preview  = document.getElementById("mdPreview");
  if (tab === "write") {
    textarea.style.display = ""; preview.style.display = "none";
  } else {
    textarea.style.display = "none"; preview.style.display = "";
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
  frame.srcdoc = buildSrcdoc(
    document.getElementById("codeHtml").value,
    document.getElementById("codeCss").value,
    document.getElementById("codeJs").value
  );
  wrap.style.display = "";
  wrap.scrollIntoView({ behavior: "smooth" });
}
window.previewCode = previewCode;

// ── SEARCH ────────────────────────────────────────────────────
function setupSearch() {
  const input = document.getElementById("searchInput");
  input.addEventListener("input", debounce(e => {
    searchQ = e.target.value.trim();
    if (currentPage !== "documents") showPage("documents");
    else renderDocuments();
  }, 280));
}

// ── SIDEBAR ───────────────────────────────────────────────────
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

// ── UTILS ─────────────────────────────────────────────────────
function emptyHTML(icon, title, desc) {
  return `<div class="empty" style="grid-column:1/-1">
    <div class="empty-ico">${icon}</div>
    <div class="empty-t">${title}</div>
    <div class="empty-d">${desc}</div>
  </div>`;
}
function loadingHTML(small = false) {
  return small
    ? `<div style="padding:20px;text-align:center;color:var(--muted)"><div class="spinner" style="width:20px;height:20px;border-width:2px;margin:0 auto"></div></div>`
    : `<div class="loading"><div class="spinner"></div>Đang tải…</div>`;
}
function animateCards(grid) {
  grid.querySelectorAll(".doc-card").forEach((c, i) => {
    c.style.animationDelay = (i * 0.045) + "s";
  });
}