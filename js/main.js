/* js/main.js — Advanced Flow Background
   - multi-layer flow + particles + ribbons + glow
   - auto quality, pause on hidden, respects reduced-motion
   - pointer attraction / burst on tap
*/

(() => {
    // elements (must match your HTML)
    const flowC = document.getElementById('flowCanvas');
    const glowC = document.getElementById('glowCanvas');
    if (!flowC || !glowC) {
        console.warn('flowCanvas or glowCanvas not found.');
        return;
    }

    // contexts
    const flowCtx = flowC.getContext('2d', { alpha: true });
    const glowCtx = glowC.getContext('2d', { alpha: true });

    // buffer for trails (offscreen)
    const buffer = document.createElement('canvas');
    const bufCtx = buffer.getContext('2d', { alpha: true });

    // DPR adaptive
    let DPR = Math.max(1, window.devicePixelRatio || 1);

    // device heuristics
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};
    const saveData = conn.saveData;
    const lowMem = navigator.deviceMemory && navigator.deviceMemory < 2;
    const isMobile = window.matchMedia && window.matchMedia('(pointer:coarse)').matches;
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // config — tweak these to change "intensity"
    const CONFIG = {
        BASE_PARTICLES: isMobile ? 30 : 80,
        RIBBONS: isMobile ? 18 : 34,
        FLOW_SCALE: 0.0008,        // lower => bigger swirls
        TIME_SPEED: 0.00085,       // evolution speed
        VELOCITY: 0.62,
        SMOOTH: 0.14,
        TRAIL_ALPHA: 0.12,         // buffer fade (0.02 - 0.3)
        GLOW_MULT: 0.9,
        PALETTE: ['rgba(36,211,255,1)', 'rgba(90,255,180,0.95)', 'rgba(120,220,255,0.55)'],
    };

    // adaptive counts
    let PARTICLES = Math.max(8, Math.floor(CONFIG.BASE_PARTICLES * (saveData || lowMem ? 0.45 : 1)));
    let RIBBON_COUNT = Math.max(6, Math.floor(CONFIG.RIBBONS * (saveData || lowMem ? 0.6 : 1)));

    // state
    let particles = [];
    let ribbons = []; // each ribbon is array of points
    let w = 0, h = 0;
    let running = !prefersReduced;
    let lastTime = performance.now();

    // pointer state
    let pointer = { x: null, y: null, down: false, vx: 0, vy: 0, lastX: null, lastY: null };

    // util
    const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
    const randF = (a, b) => a + Math.random() * (b - a);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    // fit canvases (and buffer)
    function fitAll() {
        DPR = Math.max(1, (window.devicePixelRatio || 1) * (window._adaptiveDPR || 1));
        w = Math.floor(window.innerWidth * DPR);
        h = Math.floor(window.innerHeight * DPR);

        [flowC, glowC, buffer].forEach(c => {
            c.width = w; c.height = h;
            c.style.width = window.innerWidth + 'px';
            c.style.height = window.innerHeight + 'px';
            const ctx = c.getContext ? c.getContext('2d') : null;
            if (ctx) ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        });
        // re-init columns/ribbons when size changes
        initParticles();
        initRibbons();
    }

    // Light-weight smooth noise-based flow angle (combination of sines for organic feel)
    function flowAngle(x, y, t) {
        const nx = x * CONFIG.FLOW_SCALE;
        const ny = y * CONFIG.FLOW_SCALE;
        const a = Math.sin((nx + t) * 1.02) * 1.0;
        const b = Math.cos((ny - t * 0.74) * 0.9) * 0.6;
        const c = Math.sin((nx * 0.62 + ny * 0.43 + Math.sin(t * 0.28)) * 0.95) * 0.8;
        return (a + b + c) * Math.PI; // radians
    }

    // create particles
    function makeParticle(i) {
        return {
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * 0.6,
            vy: (Math.random() - 0.5) * 0.6,
            size: 1.2 + Math.random() * 3.6,
            color: CONFIG.PALETTE[i % CONFIG.PALETTE.length],
            seed: Math.random() * 1000
        };
    }

    function initParticles() {
        particles = [];
        for (let i = 0; i < PARTICLES; i++) particles.push(makeParticle(i));
        // clear buffer for nice fresh trails
        bufCtx.clearRect(0, 0, buffer.width, buffer.height);
    }

    // ribbons: seed some streamlines that follow field — each ribbon keeps small point history
    function initRibbons() {
        ribbons = [];
        const cols = Math.max(3, Math.floor(RIBBON_COUNT / 2));
        for (let i = 0; i < RIBBON_COUNT; i++) {
            const startX = Math.random() * window.innerWidth;
            const startY = Math.random() * window.innerHeight;
            ribbons.push({
                pts: [{ x: startX, y: startY }],
                width: 8 + Math.random() * 14,
                color: CONFIG.PALETTE[i % CONFIG.PALETTE.length],
                life: rand(4000, 9000),
                t0: performance.now() + Math.random() * 1000
            });
        }
    }

    // update ribbons: step forward along flow and keep tail length limited
    function updateRibbons(t, dt) {
        for (const rb of ribbons) {
            // advance head according to flow, influenced by time
            const last = rb.pts[rb.pts.length - 1];
            const angle = flowAngle(last.x, last.y, t * CONFIG.TIME_SPEED + rb.t0 * 0.0005);
            const speed = (rb.width * 0.02) * (1 + Math.sin(rb.t0 * 0.0003 + t * 0.0005));
            const nx = last.x + Math.cos(angle) * speed * (window._perfMultiplier || 1);
            const ny = last.y + Math.sin(angle) * speed * (window._perfMultiplier || 1);

            // occasional jitter and pointer influence
            let tx = nx, ty = ny;
            if (pointer.x !== null) {
                const dx = pointer.x - last.x;
                const dy = pointer.y - last.y;
                const d = Math.hypot(dx, dy) + 0.0001;
                const pull = clamp(1200 / d, 0, 0.9);
                tx += dx * 0.002 * pull;
                ty += dy * 0.002 * pull;
            }

            rb.pts.push({ x: tx, y: ty });
            // trim to length proportional to width
            const maxLen = Math.max(8, Math.floor(160 / (rb.width * 0.08)));
            while (rb.pts.length > maxLen) rb.pts.shift();
            // slowly nudge starting point occasionally to avoid stuck ribbons
            if (Math.random() < 0.003) rb.pts[0].x += randF(-10, 10);
        }
    }

    // draw ribbons into buffer for natural trails (they will be blurred by glow canvas)
    function drawRibbonsToBuffer() {
        // draw semi-transparent strokes into buffer
        bufCtx.globalCompositeOperation = 'source-over';
        bufCtx.lineCap = 'round';
        bufCtx.lineJoin = 'round';
        for (const rb of ribbons) {
            if (rb.pts.length < 2) continue;
            // create gradient along ribbon
            const head = rb.pts[rb.pts.length - 1];
            const tail = rb.pts[0];
            const g = bufCtx.createLinearGradient(tail.x, tail.y, head.x, head.y);
            g.addColorStop(0, rb.color.replace('1)', '0)'));
            g.addColorStop(0.6, rb.color.replace('1)', '0.18)'));
            g.addColorStop(1, rb.color);
            bufCtx.strokeStyle = g;
            bufCtx.lineWidth = Math.max(2, rb.width * (window._perfMultiplier || 1));
            bufCtx.beginPath();
            const pts = rb.pts;
            bufCtx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) bufCtx.lineTo(pts[i].x, pts[i].y);
            bufCtx.stroke();
            // small bright head
            bufCtx.beginPath();
            bufCtx.fillStyle = rb.color.replace('1)', '0.14)');
            bufCtx.arc(head.x, head.y, Math.max(2, rb.width * 0.3), 0, Math.PI * 2);
            bufCtx.fill();
        }
    }

    // main render loop
    let last = performance.now();
    function render(now) {
        if (!running || window._pageHidden) { requestAnimationFrame(render); return; }
        const t = now;
        const dt = Math.min(50, now - last);
        last = now;

        // fade buffer slowly to keep trailing ribbons
        bufCtx.globalCompositeOperation = 'destination-out';
        bufCtx.fillStyle = `rgba(0,0,0,${CONFIG.TRAIL_ALPHA * (window._perfMultiplier || 1)})`;
        bufCtx.fillRect(0, 0, buffer.width, buffer.height);
        bufCtx.globalCompositeOperation = 'source-over';

        // update particles
        for (const p of particles) {
            const ang = flowAngle(p.x, p.y, t * CONFIG.TIME_SPEED + p.seed * 0.001);
            // target velocity from field
            const tx = Math.cos(ang) * (1 + CONFIG.VELOCITY * 1.2);
            const ty = Math.sin(ang) * (1 + CONFIG.VELOCITY * 1.2);

            // pointer attraction/repel
            if (pointer.x !== null) {
                const dx = pointer.x - p.x;
                const dy = pointer.y - p.y;
                const d = Math.hypot(dx, dy) + 0.0001;
                const pull = clamp(600 / d, 0, 0.9);
                p.vx += (tx + dx / d * pull - p.vx) * CONFIG.SMOOTH;
                p.vy += (ty + dy / d * pull - p.vy) * CONFIG.SMOOTH;
            } else {
                p.vx += (tx - p.vx) * CONFIG.SMOOTH;
                p.vy += (ty - p.vy) * CONFIG.SMOOTH;
            }
            p.x += p.vx * (0.72 * (window._perfMultiplier || 1)) * (dt / 16);
            p.y += p.vy * (0.72 * (window._perfMultiplier || 1)) * (dt / 16);
            // wrap
            if (p.x < -60) p.x = window.innerWidth + 60;
            if (p.x > window.innerWidth + 60) p.x = -60;
            if (p.y < -60) p.y = window.innerHeight + 60;
            if (p.y > window.innerHeight + 60) p.y = -60;
        }

        // update ribbons
        updateRibbons(now, dt);

        // draw flow canvas (lines + soft dots)
        flowCtx.clearRect(0, 0, flowC.width / DPR, flowC.height / DPR);
        flowCtx.globalCompositeOperation = 'lighter';
        for (const p of particles) {
            // faint streak
            flowCtx.strokeStyle = alpha(p.color, 0.06 * (window._perfMultiplier || 1));
            flowCtx.lineWidth = Math.max(1, p.size * 0.16);
            flowCtx.beginPath();
            flowCtx.moveTo(p.x - p.vx * 1.4, p.y - p.vy * 1.4);
            flowCtx.lineTo(p.x, p.y);
            flowCtx.stroke();
            // head
            const g = flowCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(6, p.size * 6));
            g.addColorStop(0, alpha(p.color, 0.75));
            g.addColorStop(0.18, alpha(p.color, 0.22));
            g.addColorStop(1, alpha(p.color, 0));
            flowCtx.fillStyle = g;
            flowCtx.beginPath();
            flowCtx.arc(p.x, p.y, Math.max(6, p.size * 3), 0, Math.PI * 2);
            flowCtx.fill();
        }

        // draw ribbons to buffer and composite blurred glow
        drawRibbonsToBuffer();
        // composite buffer to glow canvas with blur (glowCtx has CSS blur in stylesheet as well)
        glowCtx.clearRect(0, 0, glowC.width / DPR, glowC.height / DPR);
        // draw buffer with slight globalAlpha
        glowCtx.globalAlpha = 0.88 * (window._perfMultiplier || 1) * CONFIG.GLOW_MULT;
        glowCtx.drawImage(buffer, 0, 0);
        glowCtx.globalAlpha = 1;

        // optionally add faint scanning noise on top (cheap)
        if (Math.random() < 0.02 * (window._perfMultiplier || 1)) {
            flowCtx.globalAlpha = 0.06;
            flowCtx.fillStyle = '#0a0d0a';
            flowCtx.fillRect(rand(0, window.innerWidth), rand(0, window.innerHeight), rand(40, window.innerWidth * 0.25), rand(2, 18));
            flowCtx.globalAlpha = 1;
        }

        // request next
        requestAnimationFrame(render);
    }

    // helper: set alpha for rgba strings
    function alpha(rgba, a) {
        if (rgba.startsWith('rgba')) return rgba.replace(/rgba\(([^,]+),([^,]+),([^,]+),([^)]+)\)/, `rgba($1,$2,$3,${a})`);
        if (rgba.startsWith('rgb')) return rgba.replace(/rgb\(([^,]+),([^,]+),([^)]+)\)/, `rgba($1,$2,$3,${a})`);
        // fallback, try to insert
        return rgba;
    }

    // pointer listeners
    (function pointerSetup() {
        // pointer move
        let last = 0;
        window.addEventListener('pointermove', (e) => {
            const now = performance.now();
            if (now - last < 12) return; last = now;
            pointer.x = e.clientX; pointer.y = e.clientY;
            if (pointer.lastX !== null) {
                pointer.vx = pointer.x - pointer.lastX;
                pointer.vy = pointer.y - pointer.lastY;
            }
            pointer.lastX = pointer.x; pointer.lastY = pointer.y;
        }, { passive: true });

        // pointer down -> burst
        window.addEventListener('pointerdown', (e) => {
            pointer.down = true;
            burst(e.clientX, e.clientY, 28 + Math.floor(Math.random() * 24));
            setTimeout(() => pointer.down = false, 180);
        });

        window.addEventListener('pointerup', () => { pointer.down = false; });

        // touch fallback handled by pointer events above
    })();

    // burst: spawn quick particles and temporary ribbon jitter
    function burst(x, y, count = 20) {
        for (let i = 0; i < count; i++) {
            particles.push({
                x: x + randF(-40, 40),
                y: y + randF(-40, 40),
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                size: 2 + Math.random() * 4,
                color: CONFIG.PALETTE[Math.floor(Math.random() * CONFIG.PALETTE.length)],
                seed: Math.random() * 1000
            });
        }
        // cap particles array to reasonable limit
        if (particles.length > PARTICLES * 4) particles.splice(0, particles.length - PARTICLES * 2);
        // jitter ribbons
        for (const r of ribbons) {
            if (Math.random() < 0.5) r.pts[r.pts.length - 1].x += randF(-40, 40);
            if (Math.random() < 0.5) r.pts[r.pts.length - 1].y += randF(-40, 40);
        }
    }

    // schedule gentle auto-bursts for life
    setInterval(() => {
        if (!running) return;
        if (Math.random() < 0.08) {
            const x = Math.random() * window.innerWidth;
            const y = Math.random() * window.innerHeight;
            burst(x, y, 8 + Math.floor(Math.random() * 16));
        }
    }, 2400);

    // init
    function init() {
        fitAll();
        initParticles();
        initRibbons();
        last = performance.now();
        if (running) requestAnimationFrame(render);
    }

    // visibility handling
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) { window._pageHidden = true; running = false; }
        else { window._pageHidden = false; running = true; last = performance.now(); requestAnimationFrame(render); }
    });

    // adaptive perf detection
    (function perfDetect() {
        const conn = navigator.connection || null;
        const slowNet = conn && (conn.saveData || (conn.effectiveType && (conn.effectiveType.includes('2g') || conn.effectiveType.includes('3g'))));
        const lowmem = navigator.deviceMemory && navigator.deviceMemory < 2;
        const cpu = navigator.hardwareConcurrency || 4;
        if (slowNet || lowmem || cpu <= 2) {
            window._perfMultiplier = 0.68;
            window._adaptiveDPR = Math.max(1, Math.floor((window.devicePixelRatio || 1) / 1.6));
            document.documentElement.classList.add('performance-low');
        } else if (cpu <= 4) {
            window._perfMultiplier = 1.0;
            window._adaptiveDPR = 1;
            document.documentElement.classList.remove('performance-low');
        } else {
            window._perfMultiplier = 1.18;
            window._adaptiveDPR = 1;
            document.documentElement.classList.remove('performance-low');
        }
        // reduce counts if multiplier low
        if (window._perfMultiplier < 0.9) {
            PARTICLES = Math.max(12, Math.floor(PARTICLES * 0.5));
            RIBBON_COUNT = Math.max(6, Math.floor(RIBBON_COUNT * 0.6));
        }
    })();

    // handle resize (throttled)
    let rTO = null;
    window.addEventListener('resize', () => {
        clearTimeout(rTO);
        rTO = setTimeout(() => { fitAll(); }, 120);
    });

    // start
    init();

    // expose debug helpers
    window.__YusufBg = {
        pause() { running = false; },
        resume() { if (!prefersReduced) { running = true; requestAnimationFrame(render); } },
        setPerf(v) { window._perfMultiplier = v || 1; },
        burstAt(x, y, cnt = 30) { burst(x, y, cnt); }
    };

    // honor reduced-motion immediately: draw static frame then stop loops
    if (prefersReduced) {
        running = false;
        // render one quiet frame
        (function oneFrame() {
            // very subtle static visual: draw one set of soft blobs
            bufCtx.clearRect(0, 0, buffer.width, buffer.height);
            for (let i = 0; i < Math.min(8, PARTICLES); i++) {
                const px = Math.random() * window.innerWidth;
                const py = Math.random() * window.innerHeight;
                bufCtx.fillStyle = alpha(CONFIG.PALETTE[i % CONFIG.PALETTE.length], 0.08);
                bufCtx.beginPath();
                bufCtx.arc(px, py, 40 + Math.random() * 80, 0, Math.PI * 2);
                bufCtx.fill();
            }
            // composite to glow once
            glowCtx.clearRect(0, 0, glowC.width / DPR, glowC.height / DPR);
            glowCtx.globalAlpha = 0.9;
            glowCtx.drawImage(buffer, 0, 0);
            glowCtx.globalAlpha = 1;
            // flow lowest opacity frame
            flowCtx.clearRect(0, 0, flowC.width / DPR, flowC.height / DPR);
        })();
    }

})();
