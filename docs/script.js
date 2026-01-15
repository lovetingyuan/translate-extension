document.addEventListener('DOMContentLoaded', () => {
    
    // 滚动显示动画 (Intersection Observer)
    const reveals = document.querySelectorAll('.reveal');

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // 可选：如果只想触发一次，可以取消观察
                // observer.unobserve(entry.target);
            }
        });
    }, {
        root: null,
        threshold: 0.15, // 元素出现 15% 时触发
        rootMargin: "0px 0px -50px 0px"
    });

    reveals.forEach(element => {
        revealObserver.observe(element);
    });

    // 导航栏平滑滚动
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // 模拟演示动画的循环触发 (可选)
    const mockup = document.querySelector('.browser-mockup');
    if(mockup) {
        mockup.addEventListener('mouseenter', () => {
            // 重新触发 CSS 动画
            const contextMenu = document.querySelector('.context-menu');
            const transCard = document.querySelector('.translation-card');
            
            contextMenu.style.animation = 'none';
            transCard.style.animation = 'none';
            contextMenu.offsetHeight; /* trigger reflow */
            transCard.offsetHeight; /* trigger reflow */
            
            contextMenu.style.animation = 'fadeIn 0.5s ease-out 0.2s forwards';
            transCard.style.animation = 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.8s forwards';
        });
    }
});
