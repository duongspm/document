/* ============================================================
   DOCVAULT — data.js
   Quản lý trạng thái, localStorage, dữ liệu mẫu
   ============================================================ */

// ── App State ──────────────────────────────────────────────
let docs     = JSON.parse(localStorage.getItem('docvault_docs')     || '[]');
let settings = JSON.parse(localStorage.getItem('docvault_settings') || '{}');

let currentPage   = 'home';
let currentFilter = 'all';
let currentViewId = null;
let previousPage  = 'home';
let searchQuery   = '';

// ── Persistence ────────────────────────────────────────────
function saveDocs()     { localStorage.setItem('docvault_docs',     JSON.stringify(docs)); }
function saveSettings() { localStorage.setItem('docvault_settings', JSON.stringify(settings)); }

// ── Helpers ────────────────────────────────────────────────
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function escHtml(s) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function typeLabel(t) {
  const map = { guide:'Hướng dẫn', api:'API', tutorial:'Tutorial', release:'Release', design:'Design' };
  return map[t] || t;
}

// ── Seed demo data (only on first launch) ──────────────────
function seedDemoData() {
  if (docs.length > 0) return;

  docs = [
    {
      id: genId(),
      createdAt: Date.now() - 86400000 * 3,
      title: 'Hướng dẫn cài đặt dự án',
      type: 'guide',
      desc: 'Các bước cài đặt và chạy dự án từ đầu',
      author: 'Admin',
      favorite: true,
      tags: 'setup, install, guide',
      content: `## Giới thiệu

Đây là hướng dẫn cài đặt dự án từ đầu.

## Yêu cầu hệ thống

- Node.js >= 18
- npm >= 9
- Git

## Các bước cài đặt

1. Clone repository
2. Chạy \`npm install\`
3. Cấu hình file \`.env\`
4. Chạy \`npm run dev\`

## Lưu ý

> Đảm bảo đã cài đặt Node.js trước khi bắt đầu.

Nếu gặp lỗi, kiểm tra lại phiên bản Node.js.`
    },
    {
      id: genId(),
      createdAt: Date.now() - 86400000 * 2,
      title: 'API Authentication',
      type: 'api',
      desc: 'Tài liệu xác thực API sử dụng JWT token',
      author: 'Dev Team',
      favorite: false,
      tags: 'api, jwt, auth',
      content: `## Authentication API

Tất cả requests cần header xác thực.

### Headers

\`\`\`
Authorization: Bearer <token>
Content-Type: application/json
\`\`\`

### Login Endpoint

\`\`\`
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "secret"
}
\`\`\`

### Response

\`\`\`
{
  "token": "eyJhbGci...",
  "expiresIn": 3600
}
\`\`\``
    },
    {
      id: genId(),
      createdAt: Date.now() - 86400000,
      title: 'Xây dựng Component React',
      type: 'tutorial',
      desc: 'Tutorial từng bước tạo component React tái sử dụng',
      author: 'Admin',
      favorite: false,
      tags: 'react, component, tutorial',
      content: `## Tạo Button Component

Trong tutorial này, chúng ta sẽ xây dựng một Button component tái sử dụng.

### Bước 1: Tạo file

\`\`\`jsx
// Button.jsx
function Button({ children, variant = 'primary' }) {
  return (
    <button className={\`btn btn-\${variant}\`}>
      {children}
    </button>
  );
}
\`\`\`

### Bước 2: Thêm styles

Thêm CSS vào file \`Button.css\`.

### Bước 3: Export

Export component để sử dụng ở nơi khác.`
    },
    {
      id: genId(),
      createdAt: Date.now() - 86400000 * 5,
      title: 'Release Notes v2.0',
      type: 'release',
      desc: 'Những thay đổi và tính năng mới trong phiên bản 2.0',
      author: 'Release Team',
      favorite: false,
      tags: 'release, changelog, v2',
      content: `## Release Notes — v2.0.0

### Tính năng mới

- **Dashboard mới**: Giao diện tổng quan được thiết kế lại hoàn toàn
- **Dark mode**: Hỗ trợ chế độ tối
- **API v2**: Endpoints mới hiệu suất cao hơn 3x

### Sửa lỗi

- Sửa lỗi scroll trên mobile
- Cải thiện thời gian tải trang
- Fix memory leak trong component list

### Breaking Changes

> Xem migration guide trước khi nâng cấp từ v1.x

- \`getUserData()\` đổi tên thành \`fetchUser()\`
- Endpoint \`/api/v1/*\` sẽ bị xoá vào 2025-01-01`
    },
    {
      id: genId(),
      createdAt: Date.now() - 86400000 * 4,
      title: 'Design System Guide',
      type: 'design',
      desc: 'Hướng dẫn sử dụng design system và component library',
      author: 'Design Team',
      favorite: true,
      tags: 'design, ui, components, tokens',
      content: `## Design System

Hệ thống thiết kế giúp đảm bảo tính nhất quán trên toàn ứng dụng.

## Color Tokens

\`\`\`css
--color-primary:   #7c6fff;
--color-secondary: #ff6fb0;
--color-success:   #6fffc8;
--color-warning:   #ffb86f;
\`\`\`

## Typography

- **Display**: Syne 800 — dùng cho tiêu đề lớn
- **Body**: DM Sans 400 — dùng cho nội dung thông thường
- **Code**: Fira Code — dùng cho code snippets

## Spacing Scale

Sử dụng bội số của 4px: 4, 8, 12, 16, 24, 32, 48, 64...

## Components

- Button (Primary, Ghost, Danger)
- Card
- Modal
- Toast
- Badge`
    },
  ];

  saveDocs();
}
