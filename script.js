// ننتظر حتى يتم تحميل محتوى الصفحة بالكامل قبل تشغيل أي كود
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. شاشة التحميل (LOADING SCREEN) ---
    // هذا الجزء مسؤول عن شاشة التحميل الأولية التي تعرض رموزًا عشوائية
    const loader = document.getElementById('loading-screen');
    const loaderText = document.getElementById('loader-text');
    const symbols = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890@#$&*";

    // يقوم بتحديث النص بشكل متكرر لإنشاء تأثير "التحميل"
    let loaderInterval = setInterval(() => {
        let text = "";
        for (let i = 0; i < 8; i++) {
            text += symbols.charAt(Math.floor(Math.random() * symbols.length));
        }
        loaderText.textContent = text;
    }, 100);

    // عندما يتم تحميل الصفحة بالكامل (بما في ذلك الصور وما إلى ذلك)
    window.addEventListener('load', () => {
        clearInterval(loaderInterval); // إيقاف تحديث الرموز
        loaderText.textContent = "CONNECTED"; // عرض رسالة الاكتمال
        setTimeout(() => {
            loader.classList.add('hidden'); // إخفاء شاشة التحميل بسلاسة
        }, 800);
    });

    // --- 2. مؤشر الماوس المخصص (CUSTOM CURSOR) ---
    // يحرك المؤشر المخصص ليتوافق مع حركة الماوس الحقيقية
    const cursor = document.querySelector('.cursor');
    window.addEventListener('mousemove', e => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });

    // يضيف تأثير التكبير للمؤشر عند المرور فوق العناصر القابلة للنقر
    document.querySelectorAll('a, .card, .cta-button').forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hovered'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hovered'));
    });

    // --- 3. تأثير القائمة العلوية عند التمرير (HEADER SCROLL) ---
    // يضيف خلفية للقائمة العلوية عندما يقوم المستخدم بالتمرير لأسفل
    const header = document.querySelector('.header');
    window.addEventListener('scroll', () => {
        // إذا كان التمرير أكبر من 50 بكسل، أضف كلاس 'scrolled'، وإلا قم بإزالته
        header.classList.toggle('scrolled', window.scrollY > 50);
    });

    // --- 4. الخلفية التفاعلية (INTERACTIVE CANVAS BACKGROUND) ---
    // هذا هو الجزء الأكثر تعقيدًا، حيث يرسم شبكة من النقاط التي تتفاعل مع الماوس
    const canvas = document.getElementById('interactive-bg');
    const ctx = canvas.getContext('2d');
    let dots = [];
    const mouse = { x: null, y: null, radius: 150 };

    // وظيفة لضبط أبعاد الـ canvas وإنشاء النقاط من جديد عند تغيير حجم النافذة
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        createDots();
    }

    // كلاس لإنشاء كل نقطة بخصائصها (الموقع، الحجم، اللون)
    class Dot {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.baseSize = 1;
            this.size = this.baseSize;
            this.baseColor = 'rgba(0, 175, 255, 0.2)';
            this.color = this.baseColor;
        }

        // وظيفة لرسم النقطة على الـ canvas
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }

        // وظيفة لتحديث حجم ولون النقطة بناءً على قربها من الماوس
        update() {
            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < mouse.radius) {
                const force = (mouse.radius - distance) / mouse.radius;
                this.size = this.baseSize + force * 2;
                this.color = `rgba(0, 175, 255, ${0.2 + force * 0.6})`;
            } else {
                if (this.size !== this.baseSize) { // إعادة الحجم واللون لوضعهما الطبيعي
                    this.size -= (this.size - this.baseSize) * 0.1;
                    this.color = this.baseColor;
                }
            }
            this.draw();
        }
    }

    // وظيفة لملء الشاشة بالنقاط بناءً على أبعاد النافذة
    function createDots() {
        dots = [];
        const spacing = 40;
        for (let x = 0; x < canvas.width; x += spacing) {
            for (let y = 0; y < canvas.height; y += spacing) {
                dots.push(new Dot(x, y));
            }
        }
    }

    // حلقة الأنيميشن الرئيسية التي تعيد رسم كل شيء في كل إطار
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        dots.forEach(dot => dot.update());
        requestAnimationFrame(animate);
    }

    // تحديث إحداثيات الماوس عند تحريكه
    window.addEventListener('mousemove', e => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    window.addEventListener('resize', resizeCanvas); // إعادة بناء الخلفية عند تغيير حجم الشاشة
    resizeCanvas();
    animate();

    // --- 5. تأثير الميل ثلاثي الأبعاد للبطاقات (3D CARD TILT EFFECT) ---
    // يضيف تأثير ميلان للبطاقات عند تحريك الماوس فوقها
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const width = card.offsetWidth;
            const height = card.offsetHeight;
            const rotateX = (y - height / 2) / height * -15; // دوران المحور X (_أقصاه_ 15 درجة)
            const rotateY = (x - width / 2) / width * 15;   // دوران المحور Y (أقصاه 15 درجة)

            card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });

        // إعادة البطاقة إلى وضعها الأصلي عند ابتعاد الماوس
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'rotateX(0) rotateY(0) scale(1)';
        });
    });

    // --- 6. تأثيرات النصوص المتحركة (TEXT ANIMATIONS) ---
    // تأثير "فك التشفير" للعنوان الرئيسي
    const title = document.getElementById('hero-title');
    const originalText = title.dataset.text;
    let i = 0;

    function decryptEffect() {
        let iterations = 0;
        const interval = setInterval(() => {
            title.textContent = originalText.split("")
                .map((letter, index) => {
                    if (index < iterations) {
                        return originalText[index];
                    }
                    return symbols[Math.floor(Math.random() * symbols.length)];
                })
                .join("");

            if (iterations >= originalText.length) {
                clearInterval(interval);
            }
            iterations += 1 / 3;
        }, 50);
    }
    setTimeout(decryptEffect, 1000); // بدء التأثير بعد ثانية

    // تأثير "الكتابة" للعنوان الفرعي
    const subtitle = document.getElementById('hero-subtitle');
    const textToType = "نحن نبني الفراغ الرقمي.";
    let j = 0;

    function type() {
        if (j < textToType.length) {
            subtitle.textContent += textToType.charAt(j);
            j++;
            setTimeout(type, 100);
        }
    }
    setTimeout(type, 1500); // بدء التأثير بعد 1.5 ثانية

    // --- 7. إظهار العناصر عند التمرير (SCROLL-BASED FADE-IN) ---
    // يستخدم IntersectionObserver لمراقبة ظهور العناصر على الشاشة
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // إيقاف المراقبة بعد ظهور العنصر
            }
        });
    }, { threshold: 0.2 }); // يظهر العنصر عند رؤية 20% منه

    document.querySelectorAll('.section-title, .card, .cta-button, .section-subtitle, .timeline-item').forEach(el => observer.observe(el));
});