/* ============================================================
   DOCVAULT — app.js
   UI logic: navigation, rendering, events, settings
   ============================================================ */

// ── Apply saved settings on load ───────────────────────────
function applySettings() {
  if (settings.accentColor) {
    document.documentElement.style.setProperty('--accent', settings.accentColor);
    document.documentElement.style.setProperty('--glow',   settings.accentColor + '40');
  }
  if (settings.adminName) {
    document.getElementById('adminName').textContent          = settings.adminName;
    document.getElementById('settingAdminName').value         = settings.adminName;
  }
  if (settings.siteDesc) {
    document.getElementById('settingSiteDesc').value          = settings.siteDesc;
  }
  if (settings.shimmer === false) {
    document.getElementById('featuredCard').classList.remove('shimmer');
    document.getElementById('toggleShimmer').classList.remove('on');
  }
  if (settings.animation === false) {
    document.getElementById('toggleAnim').classList.remove('on');
  }
  if (settings.hover === false) {
    document.getElementById('toggleHover').classList.remove('on');
  }
}

// ============================================================
// NAVIGATION
// ============================================================
function showPage(page) {
  previousPage = currentPage;
  currentPage  = page;

  // Hide all pages
  document.querySelectorAll('[id^="page-"]').forEach(p => {
    p.style.display = 'none';
    p.classList.remove('active');
  });

  // Deactivate all nav items
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  if (page === 'view') {
    const el = document.getElementById('page-view');
    el.classList.add('active');
    el.style.display = 'block';
  } else {
    const el  = document.getElementById('page-' + page);
    const nav = document.getElementById('nav-'  + page);
    if (el)  el.style.display  = 'block';
    if (nav) nav.classList.add('active');
    renderPage(page);
  }

  // Close sidebar on mobile
  if (window.innerWidth <= 768) closeSidebar();
}

function filterByType(type) {
  currentFilter = type;
  showPage('docs');
  // Sync filter tabs
  document.querySelectorAll('.filter-tab').forEach(tab => {
    const matches = tab.textContent.toLowerCase().includes(typeLabel(type).toLowerCase())
                 || (type === 'all' && tab.textContent.trim() === 'Tất cả');
    tab.classList.toggle('active', matches);
  });
}

function goBack() {
  showPage(previousPage === 'view' ? 'home' : previousPage);
}

// ============================================================
// RENDER DISPATCHER
// ============================================================
function renderPage(page) {
  updateBadges();
  const map = {
    home:      renderHome,
    docs:      renderDocs,
    favorites: renderFavorites,
    recent:    renderRecent,
    settings:  renderSettings,
  };
  if (map[page]) map[page]();
}

// ============================================================
// RENDER — HOME
// ============================================================
function renderHome() {
  const sorted = [...docs].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);
  const now    = new Date();

  // Stats
  document.getElementById('statTotal').textContent  = docs.length;
  document.getElementById('statFav').textContent    = docs.filter(d => d.favorite).length;
  document.getElementById('statRecent').textContent = docs.filter(d => {
    const d2 = new Date(d.createdAt);
    return d2.getMonth() === now.getMonth() && d2.getFullYear() === now.getFullYear();
  }).length;

  // Featured card
  if (sorted.length > 0) {
    const latest = sorted[0];
    document.getElementById('featuredTitle').textContent = latest.title;
    document.getElementById('featuredDesc').textContent  = latest.desc || 'Xem chi tiết tài liệu này.';
  }

  // Grid
  const grid = document.getElementById('homeDocsGrid');
  if (sorted.length === 0) {
    grid.innerHTML = emptyHTML('📭', 'Chưa có tài liệu', 'Bấm "Thêm tài liệu" để bắt đầu');
  } else {
    grid.innerHTML = sorted.map(docCard).join('');
    animateCards(grid);
  }
}

// ============================================================
// RENDER — ALL DOCS
// ============================================================
function renderDocs() {
  let filtered = currentFilter === 'all' ? docs : docs.filter(d => d.type === currentFilter);

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(d =>
      d.title.toLowerCase().includes(q) ||
      (d.desc  || '').toLowerCase().includes(q) ||
      (d.tags  || '').toLowerCase().includes(q)
    );
  }

  const sorted = [...filtered].sort((a, b) => b.createdAt - a.createdAt);
  const label  = currentFilter === 'all' ? 'Tất cả' : typeLabel(currentFilter);

  document.getElementById('docsSectionTitle').textContent = label;
  document.getElementById('docsSubtitle').textContent =
    `${sorted.length} tài liệu${searchQuery ? ` (tìm: "${searchQuery}")` : ''}`;

  const grid = document.getElementById('allDocsGrid');
  if (sorted.length === 0) {
    grid.innerHTML = emptyHTML(
      searchQuery ? '🔍' : '📭',
      searchQuery ? 'Không tìm thấy kết quả' : 'Chưa có tài liệu',
      searchQuery ? 'Thử từ khoá khác'        : 'Bấm "Thêm tài liệu" để tạo mới'
    );
  } else {
    grid.innerHTML = sorted.map(docCard).join('');
    animateCards(grid);
  }
}

// ============================================================
// RENDER — FAVORITES
// ============================================================
function renderFavorites() {
  const favs  = docs.filter(d => d.favorite).sort((a, b) => b.createdAt - a.createdAt);
  const grid  = document.getElementById('favDocsGrid');
  if (favs.length === 0) {
    grid.innerHTML = emptyHTML('⭐', 'Chưa có tài liệu yêu thích', 'Bấm ⭐ trên tài liệu để thêm vào đây');
  } else {
    grid.innerHTML = favs.map(docCard).join('');
    animateCards(grid);
  }
}

// ============================================================
// RENDER — RECENT
// ============================================================
function renderRecent() {
  const sorted = [...docs]
    .sort((a, b) => (b.viewedAt || b.createdAt) - (a.viewedAt || a.createdAt))
    .slice(0, 12);
  const grid = document.getElementById('recentDocsGrid');
  if (sorted.length === 0) {
    grid.innerHTML = emptyHTML('🕐', 'Chưa có hoạt động', 'Xem tài liệu để chúng xuất hiện ở đây');
  } else {
    grid.innerHTML = sorted.map(docCard).join('');
    animateCards(grid);
  }
}

// ============================================================
// RENDER — SETTINGS
// ============================================================
function renderSettings() {
  // Highlight active colour swatch
  document.querySelectorAll('.color-swatch').forEach(s => {
    s.classList.toggle('active', s.style.background === (settings.accentColor || '#7c6fff'));
  });
}

// ============================================================
// RENDER — BADGE COUNTS
// ============================================================
function updateBadges() {
  const types = ['guide', 'api', 'tutorial', 'release', 'design'];
  document.getElementById('badge-docs').textContent      = docs.length;
  document.getElementById('badge-favorites').textContent = docs.filter(d => d.favorite).length;
  types.forEach(t => {
    document.getElementById('badge-' + t).textContent = docs.filter(d => d.type === t).length;
  });
}

// ============================================================
// HELPERS — card HTML, empty state, animations
// ============================================================
const TYPE_NAMES = { guide:'Hướng dẫn', api:'API', tutorial:'Tutorial', release:'Release Notes', design:'Design' };
const TYPE_ICONS = { guide:'📖', api:'⚡', tutorial:'🎯', release:'🚀', design:'🎨' };

function docCard(doc) {
  const icon = TYPE_ICONS[doc.type] || '📄';
  const name = TYPE_NAMES[doc.type] || doc.type;
  const date = new Date(doc.createdAt).toLocaleDateString('vi-VN');
  const desc = (doc.desc || '').slice(0, 80) + ((doc.desc || '').length > 80 ? '…' : '');

  return `
    <div class="doc-card" onclick="viewDoc('${doc.id}')">
      <div class="doc-card-preview preview-${doc.type}"></div>
      <div class="doc-card-body">
        <span class="doc-type-badge type-${doc.type}">${icon} ${name}</span>
        <div class="doc-title">${escHtml(doc.title)}</div>
        <div class="doc-desc">${escHtml(desc)}</div>
        <div class="doc-meta">
          <span>${date}</span>
          ${doc.author ? `<span class="doc-meta-dot">·</span><span>${escHtml(doc.author)}</span>` : ''}
          ${doc.favorite ? `<span class="doc-meta-dot">·</span><span>⭐</span>` : ''}
        </div>
        <div class="doc-actions">
          <button class="doc-action-btn primary" onclick="event.stopPropagation();viewDoc('${doc.id}')">👁 Xem</button>
          <button class="doc-action-btn"         onclick="event.stopPropagation();editDoc('${doc.id}')">✏️ Sửa</button>
          <button class="doc-action-btn"         onclick="event.stopPropagation();toggleFav('${doc.id}')">${doc.favorite ? '⭐' : '☆'}</button>
          <button class="doc-action-btn" style="color:#ff6b6b" onclick="event.stopPropagation();deleteDoc('${doc.id}')">🗑️</button>
        </div>
      </div>
    </div>`;
}

function emptyHTML(icon, title, desc) {
  return `
    <div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon">${icon}</div>
      <div class="empty-title">${title}</div>
      <div class="empty-desc">${desc}</div>
    </div>`;
}

function animateCards(grid) {
  if (settings.animation === false) return;
  grid.querySelectorAll('.doc-card').forEach((c, i) => {
    c.style.animationDelay = (i * 0.05) + 's';
  });
}

// ============================================================
// DOC VIEW (detail page)
// ============================================================
function viewDoc(id) {
  const doc = docs.find(d => d.id === id);
  if (!doc) return;
  currentViewId = id;

  // Update last-viewed timestamp
  doc.viewedAt = Date.now();
  saveDocs();

  const icon  = TYPE_ICONS[doc.type] || '📄';
  const name  = TYPE_NAMES[doc.type] || doc.type;
  const bgMap = {
    guide:    'rgba(124,111,255,0.15)',
    api:      'rgba(255,111,176,0.15)',
    tutorial: 'rgba(111,255,200,0.15)',
    release:  'rgba(255,184,111,0.15)',
    design:   'rgba(111,200,255,0.15)',
  };

  document.getElementById('viewIcon').textContent          = icon;
  document.getElementById('viewIcon').style.background     = bgMap[doc.type] || 'var(--surface2)';
  document.getElementById('viewBadge').innerHTML           = `<span class="doc-type-badge type-${doc.type}">${icon} ${name}</span>`;
  document.getElementById('viewTitle').textContent         = doc.title;
  document.getElementById('viewType').textContent          = '';
  document.getElementById('viewDate').textContent          = '📅 ' + new Date(doc.createdAt).toLocaleDateString('vi-VN');
  document.getElementById('viewAuthor').textContent        = doc.author ? '👤 ' + doc.author : '';
  document.getElementById('viewFavBtn').textContent        = doc.favorite ? '⭐ Bỏ yêu thích' : '☆ Yêu thích';
  document.getElementById('viewBody').innerHTML            = renderMarkdown(doc.content || '*Không có nội dung*');

  showPage('view');
}

// ── Lightweight Markdown → HTML parser ─────────────────────
function renderMarkdown(text) {
  if (!text) return '<p><em>Không có nội dung</em></p>';

  let html = text
    // Escape HTML first
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Code blocks (must be before inline code)
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2>$1</h2>')
    .replace(/^# (.+)$/gm,   '<h2>$1</h2>')
    // Bold & italic
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g,     '<em>$1</em>')
    // Blockquote
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // List items (unordered + ordered)
    .replace(/^[-*] (.+)$/gm,    '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm,   '<li>$1</li>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:var(--accent)">$1</a>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--border);margin:20px 0">')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>.*?<\/li>\s*)+/gs, m => `<ul>${m}</ul>`);

  return '<p>' + html + '</p>';
}

// ============================================================
// CRUD OPERATIONS
// ============================================================
function openAddModal() {
  document.getElementById('editId').value    = '';
  document.getElementById('modalTitle').textContent = '📝 Thêm tài liệu mới';
  document.getElementById('docTitle').value   = '';
  document.getElementById('docDesc').value    = '';
  document.getElementById('docAuthor').value  = settings.adminName || '';
  document.getElementById('docContent').value = '';
  document.getElementById('docTags').value    = '';
  document.getElementById('docType').value    = 'guide';
  openModal();
}

function editDoc(id) {
  const doc = docs.find(d => d.id === id);
  if (!doc) return;
  document.getElementById('editId').value    = id;
  document.getElementById('modalTitle').textContent = '✏️ Chỉnh sửa tài liệu';
  document.getElementById('docTitle').value   = doc.title;
  document.getElementById('docDesc').value    = doc.desc    || '';
  document.getElementById('docAuthor').value  = doc.author  || '';
  document.getElementById('docContent').value = doc.content || '';
  document.getElementById('docTags').value    = doc.tags    || '';
  document.getElementById('docType').value    = doc.type;
  openModal();
}

function editCurrentDoc() {
  if (currentViewId) editDoc(currentViewId);
}

function saveDoc() {
  const id    = document.getElementById('editId').value;
  const title = document.getElementById('docTitle').value.trim();
  if (!title) { showToast('⚠️ Vui lòng nhập tiêu đề', 'error'); return; }

  const data = {
    title,
    type:    document.getElementById('docType').value,
    desc:    document.getElementById('docDesc').value.trim(),
    author:  document.getElementById('docAuthor').value.trim(),
    content: document.getElementById('docContent').value.trim(),
    tags:    document.getElementById('docTags').value.trim(),
  };

  if (id) {
    const idx = docs.findIndex(d => d.id === id);
    if (idx >= 0) docs[idx] = { ...docs[idx], ...data };
    showToast('✅ Đã cập nhật tài liệu', 'success');
  } else {
    docs.push({ ...data, id: genId(), createdAt: Date.now(), favorite: false });
    showToast('✅ Đã thêm tài liệu', 'success');
  }

  saveDocs();
  closeModal();
  renderPage(currentPage);
  updateBadges();
}

function deleteDoc(id) {
  if (!confirm('Xoá tài liệu này?')) return;
  docs = docs.filter(d => d.id !== id);
  saveDocs();
  showToast('🗑️ Đã xoá tài liệu', 'success');
  renderPage(currentPage);
  updateBadges();
}

function deleteCurrentDoc() {
  deleteDoc(currentViewId);
  showPage('docs');
}

function toggleFav(id) {
  const doc = docs.find(d => d.id === id);
  if (!doc) return;
  doc.favorite = !doc.favorite;
  saveDocs();
  renderPage(currentPage);
  updateBadges();
}

function toggleFavFromView() {
  if (!currentViewId) return;
  toggleFav(currentViewId);
  const doc = docs.find(d => d.id === currentViewId);
  document.getElementById('viewFavBtn').textContent = doc?.favorite ? '⭐ Bỏ yêu thích' : '☆ Yêu thích';
  showToast(doc?.favorite ? '⭐ Đã thêm vào yêu thích' : '✓ Đã bỏ yêu thích', 'success');
}

// ============================================================
// MODAL
// ============================================================
function openModal() {
  document.getElementById('docModal').classList.add('open');
  setTimeout(() => document.getElementById('docTitle').focus(), 100);
}

function closeModal() {
  document.getElementById('docModal').classList.remove('open');
}

// Close modal on backdrop click
document.getElementById('docModal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// ============================================================
// SEARCH
// ============================================================
function handleSearch(val) {
  searchQuery = val.trim();
  if (currentPage !== 'docs') showPage('docs');
  else renderDocs();
}

// ── Filter tab click ────────────────────────────────────────
function setFilter(type, el) {
  currentFilter = type;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderDocs();
}

// ============================================================
// SIDEBAR (mobile toggle)
// ============================================================
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}

// ============================================================
// SETTINGS
// ============================================================
function saveProfile() {
  settings.adminName = document.getElementById('settingAdminName').value.trim() || 'Admin';
  settings.siteDesc  = document.getElementById('settingSiteDesc').value.trim();
  document.getElementById('adminName').textContent = settings.adminName;
  saveSettings();
  showToast('✅ Đã lưu hồ sơ', 'success');
}

function setAccent(color, light, el) {
  document.documentElement.style.setProperty('--accent', color);
  settings.accentColor = color;
  settings.accentLight = light;
  saveSettings();
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
  showToast('🎨 Đã đổi màu chủ đề', 'success');
}

function toggleSetting(key, btn) {
  btn.classList.toggle('on');
  settings[key] = btn.classList.contains('on');

  if (key === 'shimmer') {
    document.getElementById('featuredCard').classList.toggle('shimmer', settings[key]);
  }
  if (key === 'hover') {
    // Toggle hover lift effect dynamically via a class on body
    document.body.classList.toggle('no-hover', !settings[key]);
  }

  saveSettings();
}

// ── Data export / import ────────────────────────────────────
function exportData() {
  const blob = new Blob([JSON.stringify({ docs, settings }, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'docvault-backup.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('📦 Đã xuất dữ liệu', 'success');
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (data.docs)     docs     = data.docs;
      if (data.settings) settings = data.settings;
      saveDocs();
      saveSettings();
      applySettings();
      renderPage(currentPage);
      updateBadges();
      showToast('✅ Đã nhập dữ liệu thành công', 'success');
    } catch {
      showToast('❌ File không hợp lệ', 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function clearAll() {
  if (!confirm('Xoá TOÀN BỘ tài liệu? Không thể hoàn tác!')) return;
  docs = [];
  saveDocs();
  renderPage(currentPage);
  updateBadges();
  showToast('🗑️ Đã xoá tất cả dữ liệu', 'success');
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const el        = document.createElement('div');
  el.className    = `toast ${type}`;
  el.innerHTML    = `<span>${msg}</span>`;
  container.appendChild(el);

  setTimeout(() => {
    el.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, 2800);
}

// ============================================================
// INIT
// ============================================================
applySettings();
seedDemoData();
showPage('home');
