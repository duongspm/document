// ============================================================
//  shared/utils.js  —  Tiện ích dùng chung
// ============================================================

// 1. Sửa escHtml để an toàn tuyệt đối với thuộc tính HTML (onclick)
export function escHtml(s) {
  if (!s) return "";
  return s.replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;"); // Cực kỳ quan trọng cho các chuỗi trong onclick
}

export function parseTags(tags) {
  return (tags || "").split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
}

export function formatDate(ts) {
  if (!ts?.seconds) return "";
  return new Date(ts.seconds * 1000).toLocaleDateString("vi-VN");
}
export function formatDates(ts) {
    // 1. Kiểm tra nếu không có dữ liệu
    if (!ts) return "---";

    let date;

    // 2. Nếu là Firestore ts Object (có .seconds)
    if (ts.seconds) {
        date = new Date(ts.seconds * 1000);
    } 
    // 3. Nếu là số miligiây (Date.now()) hoặc chuỗi ISO
    else {
        date = new Date(ts);
    }

    // 4. Kiểm tra xem sau khi convert có hợp lệ không
    if (isNaN(date.getTime())) {
        return "N/A"; // Trả về N/A nếu vẫn Invalid
    }

    // 5. Trả về định dạng: 16:30:05 - 27/03/2026
    return date.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour12: false
    });
}

export function formatDateTime(ts) {
  if (!ts?.seconds) return "";
  const d = new Date(ts.seconds * 1000);
  return d.toLocaleDateString("vi-VN") + " " + d.toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"});
}

export function getAnonUser() {
  let u = JSON.parse(localStorage.getItem("dv_user") || "null");
  if (!u) {
    const adj = ["Nhanh","Vui","Thông","Sáng","Cool","Pro","Happy","Swift","Lazy","Wise"];
    const nou = ["Coder","Maker","Dev","Ninja","Wizard","Hacker","Builder","Tiger","Fox","Geek"];
    const a = adj[Math.floor(Math.random()*adj.length)];
    const n = nou[Math.floor(Math.random()*nou.length)];
    const num = Math.floor(Math.random()*900)+100;
    u = {
      id:     "anon_" + Math.random().toString(36).slice(2,10),
      name:   `${a}${n}${num}`,
      avatar: (a[0]+n[0]).toUpperCase(),
      color:  `hsl(${Math.floor(Math.random()*360)},60%,60%)`,
    };
    localStorage.setItem("dv_user", JSON.stringify(u));
  }
  return u;
}

// 2. Sửa renderMarkdown để không bị lỗi thẻ <p> trống
export function renderMarkdown(text) {
  if (!text) return "<em style='color:var(--muted,#888)'>Không có nội dung</em>";
  
  let h = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    // Xử lý Code block trước để không bị dính các replace phía sau
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, l, c) => `<pre><code class="lang-${l}">${c.trim()}</code></pre>`)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/~~(.+?)~~/g, "<del>$1</del>")
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>\s*)+/g, m => `<ul>${m}</ul>`)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/^---$/gm, "<hr>");

  // Tách đoạn văn thông minh hơn: Chỉ bọc <p> cho những dòng không phải thẻ block
  return h.split(/\n\n+/).map(p => {
    if (p.trim().startsWith("<")) return p; // Nếu đã là thẻ HTML block thì giữ nguyên
    return `<p>${p.replaceAll("\n", "<br>")}</p>`;
  }).join("");
}
// 3. Sửa timeAgo tránh số âm
export function timeAgo(ts) {
  if (!ts?.seconds) return "vừa xong";
  const diff = Math.max(0, (Date.now() - ts.seconds * 1000) / 1000);
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return Math.floor(diff / 60) + " phút trước";
  if (diff < 86400) return Math.floor(diff / 3600) + " giờ trước";
  if (diff < 2592000) return Math.floor(diff / 86400) + " ngày trước";
  return formatDate(ts);
}

// 4. Sửa copyToClipboard để trả về kết quả chuẩn cho async/await
export async function copyToClipboard(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    throw new Error(); 
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "absolute";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    const success = document.execCommand("copy");
    document.body.removeChild(el);
    return success;
  }
}
export const TYPE_META = {
  guide:     { icon:"📖", cls:"guide",     label:"Hướng dẫn"  },
  api:       { icon:"⚡", cls:"api",       label:"API"         },
  tutorial:  { icon:"🎯", cls:"tutorial",  label:"Tutorial"    },
  component: { icon:"🧩", cls:"component", label:"Component"   },
  snippet:   { icon:"✂️", cls:"snippet",   label:"Snippet"     },
  release:   { icon:"🚀", cls:"release",   label:"Release"     },
  design:    { icon:"🎨", cls:"design",    label:"Design"      },
};

export function getTypeMeta(type) {
  return TYPE_META[type] || { icon:"📄", cls:"guide", label: type||"Khác" };
}

export function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}


export function buildSrcdoc(html="", css="", js="") {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*,*::before,*::after{box-sizing:border-box}body{margin:0;padding:16px;font-family:system-ui,sans-serif}${css}</style>
</head><body>${html}<script>try{${js}}catch(e){console.error(e)}<\/script></body></html>`;
}

export function slugify(text) {
  return (text || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}