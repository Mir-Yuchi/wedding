/* Сцена и таймлайн: прогресс прокрутки каждой секции → состояние сцены → отрисовка. */
(function () {
  const { clamp, lerp, seg, ease, mix, attr, css } = Core;
  const NS = 'http://www.w3.org/2000/svg';
  const $ = id => document.getElementById(id);
  const svgEl = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  };

  const SKY_GROUND = ['#e9d8bb', '#8a6f73', '#15142a'];
  const ARCH_WINDOW = ['#fff8ec', '#f1cfc2', '#221f3d'];
  const CAM = 0.8, S3 = 0.62, S4 = 0.74, SF = 0.94, SPACE = Couple.SPACE, SHIFT = -20;

  let el = {}, sections = [], reduced = false, walkPath, walkLen = 1, halfU = 200;
  let nextFire = 0, firstFire = true, twirlAt = null;
  const bloom = { outer: [], inner: [], leaves: [] };
  const state = { active: '', progress: 0 };

  /* ---------- построение SVG ---------- */
  const PETAL = 'M0 0C10 -14 10 -34 0 -46C-10 -34 -10 -14 0 0Z';
  const LEAF = 'M0 0C5 -6 5 -14 0 -20C-5 -14 -5 -6 0 0Z';

  function buildBloom() {
    const g = { outer: $('bloomOuter'), inner: $('bloomInner'), leaves: $('bloomLeaves'), dots: $('bloomDots') };
    for (let i = 0; i < 16; i++) bloom.leaves.push(svgEl('path', { d: LEAF, fill: i % 2 ? '#8fae93' : '#6f9479', transform: 'scale(0)' }, g.leaves));
    for (let i = 0; i < 12; i++) bloom.outer.push(svgEl('path', { d: PETAL, fill: i % 2 ? 'url(#goldV)' : '#e3b3ae', stroke: '#fffaf0', 'stroke-width': 1.2, transform: 'scale(0)' }, g.outer));
    for (let i = 0; i < 8; i++) bloom.inner.push(svgEl('path', { d: PETAL, fill: '#fffaf0', stroke: '#c9a15a', 'stroke-width': 1.2, transform: 'scale(0)' }, g.inner));
    for (let i = 0; i < 28; i++) {
      const a = i / 28 * Math.PI * 2;
      svgEl('circle', { cx: Math.cos(a) * 72, cy: Math.sin(a) * 72, r: i % 2 ? 1.5 : 2.6, fill: i % 2 ? '#e3b3ae' : '#c9a15a' }, g.dots);
    }
  }

  /* ---------- бумажная арка ---------- */
  const star8 = (cx, cy, r) => {
    let d = '';
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * .46 : r;
      d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`;
    }
    return d + 'Z';
  };
  const boteh = (x, y, s, flip) => {
    const f = flip ? -1 : 1, p = (dx, dy) => `${(x + dx * s * f).toFixed(1)} ${(y + dy * s).toFixed(1)}`;
    return `M${p(0, 0)}C${p(-4, -2)} ${p(-5.5, -8)} ${p(-1.5, -11.5)}C${p(2.5, -14)} ${p(6.5, -10.5)} ${p(4.5, -6.5)}C${p(3.5, -4.5)} ${p(1.5, -3)} ${p(0, 0)}Z`;
  };
  function scallopHole(base, n, bulge) {
    const tmp = svgEl('path', { d: base }, $('scene'));
    const L = tmp.getTotalLength();
    let d = '';
    for (let i = 0; i < n; i++) {
      const a = tmp.getPointAtLength(L * i / n), b = tmp.getPointAtLength(L * (i + 1) / n);
      const len = Math.hypot(b.x - a.x, b.y - a.y), nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
      if (!i) d += `M${a.x.toFixed(1)} ${a.y.toFixed(1)}`;
      d += `Q${((a.x + b.x) / 2 + nx * bulge).toFixed(1)} ${((a.y + b.y) / 2 + ny * bulge).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    }
    tmp.remove();
    return d + 'Z';
  }
  const rose = (x, y, r, c1, c2, parent) => {
    const g = svgEl('g', { transform: `translate(${x} ${y})` }, parent);
    svgEl('circle', { r, fill: c1 }, g);
    svgEl('circle', { r: r * .7, cx: r * .08, cy: -r * .06, fill: c2 }, g);
    svgEl('path', { d: `M${-r * .4} 0C${-r * .4} ${-r * .5} ${r * .4} ${-r * .5} ${r * .38} 0C${r * .3} ${r * .35} ${-r * .15} ${r * .35} ${-r * .12} 0`, fill: 'none', stroke: c1, 'stroke-width': r * .16, 'stroke-linecap': 'round' }, g);
    svgEl('circle', { r: r * .16, fill: c1 }, g);
  };
  const leafP = (x, y, len, rot, c, parent) => {
    const g = svgEl('g', { transform: `translate(${x} ${y}) rotate(${rot})` }, parent);
    svgEl('path', { d: `M0 0C${len * .3} ${-len * .38} ${len * .75} ${-len * .36} ${len} 0C${len * .75} ${len * .34} ${len * .3} ${len * .34} 0 0Z`, fill: c }, g);
    svgEl('path', { d: `M${len * .08} 0H${len * .85}`, stroke: '#fff', 'stroke-opacity': .35, 'stroke-width': .8 }, g);
  };
  const blossom = (x, y, r, parent) => {
    const g = svgEl('g', { transform: `translate(${x} ${y})` }, parent);
    for (let i = 0; i < 5; i++) svgEl('ellipse', { cx: 0, cy: -r * .55, rx: r * .38, ry: r * .55, fill: '#fffaf1', transform: `rotate(${i * 72})` }, g);
    svgEl('circle', { r: r * .26, fill: '#d9b060' }, g);
  };
  function flowerCluster(x, y, flip, parent) {
    const f = flip ? -1 : 1, g = svgEl('g', { filter: 'url(#paperSm)' }, parent);
    [[-40, -18, 20, 200], [-30, -40, 24, 235], [-6, -52, 22, 265], [20, -44, 20, 300], [34, -20, 18, 330], [-46, 2, 16, 170], [42, 0, 16, 10]]
      .forEach(([dx, dy, l, r], i) => leafP(x + dx * f, y + dy, l, flip ? 180 - r : r, i % 2 ? '#8fae93' : '#6f9479', g));
    rose(x - 18 * f, y - 16, 15, '#d98f8a', '#e9aca6', g);
    rose(x + 12 * f, y - 22, 13, '#f3d3cb', '#fbe6e0', g);
    rose(x - 2 * f, y - 2, 12, '#b9606a', '#cf7d82', g);
    rose(x + 28 * f, y - 4, 10, '#fbf1e6', '#fffaf3', g);
    blossom(x - 36 * f, y - 36, 8, g); blossom(x + 20 * f, y - 44, 7, g); blossom(x - 30 * f, y + 2, 6, g); blossom(x + 38 * f, y - 26, 6, g);
  }
  function buildArch() {
    const g = $('arch');
    g.innerHTML = '';
    const O0 = 'M88 640V300Q88 184 200 124Q312 184 312 300V640Z';
    const CREST = 'M132 60Q168 60 180 42Q190 26 200 18Q210 26 220 42Q232 60 268 60Z';
    svgEl('path', { id: 'archWindow', d: O0, fill: '#fff8ec' }, $('lWindow'));
    svgEl('path', { id: 'archGlow', d: 'M24 640V60H376V640M88 640V300Q88 184 200 124Q312 184 312 300V640', fill: 'none', stroke: '#ffd98a', 'stroke-width': 7, filter: 'url(#blur)' }, $('lGlow'));
    const portal = svgEl('g', { class: 'portal' }, g);
    const layer = (d, fill) => svgEl('path', { d, fill, 'fill-rule': 'evenodd', filter: 'url(#paper)' }, portal);
    // слой 1: задний, с куполом-гребнем
    layer(`M24 640V60H376V640Z ${CREST} ${O0}`, '#ead6ba');
    svgEl('circle', { cx: 200, cy: 12, r: 4.5, fill: '#c9a15a', filter: 'url(#paperSm)' }, portal);
    // слой 2: пудровый
    layer(`M40 640V78H360V640Z ${scallopHole('M98 640V300Q98 192 200 134Q302 192 302 300V640', 44, 5)}`, '#eccbbd');
    // слой 3: слоновая кость с резьбой (звёзды, бута, круги)
    let holes = '';
    for (let y = 170; y <= 600; y += 34) { holes += star8(76, y, 8) + star8(324, y, 8); }
    holes += boteh(96, 176, 3.2, false) + boteh(304, 176, 3.2, true);
    [[118, 148, 4], [282, 148, 4], [132, 128, 2.6], [268, 128, 2.6]].forEach(([cx, cy, r]) => { holes += `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`; });
    layer(`M58 640V96H342V640Z ${scallopHole('M110 640V300Q110 202 200 154Q290 202 290 300V640', 46, 6)} ${holes}`, '#fbf4e8');
    // золотые линии (прорисовываются в интро)
    const lines = svgEl('g', { fill: 'none', stroke: '#c9a15a' }, g);
    [['M58 640V96H342V640', 1.4], ['M24 640V60H132Q168 60 180 42Q190 26 200 18Q210 26 220 42Q232 60 268 60H376V640', 1.6],
      ['M92 640V300Q92 188 200 129Q308 188 308 300V640', 1.2]].forEach(([d, w]) => svgEl('path', { class: 'arch-line', pathLength: 1, d, 'stroke-width': w }, lines));
    // табличка с именами
    const label = svgEl('g', { class: 'portal', filter: 'url(#paperSm)' }, g);
    svgEl('rect', { x: 118, y: 104, width: 164, height: 28, rx: 3, fill: '#fffaf2', stroke: '#c9a15a', 'stroke-width': 1 }, label);
    const tx = svgEl('text', { x: 200, y: 123.5, 'text-anchor': 'middle', 'font-family': 'Marck Script, cursive', 'font-size': 15, fill: '#9a7438' }, label);
    tx.setAttribute('data-names', '');
    // цветы у подножия
    const fl = svgEl('g', { class: 'portal' }, g);
    flowerCluster(62, 632, false, fl);
    flowerCluster(338, 632, true, fl);
    svgEl('path', { id: 'archNight', 'fill-rule': 'evenodd', fill: '#2a1c3a', d: `M24 640V60H376V640Z ${CREST} ${O0}` }, $('lNight'));
  }

  function buildCusps() {
    const tmp = svgEl('path', { d: 'M104 640V300Q104 196 200 146Q296 196 296 300V640', fill: 'none' }, $('archCusps'));
    const L = tmp.getTotalLength(), n = 46;
    let d = '';
    for (let i = 0; i < n; i++) {
      const a = tmp.getPointAtLength(L * i / n), b = tmp.getPointAtLength(L * (i + 1) / n);
      const len = Math.hypot(b.x - a.x, b.y - a.y), nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
      d += `M${a.x.toFixed(1)} ${a.y.toFixed(1)}Q${((a.x + b.x) / 2 + nx * 7).toFixed(1)} ${((a.y + b.y) / 2 + ny * 7).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    }
    tmp.setAttribute('d', d);
    tmp.setAttribute('stroke', '#b8893b');
    tmp.setAttribute('stroke-width', '1.6');
  }

  function poplar(x, base, h, w, parent) {
    svgEl('path', { d: `M${x} ${base}C${x - w} ${base - h * .3} ${x - w * .6} ${base - h * .8} ${x} ${base - h}C${x + w * .6} ${base - h * .8} ${x + w} ${base - h * .3} ${x} ${base}Z`, fill: '#0f2a2c' }, parent);
    svgEl('path', { d: `M${x} ${base}C${x - w} ${base - h * .3} ${x - w * .6} ${base - h * .8} ${x} ${base - h}Z`, fill: '#1c4540', opacity: .8 }, parent);
  }

  function buildMap() {
    const m = $('map');
    m.innerHTML = '';
    const defs = svgEl('defs', {}, m);
    const grad = (id, stops, v = true) => {
      const g = svgEl('linearGradient', { id, x1: 0, y1: 0, x2: v ? 0 : 1, y2: v ? 1 : 0 }, defs);
      stops.forEach(([o, c]) => svgEl('stop', { offset: o, 'stop-color': c }, g));
    };
    grad('mWall', [[0, '#e6dac2'], [1, '#c4b69b']]);
    grad('mWallS', [[0, '#d2c5ab'], [1, '#ad9f84']], false);
    grad('mDome', [[0, '#6fb5b5'], [.6, '#3f8588'], [1, '#2c6468']], false);
    grad('mWater', [[0, '#35577a'], [1, '#18283f']]);
    const P = (d, fill, parent, extra = {}) => svgEl('path', Object.assign({ d, fill }, extra), parent);
    const shadowed = parent => svgEl('g', { filter: 'url(#paper)' }, parent);

    // дальние холмы и кипарисы
    const far = shadowed(m);
    P('M-600 580Q-300 452 -60 486Q80 436 200 474Q320 440 440 466Q700 426 1000 478V620H-600Z', '#2a2748', far);
    const cyp = svgEl('g', {}, far);
    const cypress = (x, base, h, w, c, g) => P(`M${x} ${base}C${x - w} ${base - h * .25} ${x - w * .7} ${base - h * .75} ${x} ${base - h}C${x + w * .7} ${base - h * .75} ${x + w} ${base - h * .25} ${x} ${base}Z`, c, g);
    [[-40, 492, 70, 8], [-10, 488, 90, 9], [40, 484, 64, 7], [70, 486, 84, 8], [120, 480, 60, 6], [470, 478, 80, 8], [500, 482, 64, 7], [540, 480, 90, 9]]
      .forEach(([x, b2, h, w]) => cypress(x, b2, h, w, '#223049', cyp));
    const mid = shadowed(m);
    P('M-600 720V524Q-200 490 60 508Q180 494 260 506Q420 488 1000 512V720Z', '#35305a', mid);

    // пышные деревья с круглыми кронами и кипарисы за домом
    const backTrees = shadowed(m);
    const roundTree = (x, y, r, c1, c2, g) => {
      P(`M${x - 3} ${y}L${x - 2} ${y - r * 1.3}H${x + 2}L${x + 3} ${y}Z`, '#3a2a22', g);
      [[-.55, -1.5, .7], [.55, -1.55, .72], [0, -2.05, .78], [-.9, -1.9, .5], [.9, -2, .52], [0, -1.35, .6]].forEach(([dx, dy, k], i) =>
        svgEl('circle', { cx: x + dx * r, cy: y + dy * r, r: k * r, fill: i % 2 ? c1 : c2 }, g));
    };
    roundTree(128, 512, 30, '#23433e', '#2b5049', backTrees);
    roundTree(478, 512, 32, '#23433e', '#2b5049', backTrees);
    [[206, 512, 150, 12], [394, 512, 140, 12], [190, 512, 100, 8], [410, 512, 96, 8]].forEach(([x, b2, h, w]) => cypress(x, b2, h, w, '#1f3b3a', backTrees));
    // гирлянда между деревьями
    const gl2 = P('M96 458Q150 486 206 440M394 440Q450 486 510 458', 'none', m, { stroke: '#3a2a22', 'stroke-width': .7 });
    const gb = svgEl('g', {}, m), L2 = gl2.getTotalLength();
    for (let i = 0; i <= 26; i++) {
      const pt = gl2.getPointAtLength(L2 * i / 26);
      svgEl('circle', { cx: pt.x, cy: pt.y + 1.6, r: 1.6, fill: ['#ffe1a0', '#f7c6c0', '#fff4de'][i % 3], class: 'bulb', style: `--d:${(i % 6) * .25}s` }, gb);
    }
    // садовая стена с арочными нишами
    const wall = shadowed(m);
    const wallSeg = (x0, x1) => {
      let niches = '';
      for (let x = x0 + 10; x + 12 <= x1 - 4; x += 20) niches += `M${x} 510V498Q${x} 492 ${x + 6} 490Q${x + 12} 492 ${x + 12} 498V510Z`;
      P(`M${x0} 512V484H${x1}V512Z ${niches}`, '#d8ccb2', wall, { 'fill-rule': 'evenodd' });
      P(`M${x0 - 2} 484H${x1 + 2}V479H${x0 - 2}Z`, '#c4b69b', wall);
      P(`M${x0} 481.5H${x1}`, 'none', wall, { stroke: '#c9a15a', 'stroke-width': 1.4, 'stroke-dasharray': '2 3' });
    };
    wallSeg(118, 214); wallSeg(386, 482);
    [118, 214, 386, 482].forEach(x => {
      P(`M${x - 4} 484V468H${x + 4}V484Z`, '#c4b69b', wall);
      svgEl('circle', { class: 'lamp-glow', cx: x, cy: 462, r: 11, fill: 'url(#lampGlow)' }, m);
      svgEl('circle', { cx: x, cy: 463, r: 3.2, fill: '#ffe2a0' }, m);
    });

    // ДОМ
    const h = shadowed(m);
    h.setAttribute('id', 'house');
    // флигели с резными столбиками-фонарями по углам
    const post = x => {
      P(`M${x - 4} 512V420H${x + 4}V512Z`, '#7a5236', h);
      P(`M${x - 6} 420h12l-2 -6h-8z`, '#c9a15a', h);
      svgEl('circle', { cx: x, cy: 410, r: 3.4, fill: '#ffe2a0' }, h);
      svgEl('circle', { class: 'lamp-glow', cx: x, cy: 410, r: 11, fill: 'url(#lampGlow)' }, h);
    };
    P('M222 512V432H378V512Z', 'url(#mWall)', h);
    P('M340 432H378V512H340Z', 'url(#mWallS)', h, { opacity: .6 });
    P('M218 426H382V434H218Z', '#cbb994', h);
    P('M220 430H380', 'none', h, { stroke: '#c9a15a', 'stroke-width': 2, 'stroke-dasharray': '2 3' });
    post(220); post(380);
    // второй этаж: айван-балкон с резными колоннами
    P('M240 426V380H360V426Z', 'url(#mWall)', h);
    P('M244 426V390H356V426Z', '#5a3a26', h);
    let arches = '';
    for (let i = 0; i < 5; i++) {
      const x0 = 246 + i * 21.6, x1 = x0 + 17.6, xm = (x0 + x1) / 2;
      arches += `M${x0} 424V402Q${x0} 394 ${xm} 391Q${x1} 394 ${x1} 402V424Z`;
    }
    P(arches, 'url(#doorLight)', h, { opacity: .95 });
    for (let i = 0; i <= 5; i++) {
      const x = 244.8 + i * 21.6;
      P(`M${x - 1.6} 426V398H${x + 1.6}V426Z`, '#8a5c3a', h);
      P(`M${x - 3} 398h6l-1 -3h-4z`, '#c9a15a', h);
    }
    P('M242 414H358', 'none', h, { stroke: '#8a5c3a', 'stroke-width': 1.4 });
    let rail = '';
    for (let x = 246; x <= 354; x += 5) rail += `M${x} 414V424`;
    P(rail, 'none', h, { stroke: '#8a5c3a', 'stroke-width': .8 });
    P('M234 382H366V372H234Z', '#5b3d2a', h);
    P('M236 372H364V366H236Z', '#6d4a33', h);
    P('M236 383H364', 'none', h, { stroke: '#c9a15a', 'stroke-width': 2.4, 'stroke-dasharray': '2 2.6' });
    P('M246 366Q300 350 354 366', '#e6dac2', h, { stroke: '#c9a15a', 'stroke-width': 1.2 });
    svgEl('circle', { cx: 300, cy: 352, r: 3, fill: '#e6c375' }, h);
    // айван с порталом
    P('M262 512V428H338V512Z', 'url(#girih)', h);
    P('M268 512V434H332V512Z', '#efe3cf', h);
    P('M262 512V428H338V512', 'none', h, { stroke: '#c9a15a', 'stroke-width': 1.6 });
    P('M276 512V470Q276 452 300 448Q324 452 324 470V512Z', 'url(#girih)', h);
    P('M280 512V470Q280 456 300 452Q320 456 320 470V512Z', 'url(#doorLight)', h);
    P('M280 512V470Q280 456 300 452V512Z', 'url(#wood)', h);
    P('M306 512V454Q315 458 320 468V512Z', 'url(#wood)', h);
    let carve = '';
    [474, 486, 498].forEach(y => { carve += `M283 ${y}h13v9h-13zM308.5 ${y}h8.5v9h-8.5z`; });
    P(carve, 'none', h, { stroke: '#caa25a', 'stroke-width': .8 });
    P('M276 470Q276 452 300 448Q324 452 324 470', 'none', h, { stroke: '#c9a15a', 'stroke-width': 1.4 });
    P('M289 436h20v10h-20z', '#fbf4e8', h, { stroke: '#c9a15a', 'stroke-width': 1 });
    const t33 = svgEl('text', { x: 299, y: 444.2, 'font-size': 8.5, fill: '#3a2a22', 'text-anchor': 'middle', 'font-family': 'Cormorant Garamond, serif', 'font-weight': 700 }, h);
    t33.textContent = '33';
    // окна
    [236, 253, 347, 364].forEach(x => {
      P(`M${x - 7} 492V470Q${x - 7} 461 ${x} 458Q${x + 7} 461 ${x + 7} 470V492Z`, 'url(#doorLight)', h, { stroke: '#8a6a45', 'stroke-width': 1.6 });
      P(`M${x} 459V492M${x - 7} 474H${x + 7}`, 'none', h, { stroke: '#8a6a45', 'stroke-width': 1 });
    });
    P('M282 512h36v4h-36z', '#b8a88a', h);
    // гирлянда и фонари
    P('M220 412Q230 430 240 386Q270 404 300 388Q330 404 360 386Q370 430 380 412', 'none', h, { id: 'garlandLine', stroke: '#3a2a22', 'stroke-width': .8 });
    svgEl('g', { id: 'garland' }, h);
    [271, 329].forEach(x => {
      P(`M${x} 426V430`, 'none', h, { stroke: '#8c6a2f', 'stroke-width': .8 });
      svgEl('circle', { class: 'lamp-glow', cx: x, cy: 437, r: 14, fill: 'url(#lampGlow)' }, h);
      P(`M${x - 4} 430H${x + 4}L${x + 5} 442Q${x} 446 ${x - 5} 442Z`, '#ffd78a', h, { stroke: '#8c6a2f', 'stroke-width': 1 });
    });

    const rolling = shadowed(m);
    P('M-600 720V600Q-160 560 120 590Q300 612 520 580Q760 556 1000 590V720Z', '#3b3563', rolling);
    P('M-600 720V668Q-100 640 200 662Q420 680 1000 650V720Z', '#433c6d', rolling);
    // сад: свет из ворот, хауз, дорожка, гранаты, клумбы
    const garden = svgEl('g', {}, m);
    P('M290 516H310L340 548H260Z', 'url(#doorGlow)', garden);
    const pool = shadowed(garden);
    P('M196 532Q196 520 230 520Q264 520 264 532Q264 544 230 544Q196 544 196 532Z', '#cbb994', pool);
    P('M200 532Q200 523 230 523Q260 523 260 532Q260 541 230 541Q200 541 200 532Z', 'url(#mWater)', pool);
    P('M212 528h10M232 530h14M216 535h8M238 536h10', 'none', pool, { stroke: '#ffd98a', 'stroke-width': 1.2, 'stroke-linecap': 'round', opacity: .7, class: 'lamp-glow' });
    const pomegranate = (x, y, s) => {
      const g = shadowed(garden);
      P(`M${x - 2 * s} ${y}L${x - 1 * s} ${y - 22 * s}H${x + 1 * s}L${x + 2 * s} ${y}Z`, '#5a3b2a', g);
      [[-10, -30, 13], [8, -32, 14], [0, -44, 14], [-14, -42, 10], [14, -44, 10]].forEach(([dx, dy, r]) => svgEl('circle', { cx: x + dx * s, cy: y + dy * s, r: r * s, fill: '#2f5a45' }, g));
      [[-8, -34], [10, -40], [2, -48], [-14, -44], [12, -28]].forEach(([dx, dy]) => svgEl('circle', { cx: x + dx * s, cy: y + dy * s, r: 2.6 * s, fill: '#c9464f' }, g));
    };
    pomegranate(168, 530, 1.1); pomegranate(436, 528, 1.1);
    const bed = shadowed(garden);
    P('M326 536Q352 522 384 536Z', '#2f5a45', bed);
    [[336, 530, '#e3a0a0'], [348, 526, '#fbf1e6'], [360, 527, '#d98f8a'], [372, 531, '#fbf1e6']].forEach(([x, y, c]) => svgEl('circle', { cx: x, cy: y, r: 3.2, fill: c }, bed));

    P('M26 716C110 690 56 640 140 612S252 560 300 516', 'none', m, { stroke: '#f1e2c0', 'stroke-opacity': .1, 'stroke-width': 18, 'stroke-linecap': 'round' });
    walkPath = P('M26 716C110 690 56 640 140 612S252 560 300 516', 'none', m, { id: 'walkPath', stroke: '#f1e2c0', 'stroke-width': 3, 'stroke-dasharray': '.1 9', 'stroke-linecap': 'round', opacity: .85 });
    walkLen = walkPath.getTotalLength();
    // цветы вдоль дорожки
    const edge = svgEl('g', { filter: 'url(#paperSm)' }, m);
    const FLOW = ['#e9aca6', '#fbf1e6', '#d98f8a', '#f3d3cb', '#e6c375'];
    for (let i = 3; i < 34; i++) {
      const f = i / 36, a = walkPath.getPointAtLength(walkLen * f), b = walkPath.getPointAtLength(walkLen * Math.min(1, f + .01));
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1, nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
      const sc = 1 - f * .55;
      [-1, 1].forEach((side, j) => {
        const off = (13 + (i % 3) * 3) * sc * side, x = a.x + nx * off, y = a.y + ny * off;
        svgEl('ellipse', { cx: x, cy: y + 1.5 * sc, rx: 5 * sc, ry: 2.4 * sc, fill: '#2f5a45' }, edge);
        svgEl('circle', { cx: x, cy: y, r: 2.6 * sc, fill: FLOW[(i + j * 2) % FLOW.length] }, edge);
      });
    }
    // светлячки и лунная дорожка в хаузе
    const flies = svgEl('g', {}, m);
    for (let i = 0; i < 18; i++) {
      svgEl('circle', { cx: 60 + ((i * 97) % 380), cy: 520 + ((i * 53) % 150), r: 1.4, fill: '#fff1a8', class: 'firefly', style: `--d:${(i % 7) * .6}s;--dx:${(i % 5) * 6 - 12}px` }, flies);
    }
    P('M226 526Q231 525 236 526M222 530Q231 529 240 530M226 535Q231 534 236 535', 'none', m, { stroke: '#fffbe6', 'stroke-width': 1, opacity: .75 });
    const lamps = svgEl('g', {}, m);
    [.16, .38, .6, .8].forEach((f, i) => {
      const p = walkPath.getPointAtLength(walkLen * f), x = p.x + (i % 2 ? 16 : -16), y = p.y;
      svgEl('circle', { cx: x, cy: y - 22, r: 16, fill: 'url(#lampGlow)', class: 'lamp-glow' }, lamps);
      svgEl('rect', { x: x - 1.2, y: y - 20, width: 2.4, height: 20, fill: '#3a2c24' }, lamps);
      P(`M${x - 3.5} ${y - 26}H${x + 3.5}L${x + 4} ${y - 19}H${x - 4}Z`, '#ffe2a0', lamps);
    });
    // передний план: кусты с бумажными розами
    const front = svgEl('g', {}, m);
    const bush = (x, y, flip) => {
      const g = shadowed(front);
      P(`M${x - 70} ${y + 40}Q${x - 60} ${y - 30} ${x} ${y - 36}Q${x + 60} ${y - 30} ${x + 70} ${y + 40}Z`, '#243f3a', g);
      flowerCluster(x + (flip ? -8 : 8), y - 6, flip, g);
    };
    bush(0, 690, false); bush(420, 700, true);
    cypress(-24, 720, 190, 16, '#1b3432', shadowed(front));
    cypress(430, 720, 170, 15, '#1b3432', shadowed(front));

    const bulbs = $('garland'), garland = $('garlandLine'), gl = garland.getTotalLength();
    for (let i = 0; i <= 22; i++) {
      const p = garland.getPointAtLength(gl * i / 22);
      svgEl('circle', { cx: p.x, cy: p.y + 2, r: 1.8, fill: ['#ffe1a0', '#f7c6c0', '#fff4de'][i % 3], class: 'bulb', style: `--d:${(i % 5) * .3}s` }, bulbs);
    }
  }

  /* ---------- сцены ---------- */
  function overlay(e, p, a, b, c, d, dy = 36) {
    if (!e) return;
    const i = ease.out(seg(p, a, b));
    const o = c == null ? 0 : ease.inOut(seg(p, c, d));
    css(e, '--o', (i * (1 - o)).toFixed(3));
    css(e, '--y', `${((1 - i) * dy - o * dy).toFixed(1)}px`);
    css(e, 'visibility', i * (1 - o) < 0.005 ? 'hidden' : 'visible');
  }

  // w: 0 — пара за краями экрана, 1 — стоят у арки лицом друг к другу
  function walkPose(w) {
    const ew = ease.inOut(w), gs = 200 - halfU - 40, bs = 200 + halfU + 40;
    return { gx: lerp(gs, 200 + SHIFT - SPACE, ew), bx: lerp(bs, 200 + SHIFT + SPACE, ew),
      moving: w > 0 && w < 1 ? 1 : 0, walk: w * 10 * Math.PI, join: 0, tilt: 0 };
  }
  const center = (s, extra = {}) => Object.assign({ gx: 200 + (SHIFT - SPACE) * s, bx: 200 + (SHIFT + SPACE) * s, s, join: 1, tilt: 1 }, extra);

  function mapPose(wp) {
    const pt = walkPath.getPointAtLength(walkLen * lerp(0.2, 1, wp));
    const s = lerp(0.42, 0.3, wp);
    return { gx: pt.x + 6 * s, bx: pt.x - 26 * s, y: pt.y, s, join: 0, tilt: 0, faceB: -1, moving: wp > 0 && wp < 1 ? 1 : 0, walk: wp * 20 * Math.PI };
  }

  const SCENES = {
    's-hero': {
      overlay(p) { overlay(el.hero, p, -1, 0, .15, .8, 50); overlay(el.hint, p, -1, 0, .02, .15, 10); },
      actors(p, t, S) {
        S.k = 0;
        // пара начинает выходить навстречу уже на первом экране
        S.couple = walkPose(.45 * ease.inOut(seg(p, .1, 1)));
      }
    },
    's-meet': {
      overlay(p) { overlay(el.meetCap, p, .74, .88, null, null, 16); },
      actors(p, t, S) {
        S.k = lerp(0, .3, p);
        S.couple = Object.assign(walkPose(lerp(.45, 1, seg(p, 0, .3))), {
          join: ease.inOut(seg(p, .28, .4)), tilt: ease.inOut(seg(p, .32, .44))
        });
        S.heart = seg(p, .36, .62);
        S.bloom = seg(p, .4, .76);
        S.petals = seg(p, .55, .7);
      }
    },
    's-invite': {
      overlay(p) { overlay(el.invite, p, .1, .32, .84, 1, 60); },
      actors(p, t, S) {
        const sh = ease.inOut(seg(p, 0, .3));
        S.k = lerp(.3, .8, p);
        S.couple = center(lerp(1, S3, sh));
        S.bloom = 1; S.bloomOp = 1 - sh; S.bloomY = lerp(232, 205, sh); S.bloomS = lerp(1, .8, sh);
        S.petals = 1 - seg(p, .15, .35);
      }
    },
    's-yes': {
      overlay(p) {
        overlay(el.yes, p, .08, .3, .84, 1, 70);
        css(el.yes, '--r', `${lerp(-11, -3, ease.out(seg(p, .08, .34))) + seg(p, .84, 1) * 6}deg`);
      },
      actors(p, t, S) {
        S.k = .8;
        S.couple = center(S3);
        S.petals = seg(p, .08, .3) * (1 - seg(p, .8, 1));
      }
    },
    's-count': {
      overlay(p) { overlay(el.count, p, .14, .34, .86, 1, 40); },
      actors(p, t, S) {
        S.k = lerp(.8, 2, ease.inOut(seg(p, 0, .7)));
        S.cam = lerp(1, CAM, ease.inOut(seg(p, 0, .4)));
        S.couple = center(lerp(S3, S4, ease.inOut(seg(p, 0, .5))));
      }
    },
    's-venue': {
      overlay(p) { overlay(el.venue, p, .12, .28, .9, 1, 40); },
      actors(p, t, S) {
        S.k = 2;
        S.archOp = 1 - seg(p, 0, .12);
        S.cam = p < .14 ? CAM : 1;
        S.mapOp = seg(p, .06, .24);
        S.moon = 1 - seg(p, 0, .12);
        if (p < .14) S.couple = center(S4, { opacity: 1 - seg(p, 0, .12) });
        else S.couple = Object.assign(mapPose(seg(p, .26, .86)), { opacity: seg(p, .16, .26) });
      }
    },
    's-final': {
      overlay(p) { overlay(el.final, p, .3, .5, null, null, 30); css(el.fireHint, 'opacity', seg(p, .55, .68).toFixed(3)); },
      actors(p, t, S) {
        S.k = 2;
        S.mapOp = 1 - seg(p, 0, .14);
        S.moon = seg(p, .12, .3);
        S.archOp = seg(p, .1, .26);
        S.cam = p < .1 ? 1 : CAM;
        S.glow = S.archOp;
        S.lanterns = seg(p, .2, .4);
        S.bloom = seg(p, .3, .62); S.bloomY = 236; S.bloomS = .82; S.bloomOp = .92;
        if (p < .1) { S.couple = Object.assign(mapPose(1), { opacity: 1 - seg(p, 0, .08), moving: 0 }); return; }
        const amp = reduced ? 0 : seg(p, .12, .3), ph = t * 2.4, sway = Math.sin(t * 1.2) * 5 * amp;
        let twirl = 0;
        if (amp >= 1) {
          if (twirlAt === null) twirlAt = t + 2.2;
          const k = (t - twirlAt) / 1.7;
          if (k >= 1) twirlAt = t + 5.5; else if (k > 0) twirl = ease.inOut(k);
        } else twirlAt = null;
        S.couple = center(SF, {
          gx: 200 + (SHIFT - SPACE) * SF - sway, bx: 200 + (SHIFT + SPACE) * SF + sway, opacity: seg(p, .1, .22),
          rot: Math.sin(ph) * 3.2 * amp, bob: Math.abs(Math.sin(ph)) * 3 * amp,
          twirl, join: 1 - Math.sin(twirl * Math.PI) * .9
        });
        if (!reduced && p > .35 && t > nextFire) {
          const { W, H } = FX.size();
          FX.firework(W * lerp(.18, .82, Math.random()), H * lerp(.12, .38, Math.random()), firstFire ? { heart: true } : {});
          firstFire = false;
          nextFire = t + lerp(1.6, 3, Math.random());
        }
      }
    }
  };

  /* ---------- отрисовка ---------- */
  const defaults = () => ({ cam: 1, k: 0, archOp: 1, glow: 0, bloom: 0, bloomOp: 1, bloomY: 232, bloomS: 1, heart: 0, petals: 0, lanterns: 0, mapOp: 0,
    moon: 1, couple: { gx: 200 - halfU - 70, bx: 200 + halfU + 90 } });

  function renderBloom(b, S, t) {
    css(el.bloom, 'display', b <= 0 || S.bloomOp <= 0.001 ? 'none' : '');
    if (el.bloom.style.display === 'none') return;
    attr(el.bloom, 'opacity', S.bloomOp);
    attr(el.bloom, 'transform', `translate(200 ${S.bloomY}) scale(${S.bloomS})`);
    attr(el.bloomSpin, 'transform', `rotate(${reduced ? 0 : t * 5})`);
    attr(el.vine, 'stroke-dashoffset', 1 - ease.out(seg(b, 0, .5)));
    attr(el.core, 'transform', `scale(${ease.back(seg(b, 0, .3))})`);
    bloom.inner.forEach((e, i) => attr(e, 'transform', `rotate(${i * 45}) scale(${ease.back(seg(b, .1 + i * .04, .45 + i * .04)) * .72})`));
    bloom.outer.forEach((e, i) => attr(e, 'transform', `rotate(${i * 30 + 15}) scale(${ease.back(seg(b, .3 + i * .025, .7 + i * .025))})`));
    bloom.leaves.forEach((e, i) => attr(e, 'transform', `rotate(${i * 22.5 + 11}) translate(0 -50) scale(${ease.back(seg(b, .5 + i * .015, .8 + i * .015))})`));
    attr(el.bloomDots, 'opacity', seg(b, .65, .95));
    attr(el.bloomGlow, 'opacity', ease.inOut(b) * (.7 + Math.sin(t * 2) * .15) * (1 + S.glow * .3));
  }

  function render(S, t) {
    const k = S.k, dusk = clamp(k), night = clamp(k - 1);
    css(el.skyDusk, 'opacity', dusk);
    css(el.skyNight, 'opacity', night);
    css(el.sun, '--sy', `${(k * 60).toFixed(1)}%`);
    css(el.sun, 'opacity', clamp(1 - k * 1.25));
    css(el.moon, 'opacity', clamp((k - 1.3) / .6) * S.moon);
    css(el.moon, '--my', `${((1 - clamp((k - 1.2) / .8)) * 40).toFixed(1)}px`);
    css(el.ground, 'background', k <= 1 ? mix(SKY_GROUND[0], SKY_GROUND[1], dusk) : mix(SKY_GROUND[1], SKY_GROUND[2], night));
    attr(el.archWindow, 'fill', k <= 1 ? mix(ARCH_WINDOW[0], ARCH_WINDOW[1], dusk) : mix(ARCH_WINDOW[1], ARCH_WINDOW[2], night));
    // слои арки: только прозрачность и масштаб на видеокарте, без перерисовки
    const ao = S.archOp, hidden = ao <= 0.001 ? 'hidden' : 'visible';
    css(el.lWindow, 'opacity', (ao * lerp(.22, .55, night)).toFixed(3));
    css(el.lArch, 'opacity', ao.toFixed(3));
    css(el.lNight, 'opacity', (ao * night * .36).toFixed(3));
    css(el.lGlow, 'opacity', (ao * (night * .5 + S.glow * .5) * .9).toFixed(3));
    el.camLayers.forEach(l => { css(l, 'visibility', hidden); css(l, 'transform', S.cam === 1 ? 'none' : `scale(${S.cam.toFixed(4)})`); });

    renderBloom(S.bloom, S, t);

    const h = S.heart;
    attr(el.heart, 'opacity', h > 0 && h < 1 ? Math.sin(h * Math.PI) : 0);
    attr(el.heart, 'transform', `translate(180 ${lerp(484, 360, ease.out(h))}) scale(${lerp(.5, 1.7, h)})`);

    const cam = S.cam === 1 ? '' : `translate(200 640) scale(${S.cam}) translate(-200 -640)`;
    el.cams.forEach(g => attr(g, 'transform', cam));
    css(el.lClouds, 'opacity', (clamp(1 - dusk * 1.2) * .95).toFixed(3));
    attr(el.map, 'opacity', S.mapOp);
    css(el.map, 'display', S.mapOp <= 0.001 ? 'none' : '');

    Couple.pose(Object.assign({ y: 640, s: 1, t }, S.couple));
    FX.set({ petals: reduced ? 0 : S.petals, lanterns: reduced ? 0 : S.lanterns, stars: clamp((k - 1.1) / .7) });
  }

  function layout() {
    const W = window.innerWidth, H = window.innerHeight, sc = Math.min(W / 400, H / 720);
    halfU = W / 2 / sc;
    document.documentElement.style.setProperty('--gh', `${(80 * sc).toFixed(1)}px`);
    document.documentElement.style.setProperty('--sw', `${(400 * sc).toFixed(1)}px`);
  }

  function init(opts = {}) {
    reduced = !!opts.reduced;
    buildArch();
    ['stage', 'skyDusk', 'skyNight', 'sun', 'moon', 'ground', 'archWindow', 'bloom', 'bloomSpin',
      'vine', 'core', 'bloomDots', 'bloomGlow', 'heart', 'map', 'lClouds', 'lWindow', 'lArch', 'lNight', 'lGlow'].forEach(id => { el[id] = $(id); });
    el.cams = [...document.querySelectorAll('#scene .cam')];
    el.camLayers = [...document.querySelectorAll('#stage .cam-l')];
    el.hero = $('hero'); el.hint = $('scrollHint'); el.meetCap = $('meetCap'); el.invite = $('inviteCard'); el.yes = $('yesCard');
    el.count = $('countPanel'); el.venue = $('venueCard'); el.final = $('finalText'); el.fireHint = $('fireHint');
    buildBloom();
    buildMap();
    Couple.mount($('couple'));
    sections = [...document.querySelectorAll('#story > section')].map(s => ({ el: s, id: s.id, def: SCENES[s.id], p: 0 }));
    layout();
    window.addEventListener('resize', layout);
  }

  function frame(t) {
    const vh = window.innerHeight;
    let active = sections[0];
    for (const sec of sections) {
      const r = sec.el.getBoundingClientRect();
      sec.p = clamp(-r.top / Math.max(1, r.height - vh));
      if (r.top <= 1) active = sec;
      if (r.top < vh && r.bottom > 0) sec.def.overlay(sec.p);
    }
    const S = defaults();
    active.def.actors(active.p, t, S);
    render(S, t);
    state.active = active.id;
    const max = document.documentElement.scrollHeight - vh;
    state.progress = max > 0 ? clamp(window.scrollY / max) : 0;
  }

  window.Stage = { init, frame, state };
})();
