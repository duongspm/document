// ============================================================
//  client.js  —  Public client page
// ============================================================
import { listenDocuments, getDocument }
  // from "../shared/firebase.js";
  from "./connection.js";
// import { toggleLike, toggleDislike, incrementView } from "../shared/firebase.js";
// import { loginUser, registerUser, logoutUser, onAuthChange, currentUser } from "../shared/auth.js";
// import { addComment, listenComments } from "../shared/firebase.js";
import { toggleLike, toggleDislike, incrementView } from "./connection.js";
import { loginUser, registerUser, logoutUser, onAuthChange, currentUser } from "./auth.js";
import { addComment, listenComments } from "./connection.js";

// ── State ────────────────────────────────────────────────────
let allDocs    = [];
let activeTag  = "all";
let searchQ    = "";

// ── Init ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  setupSearch();
  initTheme();  // ← THÊM DÒNG NÀY
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

  renderReactionBar(doc);           // Feature 2: Like/Dislike
  incrementView(doc.id).catch(()=>{}); // Feature 2: View count
  renderRelatedDocs(doc);           // Feature 7: Related posts
  loadComments(doc.id);             // Feature 3: Comments
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
  if (_commentUnsubscribe) { _commentUnsubscribe(); _commentUnsubscribe = null; }
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

// ════════════════════════════
//  AUTH LOGIC  (thêm vào cuối client.js)
// ════════════════════════════

// Theo dõi trạng thái đăng nhập
onAuthChange(user => {
  const btnLogin = document.getElementById("btnLoginHeader");
  const userChip = document.getElementById("userChip");
  if (!btnLogin || !userChip) return;

  if (user) {
    btnLogin.style.display = "none";
    userChip.style.display = "flex";
    document.getElementById("uChipName").textContent = user.displayName || user.email.split("@")[0];
    document.getElementById("uChipAvatar").textContent = (user.displayName || user.email)[0].toUpperCase();
  } else {
    btnLogin.style.display = "";
    userChip.style.display = "none";
  }
});

function openAuthModal(tab = "login") {
  document.getElementById("authOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
  switchAuthTab(tab);
}
window.openAuthModal = openAuthModal;

function closeAuthModal() {
  document.getElementById("authOverlay").classList.remove("open");
  document.body.style.overflow = "";
  clearAuthErrors();
}
window.closeAuthModal = closeAuthModal;

function handleAuthOverlayClick(e) {
  if (e.target === document.getElementById("authOverlay")) closeAuthModal();
}
window.handleAuthOverlayClick = handleAuthOverlayClick;

function switchAuthTab(tab) {
  document.getElementById("tabLogin").classList.toggle("active", tab === "login");
  document.getElementById("tabRegister").classList.toggle("active", tab === "register");
  document.getElementById("formLogin").style.display    = tab === "login"    ? "" : "none";
  document.getElementById("formRegister").style.display = tab === "register" ? "" : "none";
  clearAuthErrors();
}
window.switchAuthTab = switchAuthTab;

async function handleLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const pw    = document.getElementById("loginPassword").value;
  const btn   = document.getElementById("btnLogin");
  const errEl = document.getElementById("loginError");
  clearAuthErrors();

  if (!email || !pw) { showAuthError(errEl, "Vui lòng điền đầy đủ thông tin"); return; }
  btn.classList.add("loading"); btn.disabled = true;

  try {
    await loginUser(email, pw);
    closeAuthModal();
    showToast("✓ Đăng nhập thành công!", "success");
  } catch (e) {
    const msgs = {
      "auth/user-not-found":  "Email không tồn tại",
      "auth/wrong-password":  "Mật khẩu không đúng",
      "auth/invalid-email":   "Email không hợp lệ",
      "auth/too-many-requests":"Quá nhiều lần thử, thử lại sau",
    };
    showAuthError(errEl, msgs[e.code] || "Đăng nhập thất bại: " + e.message);
  } finally { btn.classList.remove("loading"); btn.disabled = false; }
}
window.handleLogin = handleLogin;

async function handleRegister() {
  const name  = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const pw    = document.getElementById("regPassword").value;
  const btn   = document.getElementById("btnRegister");
  const errEl = document.getElementById("registerError");
  clearAuthErrors();

  if (!name || !email || !pw) { showAuthError(errEl, "Vui lòng điền đầy đủ thông tin"); return; }
  if (pw.length < 6)          { showAuthError(errEl, "Mật khẩu phải ít nhất 6 ký tự"); return; }
  btn.classList.add("loading"); btn.disabled = true;

  try {
    await registerUser(email, pw, name);
    closeAuthModal();
    showToast("✓ Tạo tài khoản thành công!", "success");
  } catch (e) {
    const msgs = {
      "auth/email-already-in-use": "Email đã được sử dụng",
      "auth/invalid-email":        "Email không hợp lệ",
      "auth/weak-password":        "Mật khẩu quá yếu",
    };
    showAuthError(errEl, msgs[e.code] || "Đăng ký thất bại: " + e.message);
  } finally { btn.classList.remove("loading"); btn.disabled = false; }
}
window.handleRegister = handleRegister;

async function handleLogout() {
  await logoutUser();
  showToast("Đã đăng xuất", "info");
}
window.handleLogout = handleLogout;

function showAuthError(el, msg) { el.textContent = msg; el.classList.add("show"); }
function clearAuthErrors() {
  ["loginError","registerError"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove("show");
  });
}

function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  const isText = input.type === "text";
  input.type = isText ? "password" : "text";
  btn.textContent = isText ? "👁" : "🙈";
}
window.togglePw = togglePw;

// Enter key support
document.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    if (document.getElementById("formLogin")?.style.display !== "none" &&
        document.getElementById("authOverlay")?.classList.contains("open")) {
      handleLogin();
    }
  }
  if (e.key === "Escape") closeAuthModal();
});

// ════════════════════════════
//  REACTIONS (thêm vào cuối client.js)
// ════════════════════════════

// Gọi hàm này từ openDetail() sau khi render xong content
// Tìm dòng: scroll.innerHTML = `...`
// Sau đó gọi: renderReactionBar(doc);
// VÀ thêm: incrementView(doc.id);

function renderReactionBar(doc) {
  const user    = currentUser();
  const uid     = user?.uid;
  const likes   = doc.likes    || [];
  const dislikes= doc.dislikes || [];
  const views   = doc.views    || 0;

  const isLiked    = uid && likes.includes(uid);
  const isDisliked = uid && dislikes.includes(uid);

  const html = `
  <div class="reaction-bar" id="reactionBar">
    <button class="react-btn ${isLiked ? 'liked' : ''}" id="btnLike" onclick="handleReact('like','${doc.id}')">
      <span class="rbtn-icon">👍</span>
      <span class="rbtn-count" id="likeCount">${likes.length}</span>
    </button>
    <button class="react-btn ${isDisliked ? 'disliked' : ''}" id="btnDislike" onclick="handleReact('dislike','${doc.id}')">
      <span class="rbtn-icon">👎</span>
      <span class="rbtn-count" id="dislikeCount">${dislikes.length}</span>
    </button>
    <button class="react-btn" onclick="openSharePopup('${doc.id}','${escHtml(doc.title)}')">
      <span class="rbtn-icon">↗</span>
      <span>Chia sẻ</span>
    </button>
    <span style="font-size:12px;color:var(--dim);margin-left:4px">👁 ${views} lượt xem</span>
    <div class="more-wrap">
      <button class="react-btn" onclick="toggleMoreMenu(event)">
        <span class="rbtn-icon">⋯</span>
        <span>More</span>
      </button>
      <div class="more-dropdown hidden" id="moreDropdown">
        <div class="more-item" onclick="copyDocLink('${doc.id}')">🔗 Copy link</div>
        <div class="more-item" onclick="reportDoc('${doc.id}')">🚩 Báo cáo</div>
        <div class="more-item" onclick="printDoc()">🖨 In trang</div>
      </div>
    </div>
  </div>`;

  // Tìm và thêm vào sau detail-hero
  const heroEl = document.querySelector(".detail-hero");
  if (heroEl) heroEl.insertAdjacentHTML("afterend", html);
}
window.renderReactionBar = renderReactionBar;

async function handleReact(type, docId) {
  const user = currentUser();
  if (!user) { openAuthModal("login"); showToast("Vui lòng đăng nhập để tương tác", "info"); return; }

  const btn = document.getElementById(type === "like" ? "btnLike" : "btnDislike");
  btn.querySelector(".rbtn-icon").style.animation = "none";
  setTimeout(() => btn.classList.add("popping"), 10);

  try {
    if (type === "like")    await toggleLike(docId, user.uid);
    else                    await toggleDislike(docId, user.uid);

    // Cập nhật UI lạc quan (optimistic update)
    const countEl = document.getElementById(type === "like" ? "likeCount" : "dislikeCount");
    const isActive = btn.classList.toggle(type === "like" ? "liked" : "disliked");
    const curr = parseInt(countEl.textContent) || 0;
    countEl.textContent = isActive ? curr + 1 : Math.max(0, curr - 1);

    // Bỏ trạng thái phản ứng ngược
    if (type === "like") {
      const dBtn = document.getElementById("btnDislike");
      if (dBtn?.classList.contains("disliked")) {
        dBtn.classList.remove("disliked");
        const dc = document.getElementById("dislikeCount");
        dc.textContent = Math.max(0, (parseInt(dc.textContent) || 0) - 1);
      }
    }
  } catch(e) { showToast("Lỗi: " + e.message, "error"); }
}
window.handleReact = handleReact;

function openSharePopup(docId, title) {
  // Remove cũ nếu có
  document.getElementById("sharePopupEl")?.remove();

  const url     = `${location.origin}${location.pathname}?doc=${docId}`;
  const encoded = encodeURIComponent(url);
  const text    = encodeURIComponent(title);

  const el = document.createElement("div");
  el.id = "sharePopupEl";
  el.className = "share-popup";
  el.innerHTML = `
    <div class="share-popup-title">📤 Chia sẻ tài liệu</div>
    <div class="share-methods">
      <div class="share-method" onclick="shareTo('copy','${url}')">
        <span class="sm-icon">🔗</span><span>Copy link</span>
      </div>
      <div class="share-method" onclick="shareTo('facebook','${encoded}')">
        <span class="sm-icon">📘</span><span>Facebook</span>
      </div>
      <div class="share-method" onclick="shareTo('twitter','${encoded}','${text}')">
        <span class="sm-icon">🐦</span><span>Twitter</span>
      </div>
      <div class="share-method" onclick="shareTo('telegram','${encoded}','${text}')">
        <span class="sm-icon">✈️</span><span>Telegram</span>
      </div>
    </div>`;
  document.body.appendChild(el);

  // Tự đóng sau 6 giây hoặc click ngoài
  setTimeout(() => el.remove(), 6000);
  document.addEventListener("click", function h(e) {
    if (!el.contains(e.target)) { el.remove(); document.removeEventListener("click", h); }
  }, true);
}
window.openSharePopup = openSharePopup;

function shareTo(method, url, text = "") {
  if (method === "copy") {
    navigator.clipboard.writeText(url).then(() => {
      showToast("✓ Đã copy link!", "success");
      document.getElementById("sharePopupEl")?.remove();
    });
  } else if (method === "facebook") {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank");
  } else if (method === "twitter") {
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, "_blank");
  } else if (method === "telegram") {
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank");
  }
}
window.shareTo = shareTo;

function toggleMoreMenu(e) {
  e.stopPropagation();
  const dd = document.getElementById("moreDropdown");
  dd?.classList.toggle("hidden");
  // Đóng khi click ngoài
  document.addEventListener("click", () => dd?.classList.add("hidden"), { once: true });
}
window.toggleMoreMenu = toggleMoreMenu;

function copyDocLink(docId) {
  const url = `${location.origin}${location.pathname}?doc=${docId}`;
  navigator.clipboard.writeText(url).then(() => showToast("✓ Đã copy link!", "success"));
  document.getElementById("moreDropdown")?.classList.add("hidden");
}
window.copyDocLink = copyDocLink;

function reportDoc(docId) {
  showToast("🚩 Đã gửi báo cáo. Cảm ơn bạn!", "info");
  document.getElementById("moreDropdown")?.classList.add("hidden");
}
window.reportDoc = reportDoc;

function printDoc() {
  window.print();
}
window.printDoc = printDoc;

// ════════════════════════════
//  COMMENTS (thêm vào cuối client.js)
// ════════════════════════════

let _commentUnsubscribe = null;  // giữ reference để unsubscribe

function loadComments(docId) {
  // Unsubscribe listener cũ
  if (_commentUnsubscribe) _commentUnsubscribe();

  // Thêm HTML section vào cuối detail-scroll
  const scroll = document.getElementById("detailScroll");
  if (!scroll) return;

  // Xoá section cũ nếu có
  document.getElementById("commentSection")?.remove();

  const user = currentUser(); // từ auth.js

  const sectionHTML = `
  <div class="comment-section" id="commentSection">
    <div class="comment-section-title">
      💬 Bình luận
      <span class="comment-count-badge" id="cmtCount">0</span>
    </div>

    ${user
      ? `<div class="comment-form" id="commentForm">
           <div class="comment-form-inner">
             <textarea id="cmtTextarea" maxlength="500"
               placeholder="Viết bình luận của bạn..."
               oninput="updateCharCount(this)"></textarea>
             <div class="comment-form-footer">
               <span class="comment-chars" id="cmtChars">0 / 500</span>
               <button class="btn-send-comment" id="btnSendCmt"
                 onclick="submitComment('${docId}')">
                 ✉ Gửi bình luận
               </button>
             </div>
           </div>
         </div>`
      : `<div class="comment-login-prompt">
           <a onclick="openAuthModal('login')">Đăng nhập</a> để viết bình luận
         </div>`
    }

    <div class="comment-list" id="cmtList">
      <div class="loading" style="padding:20px 0"><div class="loader" style="width:24px;height:24px;border-width:2px"></div></div>
    </div>
  </div>`;

  scroll.insertAdjacentHTML("beforeend", sectionHTML);

  // Lắng nghe realtime
  _commentUnsubscribe = listenComments(docId, comments => {
    renderComments(comments);
  });
}
window.loadComments = loadComments;

function renderComments(comments) {
  const list  = document.getElementById("cmtList");
  const count = document.getElementById("cmtCount");
  if (!list) return;
  if (count) count.textContent = comments.length;

  if (comments.length === 0) {
    list.innerHTML = `
      <div class="no-comments">
        <div class="no-comments-icon">💬</div>
        Chưa có bình luận nào. Hãy là người đầu tiên!
      </div>`;
    return;
  }

  list.innerHTML = comments.map((c, i) => {
    const initials = (c.authorName || "?")[0].toUpperCase();
    const timeAgo  = formatTimeAgo(c.createdAt);
    const fullTime = c.createdAt?.seconds
      ? new Date(c.createdAt.seconds * 1000).toLocaleString("vi-VN")
      : "";

    return `
    <div class="comment-item" style="animation-delay:${i*0.04}s">
      <div class="comment-avatar">${initials}</div>
      <div class="comment-body">
        <div class="comment-header">
          <span class="comment-author">${escHtml(c.authorName || "Ẩn danh")}</span>
          <span class="comment-time" title="${fullTime}">${timeAgo}</span>
        </div>
        <div class="comment-text">${escHtml(c.text)}</div>
      </div>
    </div>`;
  }).join("");
}

async function submitComment(docId) {
  const user = currentUser();
  if (!user) { openAuthModal("login"); return; }

  const textarea = document.getElementById("cmtTextarea");
  const text = textarea?.value.trim();
  if (!text) { showToast("Vui lòng nhập nội dung bình luận", "error"); return; }
  if (text.length > 500) { showToast("Bình luận tối đa 500 ký tự", "error"); return; }

  const btn = document.getElementById("btnSendCmt");
  btn.disabled = true;
  btn.innerHTML = `<span class="loader" style="width:14px;height:14px;border-width:2px;margin:0"></span>`;

  try {
    await addComment(docId, {
      text,
      authorName: user.displayName || user.email.split("@")[0],
      authorId:   user.uid,
      authorEmail:user.email,
    });
    textarea.value = "";
    updateCharCount(textarea);
    showToast("✓ Bình luận đã được đăng, chờ admin phê duyệt", "success");
  } catch(e) {
    showToast("✗ Không thể đăng bình luận: " + e.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `✉ Gửi bình luận`;
  }
}
window.submitComment = submitComment;

function updateCharCount(textarea) {
  const el = document.getElementById("cmtChars");
  if (!el) return;
  const len = textarea.value.length;
  el.textContent = `${len} / 500`;
  el.classList.toggle("warn", len > 450);
}
window.updateCharCount = updateCharCount;

// Định dạng thời gian tương đối
function formatTimeAgo(ts) {
  if (!ts?.seconds) return "Vừa xong";
  const diff  = (Date.now() / 1000) - ts.seconds;
  if (diff < 60)     return "Vừa xong";
  if (diff < 3600)   return `${Math.floor(diff/60)} phút trước`;
  if (diff < 86400)  return `${Math.floor(diff/3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff/86400)} ngày trước`;
  return new Date(ts.seconds * 1000).toLocaleDateString("vi-VN");
}

// Đóng detail → unsubscribe
// Sửa hàm closeDetail() hiện tại, thêm vào đầu:
// if (_commentUnsubscribe) { _commentUnsubscribe(); _commentUnsubscribe = null; }

// ════════════════════════════════════════════
//  TOAST SYSTEM (thêm vào cuối client.js & admin.js)
// ════════════════════════════════════════════

/**
 * showToast(message, type, options)
 * type: 'success' | 'error' | 'info' | 'warning'
 * options: { title, duration }
 * 
 * Ví dụ:
 *   showToast("Bình luận đã được đăng ✓", "success")
 *   showToast("Không thể tải dữ liệu ✗", "error")
 *   showToast("Đang xử lý...", "info", { title: "Hệ thống", duration: 2000 })
 */
function showToast(message, type = "info", options = {}) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const { title = "", duration = 3000 } = options;
  const id = "toast_" + Date.now();

  const el = document.createElement("div");
  el.className = `dv-toast ${type}`;
  el.id = id;
  el.style.animationDuration = ".35s";

  const titleHTML = title ? `<div class="toast-title">${title}</div>` : "";
  const bodyHTML  = `<div class="toast-body">${message}</div>`;

  el.innerHTML = `
    <div class="toast-icon"></div>
    <div class="toast-content">
      ${titleHTML}
      ${title ? bodyHTML : `<div class="toast-title">${message}</div>`}
    </div>
    <button class="toast-close" onclick="dismissToast('${id}')">✕</button>`;

  // Điều chỉnh duration cho progress bar
  el.style.setProperty("--toast-dur", duration + "ms");
  const progressEl = el;
  progressEl.addEventListener("animationend", e => {
    if (e.animationName === "toastProgress") dismissToast(id);
  });

  container.appendChild(el);
  dismissToast(id, duration);
}
window.showToast = showToast;

function dismissToast(id, delay = 0) {
  if (delay > 0) {
    setTimeout(() => dismissToast(id), delay);
    return;
  }
  const el = document.getElementById(id);
  if (!el) return;
  el.style.animation = "toastSlideOut .3s ease forwards";
  setTimeout(() => el.remove(), 290);
}
window.dismissToast = dismissToast;


// ════════════════════════════════════════════
//  CONFIRM MODAL
// ════════════════════════════════════════════
let _confirmResolve = null;

/**
 * confirmDialog({ title, message, icon, okText, okStyle })
 * Trả về Promise<boolean>
 * 
 * Ví dụ:
 *   const ok = await confirmDialog({ title: "Xoá bình luận?", okText: "Xoá" })
 *   if (ok) { ... }
 */
function confirmDialog({ title = "Xác nhận", message = "Bạn chắc chắn?", icon = "⚠️",
                         okText = "Xác nhận", okStyle = "danger" } = {}) {
  return new Promise(resolve => {
    _confirmResolve = resolve;

    document.getElementById("confirmTitle").textContent = title;
    document.getElementById("confirmMsg").textContent   = message;
    document.getElementById("confirmIcon").textContent  = icon;
    document.getElementById("confirmOkBtn").textContent = okText;

    const okBtn = document.getElementById("confirmOkBtn");
    okBtn.className = "confirm-btn ok" + (okStyle === "safe" ? " safe" : "");

    document.getElementById("confirmOverlay").classList.add("open");
    document.body.style.overflow = "hidden";
  });
}
window.confirmDialog = confirmDialog;

function resolveConfirm(result) {
  document.getElementById("confirmOverlay").classList.remove("open");
  document.body.style.overflow = "";
  if (_confirmResolve) { _confirmResolve(result); _confirmResolve = null; }
}
window.resolveConfirm = resolveConfirm;

// Close on backdrop click
document.getElementById("confirmOverlay")?.addEventListener("click", e => {
  if (e.target.id === "confirmOverlay") resolveConfirm(false);
});

// ════════════════════════════════════════════
//  Cách dùng trong admin.js — thay thế confirm() thông thường:
//
//  CŨ:   if (!confirm("Xoá bình luận?")) return;
//        deleteComment(docId, cmtId)
//
//  MỚI:  const ok = await confirmDialog({
//          title: "Xoá bình luận?",
//          message: "Bình luận này sẽ bị xoá vĩnh viễn.",
//          icon: "🗑️", okText: "Xoá", okStyle: "danger"
//        });
//        if (!ok) return;
//        await deleteComment(docId, cmtId);
//        showToast("🗑️ Đã xoá bình luận", "success");
// ════════════════════════════════════════════

// ════════════════════════════════════════════
//  AUTO DARK MODE SCHEDULER (thêm vào cuối client.js)
// ════════════════════════════════════════════

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