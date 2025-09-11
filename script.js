document.addEventListener('DOMContentLoaded', function () {

    // --- 1. Header Hide/Show on Scroll ---
    // هذا الجزء يجعل القائمة العلوية تختفي عند التمرير للأسفل وتظهر عند التمرير للأعلى.
    let lastScrollTop = 0;
    const header = document.querySelector('.header');

    window.addEventListener('scroll', function () {
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        if (scrollTop > lastScrollTop) {
            // Downscroll - إخفاء القائمة
            header.classList.add('hidden');
        } else {
            // Upscroll - إظهار القائمة
            header.classList.remove('hidden');
        }

        // تحديث آخر موقع للتمرير
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    });

    // --- 2. Section Fade-in on Scroll ---
    // هذا الجزء يجعل أقسام الموقع تظهر بتأثير "تلاشي" عندما تصل إليها أثناء التمرير.
    const sections = document.querySelectorAll('.section');

    // إنشاء "مراقب" يكتشف متى يصبح العنصر مرئيًا على الشاشة
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            // إذا كان القسم مرئيًا
            if (entry.isIntersecting) {
                entry.target.classList.add('visible'); // أضف كلاس "visible" لتشغيل الأنيميشن
                observer.unobserve(entry.target); // أوقف المراقبة عن هذا العنصر بعد ظهوره
            }
        });
    }, {
        threshold: 0.1 // اجعل العنصر يظهر عندما يكون 10% منه مرئيًا
    });

    // تطبيق المراقب على كل قسم في الصفحة
    sections.forEach(section => {
        observer.observe(section);
    });

    // --- 3. Typewriter Effect for Hero Title ---
    // هذا الجزء يقوم بعمل تأثير الكتابة الآلية للعنوان الرئيسي في الصفحة.
    const textToType = "نحن الكيان."; // النص الذي سيتم كتابته
    const typewriterElement = document.getElementById('typewriter-text');
    let i = 0;

    function typeWriter() {
        if (i < textToType.length) {
            typewriterElement.innerHTML += textToType.charAt(i); // أضف الحرف التالي
            i++;
            setTimeout(typeWriter, 150); // سرعة الكتابة (150 ملي ثانية بين كل حرف)
        }
    }

    // بدء تأثير الكتابة
    typeWriter();

});