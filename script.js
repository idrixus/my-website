const cursor = document.getElementById('cursor');
document.addEventListener('mousemove', e => {
    if (!cursor) return;
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
});

document.addEventListener('mousedown', () => {
    if (!cursor) return;
    cursor.style.transform = 'translate(-50%,-50%) scale(0.9)';
    cursor.style.background = 'radial-gradient(circle at 30% 30%, rgba(126,252,219,0.18), transparent 40%)';
});
document.addEventListener('mouseup', () => {
    if (!cursor) return;
    cursor.style.transform = 'translate(-50%,-50%) scale(0.4)';
    cursor.style.background = 'transparent';
});

// reveal on scroll
const revealEls = Array.from(document.querySelectorAll('[data-reveal], .section-title, .project, .card, .hero-content'));
const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('is-visible');
    });
}, { threshold: 0.12 });
revealEls.forEach(el => el.setAttribute('data-reveal', 'true'));
revealEls.forEach(el => io.observe(el));

// simple contact handling — no backend, show a confirmation
const form = document.getElementById('contactForm');
if (form) {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = form.querySelector('button');
        btn.textContent = 'جارٍ الإرسال...';
        setTimeout(() => {
            btn.textContent = 'تم الإرسال — شكرًا';
            form.reset();
            setTimeout(() => btn.textContent = 'أرسل', 2500);
        }, 900);
    });
}

// link CTA to contact
const cta = document.getElementById('cta');
if (cta) cta.addEventListener('click', () => { document.location.hash = '#contact'; });
