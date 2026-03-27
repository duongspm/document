// ============================================================
//  shared/utils.js  —  Utilities dùng chung
// ============================================================

// Escape HTML
export function escHtml(s) {
    return (s || "")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Parse tags từ string "a, b, c" → ["a","b","c"]
export function parseTags(tags) {
    return (tags || "").split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
}

// Format timestamp Firestore → string
export function formatDate(ts, opts = {}) {
    if (!ts?.seconds) return "—";
    const d = new Date(ts.seconds * 1000);
    return d.toLocaleDateString("vi-VN", opts);
}

export function formatDateTime(ts) {
    if (!ts?.seconds) return "—";
    const d = new Date(ts.seconds * 1000);
    return d.toLocaleDateString("vi-VN") + " " + d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export function timeAgo(ts) {
    if (!ts?.seconds) return "vừa xong";
    const diff = (Date.now() - ts.seconds * 1000) / 1000;
    if (diff < 60) return "vừa xong";
    if (diff < 3600) return Math.floor(diff / 60) + " phút trước";
    if (diff < 86400) return Math.floor(diff / 3600) + " giờ trước";
    if (diff < 2592000) return Math.floor(diff / 86400) + " ngày trước";
    return formatDate(ts);
}

// Tạo anonymous username từ localStorage
export function getAnonUser() {
    let user = JSON.parse(localStorage.getItem("dv_user") || "null");
    if (!user) {
        const adjectives = ["Nhanh", "Vui", "Thông", "Sáng", "Mạnh", "Cool", "Pro", "Lazy", "Happy", "Swift"];
        const nouns = ["Coder", "Maker", "Dev", "Ninja", "Wizard", "Hacker", "Geek", "Builder", "Tiger", "Fox"];
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const nou = nouns[Math.floor(Math.random() * nouns.length)];
        const num = Math.floor(Math.random() * 900) + 100;
        user = {
            id: "anon_" + Math.random().toString(36).slice(2, 10),
            name: `${adj}${nou}${num}`,
            avatar: adj[0] + nou[0],
            color: `hsl(${Math.floor(Math.random() * 360)},60%,60%)`,
        };
        localStorage.setItem("dv_user", JSON.stringify(user));
    }
    return user;
}

// Markdown renderer (shared)
export function renderMarkdown(text) {
    if (!text) return "<em style='color:var(--muted,#888)'>Không có nội dung</em>";
    let html = text
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
            `<pre><code class="lang-${lang}">${code.trim()}</code></pre>`)
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/^### (.+)$/gm, "<h3>$1</h3>")
        .replace(/^## (.+)$/gm, "<h2>$1</h2>")
        .replace(/^# (.+)$/gm, "<h1>$1</h1>")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
        .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
        .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
        .replace(/(<li>[\s\S]*?<\/li>\s*)+/g, m => `<ul>${m}</ul>`)
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
        .replace(/^---$/gm, "<hr>")
        .replace(/\n\n/g, "</p><p>");
    return "<p>" + html + "</p>";
}

// TYPE metadata (dùng chung admin + client)
export const TYPE_META = {
    guide: { icon: "📖", cls: "guide", label: "Hướng dẫn" },
    api: { icon: "⚡", cls: "api", label: "API" },
    tutorial: { icon: "🎯", cls: "tutorial", label: "Tutorial" },
    component: { icon: "🧩", cls: "component", label: "Component" },
    snippet: { icon: "✂️", cls: "snippet", label: "Snippet" },
    release: { icon: "🚀", cls: "release", label: "Release" },
    design: { icon: "🎨", cls: "design", label: "Design" },
};

export function getTypeMeta(type) {
    return TYPE_META[type] || { icon: "📄", cls: "guide", label: type || "Khác" };
}

// Modal confirm
export function confirmDialog(msg) {
    return confirm(msg);
}

// Debounce
export function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// Copy to clipboard
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        const el = document.createElement("textarea");
        el.value = text;
        el.style.position = "fixed"; el.style.opacity = "0";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        el.remove();
        return true;
    }
}

// Build iframe srcdoc from code parts
export function buildSrcdoc(html = "", css = "", js = "") {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; }
    ${css}
  </style>
</head>
<body>
  ${html}
  <script>
    try { ${js} } catch(e) { console.error(e); }
  <\/script>
</body>
</html>`;
}