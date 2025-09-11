/* js/main.js — lightweight particles + subtle parallax + perf */

(function () {
    const canvas = document.getElementById('dots');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let DPR = Math.max(1, window.devicePixelRatio || 1);

    // performance heuristics — reduce particles on weak devices / save-data
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const saveData = conn && conn.saveData;
    const lowMem = navigator.deviceMemory && navigator.deviceMemory < 2;
    const isMobile = window.matchMedia && window.matchMedia('(pointer:coarse)').matches;
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let PARTICLE_COUNT = 40;
    if (saveData || lowMem) PARTICLE_COUNT = 14;
    if (isMobile) PARTICLE_COUNT = Math.max(10, Math.floor(PARTICLE_COUNT * 0.6));
    if (prefersReduced) PARTICLE_COUNT = 8;

    let particles = [];
    let running = true;
    if (prefersReduced) running = false;

    function fit() {
        DPR = Math.max(1, (window.devicePixelRatio || 1) * (window._adaptiveDPR || 1));
        const w = Math.floor(window.innerWidth * DPR);
        const h = Math.floor(window.innerHeight * DPR);
        canvas.width = w;
        canvas.height = h;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function createParticles() {
        particles = [];
        const w = window.innerWidth;
        const h = window.innerHeight;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * w,
                y: Math.random() * h,
                r: 0.6 + Math.random() * 1.6,
                vx: (Math.random() - 0.5) * 0.25,
                vy: (Math.random() - 0.5) * 0.25,
                alpha: 0.06 + Math.random() * 0.12
            });
        }
    }

    function draw() {
        if (!running) return;
        const w = canvas.width / DPR;
        const h = canvas.height / DPR;
        // subtle fade to create gentle trailing
        ctx.clearRect(0, 0, w, h);
        // slight vignette background tint (very subtle)
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, 'rgba(0,0,0,0.01)');
        g.addColorStop(1, 'rgba(0,0,0,0.06)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);

        for (const p of particles) {
            // update
            p.x += p.vx * (window._perfMultiplier || 1);
            p.y += p.vy * (window._perfMultiplier || 1);
            // wrap-around
            if (p.x < -10) p.x = w + 10;
            if (p.x > w + 10) p.x = -10;
            if (p.y < -10) p.y = h + 10;
            if (p.y > h + 10) p.y = -10;

            // draw soft dot
            const rad = p.r;
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad * 6);
            grad.addColorStop(0, `rgba(36,211,255,${p.alpha})`);
            grad.addColorStop(1, 'rgba(36,211,255,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(p.x - rad * 6, p.y - rad * 6, rad * 12, rad * 12);
        }

        requestAnimationFrame(draw);
    }

    // parallax effect for name (subtle)
    const nameEl = document.getElementById('name');
    (function () {
        if (!nameEl) return;
        let last = 0;
        window.addEventListener('pointermove', (e) => {
            const now = performance.now();
            if (now - last < 12) return; // throttle ~80fps
            last = now;
            const nx = (e.clientX / window.innerWidth - 0.5) * 6; // -3..3
            const ny = (e.clientY / window.innerHeight - 0.5) * 6;
            nameEl.style.transform = `translate(${nx}px, ${ny}px)`;
            nameEl.style.transition = 'transform 160ms linear';
        }, { passive: true });

        window.addEventListener('pointerleave', () => {
            nameEl.style.transform = 'translate(0,0)';
            nameEl.style.transition = 'transform 260ms cubic-bezier(.2,.9,.2,1)';
        });
    })();

    // simple auto subtle "glitch" on name (no heavy effects)
    (function () {
        if (prefersReduced) return;
        const base = nameEl;
        function tinyGlitch() {
            if (!running) return;
            base.style.filter = `drop-shadow(0 8px 18px rgba(36,211,255,0.04))`;
            base.style.letterSpacing = '0.02em';
            setTimeout(() => {
                base.style.filter = '';
                base.style.letterSpacing = '';
            }, 320 + Math.random() * 420);
            setTimeout(tinyGlitch, 1500 + Math.random() * 3000);
        }
        setTimeout(tinyGlitch, 900);
    })();

    // visibility handling to pause when not visible
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) { running = false; window._pageHidden = true; }
        else { window._pageHidden = false; running = true; requestAnimationFrame(draw); }
    });

    // adaptive DPR (respect save-data / low memory)
    (function () {
        const original = window.devicePixelRatio || 1;
        function adapt() {
            const conn = navigator.connection || null;
            const save = conn && conn.saveData;
            const low = navigator.deviceMemory && navigator.deviceMemory < 2;
            window._adaptiveDPR = (save || low) ? Math.max(1, Math.floor(original / 1.6)) : 1;
            window._perfMultiplier = (save || low) ? 0.8 : 1;
            fit(); createParticles();
        }
        adapt();
        const connRef = navigator.connection || null;
        if (connRef && typeof connRef.addEventListener === 'function') {
            try { connRef.addEventListener('change', adapt); } catch (e) { }
        }
        window.addEventListener('resize', adapt);
    })();

    // init
    fit();
    createParticles();
    requestAnimationFrame(draw);

    // expose small API for debugging in console
    window.__YusufMinimal = {
        setParticles(n) { PARTICLE_COUNT = n; createParticles(); },
        pause() { running = false; },
        resume() { running = true; requestAnimationFrame(draw); }
    };

})();
