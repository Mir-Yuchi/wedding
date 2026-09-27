/* Живой фон конверта: золотая пыль поднимается, лепестки опускаются. Останавливается, когда конверт убран. */
(function () {
  const cv = document.getElementById('gateFx');
  if (!cv || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = cv.getContext('2d');
  const TAU = Math.PI * 2, rnd = (a, b) => a + Math.random() * (b - a);
  const PETALS = ['#ecbcb6', '#f5d6d0', '#fbf1e4', '#e9cf94'];
  let W = 0, H = 0, dust = [], petals = [];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);
  dust = Array.from({ length: Math.min(90, Math.round(W * H / 9000)) }, () => ({
    x: rnd(0, W), y: rnd(0, H), r: rnd(.6, 2), vy: rnd(6, 18), ph: rnd(0, TAU), sp: rnd(1, 3)
  }));
  petals = Array.from({ length: 14 }, () => ({
    x: rnd(0, W), y: rnd(-H, H), s: rnd(4, 8), vy: rnd(14, 30), ph: rnd(0, TAU), rot: rnd(0, TAU), vr: rnd(-1.5, 1.5), fl: rnd(0, TAU), c: PETALS[(Math.random() * PETALS.length) | 0]
  }));

  let last = performance.now();
  function frame(now) {
    if (!document.getElementById('gate')) { window.removeEventListener('resize', resize); return; }
    const dt = Math.min(.05, (now - last) / 1000), t = now / 1000;
    last = now;
    ctx.clearRect(0, 0, W, H);
    for (const d of dust) {
      d.y -= d.vy * dt; d.x += Math.sin(t * .6 + d.ph) * 6 * dt;
      if (d.y < -4) { d.y = H + 4; d.x = rnd(0, W); }
      const a = .35 + .65 * Math.abs(Math.sin(t * d.sp + d.ph));
      const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 3);
      g.addColorStop(0, `rgba(255,236,180,${a})`); g.addColorStop(.4, `rgba(222,180,90,${a * .6})`); g.addColorStop(1, 'rgba(222,180,90,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(d.x, d.y, d.r * 3, 0, TAU); ctx.fill();
    }
    for (const p of petals) {
      p.y += p.vy * dt; p.ph += dt; p.x += Math.sin(p.ph) * 18 * dt; p.rot += p.vr * dt; p.fl += dt * 3;
      if (p.y > H + 12) { p.y = -12; p.x = rnd(0, W); }
      ctx.save(); ctx.globalAlpha = .85;
      ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.max(.2, Math.abs(Math.cos(p.fl))));
      ctx.fillStyle = p.c; ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * .6, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
