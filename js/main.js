/* =============================
   js/main.js
   Yusuf — Matrix / Dark Web Auto
   - auto quality scaling
   - pause on hidden
   - matrix rain + corruption + name glitch
   - throttled pointer parallax
   ============================= */

(() => {
    // elements
    const matrix = document.getElementById('matrix');
    const corrupt = document.getElementById('corrupt');
    const overlay = document.getElementById('overlay');
    const plate = document.querySelector('.plate');
    const nameBase = document.querySelector('.name .base');
    const nameR = document.querySelector('.name .r');
    const nameG = document.querySelector('.name .g');

    if (!matrix || !corrupt || !overlay || !plate || !nameBase) return;

    // device pixel adapt (update by PerfControl later)
    let DPR = Math.max(1, window.devicePixelRatio || 1);
    let running = true;
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) running = false;

    // canvas contexts
    const mCtx = matrix.getContext('2d');
    const cCtx = corrupt.getContext('2d');
    const oCtx = overlay.getContext('2d');

    // characters set
    const glyphs = ('01<>/\\|[]{}()@#$%&*+-=~:;.,؟٠١٢٣٤٥٦٧٨٩').split('');

    // performance globals
    window._perfMultiplier = 1.0;
    window._pageHidden = false;

    // fit function
    function fitAll() {
        DPR = Math.max(1, (window.devicePixelRatio || 1) * (window._adaptiveDPR || 1));
        const w = Math.floor(window.innerWidth * DPR);
        const h = Math.floor(window.innerHeight * DPR);
        [matrix, corrupt, overlay].forEach(c => {
            c.width = w; c.height = h;
            c.style.width = window.innerWidth + 'px';
            c.style.height = window.innerHeight + 'px';
            const ctx = c.getContext('2d');
            ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        });
        initColumns();
    }
    window.addEventListener('resize', () => { fitAll(); });

    // columns for matrix
    let columns = [];
    function initColumns() {
        const w = window.innerWidth;
        const fs = getFontSize();
        const colCount = Math.floor(w / fs) + 2;
        columns = Array.from({ length: colCount }, (_, i) => ({
            x: i * fs + fs * 0.2,
            y: rand(-200, 0) * Math.random(),
            speed: fs * (0.36 + Math.random() * 1.1),
            size: fs,
            trail: rand(6, 36),
            active: Math.random() > 0.06
        }));
    }

    function getFontSize() {
        // scale font by viewport size and performance
        const base = Math.max(10, Math.round(Math.min(window.innerWidth, window.innerHeight) / 70));
        return Math.round(base * (window._perfMultiplier || 1));
    }

    // helpers
    function rand(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

    // main loop
    let last = performance.now();
    function frame(now) {
        window.__matrixFrame = frame; // expose for PerfControl resume
        const dt = (now - last) || 16;
        last = now;

        if (!running || window._pageHidden) { requestAnimationFrame(frame); return; }

        // fade for trail effect
        mCtx.fillStyle = 'rgba(0,0,0,0.28)';
        mCtx.fillRect(0, 0, matrix.width / DPR, matrix.height / DPR);

        // draw each column
        for (let i = 0; i < columns.length; i++) {
            const col = columns[i];
            if (!col.active) continue;
            const fs = col.size;
            mCtx.font = `${fs}px "Share Tech Mono", monospace`;
            for (let t = 0; t < col.trail; t++) {
                const y = col.y - (t * fs);
                if (y < -fs) continue;
                const char = glyphs[rand(0, glyphs.length - 1)];
                if (t === 0) {
                    mCtx.fillStyle = `rgba(180,255,200,${clamp(0.5 + Math.random() * 0.5, 0.6, 1)})`;
                    mCtx.fillText(char, col.x, y);
                } else {
                    mCtx.fillStyle = `rgba(0,220,110,${(1 - t / col.trail) * 0.16})`;
                    mCtx.fillText(char, col.x, y);
                }
            }
            // advance
            const speedFactor = 1 + ((window._perfMultiplier || 1) - 1) * 0.8;
            col.y += col.speed * (0.016 * speedFactor);
            if (col.y > window.innerHeight + (col.trail * fs)) {
                if (Math.random() < 0.9) {
                    col.y = rand(-100, 0) * Math.random();
                    col.speed = fs * (0.36 + Math.random() * 1.1);
                    col.trail = rand(6, 40);
                } else {
                    col.y = -rand(10, 200);
                }
            }
        }

        // corruption canvas (occasional big glyphs & glitch bars)
        cCtx.clearRect(0, 0, corrupt.width / DPR, corrupt.height / DPR);
        if (Math.random() < 0.12 * (window._perfMultiplier || 1)) {
            const gx = rand(0, window.innerWidth);
            const gy = rand(0, window.innerHeight);
            cCtx.font = `${Math.max(12, Math.round(getFontSize() * 1.5))}px "Share Tech Mono", monospace`;
            cCtx.fillStyle = `rgba(0,255,140,${0.06 + Math.random() * 0.18})`;
            cCtx.fillText(glyphs[rand(0, glyphs.length - 1)].repeat(rand(1, 6)), gx, gy);
        }
        if (Math.random() < 0.14 * (window._perfMultiplier || 1)) {
            const hh = rand(6, 40);
            const yy = rand(0, innerHeight);
            cCtx.fillStyle = `rgba(0,255,130,${0.02 + Math.random() * 0.05})`;
            cCtx.fillRect(0, yy, innerWidth, hh);
        }

        // overlay: subtle vignette/glow
        oCtx.clearRect(0, 0, overlay.width / DPR, overlay.height / DPR);
        const grad = oCtx.createRadialGradient(innerWidth / 2, innerHeight / 2, 10, innerWidth / 2, innerHeight / 2, Math.max(innerWidth, innerHeight) / 1.1);
        grad.addColorStop(0, 'rgba(0,255,130,0.012)');
        grad.addColorStop(0.5, 'rgba(0,0,0,0)');
        oCtx.fillStyle = grad;
        oCtx.fillRect(0, 0, overlay.width / DPR, overlay.height / DPR);

        requestAnimationFrame(frame);
    }

    // name glitch system
    function doNameGlitch(burst = false) {
        const n = burst ? rand(4, 9) : rand(1, 3);
        for (let i = 0; i < n; i++) {
            const delay = rand(20, 80) + i * rand(8, 60);
            setTimeout(() => {
                const rTrans = `translate(${rand(-16, 16)}px,${rand(-10, 10)}px)`;
                const gTrans = `translate(${rand(-12, 12)}px,${rand(-18, 18)}px)`;
                const rClip = `inset(${rand(0, 70)}% 0 ${rand(0, 70)}% 0)`;
                const gClip = `inset(${rand(0, 70)}% 0 ${rand(0, 70)}% 0)`;
                nameR.style.transform = rTrans; nameR.style.clipPath = rClip; nameR.style.opacity = 0.75;
                nameG.style.transform = gTrans; nameG.style.clipPath = gClip; nameG.style.opacity = 0.7;
                nameBase.style.transform = `translate(${rand(-3, 3)}px,${rand(-2, 2)}px)`;
                plate.style.transform = `translate(${rand(-6, 6)}px,${rand(-6, 6)}px)`;
                // reset
                setTimeout(() => {
                    nameR.style.transform = 'translate(0,0)'; nameR.style.clipPath = 'inset(0 0 0 0)'; nameR.style.opacity = 1;
                    nameG.style.transform = 'translate(0,0)'; nameG.style.clipPath = 'inset(0 0 0 0)'; nameG.style.opacity = 1;
                    nameBase.style.transform = 'translate(0,0)'; plate.style.transform = 'translateZ(0)';
                }, burst ? rand(260, 920) : rand(60, 360));
            }, delay);
        }
    }

    // schedule automatic glitches with intensity escalation
    let glitchTimer = null;
    let intensity = 'medium';
    setTimeout(() => intensity = 'high', 2000);
    setTimeout(() => intensity = 'ultra', 6500);

    function scheduleGlitch() {
        clearTimeout(glitchTimer);
        const delay = intensity === 'low' ? rand(2500, 7000) : intensity === 'high' ? rand(300, 1600) : rand(900, 3500);
        glitchTimer = setTimeout(() => {
            doNameGlitch(Math.random() < 0.25);
            scheduleGlitch();
        }, delay);
    }
    scheduleGlitch();

    // autoPanic bursts occasionally
    setInterval(() => {
        if (Math.random() < 0.14) {
            doNameGlitch(true);
            const old = intensity;
            intensity = 'ultra';
            initColumns();
            setTimeout(() => { intensity = old; initColumns(); }, 1600 + rand(0, 1200));
        }
    }, 3000);

    // pointer parallax (throttled)
    (function () {
        let last = 0; const TH = 16;
        window.addEventListener('pointermove', (e) => {
            const now = performance.now(); if (now - last < TH) return; last = now;
            const nx = (e.clientX / window.innerWidth - 0.5) * 12;
            const ny = (e.clientY / window.innerHeight - 0.5) * 8;
            plate.style.transform = `translate(${nx}px,${ny}px)`;
        }, { passive: true });
        // ease back
        window.addEventListener('pointerleave', () => { plate.style.transform = 'translateZ(0)'; });
    })();

    // PerfControl: auto-scale quality
    window.PerfControl = {
        detectAndApply() {
            const conn = navigator.connection || null;
            const slowNet = conn && (conn.saveData || (conn.effectiveType && (conn.effectiveType.includes('2g') || conn.effectiveType.includes('3g'))));
            const lowMem = navigator.deviceMemory && navigator.deviceMemory < 2;
            const cpu = navigator.hardwareConcurrency || 4;
            if (slowNet || lowMem || cpu <= 2) { document.documentElement.classList.add('performance-low'); window._perfMultiplier = 0.7; }
            else if (cpu <= 4) { document.documentElement.classList.remove('performance-low'); window._perfMultiplier = 1.0; }
            else { document.documentElement.classList.remove('performance-low'); window._perfMultiplier = 1.25; }
            // re-fit canvas because DPR multiplier might change
            fitAll();
        }
    };
    try { window.PerfControl.detectAndApply(); } catch (e) { }

    // visibility handling
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) { window._pageHidden = true; running = false; }
        else { window._pageHidden = false; running = true; last = performance.now(); requestAnimationFrame(frame); }
    });

    // adaptive DPR tuning (low-memory / save-data)
    (function () {
        const original = window.devicePixelRatio || 1;
        function adjust() {
            const conn = navigator.connection || null;
            const saveData = conn && conn.saveData;
            const lowMem = navigator.deviceMemory && navigator.deviceMemory < 2;
            window._adaptiveDPR = (saveData || lowMem) ? Math.max(1, Math.floor(original / 1.5)) : 1;
            fitAll();
        }
        adjust();
        const conn = navigator.connection || null;
        if (conn && typeof conn.addEventListener === 'function') {
            try { conn.addEventListener('change', adjust); } catch (e) { }
        }
        window.addEventListener('visibilitychange', adjust);
    })();

    // graceful fallback if no canvas
    (function () {
        try { if (!matrix.getContext) throw 0; } catch (e) {
            [matrix, corrupt, overlay].forEach(c => c.style.display = 'none');
            document.documentElement.classList.add('performance-low');
            running = false;
            return;
        }
    })();

    // initialization
    function init() {
        fitAll();
        initColumns();
        last = performance.now();
        requestAnimationFrame(frame);
    }

    // start
    init();

    // cleanup on unload
    window.addEventListener('beforeunload', () => { running = false; });

})();
