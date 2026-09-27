/* Частицы: звёзды (отдельный слой за сценой), лепестки, фонарики, салют (слой над сценой). */
(function () {
  const TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[(Math.random() * a.length) | 0];
  const FIRE = ['#f6d27a', '#ffe9b0', '#f7c6c0', '#ffd0c8', '#ffffff', '#e6c375', '#fff1d6'];
  const PETAL = ['#e8b4b0', '#f3d2cf', '#fbf4e8', '#e6c375', '#d9a5a0'];

  let fx, fctx, st, sctx, W = 0, H = 0, dpr = 1, reduced = false;
  let stars = [], shooting = null;
  const petals = [], lanterns = [], rockets = [], sparks = [];
  let amt = { petals: 0, lanterns: 0, stars: 0 };
  let lanternSprite;

  function makeLanternSprite() {
    const c = document.createElement('canvas'), s = 96;
    c.width = c.height = s;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,214,140,.55)'); g.addColorStop(.45, 'rgba(255,170,80,.18)'); g.addColorStop(1, 'rgba(255,150,60,0)');
    x.fillStyle = g; x.fillRect(0, 0, s, s);
    const b = x.createLinearGradient(0, 30, 0, 70);
    b.addColorStop(0, '#ffe6a8'); b.addColorStop(.6, '#ffb45c'); b.addColorStop(1, '#e0783a');
    x.fillStyle = b;
    x.beginPath();
    x.moveTo(38, 32); x.quadraticCurveTo(48, 28, 58, 32); x.lineTo(62, 64); x.quadraticCurveTo(48, 70, 34, 64); x.closePath();
    x.fill();
    x.fillStyle = 'rgba(255,250,220,.9)'; x.beginPath(); x.ellipse(48, 62, 5, 2.4, 0, 0, TAU); x.fill();
    return c;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    for (const [c, x] of [[fx, fctx], [st, sctx]]) {
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    // Звёзды хранятся в долях экрана: смена высоты (адресная строка) не перетасовывает небо
    if (!stars.length) {
      const n = Math.min(220, Math.round(W * H / 4200));
      stars = Array.from({ length: n }, () => ({
        fx: Math.random(), fy: Math.pow(Math.random(), 1.35) * 0.8, r: Math.random() < .08 ? rnd(1.3, 2) : rnd(.35, 1.1),
        ph: rnd(0, TAU), sp: rnd(.6, 2.4)
      }));
    }
  }

  function init(fxCanvas, starCanvas, opts = {}) {
    fx = fxCanvas; st = starCanvas; reduced = !!opts.reduced;
    fctx = fx.getContext('2d'); sctx = st.getContext('2d');
    lanternSprite = makeLanternSprite();
    resize();
    window.addEventListener('resize', resize);
  }

  function set(o) { Object.assign(amt, o); }

  /* ---------- салют ---------- */
  function burst(x, y, heart) {
    const n = heart ? 90 : 80, c1 = pick(FIRE), c2 = pick(FIRE), power = rnd(.9, 1.25);
    for (let i = 0; i < n; i++) {
      let vx, vy;
      if (heart) {
        const a = i / n * TAU;
        vx = 16 * Math.pow(Math.sin(a), 3) * 9 * power;
        vy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * 9 * power;
      } else {
        const a = rnd(0, TAU), v = rnd(50, 210) * power;
        vx = Math.cos(a) * v; vy = Math.sin(a) * v;
      }
      sparks.push({ x, y, vx, vy, life: 0, max: rnd(1.1, 1.8), c: i % 2 ? c1 : c2, r: rnd(1, 2.2), g: heart ? 22 : 55 });
    }
    sparks.push({ x, y, vx: 0, vy: 0, life: 0, max: .35, c: '#fff6dc', r: 26, flash: true, g: 0 });
  }

  function firework(x, y, opts = {}) {
    if (reduced || rockets.length > 6 || sparks.length > 1500) return;
    const heart = opts.heart ?? Math.random() < 0.22;
    rockets.push({ x0: x + rnd(-40, 40), y0: H + 10, x, y, t: 0, d: rnd(.7, 1), heart });
  }

  /* ---------- кадр ---------- */
  function frame(t, dt) {
    dt = Math.min(dt, 0.05);
    drawStars(t, dt);
    fctx.clearRect(0, 0, W, H);
    if (reduced) return;
    drawPetals(dt);
    drawLanterns(t, dt);
    drawFireworks(dt);
  }

  function drawStars(t, dt) {
    sctx.clearRect(0, 0, W, H);
    if (amt.stars <= 0.01) return;
    sctx.fillStyle = '#fffbe9';
    for (const s of stars) {
      const a = reduced ? .8 : .45 + .55 * Math.sin(t * s.sp + s.ph);
      sctx.globalAlpha = amt.stars * Math.max(.08, a);
      sctx.beginPath(); sctx.arc(s.fx * W, s.fy * H, s.r, 0, TAU); sctx.fill();
    }
    sctx.globalAlpha = 1;
    if (reduced) return;
    if (!shooting && amt.stars > .8 && Math.random() < dt / 5) {
      shooting = { x: rnd(W * .1, W * .8), y: rnd(0, H * .3), vx: rnd(380, 520), vy: rnd(140, 220), life: 0 };
    }
    if (shooting) {
      const s = shooting; s.life += dt; s.x += s.vx * dt; s.y += s.vy * dt;
      const a = Math.max(0, 1 - s.life / .9) * amt.stars;
      const g = sctx.createLinearGradient(s.x, s.y, s.x - s.vx * .18, s.y - s.vy * .18);
      g.addColorStop(0, `rgba(255,248,220,${a})`); g.addColorStop(1, 'rgba(255,248,220,0)');
      sctx.strokeStyle = g; sctx.lineWidth = 1.6; sctx.lineCap = 'round';
      sctx.beginPath(); sctx.moveTo(s.x, s.y); sctx.lineTo(s.x - s.vx * .18, s.y - s.vy * .18); sctx.stroke();
      if (s.life > .9) shooting = null;
    }
  }

  function drawPetals(dt) {
    const want = Math.round(amt.petals * Math.min(46, W / 9));
    if (petals.length < want && Math.random() < 0.5) {
      petals.push({ x: rnd(-20, W + 20), y: -20, vy: rnd(28, 60), sway: rnd(.6, 1.6), ph: rnd(0, TAU), rot: rnd(0, TAU), vr: rnd(-2, 2), flip: rnd(0, TAU), vf: rnd(2, 5), s: rnd(4, 8), c: pick(PETAL) });
    }
    for (let i = petals.length - 1; i >= 0; i--) {
      const p = petals[i];
      p.ph += dt * p.sway; p.y += p.vy * dt; p.x += Math.sin(p.ph) * 22 * dt; p.rot += p.vr * dt; p.flip += p.vf * dt;
      if (p.y > H + 20) { if (petals.length > want) petals.splice(i, 1); else { p.y = -20; p.x = rnd(-20, W + 20); } continue; }
      fctx.save();
      fctx.globalAlpha = Math.min(1, amt.petals * 1.4) * .9;
      fctx.translate(p.x, p.y); fctx.rotate(p.rot); fctx.scale(1, Math.max(.15, Math.abs(Math.cos(p.flip))));
      fctx.fillStyle = p.c;
      fctx.beginPath(); fctx.ellipse(0, 0, p.s, p.s * .58, 0, 0, TAU); fctx.fill();
      fctx.restore();
    }
  }

  function drawLanterns(t, dt) {
    const want = Math.round(amt.lanterns * 22);
    if (lanterns.length < want && Math.random() < dt * 2.2) {
      const s = rnd(.45, 1);
      lanterns.push({ x: rnd(W * .05, W * .95), y: H + 60, vy: rnd(16, 34) * (0.6 + s * .6), s, ph: rnd(0, TAU), fl: rnd(0, TAU) });
    }
    for (let i = lanterns.length - 1; i >= 0; i--) {
      const l = lanterns[i];
      l.y -= l.vy * dt; l.ph += dt * .6;
      if (l.y < -80) { lanterns.splice(i, 1); continue; }
      const size = 70 * l.s, flick = .85 + .15 * Math.sin(t * 9 + l.fl);
      const fade = Math.min(1, (H + 60 - l.y) / 120) * Math.min(1, (l.y + 80) / (H * .35));
      fctx.globalAlpha = fade * flick * Math.min(1, amt.lanterns * 2);
      fctx.drawImage(lanternSprite, l.x + Math.sin(l.ph) * 10 - size / 2, l.y - size / 2, size, size);
    }
    fctx.globalAlpha = 1;
  }

  function drawFireworks(dt) {
    fctx.globalCompositeOperation = 'lighter';
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i]; r.t += dt / r.d;
      const k = 1 - Math.pow(1 - Math.min(1, r.t), 2);
      const x = r.x0 + (r.x - r.x0) * k, y = r.y0 + (r.y - r.y0) * k;
      fctx.fillStyle = 'rgba(255,230,170,.9)';
      fctx.beginPath(); fctx.arc(x, y, 2, 0, TAU); fctx.fill();
      sparks.push({ x, y, vx: rnd(-10, 10), vy: rnd(10, 40), life: 0, max: .45, c: '#ffcf7a', r: 1.1, g: 20 });
      if (r.t >= 1) { burst(r.x, r.y, r.heart); rockets.splice(i, 1); }
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i]; s.life += dt;
      if (s.life > s.max) { sparks.splice(i, 1); continue; }
      const a = 1 - s.life / s.max;
      if (s.flash) {
        const g = fctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * (1 + s.life * 6));
        g.addColorStop(0, `rgba(255,246,220,${a * .7})`); g.addColorStop(1, 'rgba(255,246,220,0)');
        fctx.fillStyle = g; fctx.beginPath(); fctx.arc(s.x, s.y, s.r * (1 + s.life * 6), 0, TAU); fctx.fill();
        continue;
      }
      s.vx *= Math.pow(.25, dt); s.vy = s.vy * Math.pow(.25, dt) + s.g * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      fctx.globalAlpha = a;
      fctx.strokeStyle = s.c; fctx.lineWidth = s.r; fctx.lineCap = 'round';
      fctx.beginPath(); fctx.moveTo(s.x - s.vx * .045, s.y - s.vy * .045); fctx.lineTo(s.x, s.y); fctx.stroke();
      if (Math.random() < .08) { fctx.fillStyle = '#fff'; fctx.fillRect(s.x, s.y, 1.2, 1.2); }
    }
    fctx.globalAlpha = 1;
    fctx.globalCompositeOperation = 'source-over';
  }

  window.FX = { init, set, frame, firework, size: () => ({ W, H }) };
})();
