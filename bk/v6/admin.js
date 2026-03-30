// ============================================================
//  admin/admin.js  —  Admin logic hoàn chỉnh
//  Tính năng: login, CRUD docs, comments moderation,
//             analytics chart, confirm modal
// ============================================================
import {
  addDocument, updateDocument, deleteDocument,
  getDocument, listenDocumentsAdmin,
  listenAllComments, flagComment, hardDeleteComment,
  addComment, updateCommentCount,
  getAnalytics, recordPageView, COL,
} from "./connection.js";
import { toast }          from "./toast.js";
import {
  escHtml, parseTags, formatDate, formatDateTime, timeAgo,
  renderMarkdown, getTypeMeta, buildSrcdoc,
  copyToClipboard, debounce,
} from "./utils.js";

// ── Auth ──────────────────────────────────────────────────────
const ADMIN_USER = "admin";
const ADMIN_PASS = "docvault2025";
const AUTH_KEY   = "dv_admin_auth";

function isLoggedIn() { return sessionStorage.getItem(AUTH_KEY) === "ok"; }

function doLogin() {
  const u = document.getElementById("loginUser").value.trim();
  const p = document.getElementById("loginPass").value;
  const err = document.getElementById("loginErr");
  if (u === ADMIN_USER && p === ADMIN_PASS) {
    sessionStorage.setItem(AUTH_KEY, "ok");
    err.textContent = "";
    bootAdmin();
  } else {
    err.textContent = "❌ Tài khoản hoặc mật khẩu không đúng";
  }
}
window.doLogin = doLogin;

function doLogout() {
  // Sử dụng openConfirm thay vì confirm() mặc định
  openConfirm(
    "🚪 Đăng xuất", 
    "Bạn có chắc chắn muốn rời khỏi hệ thống quản trị?", 
    () => {
      // Logic xử lý khi người dùng nhấn "OK" trên Modal
      sessionStorage.removeItem(AUTH_KEY);
      location.reload();
    }
  );
}
window.doLogout = doLogout;
// function doLogout() {
//   if (!confirm("Đăng xuất?")) return;
//   sessionStorage.removeItem(AUTH_KEY);
//   location.reload();
// }
// window.doLogout = doLogout;

function togglePw() {
  const inp = document.getElementById("loginPass");
  inp.type  = inp.type === "password" ? "text" : "password";
}
window.togglePw = togglePw;

// Allow Enter key on login
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("loginPass")?.addEventListener("keydown", e => {
    if (e.key === "Enter") doLogin();
  });
  document.getElementById("loginUser")?.addEventListener("keydown", e => {
    if (e.key === "Enter") document.getElementById("loginPass").focus();
  });

  if (isLoggedIn()) bootAdmin();
});

// ── Boot admin after login ────────────────────────────────────
function bootAdmin() {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("adminApp").style.display    = "";

  recordPageView("admin");
  setupSearch();
  setupHamburger();

  listenDocumentsAdmin(docs => {
    allDocs = docs;
    document.getElementById("connBadge").className = "conn-badge ok";
    document.getElementById("connBadge").innerHTML = '<span class="conn-dot"></span> Firebase ✓';
    document.getElementById("nb-docs").textContent = docs.length;
    onDocsChange();
  });

  listenAllComments(cmts => {
    allCmts = cmts;
    document.getElementById("nb-cmts").textContent = cmts.filter(c => !c.deleted).length;
    if (curPage === "comments") renderCmtTable();
    if (curPage === "dashboard") renderDashStats();
  });
}

// ── State ─────────────────────────────────────────────────────
let allDocs    = [];
let allCmts    = [];
let curPage    = "dashboard";
let prevPage   = "dashboard";
let editId     = null;
let viewId     = null;
let docFilter  = "all";
let cmtFilter  = "all";
let searchQ    = "";
let chartInst  = null;

function onDocsChange() {
  buildFilterRow();
  if (curPage === "dashboard") renderDashboard();
  if (curPage === "documents") renderDocuments();
}

// ── Navigation ────────────────────────────────────────────────
function goto(page) {
  prevPage = curPage; curPage = page;
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item[data-page]").forEach(n => n.classList.remove("active"));
  document.getElementById("page-"+page)?.classList.add("active");
  document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add("active");
  const map = { dashboard:renderDashboard, documents:renderDocuments, add:prepareForm, comments:renderCmtTable, analytics:loadAnalytics };
  map[page]?.();
  if (window.innerWidth <= 768) closeSidebar();
}
window.goto = goto;

function goBack() { goto(prevPage === "view" ? "documents" : prevPage); }
window.goBack = goBack;

// ── DASHBOARD ─────────────────────────────────────────────────
function renderDashboard() {
  renderDashStats();
  // Top liked
  const top = [...allDocs].sort((a,b)=>(b.likes||0)-(a.likes||0)).slice(0,5);
  document.getElementById("dashTopList").innerHTML = top.length
    ? top.map((d,i)=>`
      <div class="dash-top-item" onclick="viewDoc('${d.id}')">
        <div class="dash-top-rank">${["🥇","🥈","🥉","4","5"][i]}</div>
        <div class="dash-top-info">
          <div class="dash-top-name">${escHtml(d.title)}</div>
          <div class="dash-top-stats">👍 ${d.likes||0}·👎 ${d.dislikes||0} · 👁 ${d.views||0} · 💬 ${d.commentCount||0}</div>
        </div>
      </div>`).join("")
    : `<div style="color:var(--muted);font-size:13px">Chưa có dữ liệu</div>`;
  // Recent cards
  const grid = document.getElementById("dashDocCards");
  const slice = allDocs.slice(0,6);
  grid.innerHTML = slice.length ? slice.map(docCardHTML).join("") : emptyHTML("📭","Chưa có tài liệu");
  animateCards(grid);
}

function renderDashStats() {
  const total    = allDocs.length;
  const withCode = allDocs.filter(d=>d.hasCode).length;
  const cmtCount = allCmts.filter(c=>!c.deleted).length;
  const today    = allDocs.filter(d=>{
    if(!d.createdAt?.seconds) return false;
    return new Date(d.createdAt.seconds*1000).toDateString() === new Date().toDateString();
  }).length;
  document.querySelector("#sc0 .sc-num").textContent = total;
  document.querySelector("#sc1 .sc-num").textContent = withCode;
  document.querySelector("#sc2 .sc-num").textContent = cmtCount;
  document.querySelector("#sc3 .sc-num").textContent = today;
}

// ── DOCUMENTS ─────────────────────────────────────────────────
function renderDocuments() {
  let d = [...allDocs];
  if (docFilter !== "all") d = d.filter(x => x.type===docFilter || parseTags(x.tags).includes(docFilter));
  if (searchQ) {
    const q = searchQ.toLowerCase();
    d = d.filter(x => x.title?.toLowerCase().includes(q) || x.desc?.toLowerCase().includes(q) || x.tags?.toLowerCase().includes(q));
  }
  document.getElementById("docsSubtitle").textContent = `${d.length} tài liệu`;
  const grid = document.getElementById("allDocCards");
  grid.innerHTML = d.length ? d.map(docCardHTML).join("") : emptyHTML("📭","Chưa có tài liệu","Thêm tài liệu đầu tiên");
  animateCards(grid);
}

// function buildFilterRow() {
  // const tags  = [...new Set(allDocs.flatMap(d=>parseTags(d.tags)))].sort();
  // const types = [...new Set(allDocs.map(d=>d.type).filter(Boolean))];
  // const items = [...new Set([...types,...tags])].slice(0,18);
  // const row   = document.getElementById("filterRow");
  // row.innerHTML = `<button class="ftab ${docFilter==="all"?"active":""}" onclick="setDocFilter('all',this)">Tất cả</button>`
  //   + items.map(t=>`<button class="ftab ${docFilter===t?"active":""}" onclick="setDocFilter(${JSON.stringify(t)},this)">${escHtml(t)}</button>`).join("");
  // ... (logic lấy tags/types)
// }
function buildFilterRow() {
  const tags  = [...new Set(allDocs.flatMap(d => parseTags(d.tags)))].sort();
  const types = [...new Set(allDocs.map(d => d.type).filter(Boolean))];
  const items = [...new Set([...types, ...tags])].slice(0, 18);
  const row   = document.getElementById("filterRow");

  if (!row) return;

  // Dùng `all` làm chuỗi tĩnh
  let html = `<button class="ftab ${docFilter === "all" ? "active" : ""}" onclick="setDocFilter('all', this)">Tất cả</button>`;

  // Duyệt qua các items
  html += items.map(t => {
    // Quan trọng: Dùng JSON.stringify để bao bọc tag trong dấu nháy kép an toàn, 
    // kể cả khi tag có khoảng trắng hay dấu nháy đơn.
    const safeTag = JSON.stringify(t); 
    const isActive = docFilter === t ? "active" : "";
    
    return `<button class="ftab ${isActive}" onclick='setDocFilter(${safeTag}, this)'>${escHtml(t)}</button>`;
  }).join("");

  row.innerHTML = html;
}
function setDocFilter(tag, el) {
  docFilter = tag;
  document.querySelectorAll(".ftab").forEach(b=>b.classList.remove("active"));
  el.classList.add("active");
  renderDocuments();
}
window.setDocFilter = setDocFilter;

// ── Card HTML ─────────────────────────────────────────────────
function docCardHTML(doc) {
  const meta = getTypeMeta(doc.type);
  const date = formatDate(doc.createdAt);
  const tags = parseTags(doc.tags).slice(0,4).map(t=>`<span class="tag-pill">${escHtml(t)}</span>`).join("");
  return `
  <div class="doc-card-a" onclick="viewDoc('${doc.id}')">
    <div class="dca-thumb dca-thumb-${meta.cls}">${meta.icon}</div>
    <div class="dca-body">
      <span class="type-badge badge-${meta.cls}">${meta.icon} ${meta.label}</span>
      <div class="dca-title">${escHtml(doc.title)}</div>
      <div class="dca-desc">${escHtml((doc.desc||"").slice(0,75))+((doc.desc||"").length>75?"…":"")}</div>
      <div class="dca-meta">
        ${date?`<span>📅 ${date}</span>`:""}
        ${doc.author?`<span>👤 ${escHtml(doc.author)}</span>`:""}
        <span>👍 ${doc.likes}</span>
        <span>👎 ${doc.dislikes}</span>
        <span>👁 ${doc.views}</span>
        <span>💬 ${doc.commentCount}</span>
        ${doc.hasCode?`<span style="color:var(--acc3)">▶ Demo</span>`:""}
      </div>
      ${tags?`<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px">${tags}</div>`:""}
      <div class="dca-footer">
        <button class="dca-btn view" onclick="event.stopPropagation();viewDoc('${doc.id}')">👁 Xem</button>
        <button class="dca-btn"      onclick="event.stopPropagation();editDoc('${doc.id}')">✏️ Sửa</button>
        <button class="dca-btn del"  onclick="event.stopPropagation();confirmDelDoc('${doc.id}','${escHtml(doc.title).replace(/'/g,"\\'")}')">🗑️</button>
      </div>
    </div>
  </div>`;
}

// ── VIEW ──────────────────────────────────────────────────────
async function viewDoc(id) {
  viewId = id;
  goto("view");
  const area = document.getElementById("viewArea");
  area.innerHTML = `<div class="loading-wrap"><div class="spinner"></div></div>`;
  const snap = await getDocument(id);
  if (!snap.exists()) { area.innerHTML = emptyHTML("❌","Không tìm thấy"); return; }
  const doc  = { id:snap.id, ...snap.data() };
  const meta = getTypeMeta(doc.type);
  const tags = parseTags(doc.tags).map(t=>`<span class="tag-pill">${escHtml(t)}</span>`).join("");
  const demo = doc.hasCode ? buildAdminDemo(doc) : "";
  area.innerHTML = `
    <div class="view-hero">
      <span class="type-badge badge-${meta.cls}">${meta.icon} ${meta.label}</span>
      <div class="view-title">${escHtml(doc.title)}</div>
      <div class="view-meta">
        ${doc.author?`<span>👤 ${escHtml(doc.author)}</span>`:""}
        ${formatDate(doc.createdAt)?`<span>📅 ${formatDate(doc.createdAt)}</span>`:""}
        <span>👍 ${doc.likes||0}</span><span>👎 ${doc.dislikes||0}</span><span>👁 ${doc.views||0}</span><span>💬 ${doc.commentCount||0}</span>
      </div>
      ${tags?`<div style="display:flex;flex-wrap:wrap;gap:6px">${tags}</div>`:""}
    </div>
    <div class="view-content md-rendered">${renderMarkdown(doc.content||"")}</div>
    ${demo}
  `;
  if (doc.hasCode) setTimeout(()=>injectFrame(doc),80);
}
window.viewDoc = viewDoc;

function editCurrentDoc() { if(viewId) editDoc(viewId); }
window.editCurrentDoc = editCurrentDoc;

function delCurrentDoc() {
  const d = allDocs.find(x=>x.id===viewId);
  if(d) confirmDelDoc(d.id, d.title);
}
window.delCurrentDoc = delCurrentDoc;

function buildAdminDemo(doc) {
  const h = doc.codeHtml || "";
  const c = doc.codeCss  || "";
  const j = doc.codeJs   || "";
  const safeHtml = JSON.stringify(doc.codeHtml || "").replace(/"/g, '&quot;');
  const safeCss  = JSON.stringify(doc.codeCss  || "").replace(/"/g, '&quot;');
  const safeJs   = JSON.stringify(doc.codeJs   || "").replace(/"/g, '&quot;');
  return `
  <div class="demo-block" style="margin-top:20px">
    <div class="demo-header">
      <div class="demo-title">▶ LIVE DEMO</div>
      <div class="demo-tabs">
        <button class="demo-tab active" onclick="swAdminDemo(event,'adp')">Preview</button>
        <button class="demo-tab" onclick="swAdminDemo(event,'demo-html')">HTML</button>
        <button class="demo-tab" onclick="swAdminDemo(event,'demo-css')">CSS</button>
        <button class="demo-tab" onclick="swAdminDemo(event,'demo-js')">JS</button>
      </div>
    </div>
    
    <div class="demo-pane active" id="adp">
      <iframe id="adminFrame" class="demo-frame" sandbox="allow-scripts allow-same-origin"></iframe>
    </div>
    
    <div class="demo-pane" id="demo-html">
      <div class="demo-code-wrap">
        <pre class="demo-code">${escHtml(h || "")}</pre>
        <button class="demo-copy-btn" onclick="admCopy(${safeHtml})">📋</button>
      </div>
    </div>
    
    <div class="demo-pane" id="demo-css">
      <div class="demo-code-wrap">
        <pre class="demo-code">${escHtml(c || "/* Trống */")}</pre>
        <button class="demo-copy-btn" onclick="admCopy(${safeCss})">📋</button>
      </div>
    </div>
    
    <div class="demo-pane" id="demo-js">
      <div class="demo-code-wrap">
        <pre class="demo-code">${escHtml(j || "// Trống")}</pre>
        <button class="demo-copy-btn" onclick="admCopy(${safeJs})">📋</button>
      </div>
    </div>
  </div>`;
}
function injectAdminPreview(doc) {
  const f = document.getElementById("adminDemoFrame");
  if (f) f.srcdoc = buildSrcdoc(doc.codeHtml, doc.codeCss, doc.codeJs);
}
 
// function switchDemoTab(e, paneId) {
//   const block = e.target.closest(".demo-block");
//   block.querySelectorAll(".demo-tab").forEach(t => t.classList.remove("active"));
//   block.querySelectorAll(".demo-pane,.demo-preview-pane").forEach(p => p.classList.remove("active"));
//   e.target.classList.add("active");
//   block.querySelector("#" + paneId)?.classList.add("active");
//   if (paneId === "demo-preview") injectAdminPreview(allDocs.find(d => d.id === viewingId)||{});
// }
// window.switchDemoTab = switchDemoTab;


function injectFrame(doc) {
  const f = document.getElementById("adminFrame");
  if(f) f.srcdoc = buildSrcdoc(doc.codeHtml, doc.codeCss, doc.codeJs);
}

function swAdminDemo(e, paneId) {
  const block = e.target.closest(".demo-block");
  if (!block) return;

  // 1. Xóa active ở các nút tab
  block.querySelectorAll(".demo-tab").forEach(t => t.classList.remove("active"));
  // 2. Xóa active ở các nội dung pane
  block.querySelectorAll(".demo-pane").forEach(p => p.classList.remove("active"));

  // 3. Thêm active cho nút vừa bấm và pane tương ứng
  e.target.classList.add("active");
  const targetPane = block.querySelector("#" + paneId);
  if (targetPane) targetPane.classList.add("active");

  // 4. Nếu là tab Preview thì nạp code vào iframe
  if (paneId === "adp") {
    const doc = allDocs.find(d => d.id === viewId);
    if (doc) injectFrame(doc);
  }
}
window.swAdminDemo = swAdminDemo;

// async function admCopy(text) { await copyToClipboard(text); toast.success("Đã copy!"); }
// window.admCopy = admCopy;

// ── FORM ──────────────────────────────────────────────────────
function prepareForm() {
  editId = null;
  document.getElementById("formPageTitle").textContent = "Thêm tài liệu mới";
  document.getElementById("fId").value = "";
  ["fTitle","fAuthor","fDesc","fTags","fContent","fHtml","fCss","fJs"]
    .forEach(id => { const e=document.getElementById(id); if(e) e.value=""; });
  document.getElementById("fType").value       = "guide";
  document.getElementById("fHasCode").checked  = false;
  document.getElementById("codeSection").style.display = "none";
  document.getElementById("submitBtn").textContent = "💾 Lưu tài liệu";
  edTab("write", document.querySelector(".etab.active"));
  codeLang("html", document.querySelector(".cltab.active"));
  document.getElementById("previewBox").style.display = "none";
  document.getElementById("mdPreview").style.display  = "none";
  document.getElementById("fContent").style.display   = "";
}

async function editDoc(id) {
  editId = id;
  const snap = await getDocument(id);
  if (!snap.exists()) { toast.error("Không tìm thấy"); return; }
  const d = snap.data();
  goto("add");
  document.getElementById("formPageTitle").textContent = "Chỉnh sửa tài liệu";
  document.getElementById("fId").value      = id;
  document.getElementById("fTitle").value   = d.title   || "";
  document.getElementById("fType").value    = d.type    || "guide";
  document.getElementById("fAuthor").value  = d.author  || "";
  document.getElementById("fDesc").value    = d.desc    || "";
  document.getElementById("fTags").value    = d.tags    || "";
  document.getElementById("fContent").value = d.content || "";
  document.getElementById("fHtml").value    = d.codeHtml|| "";
  document.getElementById("fCss").value     = d.codeCss || "";
  document.getElementById("fJs").value      = d.codeJs  || "";
  document.getElementById("fHasCode").checked = !!d.hasCode;
  document.getElementById("codeSection").style.display = d.hasCode ? "" : "none";
  document.getElementById("submitBtn").textContent = "💾 Cập nhật";
}
window.editDoc = editDoc;

async function submitForm(e) {
  e.preventDefault();

    // Lấy ID từ input ẩn để chắc chắn không bị nhầm lẫn
  // const currentId = document.getElementById("editId").value;
  const currentId = document.getElementById("fId").value;

  const btn = document.getElementById("submitBtn");
  btn.disabled = true; btn.textContent = "Đang lưu…";
  const hasCode = document.getElementById("fHasCode").checked;
  const data = {
    title:   document.getElementById("fTitle").value.trim(),
    type:    document.getElementById("fType").value,
    author:  document.getElementById("fAuthor").value.trim(),
    desc:    document.getElementById("fDesc").value.trim(),
    tags:    document.getElementById("fTags").value.trim(),
    content: document.getElementById("fContent").value.trim(),
    hasCode,
    codeHtml: hasCode ? document.getElementById("fHtml").value : "",
    codeCss:  hasCode ? document.getElementById("fCss").value  : "",
    codeJs:   hasCode ? document.getElementById("fJs").value   : "",
  };
  try {
    if (currentId && currentId.trim() !== "") { await updateDocument(currentId, data); toast.success("✅Đã cập nhật tài liệu thành công ✏️"); }
    else        
      { await addDocument(data);             
        toast.success("✅ Đã thêm tài liệu mới");  }
    goto("documents");
  } catch(err) { toast.error("Lỗi", err.message); }
  finally { btn.disabled=false; btn.textContent = editId?"💾 Cập nhật":"💾 Lưu tài liệu"; }
}
window.submitForm = submitForm;

function cancelForm() { goto(prevPage==="add"?"documents":prevPage); }
window.cancelForm = cancelForm;

// ── DELETE ────────────────────────────────────────────────────
function confirmDelDoc(id, title) {
  openConfirm("🗑️ Xoá tài liệu", `Xoá "<strong>${escHtml(title)}</strong>"?<br>Không thể hoàn tác!`, async () => {
    try { await deleteDocument(id); toast.success("Đã xoá"); if(curPage==="view") goto("documents"); }
    catch(e) { toast.error("Lỗi", e.message); }
  });
}
window.confirmDelDoc = confirmDelDoc;

// ── EDITOR HELPERS ────────────────────────────────────────────
function edTab(tab, el) {
  document.querySelectorAll(".etab").forEach(t=>t.classList.remove("active"));
  el?.classList.add("active");
  const ta = document.getElementById("fContent");
  const pv = document.getElementById("mdPreview");
  if (tab==="write") { ta.style.display=""; pv.style.display="none"; }
  else { ta.style.display="none"; pv.style.display=""; pv.innerHTML=renderMarkdown(ta.value); }
}
window.edTab = edTab;

function toggleCodeSection(on) {
  document.getElementById("codeSection").style.display = on ? "" : "none";
}
window.toggleCodeSection = toggleCodeSection;

function codeLang(lang, el) {
  document.querySelectorAll(".cltab:not(.cltab-run)").forEach(t=>t.classList.remove("active"));
  el?.classList.add("active");
  document.querySelectorAll(".code-pane").forEach(p=>p.classList.remove("active"));
  document.getElementById("cp-"+lang)?.classList.add("active");
}
window.codeLang = codeLang;

function runPreview() {
  const box   = document.getElementById("previewBox");
  const frame = document.getElementById("previewFrame");
  frame.srcdoc = buildSrcdoc(document.getElementById("fHtml").value, document.getElementById("fCss").value, document.getElementById("fJs").value);
  box.style.display = "";
  box.scrollIntoView({behavior:"smooth"});
}
window.runPreview = runPreview;

// ── COMMENTS ─────────────────────────────────────────────────
function setCmtFilter(val) { cmtFilter=val; renderCmtTable(); }
window.setCmtFilter = setCmtFilter;
function getNestedComments(comments) {
    const parents = comments.filter(c => !c.parentId); // Lấy các cmt gốc
    const children = comments.filter(c => c.parentId); // Lấy các cmt phản hồi
    const result = [];

    parents.forEach(parent => {
        result.push(parent); // Thêm cha vào trước
        // Tìm các con của cha này
        const subReplies = children.filter(child => child.parentId === parent.id);
        // Sắp xếp con theo thời gian tăng dần (cũ trước mới sau)
        subReplies.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        result.push(...subReplies); // Thêm các con ngay sau cha
    });

    return result;
}
function renderCmtTable() {
  let d = allCmts;
  if (cmtFilter === "flagged") d = d.filter(c => c.flagged);
  if (cmtFilter === "deleted") d = d.filter(c => c.deleted);

  // SẮP XẾP LẠI THEO CẤU TRÚC CHA-CON
  const nestedData = getNestedComments(d);
  
  document.getElementById("cmtSubtitle").textContent = `${d.length} bình luận`;
  const docMap = Object.fromEntries(allDocs.map(x => [x.id, x.title || x.id]));
  const tbody = document.getElementById("cmtTableBody");

  if (!nestedData.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--muted)">Không có bình luận</td></tr>`;
    return;
  }

  tbody.innerHTML = nestedData.map((c, i) => {
    const isReply = !!c.parentId; // Kiểm tra nếu là phản hồi
    const sc = c.deleted ? "status-del" : c.flagged ? "status-flg" : "status-ok";
    const st = c.deleted ? "🗑 Đã xoá" : c.flagged ? "⚠ Gắn cờ" : "✓ Bình thường";
    const docTitle = docMap[c.docId] || "—";

    return `
    <tr class="${c.flagged ? "cmt-row-flagged" : ""} ${c.deleted ? "cmt-row-deleted" : ""} ${isReply ? "cmt-row-reply" : ""}">
      <td style="font-size:11px;text-align:center">
         ${isReply ? "" : i + 1} 
      </td>
      <td>
        <div class="cmt-user-cell" style="${isReply ? "margin-left: 25px;" : ""}">
          ${isReply ? '<span class="reply-branch">└─</span>' : ''}
          <div class="cmt-ava" style="background:${c.userColor || '#6c5ce7'}; width:24px; height:24px; font-size:10px">
            ${escHtml(c.userAvatar || "?")}
          </div>
          <span class="cmt-username">${escHtml(c.userName || "Ẩn danh")}</span>
        </div>
      </td>
      <td>
        <div class="cmt-text-cell ${isReply ? "is-reply-text" : ""}" title="${escHtml(c.text)}">
          ${escHtml(c.text || "")}
        </div>
        <div style="font-size:11px;color:var(--dim);margin-top:2px; display:flex; gap:10px;">
            <span>👍 ${c.likes || 0}</span>
            ${isReply ? `<span style="color:var(--acc2)">• Phản hồi cho #${c.parentId.slice(-4)}</span>` : ''}
        </div>
      </td>
      <td class="cmt-doc-cell">${escHtml(docTitle)}</td>
      <td class="cmt-time-cell">${formatDate(c.createdAt)}</td> <td><span class="cmt-status ${sc}">${st}</span></td>
      <td>
        <div class="cmt-act-cell">
          ${!c.deleted ? `
            <button class="btn btn-sm ${c.flagged ? "btn-ghost" : "btn-danger"}" onclick="toggleFlag('${c.id}',${!c.flagged})">
              ${c.flagged ? "Bỏ cờ" : "⚠"}
            </button>
            <button class="btn btn-danger btn-sm" onclick="adminDelCmt('${c.id}')">🗑️</button>
            ${!isReply ? `<button class="btn btn-ghost btn-sm" onclick="adminReply('${c.id}','${escHtml(c.userName || "?")}','${c.docId}')">💬</button>` : ''}
          ` : `<button class="btn btn-danger btn-sm" onclick="hardDel('${c.id}')">Xoá hẳn</button>`}
        </div>
      </td>
    </tr>`;
  }).join("");
}
async function toggleFlag(id, flagged) {
  try { await flagComment(id, flagged); toast.success(flagged?"⚠ Đã gắn cờ":"✓ Đã bỏ gắn cờ"); }
  catch(e) { toast.error("Lỗi", e.message); }
}
window.toggleFlag = toggleFlag;

function adminDelCmt(id) {
  openConfirm("🗑️ Xoá bình luận","Xoá bình luận này?", async()=>{
    try { await hardDeleteComment(id); toast.success("Đã xoá"); }
    catch(e) { toast.error("Lỗi",e.message); }
  });
}
window.adminDelCmt = adminDelCmt;

function hardDel(id) {
  openConfirm("⚠️ Xoá vĩnh viễn","Xoá hoàn toàn khỏi database?", async()=>{
    try { await hardDeleteComment(id); toast.success("Đã xoá vĩnh viễn"); }
    catch(e) { toast.error("Lỗi",e.message); }
  });
}
window.hardDel = hardDel;

function adminReply(cmtId, userName, docId) {
  const text = prompt(`Trả lời bình luận của ${userName}:`);
  if (!text?.trim()) return;
  addComment({ docId, parentId:cmtId, text:text.trim(), userId:"admin", userName:"Admin 👑", userColor:"#6c5ce7", userAvatar:"AD" })
    .then(()=>{ updateCommentCount(docId,1).catch(()=>{}); toast.success("Đã trả lời ✓"); })
    .catch(e=>toast.error("Lỗi",e.message));
}
window.adminReply = adminReply;

// ── ANALYTICS ─────────────────────────────────────────────────
async function loadAnalytics() {
  // Top lists
  const tLiked  = [...allDocs].sort((a,b)=>(b.likes||0)-(a.likes||0)).slice(0,5);
  const tViewed = [...allDocs].sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,5);
  const ranks   = ["🥇","🥈","🥉","4️⃣","5️⃣"];

  document.getElementById("topLiked").innerHTML  = tLiked.map((d,i)=>`
    <div class="a-list-item" onclick="viewDoc('${d.id}')">
      <div class="a-rank">${ranks[i]}</div>
      <div class="a-info"><div class="a-name">${escHtml(d.title)}</div><div class="a-stat">👍 ${d.likes||0} likes · 👁 ${d.views||0}</div></div>
    </div>`).join("") || `<div style="color:var(--muted);font-size:13px">Chưa có dữ liệu</div>`;

  document.getElementById("topViewed").innerHTML = tViewed.map((d,i)=>`
    <div class="a-list-item" onclick="viewDoc('${d.id}')">
      <div class="a-rank">${ranks[i]}</div>
      <div class="a-info"><div class="a-name">${escHtml(d.title)}</div><div class="a-stat">👁 ${d.views||0} views · 👍 ${d.likes||0}</div></div>
    </div>`).join("") || `<div style="color:var(--muted);font-size:13px">Chưa có dữ liệu</div>`;

  // Type breakdown
  const typeColors = { guide:"#6c5ce7",api:"#fd79a8",tutorial:"#55efc4",component:"#74b9ff",snippet:"#fdcb6e",release:"#ff7675",design:"#d980ff" };
  const counts = {};
  allDocs.forEach(d=>{ counts[d.type]=(counts[d.type]||0)+1; });
  const maxC = Math.max(...Object.values(counts),1);
  document.getElementById("typeBreak").innerHTML = Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([t,n])=>{
    const meta = getTypeMeta(t);
    const pct  = Math.round(n/maxC*100);
    return `<div class="ab-row">
      <div class="ab-label">${meta.icon} ${meta.label}</div>
      <div class="ab-bar-bg"><div class="ab-bar" style="width:${pct}%;background:${typeColors[t]||'#6c5ce7'}"></div></div>
      <div class="ab-count">${n}</div>
    </div>`;
  }).join("");

  // Chart
  const analyticsData = await getAnalytics();
  drawChart(analyticsData);
}
window.loadAnalytics = loadAnalytics;

function drawChart(data) {
  const ctx = document.getElementById("viewChart");
  if (!ctx) return;
  if (chartInst) chartInst.destroy();
  const days=[], vals=[];
  for (let i=13;i>=0;i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    const key = d.toISOString().slice(0,10);
    days.push(key.slice(5));
    vals.push(data.find(e=>e.id===key)?.total||0);
  }
  chartInst = new Chart(ctx, {
    type:"bar",
    data: { labels:days, datasets:[{ label:"Lượt truy cập", data:vals, backgroundColor:"rgba(108,92,231,.35)", borderColor:"rgba(108,92,231,.9)", borderWidth:1, borderRadius:4 }] },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{ backgroundColor:"#1c1c30",titleColor:"#eeeef8",bodyColor:"#8080b0",borderColor:"rgba(255,255,255,.06)",borderWidth:1 } },
      scales:{
        x:{ grid:{color:"rgba(255,255,255,.04)"}, ticks:{color:"#3c3c5c"} },
        y:{ grid:{color:"rgba(255,255,255,.04)"}, ticks:{color:"#3c3c5c"}, beginAtZero:true }
      }
    }
  });
}

// ── CONFIRM MODAL ─────────────────────────────────────────────
function openConfirm(title, body, onOk) {
  document.getElementById("confirmTitle").textContent = title;
  document.getElementById("confirmBody").innerHTML    = body;
  document.getElementById("confirmOk").onclick       = ()=>{ closeConfirm(); onOk(); };
  document.getElementById("confirmModal").classList.add("open");
}
function closeConfirm() { document.getElementById("confirmModal").classList.remove("open"); }
window.closeConfirm = closeConfirm;

// ── SEARCH ────────────────────────────────────────────────────
function setupSearch() {
  document.getElementById("searchInput").addEventListener("input", debounce(e=>{
    searchQ = e.target.value.trim();
    if (curPage!=="documents") goto("documents"); else renderDocuments();
  },280));
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
window.closeSidebar = closeSidebar;

// ── UTILS ─────────────────────────────────────────────────────
function emptyHTML(icon, title, desc="") {
  return `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">${icon}</div><div class="empty-title">${title}</div>${desc?`<div class="empty-desc">${desc}</div>`:""}</div>`;
}
function animateCards(grid) {
  grid.querySelectorAll(".doc-card-a").forEach((c,i)=>{ c.style.animationDelay=(i*0.04)+"s"; });
}

// Logic admin lắng nghe feedback mới
function listenAdminNotifications() {
  const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    const notifs = [];
    snapshot.forEach(doc => notifs.push({ id: doc.id, ...doc.data() }));
    
    // Cập nhật số lượng trên chuông (notifBell)
    const unreadCount = notifs.filter(n => n.status === "unread").length;
    updateBellBadge(unreadCount); 
    
    // Render danh sách feedback vào trang quản lý
    renderFeedbackList(notifs.filter(n => n.type === "feedback"));
  });
}
function renderFeedbackList(feedbacks) {
  const container = document.getElementById('adminFeedbackContainer');
  if (!container) return;

  container.innerHTML = feedbacks.map(fb => `
    <div class="fb-card ${fb.status}">
      <div class="fb-card-header">
        <strong>${fb.userContact?.name || "Ẩn danh"}</strong>
        <span>${new Date(fb.createdAt).toLocaleString()}</span>
      </div>
      <div class="fb-card-contact">
        Email: ${fb.userContact?.email || "---"} | SĐT: ${fb.userContact?.phone || "---"}
      </div>
      <div class="fb-card-body">${fb.body}</div>
      <div class="fb-card-actions">
        <button onclick="markAsRead('${fb.id}')">Đánh dấu đã đọc</button>
        <button onclick="deleteFeedback('${fb.id}')" class="btn-delete">Xóa</button>
      </div>
    </div>
  `).join('');
}
// Thêm vào file admin.js của bạn

function listenFeedbacks() {
  // Giả sử bạn dùng collection 'notifications' để lưu feedback
  const q = query(
    collection(db, "notifications"), 
    where("type", "==", "feedback"),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, (snapshot) => {
    const feedbacks = [];
    snapshot.forEach(doc => feedbacks.push({ id: doc.id, ...doc.data() }));

    // 1. Cập nhật Badge trên chuông và sidebar
    const unreadCount = feedbacks.filter(f => f.status === "unread").length;
    const bellBadge = document.getElementById('bell-badge');
    const sideBadge = document.getElementById('nb-feedback');
    
    if (unreadCount > 0) {
      bellBadge.innerText = unreadCount;
      bellBadge.style.display = 'block';
      sideBadge.innerText = unreadCount;
      sideBadge.style.display = 'block';
    } else {
      bellBadge.style.display = 'none';
      sideBadge.style.display = 'none';
    }

    // 2. Render danh sách ra trang Feedback
    renderAdminFeedbacks(feedbacks);
  });
}

function renderAdminFeedbacks(list) {
  const container = document.getElementById('adminFeedbackList');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state">Chưa có góp ý nào.</div>`;
    return;
  }

  container.innerHTML = list.map(fb => `
    <div class="fb-item ${fb.status === 'unread' ? 'is-unread' : ''}" id="fb-${fb.id}">
      <div class="fb-item-header">
        <div class="fb-user">
          <div class="fb-avatar">${(fb.userContact?.name || "A").slice(0,1)}</div>
          <div>
            <div class="fb-name">${fb.userContact?.name || "Người dùng ẩn danh"}</div>
            <div class="fb-meta">${fb.userContact?.email || "No Email"} • ${fb.userContact?.phone || "No Phone"}</div>
          </div>
        </div>
        <div class="fb-time">${new Date(fb.createdAt).toLocaleString('vi-VN')}</div>
      </div>
      <div class="fb-item-body">${fb.body}</div>
      <div class="fb-item-actions">
        ${fb.status === 'unread' ? `<button onclick="updateFbStatus('${fb.id}', 'read')" class="btn-sm-link">Đánh dấu đã đọc</button>` : ''}
        <button onclick="deleteFb('${fb.id}')" class="btn-sm-link btn-danger-link">Xoá</button>
      </div>
    </div>
  `).join('');
}

// Cập nhật trạng thái đã đọc
window.updateFbStatus = async (id, status) => {
  try {
    const docRef = doc(db, "notifications", id);
    await updateDoc(docRef, { status: status });
  } catch (e) { console.error(e); }
};
// async function admCopy(text) {
//   await copyToClipboard(text);
//   toast.success("Đã copy! 📋");
// }
// window.admCopy = admCopy;
// Ở cuối file admin.js
async function admCopy(text) {
  if (!text) {
    toast.error("Không có nội dung để copy");
    return;
  }
  const success = await copyToClipboard(text);
  if (success) {
    toast.success("Đã copy vào bộ nhớ tạm! 📋");
  } else {
    toast.error("Lỗi khi copy");
  }
}



// Dòng này là BẮT BUỘC
window.admCopy = admCopy;


