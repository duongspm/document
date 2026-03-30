// ============================================================
//  client.js  —  DocVault Client (đầy đủ tính năng)
//  Features: reactions, comments (threaded), share, FAB,
//            notifications, sort, OG meta, Monaco editor
// ============================================================
import {
  listenDocuments, getDocument, incrementView,
  toggleReaction, getUserReaction,
  addComment, listenComments, toggleCommentLike, getCommentLiked,
  updateCommentCount, addNotification,
  listenNotifications, markNotifRead, COL
} from "./connection.js";
import { toast }                                     from "./toast.js";
import { escHtml, parseTags, formatDate, timeAgo,
         getAnonUser, renderMarkdown, getTypeMeta,
         debounce, copyToClipboard, buildSrcdoc }     from "./utils.js";

// ── State ────────────────────────────────────────────────────
let allDocs        = [];
let activeTag      = "all";
let activeSort     = "likes";   // "likes" | "createdAt" | "views"
let searchQ        = "";
let currentDocId   = null;
let commentUnsub   = null;       // unsubscribe realtime comment listener
let notifUnsub     = null;
let fabOpen        = false;

const anonUser = getAnonUser();

// ── Init ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  setupSearch();
  setupScrollHeader();
  setupMobileMenu();
  setupOverlayClose();
  setupNotifBell();
  setupShareModal();
  checkUrlParams();   // hỗ trợ ?doc=ID để deep link

  // Firebase realtime
  listenDocuments(docs => {
    allDocs = docs;
    updateHeroStats();
    buildTagBar();
    renderGrid();
  });

  listenNotifications(notifs => renderNotifications(notifs));
});

// ── Check URL deep link (?doc=ID) ────────────────────────────
function checkUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const docId  = params.get("doc");
  if (docId) setTimeout(() => openDetail(docId), 600);
}

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
  const all   = [...new Set([...types, ...tags])].slice(0, 28);

  const bar = document.getElementById("tagBarInner");
  bar.innerHTML = `<button class="tag-btn ${activeTag === "all" ? "active" : ""}"
    onclick="setClientFilter('all',this)">✦ Tất cả</button>`;
  all.forEach(t => {
    const active = activeTag === t ? "active" : "";
    bar.innerHTML += `<button class="tag-btn ${active}" onclick="setClientFilter('${escHtml(t)}',this)">${escHtml(t)}</button>`;
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
  setClientFilter("all", document.querySelector('.tag-btn'));
}
window.filterAll = filterAll;

// ── Sort ─────────────────────────────────────────────────────
function setSort(key, el) {
  activeSort = key;
  document.querySelectorAll(".sort-btn").forEach(b => b.classList.remove("active"));
  el.classList.add("active");
  renderGrid();
}
window.setSort = setSort;

function sortDocs(docs) {
  return [...docs].sort((a, b) => {
    if (activeSort === "likes")     return (b.likes || 0) - (a.likes || 0);
    if (activeSort === "views")     return (b.views || 0) - (a.views || 0);
    if (activeSort === "createdAt") {
      const ta = a.createdAt?.seconds || 0;
      const tb = b.createdAt?.seconds || 0;
      return tb - ta;
    }
    return 0;
  });
}

// ── Render grid ───────────────────────────────────────────────
function renderGrid() {
  let filtered = allDocs;

  if (activeTag !== "all") {
    filtered = filtered.filter(d =>
      d.type === activeTag || parseTags(d.tags).includes(activeTag)
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

  filtered = sortDocs(filtered);

  const info = document.getElementById("resultsInfo");
  info.textContent = filtered.length === allDocs.length
    ? `${allDocs.length} tài liệu`
    : `${filtered.length} / ${allDocs.length} tài liệu`;

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
function clientCardHTML(doc, idx) {
  const meta     = getTypeMeta(doc.type);
  const date     = formatDate(doc.createdAt);
  const tags     = parseTags(doc.tags).slice(0, 4)
    .map(t => `<span class="ctag" onclick="event.stopPropagation();tagClick('${escHtml(t)}')">${escHtml(t)}</span>`)
    .join("");
  const demoInd  = doc.hasCode ? `<div class="demo-indicator">▶ Demo</div>` : "";
  const userRxn  = getUserReaction(doc.id);
  const likes    = doc.likes    || 0;
  const dislikes = doc.dislikes || 0;
  const views    = doc.views    || 0;
  const comments = doc.commentCount || 0;

  return `
  <div class="client-card" onclick="openDetail('${doc.id}')" style="animation-delay:${idx*0.04}s">
    <div class="client-card-thumb cthumb-${meta.cls}">
      ${meta.icon}
      ${demoInd}
    </div>
    <div class="client-card-body">
      <span class="cbadge cbadge-${meta.cls}">${meta.icon} ${meta.label}</span>
      <div class="client-card-title">${escHtml(doc.title)}</div>
      <div class="client-card-desc">${escHtml((doc.desc||"").slice(0,90) + ((doc.desc||"").length>90?"…":""))}</div>
      <div class="client-card-footer">
        ${date ? `<div class="client-card-meta">📅 ${date}</div>` : ""}
        ${tags ? `<div class="client-tags">${tags}</div>` : ""}
      </div>
      <div class="card-reactions">
        <button class="card-react-btn ${userRxn==='like'?'liked':''}"
          onclick="event.stopPropagation();quickReact(event,'${doc.id}','like')">
          👍 <span class="card-react-count">${likes}</span>
        </button>
        <button class="card-react-btn ${userRxn==='dislike'?'disliked':''}"
          onclick="event.stopPropagation();quickReact(event,'${doc.id}','dislike')">
          👎 <span class="card-react-count">${dislikes}</span>
        </button>
        <div class="card-meta-right">
          <span title="Bình luận">💬 ${comments}</span>
          <span title="Lượt xem">👁 ${views}</span>
        </div>
      </div>
    </div>
  </div>`;
}

// Quick react từ card (không mở detail)
async function quickReact(e, docId, type) {
  e.stopPropagation();
  try {
    await toggleReaction(docId, type);
    // Cập nhật lại card tại chỗ
    const doc = allDocs.find(d => d.id === docId);
    if (!doc) return;
    const userRxn = getUserReaction(docId);
    const card    = e.target.closest(".client-card");
    if (!card) return;
    // cập nhật class của các nút
    card.querySelectorAll(".card-react-btn").forEach(btn => {
      btn.classList.remove("liked", "disliked");
    });
    if (userRxn === "like")    e.target.closest(".card-react-btn")?.classList.add("liked");
    if (userRxn === "dislike") e.target.closest(".card-react-btn")?.classList.add("disliked");
    // số đếm sẽ tự cập nhật qua listenDocuments
  } catch { toast.error("Lỗi", "Không thể reaction"); }
}
window.quickReact = quickReact;

function tagClick(tag) {
  activeTag = tag;
  buildTagBar();
  renderGrid();
  document.getElementById("siteBody").scrollIntoView({ behavior: "smooth" });
}
window.tagClick = tagClick;

// ── Detail Overlay ────────────────────────────────────────────
async function openDetail(id) {
  currentDocId = id;
  const overlay = document.getElementById("detailOverlay");
  const scroll  = document.getElementById("detailScroll");

  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
  scroll.innerHTML = `<div class="detail-loading"><div class="loader"></div><p>Đang tải…</p></div>`;

  // Ghi view
  incrementView(id).catch(() => {});

  const snap = await getDocument(id);
  if (!snap.exists()) {
    scroll.innerHTML = `<div class="detail-loading"><p>Không tìm thấy tài liệu.</p></div>`;
    return;
  }
  const doc  = { id: snap.id, ...snap.data() };
  const meta = getTypeMeta(doc.type);
  const date = formatDate(doc.createdAt);
  const tags = parseTags(doc.tags)
    .map(t => `<span class="ctag" onclick="tagClick('${escHtml(t)}')">${escHtml(t)}</span>`).join("");

  const demoSection    = doc.hasCode ? buildDetailDemo(doc) : "";
  const userRxn        = getUserReaction(id);
  const likes          = doc.likes    || 0;
  const dislikes       = doc.dislikes || 0;

  scroll.innerHTML = `
    <!-- Detail hero -->
    <div class="detail-hero">
      <span class="detail-type-icon">${meta.icon}</span>
      <div class="detail-title">${escHtml(doc.title)}</div>
      <div class="detail-meta">
        <span class="cbadge cbadge-${meta.cls}">${meta.icon} ${meta.label}</span>
        ${date ? `<span>📅 ${date}</span>` : ""}
        ${doc.author ? `<span>👤 ${escHtml(doc.author)}</span>` : ""}
      </div>
      ${tags ? `<div class="detail-tags-row">${tags}</div>` : ""}
    </div>

    <!-- Reactions + share bar -->
    <div class="detail-reactions" id="detailReactions">
      <button class="react-btn like-btn ${userRxn==='like'?'active':''}" id="likeBtn"
        onclick="handleReaction('like')">
        <span class="react-icon">👍</span>
        <span class="react-count" id="likeCount">${likes}</span>
        <span style="font-size:13px">Thích</span>
      </button>
      <button class="react-btn dislike-btn ${userRxn==='dislike'?'active':''}" id="dislikeBtn"
        onclick="handleReaction('dislike')">
        <span class="react-icon">👎</span>
        <span class="react-count" id="dislikeCount">${dislikes}</span>
        <span style="font-size:13px">Không thích</span>
      </button>
      <span class="view-count">👁 ${doc.views || 0} lượt xem</span>
      <div class="react-actions">
        <button class="share-btn-detail" onclick="openShareModal('${doc.id}','${escHtml(doc.title)}')">
          📤 Chia sẻ
        </button>
      </div>
    </div>

    <!-- Markdown content -->
    <div class="detail-body">${renderMarkdown(doc.content || "")}</div>

    <!-- Code demo -->
    ${demoSection}

    <!-- Comments -->
    <div class="comments-section" id="commentsSection">
      <div class="comments-title">
        💬 Bình luận
        <span class="comment-count-badge" id="commentCountBadge">${doc.commentCount || 0}</span>
      </div>
      ${buildCommentForm()}
      <div class="comments-list" id="commentsList">
        <div class="no-comments">Đang tải bình luận…</div>
      </div>
    </div>
  `;

  // Inject iframe
  if (doc.hasCode) setTimeout(() => injectDetailFrame(doc), 80);

  // Bắt đầu lắng nghe comments realtime
  startCommentListener(id);

  // Cập nhật OG meta
  updateOGMeta(doc);
}
window.openDetail = openDetail;

// ── OG Meta cập nhật động ─────────────────────────────────────
function updateOGMeta(doc) {
  const url   = window.location.origin + window.location.pathname + "?doc=" + doc.id;
  const title = doc.title + " — DocVault";
  const desc  = doc.desc || "Xem tài liệu trên DocVault";

  document.getElementById("og-title").setAttribute("content", title);
  document.getElementById("og-desc").setAttribute("content", desc);
  document.getElementById("og-url").setAttribute("content", url);
  document.getElementById("tw-title").setAttribute("content", title);
  document.getElementById("tw-desc").setAttribute("content", desc);
  document.getElementById("pageTitle").textContent = title;

  // Update URL bar without reload
  window.history.replaceState({}, "", "?doc=" + doc.id);
}

function closeDetail() {
  document.getElementById("detailOverlay").classList.remove("open");
  document.body.style.overflow = "";
  currentDocId = null;
  // Unsubscribe comment listener
  if (commentUnsub) { commentUnsub(); commentUnsub = null; }
  // Reset URL
  window.history.replaceState({}, "", window.location.pathname);
  document.getElementById("pageTitle").textContent = "DocVault — Khám phá tài liệu";
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

// ── Reactions ─────────────────────────────────────────────────
async function handleReaction(type) {
  if (!currentDocId) return;
  try {
    await toggleReaction(currentDocId, type);
    const snap = await getDocument(currentDocId);
    if (!snap.exists()) return;
    const data    = snap.data();
    const userRxn = getUserReaction(currentDocId);

    // Update UI
    document.getElementById("likeCount").textContent    = data.likes    || 0;
    document.getElementById("dislikeCount").textContent = data.dislikes || 0;
    document.getElementById("likeBtn").classList.toggle("active",    userRxn === "like");
    document.getElementById("dislikeBtn").classList.toggle("active", userRxn === "dislike");

    if (type === "like" && userRxn === "like") {
      toast.success("Đã thích! 👍");
    } else if (type === "dislike" && userRxn === "dislike") {
      toast.info("Đã đánh dấu không thích");
    } else {
      toast.info("Đã bỏ reaction");
    }
  } catch (e) {
    toast.error("Lỗi", "Không thể cập nhật reaction");
  }
}
window.handleReaction = handleReaction;

// ── Code Demo ─────────────────────────────────────────────────
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
    <button class="dd-copy" onclick="ddCopy('${btoa(unescape(encodeURIComponent(doc.codeHtml||'')))}')">📋 Copy HTML</button>
      <pre class="dd-code">${h || "<!-- Không có HTML -->"}</pre>
    </div>
    <div class="dd-pane" id="dd-css">
    <button class="dd-copy" onclick="ddCopy('${btoa(unescape(encodeURIComponent(doc.codeCss||'')))}')">📋 Copy CSS</button>
      <pre class="dd-code">${c || "/* Không có CSS */"}</pre>
    </div>
    <div class="dd-pane" id="dd-js">
    <button class="dd-copy" onclick="ddCopy('${btoa(unescape(encodeURIComponent(doc.codeJs||'')))}')">📋 Copy JS</button>
      <pre class="dd-code">${j || "// Không có JS"}</pre>
    </div>
  </div>`;
}

function injectDetailFrame(doc) {
  const frame = document.getElementById("detailFrame");
  if (!frame) return;
  frame.srcdoc = buildSrcdoc(doc.codeHtml, doc.codeCss, doc.codeJs);
}

function switchDDTab(e, paneId) {
  const demo = e.target.closest(".detail-demo");
  demo.querySelectorAll(".dd-tab").forEach(t => t.classList.remove("active"));
  demo.querySelectorAll(".dd-pane").forEach(p => p.classList.remove("active"));
  e.target.classList.add("active");
  demo.querySelector("#" + paneId)?.classList.add("active");
  if (paneId === "dd-preview") injectDetailFrame(
    allDocs.find(d => d.id === currentDocId) || {}
  );
}
window.switchDDTab = switchDDTab;

// function ddCopy(b64) {
//   try {
//     const text = decodeURIComponent(escape(atob(b64)));
//     navigator.clipboard.writeText(text).then(() => showFloatToast("✅ Đã copy!"));
//   } catch { showFloatToast("❌ Không copy được"); }
// }
// window.ddCopy = ddCopy;
// Đảm bảo đầu file client.js đã có: import { toast } from "./toast.js";

async function ddCopy(b64) {
  // BƯỚC 1: Kiểm tra xem tham số truyền vào có rỗng không
  if (!b64 || b64 === "''" || b64 === "") {
    toast.error("❌ Không có nội dung để copy!");
    return; // Dừng hàm tại đây
  }
  try {
    if (!b64) return;
    
    // Giải mã Base64 sang UTF-8 (Tiếng Việt)
    const text = decodeURIComponent(escape(atob(b64)));
    
    // Sử dụng navigator.clipboard
    await navigator.clipboard.writeText(text);
    

    // SỬA TẠI ĐÂY: Thay showFloatToast bằng toast.success
    if (typeof toast !== 'undefined') {
      toast.success("✅ Đã copy mã!");
    } else {
      console.log("Đã copy:", text);
    }
  } catch (err) {
    console.error("Copy error:", err);
    // Thay showFloatToast bằng toast.error
    if (typeof toast !== 'undefined') {
      toast.error("❌ Không thể copy");
    }
  }
}
window.ddCopy = ddCopy;
// ── COMMENTS ─────────────────────────────────────────────────

// Form bình luận
function buildCommentForm() {
  const u = anonUser;
  return `
  <div class="comment-form-wrap">
    <div class="comment-form-user">
      <div class="comment-avatar" style="background:${u.color}">${u.avatar}</div>
      <div>
        <span class="comment-username">${escHtml(u.name)}</span>
        <span class="comment-username-edit" onclick="editUsername()" title="Đổi tên">✏️</span>
      </div>
    </div>
    <textarea class="comment-input" id="commentInput"
      placeholder="Chia sẻ suy nghĩ của bạn về tài liệu này…" maxlength="2000"></textarea>
    <div class="comment-form-actions">
      <button class="btn-post-comment" onclick="submitComment()" id="postCommentBtn">
        💬 Đăng bình luận
      </button>
    </div>
  </div>`;
}

// Đổi tên user
function editUsername() {
  const name = prompt("Nhập tên hiển thị của bạn:", anonUser.name);
  if (name?.trim()) {
    anonUser.name   = name.trim().slice(0, 30);
    anonUser.avatar = name.trim().slice(0, 2).toUpperCase();
    localStorage.setItem("dv_user", JSON.stringify(anonUser));
    // Re-render form
    const formWrap = document.querySelector(".comment-form-wrap");
    if (formWrap) formWrap.outerHTML = buildCommentForm();
    toast.success("Đã cập nhật tên!");
  }
}
window.editUsername = editUsername;

//đầu viết lại
// ============================================================
//  SECTION: COMMENTS SYSTEM (THREADED) - ĐÃ ĐỒNG NHẤT BIẾN
// ============================================================

// 1. Khởi tạo listener (Đảm bảo gọi hàm này trong openDetail)
function startCommentListener(docId) {
  if (commentUnsub) commentUnsub(); 

  commentUnsub = listenComments(docId, (comments) => {
    try {
      // Cập nhật số lượng trên Badge
      const badge = document.getElementById("commentCountBadge");
      if (badge) badge.textContent = comments.length;

      // Gọi hàm render danh sách
      renderComments(comments, docId);
    } catch (err) {
      console.error("Lỗi khi xử lý dữ liệu comment:", err);
    }
  });
}
window.startCommentListener = startCommentListener;

// 2. Hàm render chính (Dùng ID commentsList)
function renderComments(comments, docId) {
  const list = document.getElementById("commentsList");
  if (!list) return;

  // Tách Cha (parentId null) và Con
  const roots = comments.filter(c => !c.parentId);
  const allReplies = comments.filter(c => c.parentId);

  if (roots.length === 0) {
    list.innerHTML = `<div class="no-comments">Chưa có bình luận nào. Hãy là người đầu tiên! 🎉</div>`;
    return;
  }

  // Sắp xếp: Mới nhất lên đầu
  roots.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

  // Render logic lồng nhau
  list.innerHTML = roots.map(root => {
    const directReplies = allReplies.filter(r => r.parentId === root.id);
    return commentItemHTML(root, docId, directReplies);
  }).join("");
}

// viet lại 3:02
// 3. Hàm tạo HTML cho bình luận cha
// 3. Hàm tạo HTML cho bình luận cha
// 3. Hàm tạo HTML cho bình luận cha
// 3. Hàm tạo HTML cho bình luận cha
/* <div class="comment-body-text" id="text-${cmt.id}">${escHtml(cmt.text)}</div> */
// 3. Hàm tạo HTML cho bình luận CHA
// 3. Hàm tạo HTML cho bình luận CHA
function commentItemHTML(cmt, docId, directReplies = []) {
  const liked = getCommentLiked(cmt.id);
  const safeName = escHtml(cmt.userName || "Ẩn danh");
  const avatar = escHtml(cmt.userAvatar || safeName.slice(0, 2)).toUpperCase();

  return `
  <div class="comment-item" id="cmt-${cmt.id}" style="margin-bottom: 20px;">
    <div class="comment-main-content">
      <div class="comment-header">
        <div class="comment-avatar" style="background:${cmt.userColor || '#6c5ce7'}">${avatar}</div>
        <span class="comment-username-text">${safeName}</span>
        <span class="cmt-time">${timeAgo(cmt.createdAt)}</span>
      </div>
      <div class="comment-body-text" id="text-${cmt.id}">${escHtml(cmt.text)}</div>
      <div class="comment-actions">
        <button class="cmt-action-btn ${liked ? "liked" : ""}" onclick="likeCmt('${cmt.id}', this)">
          👍 <span>${cmt.likes || 0}</span>
        </button>
        <button class="cmt-action-btn" onclick="toggleReplyForm('${cmt.id}', '${safeName}')">
          💬 Phản hồi
        </button>
      </div>
    </div>

    <div class="reply-form" id="replyForm_${cmt.id}" style="display:none; margin-top:10px; margin-left:40px;">
      <div id="quoteContext_${cmt.id}"></div> 
      <textarea class="reply-input" id="replyInput_${cmt.id}" placeholder="Trả lời ${safeName}..."></textarea>
      <div class="reply-form-actions">
        <button class="btn-cancel" onclick="closeReplyForm('${cmt.id}')">Huỷ</button>
        <button class="btn-submit" id="replyBtn_${cmt.id}" onclick="submitReply('${cmt.id}', '${docId}', '${cmt.id}')">Gửi</button>
      </div>
    </div>

    ${directReplies.length > 0 ? `
    <div class="replies-container" style="margin-left:40px; border-left: 2px solid #eee; padding-left: 15px;">
      ${directReplies.map(reply => subReplyHTML(reply, docId, cmt.id)).join("")}
    </div>` : ""}
  </div>`;
}

// 4. Hàm cho bình luận CON
function subReplyHTML(cmt, docId, parentId) {
  const safeName = escHtml(cmt.userName || "Ẩn danh");
  const liked = getCommentLiked(cmt.id);
  
  return `
  <div class="comment-item sub-reply" id="cmt-${cmt.id}" style="margin-top:10px;">
    <div class="comment-header">
      <div class="comment-avatar small" style="background:${cmt.userColor || '#6c5ce7'}">
        ${escHtml(cmt.userAvatar || "?").toUpperCase()}
      </div>
      <span class="comment-username-text small">${safeName}</span>
      <span class="cmt-time">${timeAgo(cmt.createdAt)}</span>
    </div>
    <div class="comment-body-text small" id="text-${cmt.id}">${escHtml(cmt.text)}</div>
    <div class="comment-actions">
      <button class="cmt-action-btn ${liked ? "liked" : ""}" onclick="likeCmt('${cmt.id}', this)">
        👍 <span>${cmt.likes || 0}</span>
      </button>
      <button class="cmt-action-btn" onclick="toggleReplyForm('${cmt.id}', '${safeName}')">
        💬 Phản hồi
      </button>
    </div>

    <div class="reply-form" id="replyForm_${cmt.id}" style="display:none; margin-top:10px;">
      <div id="quoteContext_${cmt.id}"></div> 
      <textarea class="reply-input" id="replyInput_${cmt.id}" placeholder="Trả lời ${safeName}..."></textarea>
      <div class="reply-form-actions">
        <button class="btn-cancel" onclick="closeReplyForm('${cmt.id}')">Huỷ</button>
        <button class="btn-submit" id="replyBtn_${cmt.id}" onclick="submitReply('${cmt.id}', '${docId}', '${parentId}')">Gửi</button>
      </div>
    </div>
  </div>`;
}
// 306
// 5. Các hàm hỗ trợ UI
// Hàm đóng/mở form và xử lý TRÍCH DẪN nội dung
// 5. Các hàm hỗ trợ UI
window.toggleReplyForm = (cmtId, userName) => {
  const form = document.getElementById(`replyForm_${cmtId}`);
  const quoteArea = document.getElementById(`quoteContext_${cmtId}`);
  
  // Tìm thẻ chứa nội dung dựa trên cmtId vừa bấm
  const sourceElement = document.getElementById(`text-${cmtId}`);
  const sourceText = sourceElement ? sourceElement.innerText.trim() : "";

  if (form) {
    if (form.style.display === "none") {
      // Đóng tất cả các form đang mở khác cho đỡ rối
      document.querySelectorAll('.reply-form').forEach(f => f.style.display = 'none');
      
      // BƠM NỘI DUNG TRÍCH DẪN VÀO ĐÚNG KHUNG CỦA FORM ĐANG MỞ
      if (quoteArea) {
        quoteArea.innerHTML = `
          <div class="reply-quote-box" style="background: rgba(108, 92, 231, 0.08); border-left: 4px solid #6c5ce7; padding: 10px; margin-bottom: 10px; border-radius: 6px;">
            <span class="quote-user-name" style="font-weight: bold; color: #6c5ce7; display: block; font-size: 11px;">@${userName}</span>
            <div class="quote-text-content" style="font-style: italic; color: #555; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              "${sourceText}"
            </div>
          </div>
        `;
      }
      
      form.style.display = "block";
      const textarea = form.querySelector('textarea');
      if (textarea) textarea.focus();
    } else {
      form.style.display = "none";
      if (quoteArea) quoteArea.innerHTML = "";
    }
  }
};

window.closeReplyForm = (id) => {
  const f = document.getElementById(`replyForm_${id}`);
  const q = document.getElementById(`quoteContext_${id}`);
  if (f) f.style.display = "none";
  if (q) q.innerHTML = ""; // Xóa nội dung khi đóng cho sạch
};
async function submitComment() {
  const input = document.getElementById("commentInput");
  const text = input?.value.trim();
  if (!text) { toast.warn("Vui lòng nhập nội dung bình luận"); return; }
  if (!currentDocId) return;

  const btn = document.getElementById("postCommentBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Đang đăng…"; }

  try {
    await addComment({
      docId: currentDocId, parentId: null, text,
      userId: anonUser.id, userName: anonUser.name,
      userColor: anonUser.color, userAvatar: anonUser.avatar,
    });
    await updateCommentCount(currentDocId, 1);
    input.value = "";
    toast.success("Bình luận đã được đăng ✓");
    
    await addNotification({
      type: "new_comment", title: "Bình luận mới",
      body: `${anonUser.name} đã bình luận`, docId: currentDocId,
    }).catch(() => {});
  } catch (e) {
    toast.error("Lỗi ✗", e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "💬 Đăng bình luận"; }
  }
}
window.submitComment = submitComment;
// 3:18
async function submitReply(currentCmtId, docId, firebaseParentId) {
  const input = document.getElementById(`replyInput_${currentCmtId}`);
  const quoteArea = document.getElementById(`quoteContext_${currentCmtId}`);
  let text = input?.value.trim();

  if (!text) {
    toast.warn("Vui lòng nhập nội dung phản hồi");
    return;
  }

  // Lấy text trích dẫn đang hiển thị trong UI (nếu có)
  const quoteTextElement = quoteArea?.querySelector('.quote-text-content'); // Thêm class này vào toggleReplyForm bên dưới
  const quoteUserElement = quoteArea?.querySelector('.quote-user-name');
  
  if (quoteTextElement && quoteUserElement) {
    const qUser = quoteUserElement.innerText.replace('@', '');
    const qText = quoteTextElement.innerText.replace(/"/g, '');
    // Đóng gói trích dẫn vào nội dung theo định dạng riêng
    text = `[[quote]]${qUser}|${qText}[[endquote]]\n${text}`;
  }

  const btn = document.getElementById(`replyBtn_${currentCmtId}`);
  if (btn) { btn.disabled = true; btn.textContent = "Đang gửi..."; }

  try {
    await addComment({
      docId,
      parentId: firebaseParentId, // Vẫn giữ cấu trúc 2 tầng (cha - con)
      text: text, 
      userId: anonUser.id,
      userName: anonUser.name,
      userColor: anonUser.color,
      userAvatar: anonUser.avatar,
      createdAt: Date.now()
    });

    await updateCommentCount(docId, 1);
    input.value = "";
    closeReplyForm(currentCmtId);
    toast.success("Đã gửi phản hồi!");
  } catch (e) {
    toast.error("Lỗi gửi phản hồi: " + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Gửi"; }
  }
}

// 3:18
window.submitReply = submitReply;
//cuối viết lại
// comment

function toggleReplyForm(parentId, docId) {
  const form = document.getElementById(`replyForm_${parentId}`);
  if (!form) return;
  const isVisible = form.style.display !== "none";
  // Đóng tất cả reply forms khác
  document.querySelectorAll(".reply-form").forEach(f => f.style.display = "none");
  form.style.display = isVisible ? "none" : "block";
  if (!isVisible) form.querySelector("textarea")?.focus();
}
window.toggleReplyForm = toggleReplyForm;

function closeReplyForm(parentId) {
  const f = document.getElementById(`replyForm_${parentId}`);
  if (f) { f.style.display = "none"; const i = f.querySelector("textarea"); if(i) i.value = ""; }
}
window.closeReplyForm = closeReplyForm;

function toggleReplies(parentId) {
  const container = document.getElementById(`replies_${parentId}`);
  if (!container) return;
  const hidden = container.style.display === "none";
  container.style.display = hidden ? "block" : "none";
}
window.toggleReplies = toggleReplies;

async function likeCmt(cmtId, btn) {
  const liked = await toggleCommentLike(cmtId);
  btn.classList.toggle("liked", liked);
  // Update count optimistically
  const countEl = btn.querySelector("span");
  if (countEl) {
    const cur = parseInt(countEl.textContent) || 0;
    countEl.textContent = liked ? cur + 1 : Math.max(0, cur - 1);
  }
}
window.likeCmt = likeCmt;

// ── SHARE MODAL ───────────────────────────────────────────────
let _shareDocId = null, _shareTitle = "";

function openShareModal(docId, title) {
  _shareDocId  = docId;
  _shareTitle  = title;
  const url    = window.location.origin + window.location.pathname + "?doc=" + docId;
  const encUrl = encodeURIComponent(url);
  const encT   = encodeURIComponent(title + " — DocVault");

  document.getElementById("shareUrlInput").value = url;
  document.getElementById("shareTwitter").href   =
    `https://twitter.com/intent/tweet?text=${encT}&url=${encUrl}`;
  document.getElementById("shareFacebook").href  =
    `https://www.facebook.com/sharer/sharer.php?u=${encUrl}`;
  document.getElementById("shareLinkedin").href  =
    `https://www.linkedin.com/sharing/share-offsite/?url=${encUrl}`;

  document.getElementById("shareModalOverlay").classList.add("open");
}
window.openShareModal = openShareModal;

function closeShareModal() {
  document.getElementById("shareModalOverlay").classList.remove("open");
}
window.closeShareModal = closeShareModal;

function setupShareModal() {
  document.getElementById("shareModalOverlay").addEventListener("click", e => {
    if (e.target === document.getElementById("shareModalOverlay")) closeShareModal();
  });
}

async function copyShareUrl() {
  const val = document.getElementById("shareUrlInput").value;
  await copyToClipboard(val);
  toast.success("Đã copy link! 🔗");
  closeShareModal();
}
window.copyShareUrl = copyShareUrl;

// ── NOTIFICATIONS ─────────────────────────────────────────────
function setupNotifBell() {
  const bell = document.getElementById("notifBell");
  bell.addEventListener("click", e => {
    e.stopPropagation();
    bell.classList.toggle("open");
  });
  document.addEventListener("click", () => {
    document.getElementById("notifBell").classList.remove("open");
  });
}

function renderNotifications(notifs) {
  const list  = document.getElementById("notifList");
  const badge = document.getElementById("notifBadge");
  const unread = notifs.filter(n => !n.read).length;

  badge.textContent    = unread > 9 ? "9+" : unread;
  badge.style.display  = unread > 0 ? "flex" : "none";

  if (notifs.length === 0) {
    list.innerHTML = `<div class="notif-empty">Không có thông báo</div>`;
    return;
  }

  list.innerHTML = notifs.slice(0, 15).map(n => `
    <div class="notif-item ${n.read?"":"unread"}" onclick="clickNotif('${n.id}','${n.docId||''}')">
      <div class="notif-item-title">${escHtml(n.title||"Thông báo")}</div>
      ${n.body ? `<div style="font-size:12px;color:var(--muted);margin-top:2px">${escHtml(n.body)}</div>` : ""}
      <div class="notif-item-time">${timeAgo(n.createdAt)}</div>
    </div>`).join("");
}

function clickNotif(id, docId) {
  markNotifRead(id).catch(() => {});
  if (docId) openDetail(docId);
  document.getElementById("notifBell").classList.remove("open");
}
window.clickNotif = clickNotif;

function markAllNotifsRead() {
  document.querySelectorAll(".notif-item.unread").forEach(el => el.classList.remove("unread"));
  document.getElementById("notifBadge").style.display = "none";
  // Firebase: không cần mass update, chỉ update UI
  toast.info("Đã đọc tất cả thông báo");
}
window.markAllNotifsRead = markAllNotifsRead;

// ── FAB ───────────────────────────────────────────────────────
function toggleFab() {
  fabOpen = !fabOpen;
  document.getElementById("fabMain").classList.toggle("open", fabOpen);
  document.getElementById("fabMenu").classList.toggle("open", fabOpen);
}
window.toggleFab = toggleFab;
function openFeedback() {
  if (typeof toggleFab === "function") toggleFab(); // Đóng menu nếu đang mở
  
  const modal = document.getElementById('feedbackModal');
  const input = document.getElementById('fbInput');
  
  modal.classList.add('active');
  input.focus();
}
function closeFeedback() {
  const modal = document.getElementById('feedbackModal');
  modal.classList.remove('active');
}
async function processFeedback() {
  const name = document.getElementById('fbName').value.trim();
  const email = document.getElementById('fbEmail').value.trim();
  const phone = document.getElementById('fbPhone').value.trim();
  const msg = document.getElementById('fbInput').value.trim();
  const btn = document.getElementById('btnSendFb');

  if (!msg || !name) {
    toast.warn("Vui lòng nhập tên và nội dung góp ý!");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Đang gửi...";

  try {
    await addNotification({
      type: "feedback",
      title: `Góp ý từ ${name}`,
      body: msg,
      userContact: { name, email, phone }, // Thêm metadata liên lạc
      createdAt: Date.now(),
      status: "unread"
    });

    toast.success("Cảm ơn góp ý của bạn! 🙏");
    // Reset form
    document.getElementById('fbName').value = "";
    document.getElementById('fbEmail').value = "";
    document.getElementById('fbPhone').value = "";
    document.getElementById('fbInput').value = "";
    closeFeedback();
    
    // Nếu có hàm rung chuông ở admin (thông qua realtime)
    if (typeof refreshAdminNotif === "function") refreshAdminNotif();
  } catch (e) {
    toast.error("Lỗi gửi góp ý!");
  } finally {
    btn.disabled = false;
    btn.textContent = "Gửi góp ý";
  }
}
// Gán lại hàm vào window
window.openFeedback = openFeedback;
window.closeFeedback = closeFeedback;
window.processFeedback = processFeedback;

// ── Search ────────────────────────────────────────────────────
function setupSearch() {
  const input = document.getElementById("heroSearch");
  const debouncedSearch = debounce((val) => {
    searchQ = val;
    renderGrid();
    if (val) document.getElementById("siteBody").scrollIntoView({ behavior: "smooth" });
  }, 280);

  input.addEventListener("input",  e => debouncedSearch(e.target.value.trim()));
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") { debouncedSearch.cancel?.(); searchQ = e.target.value.trim(); renderGrid(); }
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

function formatCommentText(rawText) {
  if (!rawText.includes("[[quote]]")) return escHtml(rawText);

  // Tách phần quote và phần nội dung thực
  const quoteMatch = rawText.match(/\[\[quote\]\](.*)\|(.*)\[\[endquote\]\]/);
  if (quoteMatch) {
    const user = quoteMatch[1];
    const text = quoteMatch[2];
    const mainContent = rawText.split("[[endquote]]\n")[1] || "";

    return `
      <div class="rendered-quote" style="background: #f8f9fa; border-left: 3px solid #dee2e6; padding: 5px 10px; margin-bottom: 8px; border-radius: 4px; font-size: 12px; color: #666;">
        <b style="color: #6c5ce7;">@${escHtml(user)}</b>: <i>${escHtml(text)}</i>
      </div>
      <div>${escHtml(mainContent)}</div>
    `;
  }
  return escHtml(rawText);
}

// TRONG HÀM commentItemHTML và subReplyHTML, hãy sửa chỗ hiển thị text:
// Thay vì: ${escHtml(cmt.text)}
// Hãy dùng: ${formatCommentText(cmt.text)}

// Cấu hình Tag cố định bạn muốn lọc
const FIXED_TAG = "thong-dung"; 

async function loadCommonDocs() {
    const navList = document.getElementById("docs-nav-list");
    const contentArea = document.getElementById("docs-content-area");

    try {
        // Truy vấn: Lấy document có chứa tag cố định trong mảng tags
        // Lưu ý: Trường 'tags' trong Firebase nên là Array để dùng 'array-contains'
        // Nếu 'tags' là String, ta sẽ lấy hết về rồi lọc bằng JS .filter()
        const q = query(collection(db, "documents"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        
        const allData = [];
        snapshot.forEach(doc => allData.push({ id: doc.id, ...doc.data() }));

        // Lọc dữ liệu theo tag cố định (không phân biệt hoa thường)
        const filteredDocs = allData.filter(doc => {
            const tags = doc.tags ? doc.tags.toLowerCase() : "";
            return tags.includes(FIXED_TAG.toLowerCase());
        });

        if (filteredDocs.length === 0) {
            contentArea.innerHTML = `<div class="empty">Không có tài liệu nào thuộc mục "${FIXED_TAG}"</div>`;
            return;
        }

        // 1. Render Menu Sidebar (Cố định bên trái)
        navList.innerHTML = filteredDocs.map((doc, index) => `
            <li>
                <a href="#quick-${doc.id}" class="nav-link ${index === 0 ? 'active' : ''}">
                    ${doc.title}
                </a>
            </li>
        `).join("");

        // 2. Render Blocks Nội dung (Bên phải)
        contentArea.innerHTML = filteredDocs.map(doc => `
            <article class="doc-block" id="quick-${doc.id}">
                <div class="doc-header">
                    <h3 class="doc-title">${doc.title}</h3>
                    <p class="doc-desc">${doc.desc || "Mô tả đang cập nhật..."}</p>
                    
                    <div class="doc-meta">
                        <div class="meta-info">
                            <span class="author">👤 ${doc.author || 'Admin'}</span>
                            <span class="tags">${doc.tags}</span>
                        </div>
                        <div class="stats">
                            <span>👁️ ${doc.views || 0}</span>
                            <span>👍 ${doc.likes || 0}</span>
                            <span>👎 ${doc.dislikes || 0}</span>
                            <span>💬 ${doc.commentsCount || 0}</span>
                        </div>
                    </div>
                </div>

                <div class="code-tabs">
                    <div class="tab-header">
                        <button class="t-btn active" onclick="switchTab(event, 'html-${doc.id}')">HTML</button>
                        <button class="t-btn" onclick="switchTab(event, 'css-${doc.id}')">CSS</button>
                        <button class="t-btn" onclick="switchTab(event, 'js-${doc.id}')">JS</button>
                        <button class="copy-btn" onclick="copyCode('${doc.id}')">📋 Copy</button>
                    </div>
                    <div class="tab-body">
                        <pre id="html-${doc.id}" class="code-panel active"><code>${escHtml(doc.html || '')}</code></pre>
                        <pre id="css-${doc.id}" class="code-panel"><code>${escHtml(doc.css || '')}</code></pre>
                        <pre id="js-${doc.id}" class="code-panel"><code>${escHtml(doc.js || '')}</code></pre>
                    </div>
                </div>
            </article>
        `).join("");

        // Kích hoạt ScrollSpy sau khi render
        initScrollSpy();

    } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
    }
}