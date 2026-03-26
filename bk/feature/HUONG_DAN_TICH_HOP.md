# 📋 HƯỚNG DẪN TÍCH HỢP TỪNG BƯỚC
# DocVault — Thêm chức năng mới vào source code cũ
# ==============================================================

## CẤU TRÚC FILE SAU KHI TÍCH HỢP
```
docvault2/
├── shared/
│   ├── firebase.js     ← Đã có + cần thêm (Feature 2, 3)
│   └── auth.js         ← TẠO MỚI (Feature 1)
├── admin/
│   ├── index.html      ← Sửa (Feature 5)
│   ├── admin.css       ← Sửa (Feature 4, 5)
│   └── admin.js        ← Sửa (Feature 4, 5)
└── client/
    ├── client.html     ← Sửa (Feature 1, 6)
    ├── client.css      ← Sửa (Feature 1, 2, 3, 4, 6, 7)
    └── client.js       ← Sửa (Feature 1, 2, 3, 4, 6, 7)
```

---

## ═══════════════════════════════════════════════
## BƯỚC 1: Firebase Console — Bật Authentication
## ═══════════════════════════════════════════════
1. Mở https://console.firebase.google.com
2. Chọn project "my-creative-blog"
3. Authentication → Get Started
4. Sign-in method → Email/Password → Enable → Save
5. Firestore → Rules, thêm rules sau:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Documents: đọc công khai, ghi cần đăng nhập
    match /documents/{docId} {
      allow read: true;
      allow write: if request.auth != null;
      
      // Comments subcollection
      match /comments/{cmtId} {
        allow read: if resource.data.approved == true;
        allow create: if request.auth != null;
        allow update, delete: if request.auth.token.email == 'YOUR_ADMIN_EMAIL@gmail.com';
      }
    }
  }
}
```
⚠ Thay YOUR_ADMIN_EMAIL bằng email admin của bạn!

---

## ═══════════════════════════════════════════════
## BƯỚC 2: Tạo file shared/auth.js
## ═══════════════════════════════════════════════
📁 Mở file: feature-1-auth.html
→ Copy nội dung file shared/auth.js đã tạo
→ Lưu vào: docvault2/shared/auth.js

---

## ═══════════════════════════════════════════════
## BƯỚC 3: Cập nhật shared/firebase.js
## ═══════════════════════════════════════════════
📁 Mở: docvault2/shared/firebase.js
Tìm dòng import đầu tiên, SỬA thành:

```javascript
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, doc,
         addDoc, updateDoc, deleteDoc, getDoc,
         getDocs, query, orderBy, onSnapshot,
         serverTimestamp, where,
         arrayUnion, arrayRemove, increment }    // ← THÊM 3 cái này
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
```

Sau đó mở: feature-2-reactions.html
→ Copy phần "PHẦN A" (firebase-additions) → dán vào CUỐI shared/firebase.js

Mở: feature-3-comments.html
→ Copy phần "PHẦN A" (firebase-comments) → dán vào CUỐI shared/firebase.js

---

## ═══════════════════════════════════════════════
## BƯỚC 4: Cập nhật client/client.html
## ═══════════════════════════════════════════════
📁 Mở: docvault2/client/client.html

### 4a. Thêm data-theme vào <body>:
Tìm: <body>
Đổi thành: <body data-theme="dark">

### 4b. Thêm nút Login vào header:
Tìm: <a href="index.html" target="_blank" class="admin-link">Admin ↗</a>
Thêm TRƯỚC dòng đó code từ feature-1-auth.html phần "HEADER BUTTON"

### 4c. Thêm nút Dark Mode:
Tìm: <button class="hamburger-client" id="mobileMenuBtn">☰</button>
Thêm TRƯỚC dòng đó:
<button class="theme-toggle-btn" id="themeToggleBtn" onclick="manualToggleTheme()">
  <span id="themeIcon">🌙</span>
</button>

### 4d. Thêm các Modal/Toast trước </body>:
Thêm theo thứ tự:
1. AUTH MODAL (từ feature-1-auth.html phần "PHẦN B")
2. TOAST CONTAINER + CONFIRM MODAL (từ feature-4-toast-modal.html phần "PHẦN A")
3. THEME TOAST (từ feature-6-7-darkmode-related.html)

Kết quả trước </body>:
```html
  <!-- Auth modal -->
  <div class="auth-overlay" id="authOverlay" ...>...</div>
  
  <!-- Toast + Confirm -->
  <div id="toastContainer" class="toast-container"></div>
  <div class="confirm-overlay" id="confirmOverlay">...</div>
  
  <!-- Theme notification -->
  <div id="themeToastFixed" class="theme-toast-fixed" style="display:none">...</div>

  <script type="module" src="client.js"></script>
</body>
```

---

## ═══════════════════════════════════════════════
## BƯỚC 5: Cập nhật client/client.css
## ═══════════════════════════════════════════════
📁 Mở: docvault2/client/client.css
Thêm vào CUỐI FILE theo thứ tự:

1. CSS từ feature-1-auth.html      (thẻ <style id="auth-css-preview">)
2. CSS từ feature-2-reactions.html (thẻ <style id="reaction-css">)
3. CSS từ feature-3-comments.html  (thẻ <style id="comment-css">)
4. CSS từ feature-4-toast-modal.html (thẻ <style id="toast-css">)
5. CSS từ feature-6-7-darkmode-related.html (thẻ <style id="darkmode-css"> và <style id="related-css">)

---

## ═══════════════════════════════════════════════
## BƯỚC 6: Cập nhật client/client.js
## ═══════════════════════════════════════════════
📁 Mở: docvault2/client/client.js

### 6a. SỬA phần import ở ĐẦU FILE:
```javascript
// THAY THẾ dòng import cũ bằng:
import { listenDocuments, getDocument,
         toggleLike, toggleDislike, incrementView,
         addComment, listenComments }
  from "../shared/firebase.js";

import { loginUser, registerUser, logoutUser,
         onAuthChange, currentUser }
  from "../shared/auth.js";
```

### 6b. SỬA hàm DOMContentLoaded:
Tìm:
```javascript
document.addEventListener("DOMContentLoaded", () => {
  setupSearch();
  setupScrollHeader();
  setupMobileMenu();
  setupOverlayClose();
  listenDocuments(docs => { ...
```
Thêm initTheme() vào:
```javascript
document.addEventListener("DOMContentLoaded", () => {
  initTheme();          // ← THÊM DÒNG NÀY
  setupSearch();
  setupScrollHeader();
  setupMobileMenu();
  setupOverlayClose();
  listenDocuments(docs => { ...
```

### 6c. SỬA hàm openDetail():
Tìm đoạn cuối của openDetail() sau scroll.innerHTML:
```javascript
  // Inject iframe after render
  if (doc.hasCode) setTimeout(() => injectDetailFrame(doc), 80);
```
Đổi thành:
```javascript
  // Inject iframe after render
  if (doc.hasCode) setTimeout(() => injectDetailFrame(doc), 80);
  renderReactionBar(doc);           // Feature 2: Like/Dislike
  incrementView(doc.id).catch(()=>{}); // Feature 2: View count
  renderRelatedDocs(doc);           // Feature 7: Related posts
  loadComments(doc.id);             // Feature 3: Comments
```

### 6d. SỬA hàm closeDetail():
Tìm:
```javascript
function closeDetail() {
  document.getElementById("detailOverlay").classList.remove("open");
  document.body.style.overflow = "";
}
```
Đổi thành:
```javascript
function closeDetail() {
  if (_commentUnsubscribe) { _commentUnsubscribe(); _commentUnsubscribe = null; }
  document.getElementById("detailOverlay").classList.remove("open");
  document.body.style.overflow = "";
}
```

### 6e. XOÁ hoặc thay thế hàm showFloatToast cũ:
Tìm hàm showFloatToast() cũ → XOÁ nó (sẽ dùng showToast mới)

### 6f. Thêm JS các chức năng vào CUỐI FILE:
Thêm theo thứ tự:
1. JS từ feature-1-auth.html      (<script id="auth-js-preview">)
2. JS từ feature-2-reactions.html (<script id="reaction-js">)
3. JS từ feature-3-comments.html  (<script id="comment-js">)
4. JS từ feature-4-toast-modal.html (<script id="toast-js">)
5. JS từ feature-6-7-darkmode-related.html (<script id="darkmode-js"> và <script id="related-js">)

---

## ═══════════════════════════════════════════════
## BƯỚC 7: Cập nhật admin/index.html
## ═══════════════════════════════════════════════
📁 Mở: docvault2/admin/index.html

### 7a. Thêm nav item bình luận:
Từ feature-5-admin-comments.html phần "PHẦN A1"
Tìm: <div class="nav-section-label" style="margin-top:20px">Liên kết</div>
Thêm TRƯỚC dòng đó.

### 7b. Thêm page section bình luận:
Từ feature-5-admin-comments.html phần "PHẦN A2"
Tìm: </main>
Thêm TRƯỚC dòng đó.

### 7c. Thêm Toast + Confirm vào trước </body>:
Từ feature-4-toast-modal.html phần "PHẦN A"

---

## ═══════════════════════════════════════════════
## BƯỚC 8: Cập nhật admin/admin.css
## ═══════════════════════════════════════════════
Thêm vào CUỐI FILE:
1. CSS từ feature-4-toast-modal.html (<style id="toast-css">)
2. CSS từ feature-5-admin-comments.html (<style id="cmt-admin-css">)

---

## ═══════════════════════════════════════════════
## BƯỚC 9: Cập nhật admin/admin.js
## ═══════════════════════════════════════════════
📁 Mở: docvault2/admin/admin.js

### 9a. Thêm vào import đầu file:
```javascript
// Thêm vào import firebase.js hiện tại:
import { ..., listenAllComments, approveComment,
         deleteComment, flagComment }
  from "../shared/firebase.js";

// Thêm import mới:
import { onAuthChange, currentUser } from "../shared/auth.js";
```

### 9b. SỬA hàm showPage() — thêm case "comments":
Tìm: if (name === "documents")  renderDocuments();
Thêm SAU: if (name === "comments")  loadAllDocComments();

### 9c. Thêm JS vào CUỐI FILE:
1. JS từ feature-4-toast-modal.html (<script id="toast-js">)
   → Thay thế hàm toast() cũ
2. JS từ feature-5-admin-comments.html (<script id="cmt-admin-js">)

---

## KIỂM TRA SAU KHI TÍCH HỢP
- [ ] Mở browser console, không có lỗi import
- [ ] Firebase connected (badge xanh ở topbar)
- [ ] Đăng ký tài khoản thành công
- [ ] Đăng nhập, thấy user chip ở header
- [ ] Mở tài liệu → reaction bar xuất hiện
- [ ] Thích một bài → số tăng
- [ ] Viết bình luận → toast "chờ phê duyệt"
- [ ] Admin → trang Comments → thấy bình luận chờ duyệt
- [ ] Duyệt bình luận → xuất hiện trên client
- [ ] 18:00 hoặc trước 7:00 → tự chuyển dark mode
- [ ] Bài viết liên quan xuất hiện ở cuối
