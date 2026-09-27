(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Core = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (p, a, b) => clamp((p - a) / (b - a));

  const ease = {
    inOut: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    out: t => 1 - Math.pow(1 - t, 3),
    back: t => {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      const c = 1.70158;
      return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
    }
  };

  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => {
    const A = hex(a), B = hex(b);
    return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',')})`;
  };

  const pad2 = n => String(n).padStart(2, '0');

  function pluralRu(n, [one, few, many]) {
    const a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return one;
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
    return many;
  }

  function countdown(nowMs, targetMs) {
    const left = Math.floor((targetMs - nowMs) / 1000);
    if (left <= 0) return { done: true, d: 0, h: 0, m: 0, s: 0 };
    return {
      done: false,
      d: Math.floor(left / 86400),
      h: Math.floor((left % 86400) / 3600),
      m: Math.floor((left % 3600) / 60),
      s: left % 60
    };
  }

  // preferred: одно значение или список по приоритету (?lang, затем сохранённый)
  function pickLang(languages, preferred, supported = ['ru', 'uz', 'en']) {
    const norm = v => String(v || '').toLowerCase().split('-')[0];
    for (const p of [].concat(preferred)) {
      if (p && supported.includes(norm(p))) return norm(p);
    }
    for (const l of languages || []) {
      if (supported.includes(norm(l))) return norm(l);
    }
    return 'en';
  }

  const MONTHS = {
    ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
    uz: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  };

  function formatDate(lang, { y, m, d }) {
    const mn = MONTHS[lang][m - 1];
    if (lang === 'ru') return `${d} ${mn} ${y}`;
    if (lang === 'uz') return `${y}-yil ${d}-${mn}`;
    return `${mn} ${d}, ${y}`;
  }

  return { clamp, lerp, seg, ease, mix, pad2, pluralRu, countdown, pickLang, formatDate };
});
