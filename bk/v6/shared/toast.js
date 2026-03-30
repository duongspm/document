// ============================================================
//  shared/toast.js  —  Toast notification system (dùng chung)
//  Gọi: toast.success("msg") | toast.error("msg") | toast.info("msg") | toast.warn("msg")
// ============================================================

// Inject CSS 1 lần duy nhất
const TOAST_CSS = `
.dv-toast-stack {
  position: fixed; bottom: 24px; right: 24px;
  display: flex; flex-direction: column-reverse; gap: 10px;
  z-index: 9999; pointer-events: none;
}
.dv-toast {
  display: flex; align-items: center; gap: 10px;
  padding: 13px 18px; border-radius: 12px;
  font-family: 'DM Sans', sans-serif; font-size: 13.5px;
  min-width: 260px; max-width: 380px;
  box-shadow: 0 8px 32px rgba(0,0,0,.5);
  pointer-events: all; cursor: default;
  border: 1px solid transparent;
  animation: dvToastIn .35s cubic-bezier(.34,1.56,.64,1) both;
  position: relative; overflow: hidden;
}
.dv-toast.closing { animation: dvToastOut .25s ease forwards; }

/* Progress bar */
.dv-toast::after {
  content: ''; position: absolute;
  bottom: 0; left: 0; height: 3px;
  background: currentColor; opacity: .3;
  animation: dvToastProg linear forwards;
}

.dv-toast-icon { font-size: 18px; flex-shrink: 0; }
.dv-toast-body { flex: 1; }
.dv-toast-title { font-weight: 600; margin-bottom: 1px; }
.dv-toast-msg   { opacity: .8; font-size: 12.5px; }
.dv-toast-close {
  background: none; border: none; cursor: pointer;
  color: inherit; opacity: .5; font-size: 16px; padding: 0 0 0 4px;
  flex-shrink: 0; line-height: 1;
}
.dv-toast-close:hover { opacity: 1; }

/* Variants */
.dv-toast.success { background: #0d2b1e; border-color: rgba(85,239,196,.3); color: #55efc4; }
.dv-toast.error   { background: #2b0d0d; border-color: rgba(255,118,117,.3); color: #ff7675; }
.dv-toast.info    { background: #0d1a2b; border-color: rgba(116,185,255,.3); color: #74b9ff; }
.dv-toast.warn    { background: #2b2009; border-color: rgba(253,203,110,.3); color: #fdcb6e; }

@keyframes dvToastIn {
  from { opacity: 0; transform: translateX(40px) scale(.9); }
  to   { opacity: 1; transform: translateX(0)    scale(1);  }
}
@keyframes dvToastOut {
  to { opacity: 0; transform: translateX(40px); max-height: 0; padding: 0; margin: 0; }
}
@keyframes dvToastProg {
  from { width: 100%; }
  to   { width: 0%; }
}
`;

// Inject styles
(function injectStyles() {
    if (document.getElementById("dv-toast-styles")) return;
    const st = document.createElement("style");
    st.id = "dv-toast-styles";
    st.textContent = TOAST_CSS;
    document.head.appendChild(st);
})();

// Get or create stack container
function getStack() {
    let stack = document.getElementById("dv-toast-stack");
    if (!stack) {
        stack = document.createElement("div");
        stack.id = "dv-toast-stack";
        stack.className = "dv-toast-stack";
        document.body.appendChild(stack);
    }
    return stack;
}

const ICONS = { success: "✓", error: "✕", info: "ℹ", warn: "⚠" };
const DURATIONS = { success: 3000, error: 4500, info: 3500, warn: 4000 };

/**
 * Hiển thị toast
 * @param {string} type - "success"|"error"|"info"|"warn"
 * @param {string} title - Tiêu đề ngắn
 * @param {string} [msg] - Mô tả thêm (tùy chọn)
 * @param {number} [duration] - ms (mặc định theo type)
 */
function show(type, title, msg = "", duration) {
    const stack = getStack();
    const dur = duration || DURATIONS[type] || 3000;

    const el = document.createElement("div");
    el.className = `dv-toast ${type}`;
    el.style.setProperty("--dur", dur + "ms");
    el.innerHTML = `
    <span class="dv-toast-icon">${ICONS[type]}</span>
    <div class="dv-toast-body">
      <div class="dv-toast-title">${title}</div>
      ${msg ? `<div class="dv-toast-msg">${msg}</div>` : ""}
    </div>
    <button class="dv-toast-close" onclick="this.closest('.dv-toast').remove()">✕</button>
  `;

    // Progress bar duration
    el.style.cssText += `--dur:${dur}ms`;
    const after = el.querySelector ? null : null; // handled via CSS var

    stack.appendChild(el);

    // Auto remove
    const timer = setTimeout(() => {
        el.classList.add("closing");
        setTimeout(() => el.remove(), 250);
    }, dur);

    // Click to dismiss early
    el.addEventListener("click", () => {
        clearTimeout(timer);
        el.classList.add("closing");
        setTimeout(() => el.remove(), 250);
    });

    return el;
}

// Public API
export const toast = {
    success: (title, msg, dur) => show("success", title, msg, dur),
    error: (title, msg, dur) => show("error", title, msg, dur),
    info: (title, msg, dur) => show("info", title, msg, dur),
    warn: (title, msg, dur) => show("warn", title, msg, dur),
    // Shorthand dùng cho các nơi chỉ pass 1 string
    show,
};