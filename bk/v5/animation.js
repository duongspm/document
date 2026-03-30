document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;

    // 1. Kiểm tra lựa chọn cũ từ LocalStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        body.classList.add('light-theme');
    }

    // 2. Xử lý sự kiện Click
    themeToggle.addEventListener('click', () => {
        body.classList.toggle('light-theme');
        
        // Tạo hiệu ứng rung nhẹ khi nhấn cho sướng tay (Haptic vibe)
        themeToggle.style.transform = 'scale(0.9)';
        setTimeout(() => {
            themeToggle.style.transform = 'scale(1.05)';
        }, 100);

        // 3. Lưu lại trạng thái
        if (body.classList.contains('light-theme')) {
            localStorage.setItem('theme', 'light');
        } else {
            localStorage.setItem('theme', 'dark');
        }
    });
});
window.onscroll = function() {
  updateScrollBar();
};

function updateScrollBar() {
  const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const scrolled = (winScroll / height) * 100;
  
  document.getElementById("scrollBar").style.width = scrolled + "%";
}

// Thêm vào client.js
document.querySelectorAll('.footer-col ul li a').forEach(link => {
    link.addEventListener('mouseenter', () => {
        // Tạo một chút rung cảm nhẹ hoặc âm thanh nếu muốn
        console.log("Hovering footer link...");
    });
});
document.addEventListener('DOMContentLoaded', () => {
  const sttButton = document.getElementById('scrollToTop');
  const progressCircle = document.getElementById('sttProgress');
  const circumference = 2 * Math.PI * 20; // Chu vi vòng tròn r=20

  const updateProgress = () => {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollTop = window.scrollY;
    
    // 1. Tính toán phần trăm cuộn để vẽ vòng tròn
    const progress = (scrollTop / scrollHeight);
    const offset = circumference - (progress * circumference);
    progressCircle.style.strokeDashoffset = offset;

    // 2. Ẩn/Hiện nút khi cuộn quá 300px
    if (scrollTop > 300) {
      sttButton.classList.add('show');
    } else {
      sttButton.classList.remove('show');
    }
  };

  // 3. Xử lý sự kiện click để cuộn lên đầu trang
  sttButton.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth' // Cuộn mượt mà không cần GSAP
    });
  });

  window.addEventListener('scroll', updateProgress);
});
const updateProgress = () => {
  const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
  const scrollTop = window.scrollY;
  
  // 1. Vẽ vòng tròn tiến trình
  const progress = (scrollTop / scrollHeight);
  const offset = circumference - (progress * circumference);
  progressCircle.style.strokeDashoffset = offset;

  // 2. Ẩn/Hiện nút
  if (scrollTop > 300) {
    sttButton.classList.add('show');
  } else {
    sttButton.classList.remove('show');
  }

  // 3. HIỆU ỨNG RUNG: Kiểm tra nếu đã cuộn đến cuối trang (sai số 10px)
  if (scrollTop >= scrollHeight - 10) {
    sttButton.classList.add('stt-shake');
  } else {
    sttButton.classList.remove('stt-shake');
  }
};

window.addEventListener('scroll', () => {
  const items = document.querySelectorAll('.timeline-item');
  const progressBar = document.getElementById('timelineProgress');
  const scrollPos = window.scrollY + window.innerHeight * 0.8;

  // 1. Cập nhật thanh tiến trình theo cuộn chuột
  const section = document.querySelector('.timeline-section');
  const sectionTop = section.offsetTop;
  const sectionHeight = section.offsetHeight;
  const progress = Math.max(0, Math.min(100, ((window.scrollY - sectionTop) / sectionHeight) * 100));
  progressBar.style.height = `${progress}%`;

  // 2. Kích hoạt hiệu ứng Reveal cho từng item
  items.forEach(item => {
    if (scrollPos > item.offsetTop + sectionTop) {
      item.classList.add('active');
    }
  });
});
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const target = entry.target;
      const countTo = parseInt(target.innerText);
      let count = 0;
      const timer = setInterval(() => {
        count += Math.ceil(countTo / 20);
        if (count >= countTo) {
          target.innerText = countTo + (target.innerText.includes('+') ? '+' : (target.innerText.includes('%') ? '%' : ''));
          clearInterval(timer);
        } else {
          target.innerText = count;
        }
      }, 50);
      observer.unobserve(target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-box h3').forEach(h3 => observer.observe(h3));

window.addEventListener('scroll', () => {
    const marquee = document.querySelector('.marquee-content');
    if (marquee) {
        // Thay đổi tốc độ hoặc vị trí nhẹ theo cuộn chuột
        let scrollPos = window.scrollY;
        marquee.style.transform = `translateX(calc(-50% + ${scrollPos * 0.2}px))`;
    }
});