/* js/main.js
   Flow-field background: big visible cyber flow + soft glow layer
   - auto quality scaling
   - pause on hidden
   - mouse/touch parallax & interaction
   - respects prefers-reduced-motion
*/

/* ---------- Configurable parameters (feel free to tweak) ---------- */
const CONFIG = {
    PARTICLE_COUNT_DESKTOP: 70,   // base particles on desktop
    PARTICLE_COUNT_MOBILE: 30,    // on mobile / low power
    FLOW_SCALE: 0.0009,           // spatial frequency of the flow field (lower = bigger swirls)
    TIME_SPEED: 0.0009,           // how fast the field evolves (time factor)
    VELOCITY: 0.6,                // particle follow strength
    SMOOTH: 0.12,                 // smoothing for movement (0..1)
    GLOW_INTENSITY: 0.22,         // second canvas glow alpha
    PALETTE: ['rgba(36,211,255,0.9)', 'rgba(90,255,180,0.75)', 'rgba(120,220,255,0.4)']
};

/* ---------- Boilerplate ---------- */
(function () {
    const flowC = document.getElementById('flowCanvas');
    const glowC = document.getElementById('glowCanvas');
    if (!flowC || !glowC) return;

    // contexts
    const flowCtx = flowC.getContext('2d', { alpha: true });
    const glowCtx = glowC.getContext('2d', { alpha: true });

    // DPR adaptive
    let DPR = Math.max(1, window.devicePixelRatio || 1);

    // device heuristics
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};
    const saveData = conn.saveData;
    const lowMem = navigator.deviceMemory && navigator.deviceMemory < 2;
    const isMobile = window.matchMedia && window.matchMedia('(pointer:coarse)').matches;
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // adaptive counts
    let PARTICLES = CONFIG.PARTICLE_COUNT_DESKTOP;
    if (saveData || lowMem) PARTICLES = Math.max(18, Math.floor(PARTICLES * 0.4));
    if (isMobile) PARTICLES = CONFIG.PARTICLE_COUNT_MOBILE;
    if (prefersReduced) PARTICLES = Math.max(8, Math.floor(PARTICLES * 0.25));

    // runtime state
    let particles = [];
    let w = 0, h = 0;
    let running = true;
    if (prefersReduced) running = false;
    let lastTime = performance.now();

    // mouse / touch interaction for parallax & attraction
    let pointer = { x: null, y: null, vx: 0, vy: 0, active: false };
    function onPointer(e) {
        const ev = e.touches ? e.touches[0] : e;
        pointer.x = ev.clientX;
        pointer.y = ev.clientY;
        pointer.active = true;
    }
    function onPointerEnd() { pointer.active = false; pointer.x = null; pointer.y = null; }

    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('touchmove', onPointer, { passive: true });
    window.addEventListener('pointerleave', onPointerEnd);
    window.addEventListener('touchend', onPointerEnd);
    window.addEventListener('touchcancel', onPointerEnd);

    // quality control: DPR adaptation
    function fitCanvas() {
        DPR = Math.max(1, (window.devicePixelRatio || 1) * (window._adaptiveDPR || 1));
        w = Math.floor(window.innerWidth * DPR);
        h = Math.floor(window.innerHeight * DPR);
        [flowC, glowC].forEach(c => {
            c.width = w;
            c.height = h;
            c.style.width = window.innerWidth + 'px';
            c.style.height = window.innerHeight + 'px';
            const ctx = c.getContext('2d');
            ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        });
    }

    // simple pseudo-noise using sin/cos combos for smooth field (cheap & smooth)
    function fieldAngle(x, y, t) {
        // normalized coords
        const nx = x * CONFIG.FLOW_SCALE;
        const ny = y * CONFIG.FLOW_SCALE;
        // mix multiple sinusoids for organic flow
        const a = Math.sin((nx + t) * 1.0) * 1.0;
        const b = Math.cos((ny - t * 0.8) * 1.0) * 0.6;
        const c = Math.sin((nx * 0.6 + ny * 0.4 + Math.sin(t * 0.3)) * 0.9) * 0.7;
        return (a + b + c) * Math.PI; // angle in radians
    }

    // particle factory
    function makeParticle(i) {
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight;
        const size = 1.6 + Math.random() * 3.8; // visible blobs
        const color = CONFIG.PALETTE[i % CONFIG.PALETTE.length];
        return {
            x, y, px: x, py: y, vx: 0, vy: 0, size, color, life: 0, seed: Math.random() * 1000
        };
    }

    function initParticles() {
        particles = new Array(PARTICLES).fill(0).map((_, i) => makeParticle(i));
    }

    // drawing helpers: soft circle (fast-ish)
    function drawSoft(ctx, x, y, r, color, alpha) {
        // radial gradient approx — fillRect with gradient is ok
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
        g.addColorStop(0, color.replace(')', `,${alpha})`).replace('rgb', 'rgba'));
        g.addColorStop(0.2, color.replace(')', `,${alpha * 0.45})`).replace('rgb', 'rgba'));
        g.addColorStop(1, color.replace(')', ',0)').replace('rgb', 'rgba'));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r * 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // safer color helper (in case PALETTE uses rgba already)
    function alphaColor(col, a) {
        // if already rgba, replace alpha
        if (col.includes('rgba')) return col.replace(/rgba\(([^,]+),([^,]+),([^,]+),([^)]+)\)/, `rgba($1,$2,$3,${a})`);
        if (col.includes('rgb')) return col.replace(/rgb\(([^,]+),([^,]+),([^)]+)\)/, `rgba($1,$2,$3,${a})`);
        return col;
    }

    // optimized draw path
    function render(now) {
        if (!running || window._pageHidden) { requestAnimationFrame(render); return; }
        const t = now * CONFIG.TIME_SPEED;
        const dt = Math.min(50, now - lastTime);
        lastTime = now;

        // clear with slight fade (keeps trails smooth)
        flowCtx.globalCompositeOperation = 'source-over';
        flowCtx.fillStyle = `rgba(2,2,2,${0.12 * (window._perfMultiplier || 1)})`;
        flowCtx.fillRect(0, 0, window.innerWidth, window.innerHeight);

        // update + draw particles on flowCtx
        flowCtx.globalCompositeOperation = 'lighter';
        for (let p of particles) {
            // sample field angle at particle pos
            const ang = fieldAngle(p.x, p.y, t + p.seed);
            // velocity target
            const tx = Math.cos(ang) * (1 + CONFIG.VELOCITY * 2);
            const ty = Math.sin(ang) * (1 + CONFIG.VELOCITY * 2);

            // attraction to pointer (subtle) if active
            if (pointer.active && pointer.x !== null) {
                const dx = (pointer.x - p.x);
                const dy = (pointer.y - p.y);
                const dist = Math.hypot(dx, dy) + 0.0001;
                const pull = clamp(180 / dist, 0, 0.9) * (pointer.active ? 0.9 : 0);
                p.vx += (tx + dx / dist * pull - p.vx) * CONFIG.SMOOTH;
                p.vy += (ty + dy / dist * pull - p.vy) * CONFIG.SMOOTH;
            } else {
                p.vx += (tx - p.vx) * CONFIG.SMOOTH;
                p.vy += (ty - p.vy) * CONFIG.SMOOTH;
            }

            // integrate
            p.x += p.vx * (0.6 * (window._perfMultiplier || 1)) * (dt / 16);
            p.y += p.vy * (0.6 * (window._perfMultiplier || 1)) * (dt / 16);

            // wrap edges (soft)
            if (p.x < -40) p.x = window.innerWidth + 40;
            if (p.x > window.innerWidth + 40) p.x = -40;
            if (p.y < -40) p.y = window.innerHeight + 40;
            if (p.y > window.innerHeight + 40) p.y = -40;

            // draw faint line from previous pos (soft trail)
            flowCtx.strokeStyle = alphaColor(p.color, 0.06);
            flowCtx.lineWidth = Math.max(1, p.size * 0.2);
            flowCtx.beginPath();
            flowCtx.moveTo(p.x - p.vx * 1.2, p.y - p.vy * 1.2);
            flowCtx.lineTo(p.x, p.y);
            flowCtx.stroke();

            // draw soft glowing head
            const gcol = alphaColor(p.color, 0.18);
            const grd = flowCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(6, p.size * 6));
            grd.addColorStop(0, alphaColor(p.color, 0.85));
            grd.addColorStop(0.2, alphaColor(p.color, 0.24));
            grd.addColorStop(1, alphaColor(p.color, 0));
            flowCtx.fillStyle = grd;
            flowCtx.beginPath();
            flowCtx.arc(p.x, p.y, Math.max(6, p.size * 4), 0, Math.PI * 2);
            flowCtx.fill();
        }

        // glow layer: subtle long blur to give depth
        glowCtx.clearRect(0, 0, glowC.width, glowC.height);
        glowCtx.globalCompositeOperation = 'lighter';
        for (let p of particles) {
            const r = Math.max(10, p.size * 6) * (1.2 + Math.sin((p.seed + now * 0.001) % Math.PI));
            const color = alphaColor(p.color, CONFIG.GLOW_INTENSITY * (window._perfMultiplier || 1));
            const g = glowCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
            g.addColorStop(0, color);
            g.addColorStop(1, alphaColor(p.color, 0));
            glowCtx.fillStyle = g;
            glowCtx.beginPath();
            glowCtx.arc(p.x, p.y, r, 0, Math.PI * 2);
            glowCtx.fill();
        }

        // subtle parallax on card via pointer (smoothed)
        const card = document.querySelector('.card');
        if (card) {
            if (pointer.x !== null) {
                const nx = (pointer.x / window.innerWidth - 0.5) * 8;
                const ny = (pointer.y / window.innerHeight - 0.5) * 6;
                card.style.transform = `translate(${nx}px, ${ny}px)`;
            } else {
                card.style.transform = 'translateZ(0)';
            }
        }

        // next frame
        requestAnimationFrame(render);
    }

    // initialization helpers
    function init() {
        fitCanvas();
        initParticles();
        lastTime = performance.now();
        requestAnimationFrame(render);
    }

    function fitCanvas() {
        // DPR adapt: allow external window._adaptiveDPR set by PerfControl
        DPR = Math.max(1, (window.devicePixelRatio || 1) * (window._adaptiveDPR || 1));
        flowC.width = Math.floor(window.innerWidth * DPR);
        flowC.height = Math.floor(window.innerHeight * DPR);
        glowC.width = flowC.width;
        glowC.height = flowC.height;
        flowC.style.width = window.innerWidth + 'px';
        flowC.style.height = window.innerHeight + 'px';
        flowC.getContext('2d').setTransform(DPR, 0, 0, DPR, 0, 0);
        glowC.style.width = window.innerWidth + 'px';
        glowC.style.height = window.innerHeight + 'px';
        glowC.getContext('2d').setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function initParticles() {
        particles = [];
        const pal = CONFIG.PALETTE;
        for (let i = 0; i < PARTICLES; i++) {
            const p = {
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 0.6,
                vy: (Math.random() - 0.5) * 0.6,
                size: 1.6 + Math.random() * 3.8,
                color: pal[i % pal.length],
                seed: Math.random() * 1000
            };
            particles.push(p);
        }
    }

    // visibility handling
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) { window._pageHidden = true; running = false; }
        else { window._pageHidden = false; running = true; lastTime = performance.now(); requestAnimationFrame(render); }
    });

    // adaptive performance controller (auto)
    (function perfDetect() {
        const conn = navigator.connection || null;
        const slowNet = conn && (conn.saveData || (conn.effectiveType && (conn.effectiveType.includes('2g') || conn.effectiveType.includes('3g'))));
        const lowMem = navigator.deviceMemory && navigator.deviceMemory < 2;
        const cpu = navigator.hardwareConcurrency || 4;
        if (slowNet || lowMem || cpu <= 2) {
            window._perfMultiplier = 0.72;
            window._adaptiveDPR = Math.max(1, Math.floor((window.devicePixelRatio || 1) / 1.6));
        } else if (cpu <= 4) {
            window._perfMultiplier = 1.0;
            window._adaptiveDPR = 1;
        } else {
            window._perfMultiplier = 1.2;
            window._adaptiveDPR = 1;
        }
        // adjust particle count dynamically
        if (window._perfMultiplier < 0.9) {
            PARTICLES = Math.max(12, Math.floor(PARTICLES * 0.45));
        }
    })();

    // resize handler (throttled)
    let rTO = null;
    window.addEventListener('resize', () => {
        clearTimeout(rTO);
        rTO = setTimeout(() => {
            fitCanvas();
            initParticles();
        }, 120);
    });

    // start
    init();

    // expose debug API
    window.__YusufFlow = {
        pause() { running = false; },
        resume() { if (!prefersReduced) { running = true; requestAnimationFrame(render); } },
        setIntensity(v) { /* v: 0.5..1.8 */ window._perfMultiplier = v || 1 }
    };

    // respect reduced-motion: if user prefers reduced, stop heavy loops
    if (prefersReduced) {
        running = false;
        // draw a single frame static subtle background for visual
        render(performance.now());
    }

})();
