/* Жених и невеста — элегантные SVG-фигурки в профиль, лицом друг к другу.
   Рисунок сделан в «макетных» координатах (жених стоит в x=165, невеста в x=238, земля y=640),
   каждая фигурка сдвинута так, что её ноги оказываются в локальной точке (0,0). */
(function () {
  const { clamp, lerp, attr } = Core;
  const BASE = 0.86;             // общий масштаб фигурок относительно макета
  const G0 = 165, B0 = 238, Y0 = 640;

  const DEFS = `
    <defs>
      <linearGradient id="cpChapan" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stop-color="#101d4a"/><stop offset=".55" stop-color="#1c3578"/><stop offset="1" stop-color="#2b4f9e"/>
      </linearGradient>
      <pattern id="cpIkat" width="11" height="24" patternUnits="userSpaceOnUse">
        <path d="M3 0L5.5 4L3 8L5.5 12L3 16L5.5 20L3 24H6.5L9 20L6.5 16L9 12L6.5 8L9 4L6.5 0Z" fill="#3fb4c0"/>
        <rect x="10" width=".7" height="24" fill="#e9c77a"/>
      </pattern>
      <linearGradient id="cpShadeL" x1="0" x2="1"><stop offset="0" stop-color="#050a20" stop-opacity=".55"/><stop offset=".6" stop-color="#050a20" stop-opacity="0"/></linearGradient>
      <linearGradient id="cpShadeR" x1="1" x2="0"><stop offset="0" stop-color="#6b5a45" stop-opacity=".38"/><stop offset=".55" stop-color="#6b5a45" stop-opacity="0"/></linearGradient>
      <linearGradient id="cpGold" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fbe3a4"/><stop offset=".5" stop-color="#d9ab52"/><stop offset="1" stop-color="#9b6f27"/></linearGradient>
      <linearGradient id="cpSkinG" x1="1" x2="0"><stop offset="0" stop-color="#f1c9a4"/><stop offset="1" stop-color="#c98e69"/></linearGradient>
      <linearGradient id="cpSkinB" x1="0" x2="1"><stop offset="0" stop-color="#fbdcc1"/><stop offset="1" stop-color="#dcab86"/></linearGradient>
      <linearGradient id="cpHair" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#4a342a"/><stop offset=".5" stop-color="#1e1411"/><stop offset="1" stop-color="#0e0a08"/></linearGradient>
      <linearGradient id="cpSatin" x1="0" x2="1"><stop offset="0" stop-color="#fffefb"/><stop offset=".35" stop-color="#fbf5ea"/><stop offset=".75" stop-color="#eee2cc"/><stop offset="1" stop-color="#d6c3a2"/></linearGradient>
      <linearGradient id="cpSheen" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <linearGradient id="cpVeil" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".78"/><stop offset=".6" stop-color="#fff" stop-opacity=".4"/><stop offset="1" stop-color="#fff" stop-opacity=".16"/></linearGradient>
      <linearGradient id="cpTrouser" x1="0" x2="1"><stop offset="0" stop-color="#15101c"/><stop offset="1" stop-color="#2c2438"/></linearGradient>
      <linearGradient id="cpBoot" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2b2023"/><stop offset=".6" stop-color="#0f0a0c"/><stop offset="1" stop-color="#000"/></linearGradient>
      <radialGradient id="cpRose" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#e2677a"/><stop offset=".6" stop-color="#a3283a"/><stop offset="1" stop-color="#6b1422"/></radialGradient>
      <radialGradient id="cpBlush" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fff2ee"/><stop offset=".6" stop-color="#f3c2c0"/><stop offset="1" stop-color="#d38e92"/></radialGradient>
      <radialGradient id="cpIvoryRose" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#f6ecdc"/><stop offset="1" stop-color="#d9c6a6"/></radialGradient>
      <filter id="cpPaper" color-interpolation-filters="sRGB" x="-15%" y="-10%" width="135%" height="125%"><feDropShadow dx="2.6" dy="3.6" stdDeviation="2.4" flood-color="#4a3218" flood-opacity=".4"/></filter>
      <filter id="cpPaperSm" color-interpolation-filters="sRGB" x="-30%" y="-20%" width="160%" height="140%"><feDropShadow dx="1.4" dy="2" stdDeviation="1.3" flood-color="#2a1a08" flood-opacity=".42"/></filter>
      <filter id="cpSoft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation=".6"/></filter>
      <filter id="cpRim" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.4"/></filter>
    </defs>`;

  const rose = (x, y, r, fill, rot = 0) => `
    <g transform="translate(${x} ${y}) rotate(${rot})">
      <circle r="${r}" fill="url(#${fill})"/>
      <path d="M${-r * .55} ${r * .1}C${-r * .5} ${-r * .6} ${r * .5} ${-r * .65} ${r * .55} 0C${r * .45} ${r * .5} ${-r * .2} ${r * .55} ${-r * .25} ${r * .05}C${-r * .2} ${-r * .3} ${r * .25} ${-r * .3} ${r * .22} ${r * .02}" fill="none" stroke="#000" stroke-opacity=".22" stroke-width="${r * .12}" stroke-linecap="round"/>
    </g>`;
  const leaf = (x, y, rot, len = 9, c = '#4f7a5c') =>
    `<path transform="translate(${x} ${y}) rotate(${rot})" d="M0 0C${len * .3} ${-len * .35} ${len * .75} ${-len * .35} ${len} 0C${len * .75} ${len * .3} ${len * .3} ${len * .3} 0 0Z" fill="${c}"/>`;

  const BOUQUET = `
    <g class="bouquet">
      <path d="M-2 10C-6 26 -10 40 -8 58M2 10C6 24 12 36 10 52" fill="none" stroke="url(#cpGold)" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M-4 8L-2 22L4 22L4 8Z" fill="#f4ecdc"/>
      ${leaf(-6, 4, 150, 14, '#3f6b50')}${leaf(6, 4, 30, 14, '#557f60')}${leaf(-2, -12, 230, 13, '#6b9474')}${leaf(4, -12, 300, 12, '#3f6b50')}
      ${leaf(-12, -2, 190, 10, '#8fb39a')}${leaf(12, -4, 350, 10, '#8fb39a')}
      ${rose(-6, -4, 6.4, 'cpRose', 20)}${rose(5, -6, 6, 'cpBlush', -30)}${rose(0, 4, 5.6, 'cpIvoryRose', 60)}
      ${rose(-10, 6, 4.4, 'cpBlush', 100)}${rose(10, 5, 4.6, 'cpRose', -80)}${rose(1, -13, 4.2, 'cpIvoryRose', 10)}
      <circle cx="-13" cy="-8" r="1.3" fill="#fff"/><circle cx="13" cy="-10" r="1.3" fill="#fff"/><circle cx="-3" cy="12" r="1.2" fill="#fff"/>
      <circle cx="8" cy="-15" r="1.1" fill="#fff"/><circle cx="-11" cy="11" r="1.1" fill="#fff"/>
    </g>`;

  /* ─────────────── ЖЕНИХ (смотрит вправо) ─────────────── */
  const CHAPAN = 'M160 352C150 356 138 362 134 372C128 392 130 420 134 450C136 490 134 540 131 594C152 599 184 599 204 592C198 550 192 500 190 452C192 430 194 400 191 378C189 366 180 358 170 355Z';
  const GROOM = `
    <g transform="translate(${-G0} ${-Y0})">
      <g class="g-legB">
        <path d="M140 588L143 632H160L159 588Z" fill="url(#cpTrouser)"/>
        <path d="M141 626H160L161 634Q171 635 174 641H140Z" fill="url(#cpBoot)"/>
        <path d="M144 630H158" stroke="#fff" stroke-opacity=".12" stroke-width="1"/>
      </g>
      <g class="g-legF">
        <path d="M163 588L167 632H184L181 588Z" fill="url(#cpTrouser)"/>
        <path d="M166 626H184L186 634Q197 635 200 641H165Z" fill="url(#cpBoot)"/>
        <path d="M169 630H183" stroke="#fff" stroke-opacity=".15" stroke-width="1"/>
      </g>
      <path d="${CHAPAN}" fill="url(#cpChapan)"/>
      <path d="${CHAPAN}" fill="url(#cpIkat)" opacity=".42"/>
      <path d="${CHAPAN}" fill="url(#cpShadeL)"/>
      <path d="M131 592C152 597 184 597 204 591" fill="none" stroke="url(#cpGold)" stroke-width="5"/>
      <path d="M131 592C152 597 184 597 204 591" fill="none" stroke="#7d1f2d" stroke-width="1.4" stroke-dasharray="2 3"/>
      <path d="M171 356C181 360 189 368 191 380C194 402 192 430 190 452C192 500 198 550 204 592" fill="none" stroke="url(#cpGold)" stroke-width="5.5"/>
      <path d="M171 356C181 360 189 368 191 380C194 402 192 430 190 452C192 500 198 550 204 592" fill="none" stroke="#7d1f2d" stroke-width="1.3" stroke-dasharray="1.5 3.5"/>
      <path d="M192 384C195 404 193 430 191 452C193 500 199 550 205 590" fill="none" stroke="#ffe6a8" stroke-width="1.6" opacity=".7" filter="url(#cpRim)"/>
      <path d="M137 400C140 440 139 500 136 580M150 380C152 440 153 520 152 594M176 470C180 520 184 560 188 594" fill="none" stroke="#050a20" stroke-opacity=".22" stroke-width="2"/>
      <path d="M166 354C174 356 180 361 182 368L176 372C173 365 170 361 163 358Z" fill="#f6f1e8"/>
      <path d="M133 445C150 449 176 449 191 445L191 460C176 464 150 464 133 460Z" fill="url(#cpGold)"/>
      <path d="M133 449C150 453 176 453 191 449M133 456C150 460 176 460 191 456" fill="none" stroke="#a3283a" stroke-width="1.4"/>
      <path d="M140 458L133 492L141 489ZM145 458L146 494L153 489Z" fill="url(#cpGold)"/>
      <path d="M133 489L141 489M146 492L153 489" stroke="#a3283a" stroke-width="1.6"/>
      <rect x="162" y="340" width="12" height="20" rx="3" fill="#c48a66"/>
      <g class="g-head">
        <path d="M163 358C160 350 152 342 148 332C144 322 145 308 152 301C158 296 170 294 177 298C181 301 183 306 183 311C183 313.5 182 315 182 316.5C183.5 320 185.5 324.5 187 327.6C187.6 329 186.6 330.6 184.6 330.8L182 331.2C181.3 332.4 181.8 333.8 182 335C182.3 336 181.2 337 180 337.4C180.8 338.4 181 339.8 180 340.8C179.6 342.4 179.6 344.2 178.5 345.8C177 347.6 174 347.8 172 349C170.5 351 171 354 172 358Z" fill="url(#cpSkinG)"/>
        <path d="M162 334C166 342 171 346.5 177.5 347.2" fill="none" stroke="#a8694a" stroke-opacity=".35" stroke-width="1.6"/>
        <path d="M182 316.5C183.5 320 185.5 324.5 187 327.6" fill="none" stroke="#ffe9cf" stroke-width="1" opacity=".8"/>
        <ellipse cx="158.6" cy="322" rx="3.6" ry="6.2" fill="#d69d78"/>
        <path d="M159.4 318.4C157.4 320 157.4 324 159.4 325.6" fill="none" stroke="#a8694a" stroke-width=".8"/>
        <path d="M147 318C146 304 155 295 168 294C177 294 183 299 183.5 306C180 303.5 175 303 171 304.5C167 306 165 310 164 314C163.4 317 163.4 320 163 322.5C160.4 320 156.4 318.6 153.4 320.4C150.6 322.2 149.6 326.4 150.6 331C148.2 328 147 323 147 318Z" fill="url(#cpHair)"/>
        <path d="M171 300C166 302 163 306 161 312M176 299.6C171 301 168 304 166 308" fill="none" stroke="#6b4a3a" stroke-width=".7" opacity=".7"/>
        <path d="M175 312.1Q178.8 309.9 182.4 311.7" fill="none" stroke="#24160f" stroke-width="1.7" stroke-linecap="round"/>
                <path d="M175.6 318.9Q178.1 316.2 180.9 318.6" fill="none" stroke="#24160f" stroke-width="1.3" stroke-linecap="round"/>
        <path d="M176.4 320.7Q178.4 321.6 180.2 320.5" fill="none" stroke="#a8694a" stroke-width=".55" opacity=".7"/>
        <path d="M180.9 318.6l1.1 .5M180.3 317.7l1 -.3" stroke="#24160f" stroke-width=".55" stroke-linecap="round"/>
        <path d="M182.6 329.4Q184 330.7 185.4 329.9" fill="none" stroke="#9c5f44" stroke-width=".8" stroke-linecap="round"/>
        <ellipse cx="176" cy="325.8" rx="4.8" ry="3.2" fill="#e38f80" opacity=".28"/>
        <path d="M180.4 331.8C178.2 333 177.2 334.8 177.4 336.6" fill="none" stroke="#a8694a" stroke-width=".6" opacity=".55"/>
        <path d="M182 335.2C181 336.5 179.6 337 177.6 336.1" fill="none" stroke="#8e4540" stroke-width="1.05" stroke-linecap="round"/>
        <path d="M180.4 337.8C180.8 338.8 180.6 339.8 179.8 340.6" fill="none" stroke="#c17a66" stroke-width="1.3" stroke-linecap="round"/>
        <path d="M148 307L150 289Q164 283 179 290L181 305Q165 300 148 307Z" fill="#141013"/>
        <path d="M150 290Q164 284 179 290" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="1.2"/>
        <path d="M148.5 305.5Q165 299.5 180.5 304.5" fill="none" stroke="#f4efe4" stroke-width="1" stroke-dasharray="1.6 1.6"/>
        <path d="M155 301q-5 -7 1 -10q6 3 -1 10M166 299q-5 -7 1 -10q6 3 -1 10M176 299q-4 -6 1 -9q5 3 -1 9" fill="none" stroke="#f4efe4" stroke-width="1.1"/>
      </g>
      <g class="g-arm">
        <path d="M168 366C181 363 190 371 191 384L195 446C195 453 181 455 180 448L172 392C171 384 168 376 168 366Z" fill="url(#cpChapan)"/>
        <path d="M168 366C181 363 190 371 191 384L195 446C195 453 181 455 180 448L172 392C171 384 168 376 168 366Z" fill="url(#cpIkat)" opacity=".42"/>
        <path d="M168 366C174 368 176 380 177 392L181 448C176 446 174 440 173 430L170 392C169 384 168 376 168 366Z" fill="#050a20" opacity=".3"/>
        <path d="M191 384L195 446" stroke="#ffe6a8" stroke-width="1.4" opacity=".6" filter="url(#cpRim)"/>
        <path d="M180 445L195 443" stroke="url(#cpGold)" stroke-width="4.5"/>
        <path d="M182 450C181 458 184 468 189 471C194 473 197 468 196 462C196 456 194 451 192 449Z" fill="url(#cpSkinG)"/>
      </g>
    </g>`;

  /* ─────────────── НЕВЕСТА (смотрит влево) ─────────────── */
  const DRESS = 'M230 366C224 370 219 378 219 390C219 408 222 424 226 440C214 500 198 578 184 640C232 648 300 648 338 640C320 600 290 540 262 480C256 466 252 452 250 440C254 420 256 400 254 384C252 374 246 368 240 366Z';
  const HEM = 'M186 638C232 646 300 646 336 638';
  const scallops = (() => { let d = 'M188 637'; for (let i = 0; i < 19; i++) d += ' q4 5 8 .6'; return d; })();
  const BRIDE = `
    <g transform="translate(${-B0} ${-Y0})">
      <g class="b-veil">
        <path d="M252 312C278 330 298 400 306 470C314 540 322 600 340 640L286 642C282 580 270 500 262 430C257 390 252 350 244 326Z" fill="url(#cpVeil)"/>
        <path d="M252 312C278 330 298 400 306 470C314 540 322 600 340 640" fill="none" stroke="#fff" stroke-width="1.2" opacity=".9"/>
        <path d="M253 314C279 332 299 402 307 472C315 542 323 602 341 640" fill="none" stroke="#e9cf94" stroke-width="2.2" stroke-dasharray=".5 5" stroke-linecap="round"/>
        <path d="M268 380C276 420 282 470 290 520M280 400C290 450 296 520 306 580" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1"/>
      </g>
      <g class="b-skirt">
        <path d="${DRESS}" fill="url(#cpSatin)"/>
        <path d="${DRESS}" fill="url(#cpShadeR)"/>
        <path d="M226 452C214 520 204 590 196 640L214 642C220 590 228 520 232 454Z" fill="url(#cpSheen)" opacity=".7"/>
        <path d="M236 454C236 530 240 590 246 644M244 452C252 520 266 590 280 644M250 460C266 530 290 590 314 642" fill="none" stroke="#b99f78" stroke-opacity=".35" stroke-width="1.4"/>
        <path d="M232 456C230 520 224 590 218 642" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="1.2"/>
        <path d="${scallops}" fill="none" stroke="#d4b06a" stroke-width="1.1"/>
        <path d="${HEM}" transform="translate(0 -9)" fill="none" stroke="url(#cpGold)" stroke-width="2.6" stroke-dasharray=".5 5.5" stroke-linecap="round"/>
        <path d="M196 612C236 620 296 620 328 612" fill="none" stroke="#e8d3a6" stroke-width="1" opacity=".8"/>
        <g transform="translate(200 628) rotate(-8)"><path d="M0 0C-4 -2 -5.5 -8 -1.5 -11.5C2.5 -14 6.5 -10.5 4.5 -6.5C3.5 -4.5 1.5 -3 0 0Z" fill="url(#cpGold)"/><circle cx="1.2" cy="-8" r="1.3" fill="#a3283a"/><path d="M-1 -3C-2 -6 -1 -9 1.5 -10" fill="none" stroke="#fff3cc" stroke-width=".5"/></g><g transform="translate(216 630) rotate(8)"><path d="M0 0C-4 -2 -5.5 -8 -1.5 -11.5C2.5 -14 6.5 -10.5 4.5 -6.5C3.5 -4.5 1.5 -3 0 0Z" fill="url(#cpGold)"/><circle cx="1.2" cy="-8" r="1.3" fill="#a3283a"/><path d="M-1 -3C-2 -6 -1 -9 1.5 -10" fill="none" stroke="#fff3cc" stroke-width=".5"/></g><g transform="translate(232 631) rotate(-8)"><path d="M0 0C-4 -2 -5.5 -8 -1.5 -11.5C2.5 -14 6.5 -10.5 4.5 -6.5C3.5 -4.5 1.5 -3 0 0Z" fill="url(#cpGold)"/><circle cx="1.2" cy="-8" r="1.3" fill="#a3283a"/><path d="M-1 -3C-2 -6 -1 -9 1.5 -10" fill="none" stroke="#fff3cc" stroke-width=".5"/></g><g transform="translate(248 631) rotate(8)"><path d="M0 0C-4 -2 -5.5 -8 -1.5 -11.5C2.5 -14 6.5 -10.5 4.5 -6.5C3.5 -4.5 1.5 -3 0 0Z" fill="url(#cpGold)"/><circle cx="1.2" cy="-8" r="1.3" fill="#a3283a"/><path d="M-1 -3C-2 -6 -1 -9 1.5 -10" fill="none" stroke="#fff3cc" stroke-width=".5"/></g><g transform="translate(264 631) rotate(-8)"><path d="M0 0C-4 -2 -5.5 -8 -1.5 -11.5C2.5 -14 6.5 -10.5 4.5 -6.5C3.5 -4.5 1.5 -3 0 0Z" fill="url(#cpGold)"/><circle cx="1.2" cy="-8" r="1.3" fill="#a3283a"/><path d="M-1 -3C-2 -6 -1 -9 1.5 -10" fill="none" stroke="#fff3cc" stroke-width=".5"/></g><g transform="translate(280 630) rotate(8)"><path d="M0 0C-4 -2 -5.5 -8 -1.5 -11.5C2.5 -14 6.5 -10.5 4.5 -6.5C3.5 -4.5 1.5 -3 0 0Z" fill="url(#cpGold)"/><circle cx="1.2" cy="-8" r="1.3" fill="#a3283a"/><path d="M-1 -3C-2 -6 -1 -9 1.5 -10" fill="none" stroke="#fff3cc" stroke-width=".5"/></g><g transform="translate(296 629) rotate(-8)"><path d="M0 0C-4 -2 -5.5 -8 -1.5 -11.5C2.5 -14 6.5 -10.5 4.5 -6.5C3.5 -4.5 1.5 -3 0 0Z" fill="url(#cpGold)"/><circle cx="1.2" cy="-8" r="1.3" fill="#a3283a"/><path d="M-1 -3C-2 -6 -1 -9 1.5 -10" fill="none" stroke="#fff3cc" stroke-width=".5"/></g><g transform="translate(312 627) rotate(8)"><path d="M0 0C-4 -2 -5.5 -8 -1.5 -11.5C2.5 -14 6.5 -10.5 4.5 -6.5C3.5 -4.5 1.5 -3 0 0Z" fill="url(#cpGold)"/><circle cx="1.2" cy="-8" r="1.3" fill="#a3283a"/><path d="M-1 -3C-2 -6 -1 -9 1.5 -10" fill="none" stroke="#fff3cc" stroke-width=".5"/></g><g transform="translate(326 624) rotate(-8)"><path d="M0 0C-4 -2 -5.5 -8 -1.5 -11.5C2.5 -14 6.5 -10.5 4.5 -6.5C3.5 -4.5 1.5 -3 0 0Z" fill="url(#cpGold)"/><circle cx="1.2" cy="-8" r="1.3" fill="#a3283a"/><path d="M-1 -3C-2 -6 -1 -9 1.5 -10" fill="none" stroke="#fff3cc" stroke-width=".5"/></g>
        <path d="M200 600q6 -8 12 0q6 -8 12 0q6 -8 12 0q6 -8 12 0q6 -8 12 0q6 -8 12 0q6 -8 12 0q6 -8 12 0q6 -8 12 0q6 -8 12 0" fill="none" stroke="#dcc08a" stroke-width=".9" opacity=".7"/>
      </g>
      <path d="M220 392C226 398 244 398 252 390M221 408C230 414 244 414 253 406" fill="none" stroke="url(#cpGold)" stroke-width="1"/>
      <g fill="#fffaf0" stroke="#d8c29a" stroke-width=".4">
        <circle cx="224" cy="396" r="1.3"/><circle cx="232" cy="398" r="1.3"/><circle cx="240" cy="398" r="1.3"/><circle cx="248" cy="395" r="1.3"/>
        <circle cx="226" cy="412" r="1.2"/><circle cx="234" cy="414" r="1.2"/><circle cx="242" cy="413" r="1.2"/><circle cx="250" cy="410" r="1.2"/>
      </g>
      <g transform="translate(230 430) rotate(-20) scale(.8)"><path d="M0 0C-4 -2 -5.5 -8 -1.5 -11.5C2.5 -14 6.5 -10.5 4.5 -6.5C3.5 -4.5 1.5 -3 0 0Z" fill="url(#cpGold)"/><circle cx="1.2" cy="-8" r="1.2" fill="#a3283a"/></g><g transform="translate(244 428) rotate(20) scale(.8)"><path d="M0 0C-4 -2 -5.5 -8 -1.5 -11.5C2.5 -14 6.5 -10.5 4.5 -6.5C3.5 -4.5 1.5 -3 0 0Z" fill="url(#cpGold)"/><circle cx="1.2" cy="-8" r="1.2" fill="#a3283a"/></g>
      <path d="M225 435C234 439 244 439 251 435L252 446C244 450 232 450 224 446Z" fill="url(#cpGold)"/>
      <path d="M225 440C234 444 244 444 251 440" stroke="#fff4d6" stroke-width=".8" opacity=".8"/>
      <rect x="229" y="348" width="12" height="20" rx="3" fill="#e8bb97"/>
      <path d="M228 360Q235 368 242 361" fill="none" stroke="url(#cpGold)" stroke-width="1.8" stroke-dasharray=".4 2.6" stroke-linecap="round"/>
      <circle cx="235" cy="366.5" r="2" fill="#fff" stroke="#d4a64a" stroke-width=".6"/>
      <g class="b-head">
        <circle cx="258" cy="318" r="12" fill="url(#cpHair)"/>
        <path d="M250 312C256 306 264 309 268 316M252 324C258 326 264 324 268 319" fill="none" stroke="#6b4a3a" stroke-width="1" opacity=".7"/>
        <path d="M242 362C245 354 252 345 255 334C258 322 256 309 249 303C243 298 232 297 226 301C221 304 219 309 219 314C219 316.5 219.6 318 219.8 319.4C218.4 322.6 216.6 326.6 215.2 329.4C214.6 330.8 215.6 332.2 217.4 332.4L219.4 332.8C219.9 334 219.5 335.2 219.3 336.2C218.9 337.2 219.6 338.2 220.8 338.6C219.8 339.6 219.6 341 220.6 342C221.2 343.6 221.6 345.2 222.8 346.6C224.6 348.4 227.4 348.6 229.4 350C231 352 230.6 356 230 362Z" fill="url(#cpSkinB)"/>
        <path d="M219.8 319.4C218.4 322.6 216.6 326.6 215.2 329.4" fill="none" stroke="#fff4ea" stroke-width="1" opacity=".85"/>
        <path d="M240 336C236 343 231 347 223.5 347.6" fill="none" stroke="#c98e6e" stroke-opacity=".3" stroke-width="1.4"/>
        <path d="M256 332C259 314 250 301 234 300C225 300 218 305 217.6 312C222 306 230 306 236 311C240 316 241 326 245 336C249 342 255 340 256 332Z" fill="url(#cpHair)"/>
        <path d="M232 302C226 303 221 307 219 312M240 305C236 308 238 318 242 328" fill="none" stroke="#7a5646" stroke-width=".8" opacity=".7"/>
        <path d="M241.5 330C239.5 338 242 345 238.6 352" fill="none" stroke="#2a1c16" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M225.8 314.5Q222.2 312.5 218.9 314.1" fill="none" stroke="#3a2620" stroke-width="1.25" stroke-linecap="round"/>
                <path d="M225 321.4Q222.4 318.7 219.8 321" fill="none" stroke="#24160f" stroke-width="1.3" stroke-linecap="round"/>
        <path d="M224.2 323Q222.4 323.9 220.6 322.9" fill="none" stroke="#c98e6e" stroke-width=".5" opacity=".7"/>
        <path d="M225 321.4l1.6 -.7M224.5 320.3l1.4 -1.2M223.6 319.5l.9 -1.5M222.5 319.1l.3 -1.6" stroke="#24160f" stroke-width=".55" stroke-linecap="round"/>
        <path d="M218 331.1Q216.9 332.2 215.9 331.6" fill="none" stroke="#b77a60" stroke-width=".7" stroke-linecap="round"/>
        <ellipse cx="225.6" cy="327.8" rx="5" ry="3.3" fill="#f09aa0" opacity=".38"/>
        <path d="M218.8 333Q221.2 334.2 222.8 336.6" fill="none" stroke="#c98e6e" stroke-width=".5" opacity=".6"/>
        <path d="M219.3 336C218.4 337.2 219.2 338 220.2 338.3C221.4 338.5 222.6 338 223.4 336.9C222.8 338.9 221.8 340.4 220.3 341.2C219.6 340 219.9 339 220.4 338.6C219.6 338.3 218.9 337.4 219.3 336Z" fill="#c75d6c"/>
        <path d="M219.8 338.3Q221.6 338.5 223.4 336.9" fill="none" stroke="#8f3345" stroke-width=".6"/>
        <path d="M219.8 336.6Q220.4 337.2 220.2 337.8" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".5"/>
        <circle cx="244.5" cy="335" r="1.8" fill="url(#cpGold)"/>
        <path d="M241 338C241 344 248 344 248 338Z" fill="url(#cpGold)"/>
        <path d="M242 342v4M244.5 343v5M247 342v4" stroke="#d9ab52" stroke-width=".6"/>
        <circle cx="242" cy="346.6" r="1" fill="#a3283a"/><circle cx="244.5" cy="348.6" r="1.2" fill="#fff" stroke="#d4a64a" stroke-width=".4"/><circle cx="247" cy="346.6" r="1" fill="#a3283a"/>
        <path d="M218 313C228 306 244 304 256 308" fill="none" stroke="url(#cpGold)" stroke-width="3" stroke-linecap="round"/>
        <path d="M218 313C228 306 244 304 256 308" fill="none" stroke="#a3283a" stroke-width="1" stroke-dasharray="1 3"/>
        <path d="M220 313v3" stroke="#d9ab52" stroke-width=".7"/><circle cx="220" cy="317.4" r="1.5" fill="url(#cpGold)"/><path d="M223.5 311.2v4.5" stroke="#d9ab52" stroke-width=".7"/><circle cx="223.5" cy="317.09999999999997" r="1.5" fill="url(#cpGold)"/><path d="M227 309.8v5.5" stroke="#d9ab52" stroke-width=".7"/><circle cx="227" cy="316.7" r="1.5" fill="url(#cpGold)"/><path d="M231 308.6v6" stroke="#d9ab52" stroke-width=".7"/><circle cx="231" cy="316.0" r="1.5" fill="url(#cpGold)"/><path d="M235 307.8v5.5" stroke="#d9ab52" stroke-width=".7"/><circle cx="235" cy="314.7" r="1.5" fill="url(#cpGold)"/><path d="M239 307.4v5" stroke="#d9ab52" stroke-width=".7"/><circle cx="239" cy="313.79999999999995" r="1.5" fill="url(#cpGold)"/><path d="M243 307.4v4" stroke="#d9ab52" stroke-width=".7"/><circle cx="243" cy="312.79999999999995" r="1.5" fill="url(#cpGold)"/><path d="M247 307.8v3" stroke="#d9ab52" stroke-width=".7"/><circle cx="247" cy="312.2" r="1.5" fill="url(#cpGold)"/>
        <path d="M226 306C228 296 236 290 242 291C249 292 252 298 252 305" fill="url(#cpGold)" stroke="#9b6f27" stroke-width=".6"/>
        <path d="M230 304C232 298 236 295 240 295C245 296 248 300 248 304" fill="none" stroke="#fff3cc" stroke-width=".8" stroke-dasharray="1 1.6"/>
        <circle cx="239.5" cy="299.5" r="2.6" fill="#a3283a" stroke="#fbe3a4" stroke-width=".8"/>
        <circle cx="233" cy="302" r="1.2" fill="#2fa3ad"/><circle cx="246" cy="302" r="1.2" fill="#2fa3ad"/>
        <circle cx="242" cy="289.5" r="1.8" fill="url(#cpGold)"/>
      </g>
      <g class="b-arm">
        <path d="M216 384C218 376 230 374 232 384L228 452C227 458 215 458 215 452Z" fill="url(#cpSkinB)"/>
        <path d="M216 384C218 376 230 374 232 384L228 452C227 458 215 458 215 452Z" fill="#fff" opacity=".6"/>
        <path d="M218 396L228 396M218 410L228 410M217 424L227 424M216 438L227 438" stroke="#e3cfa8" stroke-width=".8" stroke-dasharray="1 2" opacity=".9"/>
        <path d="M214 450L229 450" stroke="#e7d2a6" stroke-width="2.6" stroke-dasharray=".6 2.4" stroke-linecap="round"/>
        <path d="M216 454C214 460 214 468 218 472C222 474 227 470 227 463L227 455Z" fill="url(#cpSkinB)"/>
        <g transform="translate(214 478) scale(1.25)">${BOUQUET}</g>
      </g>
      <g class="b-armJoin">
        <path d="M219 381C216 396 216 410 217.5 422C214 431 209 440 204 448L211.5 453.5C216.5 446 223 437 229 426C231.5 412 232.5 396 231 381C228 377 222 377 219 381Z" fill="url(#cpSkinB)"/>
        <path d="M219 381C216 396 216 410 217.5 422C214 431 209 440 204 448L211.5 453.5C216.5 446 223 437 229 426C231.5 412 232.5 396 231 381C228 377 222 377 219 381Z" fill="#fff" opacity=".6"/>
        <path d="M218 398H231M217.5 412H231.5M217 424H229" stroke="#e3cfa8" stroke-width=".8" stroke-dasharray="1 2" opacity=".9"/>
        <path d="M204.6 447.4L211.4 452.8" stroke="#e7d2a6" stroke-width="2.6" stroke-dasharray=".6 2.4" stroke-linecap="round"/>
        <path d="M203.5 449.5C200.5 452.5 199.5 457.5 202 460.5C204.5 462.5 208.5 461 210 457.5L211 454Z" fill="url(#cpSkinB)"/>
        <g transform="translate(203 470) scale(1.25)">${BOUQUET}</g>
      </g>
    </g>`;

  // точки вращения (в локальных координатах фигурки) и длины рук
  const G_PIV = { x: 178 - G0, y: 374 - Y0 }, G_HAND = { x: 189 - G0, y: 464 - Y0 };
  const B_PIV = { x: 224 - B0, y: 382 - Y0 };
  const armLen = (p, h) => Math.hypot(h.x - p.x, h.y - p.y);
  const restAng = (p, h) => Math.atan2(h.x - p.x, h.y - p.y);
  const G_LEN = armLen(G_PIV, G_HAND);
  const B_HAND_J = { x: 206 - B0, y: 456 - Y0 };
  const G_REST = restAng(G_PIV, G_HAND);
  const deg = r => r * 180 / Math.PI;
  const asin = v => Math.asin(clamp(v, -0.95, 0.95));

  let root, el = {};
  const q = s => root.querySelector(s);

  function mount(group) {
    root = group;
    root.innerHTML = `${DEFS}
      <ellipse class="g-shadow" rx="34" ry="5" fill="#000" opacity=".16"/>
      <ellipse class="b-shadow" rx="70" ry="7" fill="#000" opacity=".16"/>
      <g class="groom"><g class="g-body">${GROOM}</g></g>
      <g class="bride"><g class="b-flip"><g class="b-body">${BRIDE}</g></g></g>`;
    // Бумажный стиль: основа однотонная (цвет задаёт CSS), одежда и украшения цветные,
    // кожа и волосы — тень-силуэт, черты лица скрыты (вернуть их: убрать класс faceless у root)
    const ACCENT = /cpGold|cpRose|cpBlush|cpIvoryRose|#a3283a|#f4efe4|#d9ab52|#d4a64a|#2fa3ad|#fff3cc|#9b6f27|#141013|#fbe3a4/i;
    const BODY = /cpSkin|cpHair|#c48a66|#e8bb97|#d69d78/i;
    root.classList.add('paper', 'faceless');
    root.querySelectorAll('path,rect,circle,ellipse').forEach(n => {
      const paint = `${n.getAttribute('fill') || ''} ${n.getAttribute('stroke') || ''}`;
      const inHead = n.closest('.g-head,.b-head');
      if (ACCENT.test(paint) || n.closest('.b-veil,.bouquet')) n.classList.add('keep');
      else if (BODY.test(paint) && n.getAttribute('fill') !== 'none') n.classList.add('keep', 'shade');
      else if (inHead) n.classList.add('keep', 'face');
      if (n.getAttribute('fill') === 'none' || n.getAttribute('fill') === null && n.getAttribute('stroke')) n.classList.add('line');
    });
    root.querySelector('.g-body').setAttribute('filter', 'url(#cpPaper)');
    root.querySelector('.b-body').setAttribute('filter', 'url(#cpPaper)');
    ['.groom', '.bride', '.b-flip', '.g-body', '.b-body', '.g-legB', '.g-legF', '.g-arm', '.g-head',
      '.b-arm', '.b-armJoin', '.b-head', '.b-veil', '.b-skirt', '.g-shadow', '.b-shadow'].forEach(s => { el[s] = q(s); });
  }

  const set = (k, v) => attr(el[k], 'transform', v);

  /**
   * gx, bx — x ног жениха/невесты в координатах сцены; y — линия земли; s — масштаб.
   * walk — фаза шага (рад), moving 0|1, join 0..1 (руки), tilt 0..1 (головы),
   * twirl 0..1 (кружение невесты), rot — наклон всей пары (град), bob — ритмичное покачивание,
   * faceB — 1: невеста смотрит на жениха, -1: в ту же сторону, что и он (прогулка по карте).
   */
  function pose(o) {
    const { gx, bx, y = 640, s = 1, walk = 0, moving = 0, join = 0, tilt = 0, t = 0,
      opacity = 1, twirl = 0, rot = 0, bob = 0, faceB = 1 } = o;
    attr(root, 'opacity', opacity.toFixed(3));
    attr(root, 'display', opacity <= 0.001 ? 'none' : 'inline');
    if (opacity <= 0.001) return;
    attr(root, 'transform', rot ? `rotate(${rot} ${(gx + bx) / 2} ${y})` : '');
    const k = s * BASE;

    const bobG = Math.abs(Math.sin(walk)) * 4 * moving + bob;
    const bobB = Math.abs(Math.sin(walk + 0.8)) * 2.5 * moving + bob * 0.8;
    set('.groom', `translate(${gx} ${y}) scale(${k})`);
    set('.bride', `translate(${bx} ${y}) scale(${k})`);
    const sh = (e, x, rx, ry) => { attr(e, 'cx', x.toFixed(2)); attr(e, 'cy', (y + 1).toFixed(2)); attr(e, 'rx', (rx * k).toFixed(2)); attr(e, 'ry', (ry * k).toFixed(2)); };
    sh(el['.g-shadow'], gx + 2 * k, 36, 5);
    sh(el['.b-shadow'], bx + 22 * k * faceB, 78, 7);

    set('.g-body', `translate(0 ${-bobG})`);
    set('.b-body', `translate(0 ${-bobB})`);
    const swing = Math.sin(walk) * moving;
    set('.g-legF', `rotate(${-swing * 14} 172 560)`);
    set('.g-legB', `rotate(${swing * 14} 150 560)`);
    set('.b-skirt', `translate(0 440) skewX(${swing * 2.5 - Math.sin(twirl * Math.PI) * 6}) translate(0 -440)`);

    // руки: целимся в середину между плечами
    const D = (bx - gx) / k;
    // невеста в паре держит руку согнутой; жених тянется к её кисти
    const gAng = asin((D + B_HAND_J.x + 2 - G_PIV.x) / G_LEN), gRot = -deg(gAng - G_REST);
    const free = swing * 10;
    set('.g-arm', `rotate(${lerp(free, gRot, join)} ${G_PIV.x + G0} ${G_PIV.y + Y0})`);
    set('.b-arm', `rotate(${-free * .6} ${B_PIV.x + B0} ${B_PIV.y + Y0})`);
    attr(el['.b-arm'], 'opacity', (1 - join).toFixed(3));
    attr(el['.b-armJoin'], 'opacity', join.toFixed(3));
    attr(el['.b-armJoin'], 'display', join < .01 ? 'none' : 'inline');
    attr(el['.b-arm'], 'display', join > .99 ? 'none' : 'inline');
    set('.g-head', `rotate(${5 * tilt} 167 350)`);
    set('.b-head', `rotate(${-5 * tilt} 236 356)`);

    const c = Math.cos(twirl * Math.PI * 2) * faceB;
    set('.b-flip', `scale(${Math.sign(c || 1) * Math.max(0.22, Math.abs(c))} 1)`);
    const veil = -bobB * 0.8 - Math.sin(twirl * Math.PI) * 12 - moving * 4;
    set('.b-veil', `translate(252 312) skewX(${veil}) translate(-252 -312)`);
  }

  window.Couple = { mount, pose, SPACE: 37 * BASE };
})();
