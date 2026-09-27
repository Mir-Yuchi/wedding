(function () {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const target = Date.parse(CONFIG.startIso);
  let lang = 'ru';

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  if (reduced) document.documentElement.classList.add('reduced');

  /* ---------- язык ---------- */
  const splitLetters = (node, text, offset) => {
    node.innerHTML = '';
    [...text].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'ch'; s.textContent = ch === ' ' ? '\u00a0' : ch; s.style.setProperty('--i', i + offset);
      node.appendChild(s);
    });
    node.setAttribute('aria-label', text);
  };

  function setLang(l) {
    lang = l;
    const T = I18N[l];
    document.documentElement.lang = T.html;
    document.title = T.title;
    $$('[data-i18n]').forEach(n => { n.textContent = T[n.dataset.i18n]; });
    $$('[data-i18n-html]').forEach(n => { n.innerHTML = T[n.dataset.i18nHtml]; });
    $$('[data-i18n-alt]').forEach(n => { n.alt = T[n.dataset.i18nAlt]; });
    $$('[data-names]').forEach(n => { n.textContent = `${T.groom} & ${T.bride}`; });
    const date = Core.formatDate(l, CONFIG.date);
    $$('[data-date]').forEach(n => { n.textContent = date; });
    $('#countDate').textContent = T.countDate(date);
    $('#addr').innerHTML = T.address.map(escape).join('<br>');
    splitLetters($('#heroGroom'), T.groom, 0);
    splitLetters($('#heroBride'), T.bride, T.groom.length + 1);
    if ($('#gateScript')) splitLetters($('#gateScript'), T.gateScript, 0);
    $$('#langs button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.l === l)));
    updateMusicLabel();
    tick(true);
    try { localStorage.setItem('lang', l); } catch (e) { /* приватный режим — язык просто не запомнится */ }
  }
  const escape = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  $$('#langs button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.l)));

  /* ---------- отсчёт ---------- */
  const prev = {};
  function tick(force) {
    const c = Core.countdown(Date.now(), target);
    $('#countGrid').hidden = c.done;
    $('#countDone').hidden = !c.done;
    for (const u of ['d', 'h', 'm', 's']) {
      const node = $(`[data-u="${u}"]`), v = u === 'd' ? String(c[u]) : Core.pad2(c[u]);
      if (prev[u] !== v) {
        node.textContent = v;
        if (!force && !reduced) { node.classList.remove('flip'); void node.offsetWidth; node.classList.add('flip'); }
        prev[u] = v;
      }
    }
    $$('.lbl[data-l]').forEach(n => { n.textContent = I18N[lang].unit(+n.dataset.l, c[['d', 'h', 'm', 's'][n.dataset.l]]); });
  }
  setInterval(tick, 1000);

  /* ---------- музыка ---------- */
  const audio = $('#bgm'), mbtn = $('#musicBtn');
  let musicOn = false, fadeRaf = 0;
  function updateMusicLabel() {
    mbtn.classList.toggle('off', !musicOn);
    mbtn.setAttribute('aria-label', musicOn ? I18N[lang].musicOn : I18N[lang].musicOff);
    mbtn.setAttribute('aria-pressed', String(musicOn));
  }
  function fadeIn() {
    cancelAnimationFrame(fadeRaf);
    const t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / 2200);
      try { audio.volume = 0.75 * k; } catch (e) { /* iOS: громкость только системная */ }
      if (k < 1) fadeRaf = requestAnimationFrame(step);
    };
    fadeRaf = requestAnimationFrame(step);
  }
  function play() {
    if (!audio.src) audio.src = CONFIG.musicSrc;
    try { audio.volume = 0; } catch (e) { /* noop */ }
    const pr = audio.play();
    musicOn = true; updateMusicLabel();
    if (pr && pr.then) pr.then(fadeIn).catch(() => { musicOn = false; updateMusicLabel(); });
    else fadeIn();
  }
  mbtn.addEventListener('click', () => {
    if (musicOn) { audio.pause(); musicOn = false; updateMusicLabel(); } else play();
  });
  document.addEventListener('visibilitychange', () => {
    if (!musicOn) return;
    if (document.hidden) audio.pause(); else audio.play().catch(() => { musicOn = false; updateMusicLabel(); });
  });

  /* ---------- конверт ---------- */
  let opened = false;
  function openInvite() {
    if (opened) return;
    opened = true;
    play();
    const gate = $('#gate');
    gate.classList.add('open');
    const wait = reduced ? 400 : 2500;
    setTimeout(() => {
      document.body.classList.remove('locked');
      document.body.classList.add('intro');
      mbtn.hidden = false;
      $('#hero').focus({ preventScroll: true });
    }, wait - 500);
    setTimeout(() => gate.remove(), wait + 400);
  }
  $('#openBtn').addEventListener('click', openInvite);
  $('#env').addEventListener('click', openInvite);

  /* ---------- карты ---------- */
  $('#gmaps').href = CONFIG.googleUrl;
  $('#ymaps').href = CONFIG.yandexUrl;

  /* ---------- салют по касанию ---------- */
  // pointerup, а не click: iOS не шлёт click на window при касании «некликабельного» фона
  window.addEventListener('pointerup', e => {
    if (!e.isPrimary || Stage.state.active !== 's-final' || e.target.closest('a,button')) return;
    FX.firework(e.clientX, e.clientY);
  });

  /* ---------- запуск ---------- */
  Stage.init({ reduced });
  FX.init($('#fx'), $('#stars'), { reduced });
  let saved = null;
  try { saved = localStorage.getItem('lang'); } catch (e) { /* noop */ }
  const param = new URLSearchParams(location.search).get('lang');
  setLang(Core.pickLang(navigator.languages || [navigator.language], [param, saved]));

  const bar = $('#progress');
  let last = performance.now();
  function loop(now) {
    const t = now / 1000, dt = (now - last) / 1000;
    last = now;
    if (!document.hidden) {
      Stage.frame(t);
      FX.frame(t, dt);
      bar.style.transform = `scaleX(${Stage.state.progress})`;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
