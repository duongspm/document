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
} from "../shared/firebase.js";
import { toast }                                     from "../shared/toast.js";
import { escHtml, parseTags, formatDate, timeAgo,
         getAnonUser, renderMarkdown, getTypeMeta,
         debounce, copyToClipboard, buildSrcdoc }     from "../shared/utils.js";

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
  <div class="detail-demo" style="margin:0 32px 20px">
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
      <button class="dd-copy" onclick="ddCopy(${JSON.stringify(doc.codeHtml||'')})">📋 Copy HTML</button>
    </div>
    <div class="dd-pane" id="dd-css">
      <pre class="dd-code">${c || "/* Không có CSS */"}</pre>
      <button class="dd-copy" onclick="ddCopy(${JSON.stringify(doc.codeCss||'')})">📋 Copy CSS</button>
    </div>
    <div class="dd-pane" id="dd-js">
      <pre class="dd-code">${j || "// Không có JS"}</pre>
      <button class="dd-copy" onclick="ddCopy(${JSON.stringify(doc.codeJs||'')})">📋 Copy JS</button>
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

async function ddCopy(text) {
  const ok = await copyToClipboard(text);
  if (ok) toast.success("Đã copy! 📋");
  else    toast.error("Không thể copy");
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

// Submit comment chính
async function submitComment() {
  const input = document.getElementById("commentInput");
  const text  = input?.value.trim();
  if (!text) { toast.warn("Vui lòng nhập nội dung bình luận"); return; }
  if (!currentDocId) return;

  const btn = document.getElementById("postCommentBtn");
  btn.disabled = true; btn.textContent = "Đang đăng…";

  try {
    await addComment({
      docId:    currentDocId,
      parentId: null,
      text,
      userId:   anonUser.id,
      userName: anonUser.name,
      userColor: anonUser.color,
      userAvatar: anonUser.avatar,
    });
    await updateCommentCount(currentDocId, 1);
    input.value = "";
    toast.success("Bình luận đã được đăng ✓");

    // Gửi notification
    await addNotification({
      type:    "new_comment",
      title:   "Bình luận mới",
      body:    `${anonUser.name} đã bình luận`,
      docId:   currentDocId,
    }).catch(() => {});
  } catch (e) {
    toast.error("Lỗi ✗", "Không thể đăng bình luận: " + e.message);
  } finally {
    btn.disabled = false; btn.textContent = "💬 Đăng bình luận";
  }
}
window.submitComment = submitComment;

// Submit reply
async function submitReply(parentId, docId) {
  const input = document.getElementById(`replyInput_${parentId}`);
  const text  = input?.value.trim();
  if (!text) { toast.warn("Vui lòng nhập nội dung phản hồi"); return; }

  const btn = document.getElementById(`replyBtn_${parentId}`);
  if (btn) { btn.disabled = true; btn.textContent = "Đang gửi…"; }

  try {
    await addComment({
      docId,
      parentId,
      text,
      userId:    anonUser.id,
      userName:  anonUser.name,
      userColor: anonUser.color,
      userAvatar: anonUser.avatar,
    });
    await updateCommentCount(docId, 1);
    input.value = "";
    closeReplyForm(parentId);
    toast.success("Đã phản hồi ✓");

    // Notification cho chủ thread
    await addNotification({
      type:    "reply",
      title:   "Có người phản hồi bình luận",
      body:    `${anonUser.name} đã phản hồi`,
      docId,   parentId,
    }).catch(() => {});
  } catch (e) {
    toast.error("Lỗi", e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Phản hồi"; }
  }
}
window.submitReply = submitReply;

// Realtime comment listener
function startCommentListener(docId) {
  if (commentUnsub) commentUnsub();
  commentUnsub = listenComments(docId, comments => {
    renderComments(comments, docId);
    // Cập nhật badge số lượng
    const badge = document.getElementById("commentCountBadge");
    if (badge) badge.textContent = comments.length;
  });
}

// Render toàn bộ comments (threaded)
function renderComments(comments, docId) {
  const list    = document.getElementById("commentsList");
  if (!list) return;

  const roots   = comments.filter(c => !c.parentId);
  const replies = comments.filter(c =>  c.parentId);

  if (roots.length === 0) {
    list.innerHTML = `<div class="no-comments">Chưa có bình luận nào. Hãy là người đầu tiên! 🎉</div>`;
    return;
  }

  list.innerHTML = roots.map(c => {
    const childReplies = replies.filter(r => r.parentId === c.id);
    return commentItemHTML(c, docId, childReplies, replies);
  }).join("");
}

function commentItemHTML(cmt, docId, directReplies = [], allReplies = []) {
  const liked   = getCommentLiked(cmt.id);
  const replyCount = countAllReplies(cmt.id, allReplies);

  return `
  <div class="comment-item" id="cmt-${cmt.id}">
    <div class="comment-header">
      <div class="comment-avatar" style="background:${cmt.userColor||'#6c5ce7'};width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;flex-shrink:0">
        ${escHtml(cmt.userAvatar||cmt.userName?.slice(0,2)||"?")}
      </div>
      <span style="font-size:13px;font-weight:600">${escHtml(cmt.userName||"Ẩn danh")}</span>
      ${cmt.flagged ? `<span class="flagged-badge">⚠ Bị gắn cờ</span>` : ""}
      <span class="cmt-time">${timeAgo(cmt.createdAt)}</span>
    </div>
    <div class="comment-body-text">${escHtml(cmt.text)}</div>
    <div class="comment-actions">
      <button class="cmt-action-btn ${liked?"liked":""}" onclick="likeCmt('${cmt.id}',this)">
        👍 <span>${cmt.likes||0}</span>
      </button>
      <button class="cmt-action-btn" onclick="toggleReplyForm('${cmt.id}','${docId}')">
        💬 Phản hồi
      </button>
      ${replyCount > 0 ? `<button class="show-replies-btn" onclick="toggleReplies('${cmt.id}')">
        ${replyCount} phản hồi ▾
      </button>` : ""}
    </div>

    <!-- Reply form (ẩn mặc định) -->
    <div class="reply-form" id="replyForm_${cmt.id}" style="display:none">
      <textarea class="reply-input" id="replyInput_${cmt.id}"
        placeholder="Phản hồi ${escHtml(cmt.userName)}…" rows="2" maxlength="1000"></textarea>
      <div class="reply-form-actions">
        <button class="btn-reply-cancel" onclick="closeReplyForm('${cmt.id}')">Huỷ</button>
        <button class="btn-reply-submit" id="replyBtn_${cmt.id}"
          onclick="submitReply('${cmt.id}','${docId}')">Phản hồi</button>
      </div>
    </div>

    <!-- Replies (ẩn mặc định nếu có nhiều) -->
    ${directReplies.length > 0 ? `
    <div class="replies-container" id="replies_${cmt.id}" style="${directReplies.length > 2 ? "display:none" : ""}">
      ${directReplies.map(r => replyItemHTML(r, docId, cmt.id)).join("")}
    </div>` : ""}
  </div>`;
}

function replyItemHTML(cmt, docId, parentId) {
  const liked = getCommentLiked(cmt.id);
  return `
  <div class="comment-item" id="cmt-${cmt.id}" style="padding:10px 0">
    <div class="comment-header">
      <div class="comment-avatar" style="background:${cmt.userColor||'#6c5ce7'};width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:white;flex-shrink:0">
        ${escHtml(cmt.userAvatar||cmt.userName?.slice(0,2)||"?")}
      </div>
      <span style="font-size:12.5px;font-weight:600">${escHtml(cmt.userName||"Ẩn danh")}</span>
      <span class="cmt-time">${timeAgo(cmt.createdAt)}</span>
    </div>
    <div class="comment-body-text" style="font-size:13px">${escHtml(cmt.text)}</div>
    <div class="comment-actions">
      <button class="cmt-action-btn ${liked?"liked":""}" onclick="likeCmt('${cmt.id}',this)">
        👍 <span>${cmt.likes||0}</span>
      </button>
      <button class="cmt-action-btn" onclick="toggleReplyForm('${parentId}','${docId}')">
        💬 Phản hồi
      </button>
    </div>
  </div>`;
}

function countAllReplies(cmtId, allReplies) {
  return allReplies.filter(r => r.parentId === cmtId).length;
}

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
  toggleFab();
  const msg = prompt("💬 Góp ý của bạn về DocVault:");
  if (msg?.trim()) {
    addNotification({
      type:  "feedback",
      title: "Góp ý từ người dùng",
      body:  msg.trim().slice(0, 300),
    }).catch(() => {});
    toast.success("Cảm ơn góp ý của bạn! 🙏");
  }
}
window.openFeedback = openFeedback;

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