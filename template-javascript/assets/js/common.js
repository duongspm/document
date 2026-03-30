/* ------------------------------
    Inview Animation
------------------------------ */
function initializeInview() {
    const targets = document.querySelectorAll('.inview');
    if (targets.length === 0) return;

    const options = {
        root: null,
        rootMargin: '0% 0px', // -50% 0px ==> center of viewport
        threshold: 0.2 // Execute when the element is 20% displayed
    };

    const addClass = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-view');
                observer.unobserve(entry.target);
            }
        });
    };

    const observer = new IntersectionObserver(addClass, options);

    targets.forEach(target => {
        observer.observe(target);
    });
}

/* ------------------------------
    Pagetop
------------------------------ */
function initializePageTop() {
    const pageTop = document.querySelector('#pagetop');

    if (!pageTop) {
        return;
    }

    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY;

        if (scrolled >= 400) {
            pageTop.classList.add('is-show');
        } else {
            pageTop.classList.remove('is-show');
        }
    }, { passive: true });

    pageTop.addEventListener('click', (e) => {
        e.preventDefault();

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

/* ------------------------------
    Component: Back To Top Link
------------------------------ */
function initBackToTopComponent() {
    const btnTop = document.getElementById('js-scroll-top');
    const siteFooter = document.querySelector('footer');

    if (!btnTop) return;

    const onScrollWindow = () => {
        const currScroll = window.scrollY;
        const winH = window.innerHeight;
        const docH = document.documentElement.scrollHeight;
        const footerH = siteFooter ? siteFooter.offsetHeight : 0;
        const scrollBottomPos = winH + currScroll;

        // 1. Logic hiển thị nút (sau 300px)
        if (currScroll > 300) {
            btnTop.classList.add('is-active');
        } else {
            btnTop.classList.remove('is-active');
        }

        // 2. Logic Sticky tránh Footer
        if (docH - scrollBottomPos <= footerH) {
            btnTop.classList.add('is-at-footer');
            btnTop.style.setProperty('--footer-offset', footerH + 'px');
        } else {
            btnTop.classList.remove('is-at-footer');
        }
    };

    // Lắng nghe sự kiện cuộn với passive mode
    window.addEventListener('scroll', onScrollWindow, { passive: true });

    // Sự kiện click cuộn lên
    btnTop.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}


/* ------------------------------
    Anchorlink
------------------------------ */
function initializeAnchorLinks() {
    const anchorLinks = document.querySelectorAll('a[href^="#"]');

    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');

            if (targetId === '#') {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
                return;
            }

            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

/* ------------------------------
    Menu Active
------------------------------ */
function initializeMenuActive() {
    const currentPath = window.location.pathname;
    const menuLinks = document.querySelectorAll('.menu-list a');

    if (menuLinks.length === 0) return;

    menuLinks.forEach(link => {
        const linkUrl = new URL(link.href);
        const linkPath = linkUrl.pathname;
        
        const normalizePath = (path) => (path.length > 1 && path.endsWith('/')) ? path.slice(0, -1) : path;

        if (normalizePath(linkPath) === normalizePath(currentPath)) {
            link.classList.add('is-active');
        }
    });
}
/* ------------------------------
    Menusp
------------------------------ */
function initializeMenusp() {
    const menu = document.getElementById("mobile-menu");
    const nav = document.getElementById("menu-wrap");

    if (!menu || !nav) return;

    menu.addEventListener("click", () => {
        const isOpen = menu.classList.toggle("is-open");
        nav.classList.toggle("is-open");
        
        // Khóa cuộn trang khi mở menu, mở lại khi đóng
        document.body.style.overflow = isOpen ? "hidden" : "";
    });

    // Đóng menu khi click vào link
    nav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
            menu.classList.remove("is-open");
            nav.classList.remove("is-open");
            document.body.style.overflow = ""; // Mở lại cuộn trang
        });
    });
}
/* ------------------------------
    splitText
------------------------------ */
function splitText(selector) {
    const elements = document.querySelectorAll(selector);

    elements.forEach(el => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        const textNodes = [];
        
        let currentNode;
        while (currentNode = walker.nextNode()) {
            textNodes.push(currentNode);
        }

        textNodes.forEach(textNode => {
            const parent = textNode.parentNode;
            const text = textNode.textContent;
            
            const fragment = document.createDocumentFragment();

            for (const char of text) {
                if (/\S/.test(char)) {
                    const span = document.createElement('span');
                    span.textContent = char;
                    fragment.appendChild(span);
                } else {
                    fragment.appendChild(document.createTextNode(char));
                }
            }

            parent.replaceChild(fragment, textNode);
        });

        const start = parseInt(el.dataset.start, 10) || 0;
        const delay = parseInt(el.dataset.delay, 10) || 0;
        const spans = el.querySelectorAll('span');

        spans.forEach((span, i) => {
            span.style.transitionDelay = `${delay * i + start}ms`;
        });
    });
}
/* ------------------------------
    ScrollSpy
------------------------------ */
function initializeScrollSpy() {
    const sections = document.querySelectorAll('.doc-section');
    const tocLinks = document.querySelectorAll('.toc-link');

    if (sections.length === 0 || tocLinks.length === 0) return;

    const options = {
        root: null,
        rootMargin: '-10% 0px -70% 0px', // Điểm kích hoạt nằm ở phần trên của màn hình
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Xóa class active cũ
                tocLinks.forEach(link => link.classList.remove('is-active'));
                
                // Tìm link có href khớp với ID của section đang hiện
                const id = entry.target.getAttribute('id');
                const activeLink = document.querySelector(`.toc-link[href="#${id}"]`);
                
                if (activeLink) {
                    activeLink.classList.add('is-active');
                }
            }
        });
    }, options);

    sections.forEach(section => observer.observe(section));
}
/* ------------------------------
initReviewBox
------------------------------ */
function initReviewBox() {
    const tabs = document.querySelectorAll('.js-review-tab');
    const panes = document.querySelectorAll('.js-review-pane');

    if (!tabs || !panes) return;

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.getAttribute('data-target');

            // 1. Cập nhật trạng thái Tab nút bấm
            tabs.forEach(t => t.classList.remove('is-active'));
            tab.classList.add('is-active');

            // 2. Hiển thị ngăn nội dung tương ứng
            panes.forEach(pane => {
                pane.classList.remove('is-active');
                if (pane.id === targetId) {
                    pane.classList.add('is-active');
                }
            });
        });
    });
}

// Đừng quên gọi hàm này trong initializeComponents() nhé!

/* ------------------------------
Component Initializer
------------------------------ */
function initializeComponents() {
    initializeInview();
    initializePageTop();
    initBackToTopComponent();
    initializeAnchorLinks();
    initializeMenuActive();
    initializeMenusp();
    initializeScrollSpy(); 
    splitText('.js-splitText');

    initReviewBox();
}

/* ------------------------------
    Include
------------------------------ */
document.addEventListener("DOMContentLoaded", function() {
    const includeElements = document.querySelectorAll("[data-include]");
    const promises = [];

    includeElements.forEach(function(el) {
        const file = el.getAttribute("data-include");
        const rootPath = el.getAttribute("data-path") || "";

        if (file) {
            const promise = fetch(file)
                .then(response => {
                    if (!response.ok) throw new Error(`Failed to load ${file}`);
                    return response.text();
                })
                .then(data => {
                    const processedData = data.replace(/\{\$root\}/g, rootPath);
                    el.innerHTML = processedData;
                })
                .catch(err => {
                    console.error(err);
                    el.innerHTML = `<p style="color: red;">Could not load ${file}</p>`;
                });
            promises.push(promise);
        }
    });

    if (promises.length > 0) {
        Promise.all(promises).then(() => {
            initializeComponents();
        });
    } else {
        initializeComponents();
    }
});
