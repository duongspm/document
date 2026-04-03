const allAnimations = [];
const masterTl = gsap.timeline({ play: true });

const code = document.querySelector("code");
code.textContent = `
<div class="box"></div>
`;


// ---------------------------------------
const anim1 = gsap.to(".card01",{
        x: 0,
        opacity: 1,
        duration: 1
    });
// ---------------------------------------

const anim2 = gsap.from(".card02", {
    x: -200,
    opacity: 0,
    duration: 1
});
// ---------------------------------------

const anim3 = gsap.fromTo(".card03",
    { x: -200, opacity: 0 },
    { x: 0, opacity: 1, duration: 1 }
);
// ---------------------------------------

const anim4 = gsap.to(".card04", {
    x: -100,
    duration: 1,
    rotation: 360,
    scale: 1.5
});
// ---------------------------------------

const anim5 = gsap.to(".card05", {
    x: 300,
    duration: 1,
    ease: "bounce.out"
});
// ---------------------------------------

const anim6 = gsap.to(".card06", {
    x: -200,
    repeat: -1, // lặp vô hạn
    yoyo: true,
    duration: 1
});
// ---------------------------------------

let tl = gsap.timeline();
const anim7 = tl.to(".card07", { x: 200, duration: 1 })
    .to(".card08", { y: 200, duration: 1 })
    .to(".card09", { rotation: 360, duration: 1 });
// ---------------------------------------

let tl2 = gsap.timeline();
const anim8 = tl2.to(".card10", { x: 50, duration: 1 })
    .to(".card11", { y: 50, duration: 1 }, "+=0.5");
// ---------------------------------------

let tl3 = gsap.timeline();
const anim9 = tl3.to(".card12", { x: -150, duration: 1 })
    .to(".card13", { y: -150, duration: 1 }, "<");
// ---------------------------------------

document.querySelector(".card14").addEventListener("click", () => {
    gsap.to(".card14", {
        scale: 2,
        duration: 0.5
    });
});
// ---------------------------------------

gsap.registerPlugin(ScrollTrigger);

const anim10 = gsap.from(".card15", {
    scrollTrigger: ".card15",
    y: 100,
    opacity: 0,
    duration: 1
});

const anim11 = gsap.from(".card16", {
    scrollTrigger: {
        trigger: ".card16",
        start: "top 80%",
        end: "top 30%",
        scrub: true
    },
    y: 200,
    opacity: 0
});
// ---------------------------------------

const anim12 = gsap.from(".card-item", {
    y: 50,
    opacity: 0,
    stagger: 1
});
// ---------------------------------------

const anim13 = gsap.from(".card17", {
    y: 100,
    opacity: 0,
    duration: 0.8,
    stagger: 0.2,
    ease: "power3.out"
});

gsap.to(".card18", {
    scrollTrigger: {
        trigger: ".box1",
        start: "top top",
        end: "+=500", 
        scrub: true,
        pin: true,
        markers: true,      // Kích hoạt các mốc đánh dấu (chỉ dùng khi code)
        id: "box1-card18-move", //đặt tên markers
    },
    x: 500
});
gsap.to(".card-scrub", {
    scrollTrigger: {
        trigger: ".card-scrub",
        start: "top 80%",
        end: "top 20%",
        scrub: 2,
        markers: true,      // Kích hoạt các mốc đánh dấu (chỉ dùng khi code)
        id: "box2-Scrub", //đặt tên markers
    },
    y: 200
});

// ---------------------------------------
const anim14 = gsap.from(".card-fadeInUp", {
    scrollTrigger: {
        trigger: ".card-fadeInUp",
        start: "top 85%",      // Khi đỉnh box cách đáy màn hình 15% (vừa lộ ra)
        toggleActions: "play none none none", // Chạy 1 lần duy nhất khi cuộn tới
        markers: true,        // Bật lên để canh chỉnh nếu cần
        id: "fadeInUp",
    },
    y: 100,                   // Bay từ dưới lên 100px
    opacity: 0,               // Từ mờ tịt
    duration: 1.2,            // Chạy trong 1.2 giây
    ease: "power4.out"        // Hiệu ứng giảm tốc cực mượt
});

// ---------------------------------------
const anim15 = gsap.from(".card-fadeInUp1", {
    scrollTrigger: {
        trigger: ".card-fadeInUp1",
        start: "top 85%",      // Khi đỉnh box cách đáy màn hình 15% (vừa lộ ra)
        toggleActions: "restart none none reset", // Chạy 1 lần duy nhất khi cuộn tới
        markers: true,        // Bật lên để canh chỉnh nếu cần
        id: "1fadeInUp1",
    },
    y: 100,                   // Bay từ dưới lên 100px
    opacity: 0,               // Từ mờ tịt
    duration: 1.2,            // Chạy trong 1.2 giây
    ease: "power4.out"        // Hiệu ứng giảm tốc cực mượt
});

// ---------------------------------------
const anim16 = gsap.from(".cards-fadeInUp", {
    scrollTrigger: {
        trigger: ".box4", // Vùng chứa chung
        start: "top 80%",
        // markers: true,        // Bật lên để canh chỉnh nếu cần
        // id: "more-fadeInUp",
    },
    y: 100,// Bay từ dưới lên 100px
    opacity: 0,
    stagger: 0.2,             // Mỗi cái cách nhau 0.2 giây
    duration: 1.8// Chạy trong 1.8 giây
});

// ---------------------------------------

let tlbox = gsap.timeline({
    scrollTrigger: {
        trigger: ".box5",
        start: "top top",
        end: "+=1000",
        scrub: true,
        pin: true
    }
});

tlbox.to(".cardbox5", { x: 300, duration: 1 })
    .to(".cardbox5", { y: 200, duration: 1 })
    .to(".cardbox5", { rotation: 360, duration: 1 });

// ---------------------------------------

allAnimations.push(
    anim1, 
    anim2, 
    anim3, 
    anim4, 
    anim5,
    anim6,
    anim7,
    anim8,
    anim9,
    anim10,
    anim11,
    anim12,
    anim13,
    anim14,
    anim15,
    anim16,
);
masterTl.add(allAnimations);

const statusText = document.getElementById("anim-status");

document.getElementById("btn-play").onclick = () => {
    masterTl.play();
    statusText.innerText = "Playing";
};

document.getElementById("btn-pause").onclick = () => {
    masterTl.pause();
    statusText.innerText = "Paused";
};

document.getElementById("btn-resume").onclick = () => {
    masterTl.resume();
    statusText.innerText = "Resuming";
};

document.getElementById("btn-restart").onclick = () => {
    masterTl.restart();
    statusText.innerText = "Restarted";
};

document.getElementById("btn-reverse").onclick = () => {
    masterTl.reverse();
    statusText.innerText = "Reversing";
};

// Tự động đổi status khi animation kết thúc
masterTl.eventCallback("onComplete", () => {
    statusText.innerText = "Finished";
});

const controlBar = document.querySelector('.control-bar-wrapper');
let hideTimeout;

// Hàm thực hiện việc ẩn
function hideControls() {
    controlBar.classList.add('hidden');
}

// Hàm thực hiện việc hiện và đặt lại bộ đếm
function showControls() {
    controlBar.classList.remove('hidden');
    
    // Xóa bộ đếm cũ nếu có
    clearTimeout(hideTimeout);
    
    // Thiết lập bộ đếm mới: ẩn sau 6 giây
    hideTimeout = setTimeout(hideControls, 6000);
}

// 1. Hiện thanh điều khiển khi di chuyển chuột trong cửa sổ
window.addEventListener('mousemove', showControls);

// 2. Hiện khi có tương tác phím (cho người dùng dùng phím tắt)
window.addEventListener('keydown', showControls);

// 3. Giữ thanh luôn hiện nếu chuột đang nằm TRÊN thanh điều khiển (User đang muốn thao tác)
controlBar.addEventListener('mouseenter', () => {
    clearTimeout(hideTimeout);
});

controlBar.addEventListener('mouseleave', () => {
    hideTimeout = setTimeout(hideControls, 3000);
});

// Khởi tạo lần đầu
showControls();
let isPinned = false;
const pinBtn = document.getElementById('btn-pin');

pinBtn.onclick = () => {
    isPinned = !isPinned;
    
    if (isPinned) {
        pinBtn.style.color = "var(--accent-color)";
        pinBtn.classList.add('pin');
        clearTimeout(hideTimeout);
        window.removeEventListener('mousemove', showControls);
    } else {
        pinBtn.style.color = "white";
        pinBtn.classList.remove('pin');
        window.addEventListener('mousemove', showControls);
        showControls();
    }
};

// Sửa lại hàm hideControls một chút
function hideControls() {
    if (!isPinned) {
        controlBar.classList.add('hidden');
    }
}

function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    container.appendChild(toast);

    // Dùng GSAP để làm hiệu ứng bay vào và biến mất
    gsap.fromTo(toast, 
        { x: 100, opacity: 0 }, 
        { x: 0, opacity: 1, duration: 0.5, ease: "back.out" }
    );

    gsap.to(toast, {
        opacity: 0,
        y: -20,
        duration: 0.5,
        delay: 2, // Hiện trong 2 giây rồi ẩn
        onComplete: () => toast.remove()
    });
}
// Áp dụng cho tất cả các nút trong Control Bar
const allButtons = document.querySelectorAll('.control-bar button');

allButtons.forEach(btn => {
    btn.addEventListener('click', function() {
        // 1. Hiệu ứng nảy nút (Squish)
        gsap.to(this, { scale: 0.8, duration: 0.1, yoyo: true, repeat: 1 });

        // 2. Hiện thông báo tương ứng với ID của nút
        const actionName = this.id.replace('btn-', '').toUpperCase();
        showToast(`Action: ${actionName}`);
        
        // 3. Cập nhật status text như đã làm ở phần trước
        statusText.innerText = actionName;
    });
});

window.addEventListener('keydown', (e) => {
    switch(e.code) {
        case 'Space': // Dấu cách để Play/Pause
            e.preventDefault();
            if (masterTl.paused()) {
                masterTl.play();
                showToast("PLAY (Space)");
            } else {
                masterTl.pause();
                showToast("PAUSE (Space)");
            }
            break;
        case 'KeyR': // Phím R để Restart
            masterTl.restart();
            showToast("RESTART (R)");
            break;
        case 'ArrowLeft': // Phím mũi tên trái để Reverse
            masterTl.reverse();
            showToast("REVERSE (←)");
            break;
    }
});

function spawnClickTag(e, text) {
    // 1. Tạo phần tử
    const tag = document.createElement('div');
    tag.className = 'click-tag';
    tag.innerText = text;
    document.body.appendChild(tag);

    // 2. Đặt vị trí xuất hiện ngay đầu ngón trỏ chuột
    gsap.set(tag, {
        left: e.clientX,
        top: e.clientY,
        xPercent: -50,
        yPercent: -50
    });

    // 3. Animation: Bay lên, mờ dần và tự hủy
    gsap.to(tag, {
        y: -50,             // Bay lên 50px
        opacity: 0,         // Mờ dần
        scale: 1.5,         // Phóng to nhẹ
        duration: 0.8,
        ease: "power2.out",
        onComplete: () => tag.remove() // Xóa khỏi DOM để tránh nặng máy
    });
}

const buttons = document.querySelectorAll('.control-bar button');

buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Lấy tên hành động từ ID (ví dụ: btn-play -> PLAY)
        const action = btn.id.replace('btn-', '').toUpperCase();
        
        // Gọi hiệu ứng tại vị trí chuột
        spawnClickTag(e, action);
        
        // Bạn vẫn có thể giữ hàm showToast() nếu muốn thông báo ở góc
        // showToast(action); 
    });
});

function spawnParticles(e) {
    for (let i = 0; i < 6; i++) {
        const p = document.createElement('div');
        p.style.cssText = `
            position: fixed;
            width: 4px; height: 4px;
            background: var(--accent-color);
            border-radius: 50%;
            pointer-events: none;
            left: ${e.clientX}px; top: ${e.clientY}px;
        `;
        document.body.appendChild(p);

        gsap.to(p, {
            x: (Math.random() - 0.5) * 100,
            y: (Math.random() - 0.5) * 100,
            opacity: 0,
            duration: 0.6,
            onComplete: () => p.remove()
        });
    }
}

// Gọi trong sự kiện click:
// spawnParticles(e);
// gsap.from(".theory-block", {
//     scrollTrigger: {
//         trigger: ".theory-grid",
//         start: "top top"
//     },
//     y: 60,
//     opacity: 0,
//     duration: 0.8,
//     stagger: 0.2,
//     ease: "power3.out"
// });
// gsap.from(".sub-block", {
//     scrollTrigger: {
//         trigger: ".sub-blocks-container",
//         start: "top 85%",
//     },
//     x: -20,            // Trượt nhẹ từ trái sang (theo đường kẻ border-left)
//     opacity: 0,
//     duration: 0.6,
//     stagger: 0.2,     // Mỗi block con hiện cách nhau 0.2s
//     ease: "power2.out"
// });