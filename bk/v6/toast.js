// ============================================================
//  shared/toast.js  —  Toast system dùng chung
// ============================================================
const CSS = `
.dv-toasts{position:fixed;bottom:24px;right:24px;display:flex;flex-direction:column-reverse;gap:10px;z-index:99999;pointer-events:none}
.dv-toast{display:flex;align-items:flex-start;gap:10px;padding:13px 16px;border-radius:12px;
  font-family:'DM Sans',sans-serif;font-size:13.5px;min-width:260px;max-width:380px;
  box-shadow:0 8px 32px rgba(0,0,0,.5);pointer-events:all;cursor:pointer;border:1px solid transparent;
  animation:dvIn .35s cubic-bezier(.34,1.56,.64,1) both;position:relative;overflow:hidden}
.dv-toast.out{animation:dvOut .25s ease forwards}
.dv-toast::before{content:'';position:absolute;bottom:0;left:0;height:3px;background:currentColor;opacity:.25;
  animation:dvBar var(--dur,3s) linear forwards}
.dv-ti{font-size:17px;flex-shrink:0;line-height:1}
.dv-tb{flex:1}.dv-tt{font-weight:600;margin-bottom:2px}.dv-tm{font-size:12px;opacity:.75}
.dv-tc{background:none;border:none;cursor:pointer;color:inherit;opacity:.5;font-size:15px;padding:0;flex-shrink:0;line-height:1}
.dv-tc:hover{opacity:1}
.dv-toast.success{background:#0a2218;border-color:rgba(85,239,196,.35);color:#55efc4}
.dv-toast.error  {background:#220a0a;border-color:rgba(255,118,117,.35);color:#ff7675}
.dv-toast.info   {background:#0a1422;border-color:rgba(116,185,255,.35);color:#74b9ff}
.dv-toast.warn   {background:#221a0a;border-color:rgba(253,203,110,.35);color:#fdcb6e}
@keyframes dvIn {from{opacity:0;transform:translateX(40px) scale(.9)}to{opacity:1;transform:none}}
@keyframes dvOut{to{opacity:0;transform:translateX(40px);max-height:0;padding:0;margin:0}}
@keyframes dvBar {from{width:100%}to{width:0}}
`;

(function(){
  if (document.getElementById("dv-toast-css")) return;
  const s = document.createElement("style");
  s.id = "dv-toast-css"; s.textContent = CSS;
  document.head.appendChild(s);
})();

function getStack() {
  let el = document.getElementById("dv-toasts");
  if (!el) { el = document.createElement("div"); el.id="dv-toasts"; el.className="dv-toasts"; document.body.appendChild(el); }
  return el;
}

const ICONS = { success:"✓", error:"✕", info:"ℹ", warn:"⚠" };
const DUR   = { success:3000, error:4500, info:3500, warn:4000 };

function show(type, title, msg="", dur) {
  const d = dur || DUR[type] || 3000;
  const el = document.createElement("div");
  el.className = `dv-toast ${type}`;
  el.style.setProperty("--dur", d + "ms");
  el.innerHTML = `
    <span class="dv-ti">${ICONS[type]}</span>
    <div class="dv-tb">
      <div class="dv-tt">${title}</div>
      ${msg ? `<div class="dv-tm">${msg}</div>` : ""}
    </div>
    <button class="dv-tc" onclick="this.closest('.dv-toast').remove()">✕</button>`;

  getStack().appendChild(el);

  const timer = setTimeout(() => {
    el.classList.add("out");
    setTimeout(() => el.remove(), 260);
  }, d);

  el.addEventListener("click", () => { clearTimeout(timer); el.classList.add("out"); setTimeout(() => el.remove(), 260); });
  return el;
}

export const toast = {
  success: (t, m, d) => show("success", t, m, d),
  error:   (t, m, d) => show("error",   t, m, d),
  info:    (t, m, d) => show("info",    t, m, d),
  warn:    (t, m, d) => show("warn",    t, m, d),
};