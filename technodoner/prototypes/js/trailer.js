// Berlin Bears — interactive promo trailer in the game's early-PS2 three.js look.
// 3D layer: 480x270 WebGL, upscaled pixelated. 2D layer: UI overlay at 960x540 (same split as the game).
(function () {
  const K = window.BBK;
  const { M, GEO, lam, basic, getTex, makeItem, makeBear, makeCustomer, poseCustomer, setPlacard, drawItem, drawSignIcon, paw, rr, bar, ARROW, NAMES } = K;
  const W = 960, H = 540, LW = 480, LH = 270;
  const $ = s => document.querySelector(s);
  const gl = $('#gl'), ov = $('#tv'), c = ov.getContext('2d');
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const GAME_URL = 'https://claude.ai/artifact/L31oprWLxHt1CUPs4Ue7Xy';
  let renderer = null;
  try { renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: false }); renderer.setPixelRatio(1); renderer.setSize(LW, LH, false); } catch (e) { renderer = null; }

  const SCENES = [
    { id: 'cold', label: 'Berlin, 03:00', d: 6, music: 'title' },
    { id: 'club', label: 'Too loud', d: 6, music: 'bunker', muffle: true },
    { id: 'roles', label: 'Two roles', d: 8, music: 'bunker', muffle: true },
    { id: 'dance', label: 'Copy the dance', d: 9, music: 'bunker' },
    { id: 'signs', label: 'Paw signs', d: 8, music: 'bunker' },
    { id: 'grill', label: 'Cook + serve', d: 8, music: 'kotti' },
    { id: 'devices', label: 'Two phones', d: 6, music: 'title' },
    { id: 'end', label: 'Play', d: 5, music: 'title' },
  ];
  let acc = 0; SCENES.forEach(s => { s.t0 = acc; acc += s.d; });
  const TOTAL = acc, DANCE_AT = SCENES[3].t0 + 3.2, SEQ = 'URD', RECIPE = 'mltogh';
  const st = { tt: 0, playing: false, started: false, inter: freshInter(), pose: null, poseT: 0, sceneIdx: -1, fired: new Set() };
  function freshInter() { return { done: false, prog: 0, result: null, since: 0, wrongT: 0 }; }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = x => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x));
  const fade = (lt, a, b, f) => ease((lt - a) / (f || 0.4)) * (b == null ? 1 : ease((b - lt) / (f || 0.4)));
  const beat = () => BB.Audio.beatPhase();
  const lerp = (a, b, k) => a + (b - a) * k;

  // ================= 3D helpers =================
  function holder(s, x, y, z, k) { const h = new THREE.Group(); h.position.set(x, y, z); h.scale.setScalar(k); h.userData.code = null; s.add(h); return h; }
  function setItem(h, code) { if (h.userData.code === code) return; h.userData.code = code; while (h.children.length) h.remove(h.children[0]); if (code) h.add(makeItem(code)); }
  function glow(o, on) { o.traverse(m => { if (m.material && m.material.emissive) m.material.emissive.setHex(on ? 0x6a5400 : 0); }); }
  function poseBear(g, pose) {
    const P = { U: [[-.32, 1.28, .15], [.32, 1.28, .15]], L: [[-.8, .9, .1], [.42, .5, .25]], R: [[-.42, .5, .25], [.8, .9, .1]], D: [[-.55, .15, .3], [.55, .15, .3]] }[pose] || [[-.42, .5, .25], [.42, .5, .25]];
    g.userData.pL.position.set(...P[0]); g.userData.pR.position.set(...P[1]);
  }
  function addHand(s, cam, kind) {
    s.add(cam);
    const hand = new THREE.Group(); hand.position.set(.34, -.3, -.75); cam.add(hand);
    hand.add(M(GEO.sph(.09, 7), lam(kind ? 0xefe6d2 : 0x8b5a33), 0, -.02, 0));
    const item = new THREE.Group(); item.position.set(-.02, .04, 0); item.scale.setScalar(1.3); item.userData.code = null; hand.add(item);
    const plac = K.makePlacard(); plac.position.set(-.26, -.17, -.85); plac.scale.setScalar(.3); plac.visible = false; cam.add(plac);
    return { hand, item, plac };
  }
  const cam = (fov, pos, look) => { const k = new THREE.PerspectiveCamera(fov, 16 / 9, .05, 60); k.position.set(...pos); k.lookAt(...look); return k; };

  // ---- club (Bruno's side), mirrors the game's Kasse scene ----
  const SLOTX = [-1.12, -.28, .56], SLOTZ = -.8, SLOTY = 1.42;
  function buildClub() {
    const s = new THREE.Scene(); s.background = new THREE.Color(0x12061c); s.fog = new THREE.Fog(0x1a0830, 2.8, 10);
    const fp = cam(52, [0, 1.78, 2.15], [0, 1.42, -1]);
    const rev = cam(50, [-.2, 1.62, -1.55], [0, 1.5, 1.05]);
    s.add(new THREE.HemisphereLight(0xffe2c4, 0x2a1040, .75)); const d = new THREE.DirectionalLight(0xfff0dd, .55); d.position.set(.5, 3, 3); s.add(d);
    const pl1 = new THREE.PointLight(0xff4fa8, 1.4, 9); pl1.position.set(-2, 2.6, -3); const pl2 = new THREE.PointLight(0x2bc4b4, 1.4, 9); pl2.position.set(2, 2.6, -4); s.add(pl1, pl2);
    const front = new THREE.PointLight(0xffd9b0, .9, 5); front.position.set(0, 2.4, 1.6); s.add(front);
    const fl = M(new THREE.PlaneGeometry(30, 30), lam(0xffffff, { map: getTex('clubfloor') }), 0, 0, -6); fl.rotation.x = -Math.PI / 2; s.add(fl);
    s.add(M(GEO.box(30, 8, .2), lam(0x1a0a26), 0, 4, -9));
    const crowd = []; for (let i = 0; i < 30; i++) { const g = new THREE.Group(); const col = new THREE.Color().setHSL(.75 + ((i * 37) % 15) / 100, .4, .18 + ((i * 13) % 12) / 100); g.add(M(GEO.cyl(.22, .26, 1.1, 6), lam(col), 0, .55, 0)); g.add(M(GEO.sph(.2, 6), lam(col), 0, 1.3, 0)); g.position.set(-4.5 + ((i * 53) % 90) / 10, 0, -2.3 - ((i * 29) % 55) / 10); g.userData.ph = i * 1.3; s.add(g); crowd.push(g); }
    const lasers = []; [0xff4fa8, 0x2bc4b4, 0xffb238, 0x7a5cff, 0xff4fa8].forEach((col, i) => { const piv = new THREE.Group(); piv.position.set(-3 + i * 1.5, 3.4, -6); piv.add(M(GEO.box(.03, .03, 9), basic(col, { transparent: true, opacity: .7, blending: THREE.AdditiveBlending, fog: false }), 0, 0, 4.5)); s.add(piv); lasers.push(piv); });
    const wall = lam(0x2a1a2e), z = -.32;
    s.add(M(GEO.box(4.4, .9, .12), wall, 0, 2.75, z)); s.add(M(GEO.box(.6, 3.2, .12), wall, -2.0, 1.6, z));
    s.add(M(GEO.box(.8, 1.12, .12), wall, 1.55, .56, z)); s.add(M(GEO.box(.8, 1.05, .12), wall, 1.55, 2.2, z)); s.add(M(GEO.box(.08, .6, .12), wall, 1.19, 1.4, z)); s.add(M(GEO.box(.08, .6, .12), wall, 1.91, 1.4, z));
    const neon = M(new THREE.PlaneGeometry(1.4, .35), basic(0xffffff, { map: getTex('neon'), transparent: true, blending: THREE.AdditiveBlending, fog: false }), -.3, 2.62, z + .07); s.add(neon);
    s.add(M(new THREE.PlaneGeometry(1, 1.4), lam(0xffffff, { map: getTex('tiles') }), 1.55, 1.4, -1.25)); const kl = new THREE.PointLight(0xffd9a0, 1.2, 2.5); kl.position.set(1.55, 1.9, -.7); s.add(kl);
    const baer = makeBear(1); baer.scale.setScalar(.52); baer.position.set(1.55, .84, -.9); s.add(baer);
    s.add(M(GEO.box(4.2, 1.0, .85), lam(0x7d8796, { map: getTex('steel') }), 0, .5, .2)); s.add(M(GEO.box(4.22, .05, .87), lam(0x6f7886), 0, 1.005, .2));
    const sauces = {}; [['g', -1.25], ['h', -.98]].forEach(([k, x]) => { const it = makeItem(k); it.scale.setScalar(1.7); it.position.set(x, 1.03, .4); s.add(it); sauces[k] = it; });
    const bin = new THREE.Group(); bin.add(M(GEO.cyl(.14, .12, .32, 8), lam(0x2b2b2b), 0, .16, 0)); bin.add(M(GEO.cyl(.145, .145, .03, 8), lam(0x555555), 0, .32, 0)); bin.position.set(-.55, 1.03, .42); s.add(bin);
    const tray = M(GEO.box(.6, .035, .38), lam(0xd6dbe2), 1.55, 1.03, .05); s.add(tray); const trayItem = holder(s, 1.55, 1.05, .05, 1.7);
    const cust = [5, 13, 7].map((seed, i) => { const m = makeCustomer(seed); m.position.set(SLOTX[i], SLOTY, SLOTZ); s.add(m); return m; });
    const bruno = makeBear(0); bruno.scale.setScalar(1.45); bruno.position.set(0, 0, 1.05); bruno.rotation.y = Math.PI; bruno.visible = false; s.add(bruno);
    const hand = addHand(s, fp, 0);
    return { s, fp, rev, pl1, pl2, crowd, lasers, neon, baer, sauces, tray, trayItem, cust, bruno, hand };
  }
  function animClub(C, t, o) {
    o = o || {};
    const b = beat(), pulse = 1 - b;
    C.pl1.intensity = .6 + 1.6 * pulse; C.pl2.intensity = .6 + 1.6 * (1 - ((b + .5) % 1));
    C.lasers.forEach((l, i) => { l.rotation.y = Math.sin(t * (.5 + i * .13) + i) * .9; l.rotation.x = -.35 + Math.sin(t * (.7 + i * .1)) * .25; });
    C.crowd.forEach(g => { g.position.y = reduce ? 0 : Math.abs(Math.sin(t * Math.PI * 128 / 60 + g.userData.ph)) * .12; });
    C.neon.material.opacity = .75 + .25 * pulse;
    C.cust.forEach((m, i) => {
      let pose = null;
      if (i === 1 && o.mainPose !== undefined) pose = o.mainPose;
      else { const ph = (t * 1.6 + i * 1.3) % 4; pose = ph < 3 ? 'LUR'[Math.floor(ph)] : null; }
      poseCustomer(m, pose);
      m.position.y = SLOTY + Math.abs(Math.sin(t * Math.PI * 128 / 60 + i)) * .04 - (pose === 'D' ? .08 : 0) + (i === 1 && o.hop ? o.hop : 0);
      m.rotation.y = Math.sin(t * .7 + i) * .15;
      m.visible = !(o.hideAll || (o.hideSides && i !== 1));
      m.userData.mats.forEach(mt => mt.emissive.setHex(i === 1 && o.mainGlow ? 0x6a5400 : 0));
    });
    C.baer.userData.head.rotation.y = Math.sin(t * .8) * .2;
    C.hand.hand.position.y = -.3 + Math.sin(t * Math.PI * 128 / 60) * .008;
    setItem(C.trayItem, o.tray || null); setItem(C.hand.item, o.held || null);
    glow(C.tray, !!o.trayGlow); glow(C.sauces.g, o.sauceGlow === 'g'); glow(C.sauces.h, o.sauceGlow === 'h');
    C.hand.plac.visible = !!o.mySign; if (o.mySign) setPlacard(C.hand.plac, o.mySign);
    C.bruno.visible = !!o.showBruno;
    if (o.showBruno) { poseBear(C.bruno, o.brunoPose || null); C.bruno.position.y = o.brunoPose ? Math.abs(Math.sin(t * 6)) * .05 : 0; }
  }

  // ---- kitchen (Bärbel's side), mirrors the game's Grill scene ----
  function buildGrill() {
    const s = new THREE.Scene(); s.background = new THREE.Color(0x0b1416); s.fog = new THREE.Fog(0x0b1416, 4, 12);
    const fp = cam(52, [.05, 1.85, 1.85], [.05, 1.18, -.8]);
    const rev = cam(50, [1.1, 1.7, -1.35], [.15, 1.35, .9]);
    s.add(new THREE.HemisphereLight(0xfff0d8, 0x332018, .7)); const kl = new THREE.PointLight(0xffe0b0, 1.1, 6); kl.position.set(0, 2.5, .6); s.add(kl);
    const tm = lam(0xffffff, { map: getTex('tiles') }), z = -1.0;
    s.add(M(GEO.box(3.1, 3.2, .1), tm, -1.0, 1.6, z)); s.add(M(GEO.box(1.4, 3.2, .1), tm, 2.35, 1.6, z)); s.add(M(GEO.box(1.1, 1.2, .1), tm, 1.1, .6, z)); s.add(M(GEO.box(1.1, 1.05, .1), tm, 1.1, 2.68, z));
    s.add(M(GEO.box(2.4, 3, .1), lam(0x2a0c3a), 1.1, 1.5, -2.8)); const cl = new THREE.PointLight(0xff4fa8, 1.5, 3.5); cl.position.set(1.1, 2.1, -1.5); s.add(cl);
    const bru = makeBear(0); bru.scale.setScalar(.72); bru.position.set(1.1, .92, -1.75); s.add(bru);
    const hLasers = [0xff4fa8, 0x2bc4b4].map((col, i) => { const p = new THREE.Group(); p.position.set(.7 + i * .8, 2.6, -2.6); p.add(M(GEO.box(.02, .02, 3), basic(col, { transparent: true, opacity: .6, blending: THREE.AdditiveBlending, fog: false }), 0, 0, 1.5)); s.add(p); return p; });
    const dark = M(new THREE.PlaneGeometry(1.1, .95), basic(0x05000a, { transparent: true, opacity: 0, fog: false }), 1.1, 1.675, -1.06); s.add(dark);
    const fogs = []; for (let i = 0; i < 5; i++) { const f = M(new THREE.PlaneGeometry(.8, .8), basic(0xe6dcf0, { map: getTex('soft'), transparent: true, opacity: 0, depthWrite: false, fog: false }), .8 + i * .15, 1.5 + (i % 2) * .3, -1.1 - i * .05); s.add(f); fogs.push(f); }
    s.add(M(GEO.box(4.2, .95, 1.15), lam(0xffffff, { map: getTex('wood') }), 0, .475, -.4)); s.add(M(GEO.box(4.22, .04, 1.17), lam(0xd8a06a), 0, .96, -.4));
    const spit = new THREE.Group(); spit.position.set(-1.3, 0, -.62); spit.add(M(GEO.cyl(.016, .016, 1.3, 5), lam(0xcccccc), 0, 1.55, 0));
    const meat = M(GEO.cyl(.26, .15, .8, 8), lam(0x8a4b2a), 0, 1.45, 0); spit.add(meat);
    for (let k = 0; k < 3; k++) { const r = M(GEO.cyl(.262 - k * .04, .24 - k * .04, .04, 8), lam(0xb86a3c), 0, 1.75 - k * .25, 0); meat.add(r); r.position.set(0, .3 - k * .25, 0); }
    s.add(spit); const heat = M(GEO.box(.55, .85, .05), basic(0xff6a1a), -1.3, 1.45, -.93); s.add(heat);
    const br = new THREE.Group(); br.position.set(-.68, .98, -.55); br.add(M(GEO.box(.46, .12, .32), lam(0x9a6638), 0, .06, 0)); for (let k = 0; k < 3; k++) { const p = makeItem('D'); p.scale.setScalar(1.3); p.position.set(-.12 + k * .12, .1 + k * .015, 0); br.add(p); } s.add(br);
    const bins = {}; [['L', -.24], ['T', .08], ['O', .4]].forEach(([k, x]) => { const g = new THREE.Group(); g.position.set(x, .98, -.62); g.add(M(GEO.box(.28, .1, .24), lam(0xdde1e6), 0, .05, 0)); [-.06, .06].forEach(dx => { const it = makeItem(k); it.scale.setScalar(1.1); it.position.set(dx, .06, 0); g.add(it); }); s.add(g); bins[k] = g; });
    const bd = M(GEO.box(.62, .035, .34), lam(0xe2b07a), -.08, .995, -.12); s.add(bd); const boardItem = holder(s, -.08, 1.015, -.12, 1.9);
    s.add(M(GEO.box(.04, .02, .2), lam(0xdddddd), .27, 1.02, -.12));
    const pl = M(GEO.cyl(.21, .19, .03, 12), lam(0xf4f1ea), .68, .995, -.1); s.add(pl); const plateItem = holder(s, .68, 1.012, -.1, 2.0);
    const tr = new THREE.Group(); tr.position.set(1.48, .98, .02); tr.add(M(GEO.cyl(.15, .13, .34, 8), lam(0x2b2b2b), 0, .17, 0)); tr.add(M(GEO.cyl(.155, .155, .03, 8), lam(0x555555), 0, .34, 0)); s.add(tr);
    const sh = M(GEO.box(1.15, .04, .3), lam(0xd6dbe2), 1.1, 1.2, -.88); s.add(sh); const passItem = holder(s, 1.1, 1.22, -.88, 1.6);
    const baer = makeBear(1); baer.scale.setScalar(1.4); baer.position.set(.15, 0, .85); baer.rotation.y = Math.PI; baer.visible = false; s.add(baer);
    const hand = addHand(s, fp, 1);
    return { s, fp, rev, cl, bru, hLasers, dark, fogs, meat, heat, spit, bins, bd, boardItem, pl, plateItem, passItem, baer, hand };
  }
  function animGrill(G, t, o) {
    o = o || {};
    const b = beat();
    G.meat.rotation.y = t * 1.4; G.meat.position.x = o.shaving ? Math.sin(t * 50) * .01 : 0;
    G.heat.material.color.setHSL(.06, 1, .45 + .08 * Math.sin(t * 5));
    G.cl.intensity = .4 + 2.2 * (1 - b);
    G.hLasers.forEach((l, i) => { l.rotation.y = Math.sin(t * (.8 + i * .4)) * .6; l.rotation.x = -.3; });
    G.dark.visible = !o.noStrobe; G.dark.material.opacity = reduce ? .35 : .7 * (1 - Math.pow(1 - b, 3));
    const fa = o.fog || 0; G.fogs.forEach((f, i) => { f.visible = !o.noStrobe; f.material.opacity = .85 * fa; f.position.x = .75 + ((i * .27 + t * .12) % .8); f.rotation.z = t * .3 + i; });
    G.bru.userData.head.rotation.y = Math.sin(t * .9) * .25;
    const plac = G.bru.userData.plac;
    plac.visible = !!o.brunoSign;
    if (o.brunoSign) { setPlacard(plac, o.brunoSign); plac.scale.setScalar(1 + (o.signPop || 0) * 1.5); G.bru.userData.pR.position.set(.42, 1.0, .3); } else G.bru.userData.pR.position.set(.42, .5, .25);
    setItem(G.boardItem, o.board || null); G.boardItem.position.y = 1.015 + (o.chopping ? Math.abs(Math.sin(t * 30)) * .02 : 0);
    setItem(G.plateItem, o.plate || null); setItem(G.passItem, o.pass || null); setItem(G.hand.item, null);
    glow(G.spit, o.hover === 'spit'); glow(G.bd, o.hover === 'board'); glow(G.pl, o.hover === 'plate');
    Object.keys(G.bins).forEach(k => glow(G.bins[k], o.hover === k));
    G.hand.plac.visible = false;
    G.baer.visible = !!o.showBaer;
    if (o.showBaer) { const ch = Math.sin(t * 16) > 0; G.baer.userData.pL.position.set(-.3, ch ? .75 : .62, .4); G.baer.userData.pR.position.set(.3, ch ? .62 : .75, .4); }
  }

  // ---- night city + bunker ----
  function buildCity() {
    const s = new THREE.Scene(); s.background = new THREE.Color(0x0b0716); s.fog = new THREE.Fog(0x1c0d2c, 10, 42);
    const k = cam(55, [0, 1.6, 7], [0, 2.4, -4]);
    s.add(new THREE.HemisphereLight(0x8a7ab8, 0x120818, .55));
    const g = M(new THREE.PlaneGeometry(80, 80), lam(0x15101c), 0, 0, -10); g.rotation.x = -Math.PI / 2; s.add(g);
    const wins = [0, 1, 2].map(v => K.tex(8, 16, (cx) => { cx.fillStyle = '#140c20'; cx.fillRect(0, 0, 8, 16); for (let y = 1; y < 16; y += 2) for (let x = 1; x < 8; x += 2) if (((x * 7 + y * 13 + v * 5) % 11) < 4) { cx.fillStyle = '#ffc46e'; cx.fillRect(x, y, 1, 1); } }));
    for (let i = 0; i < 26; i++) {
      const x = -22 + i * 1.8 + ((i * 37) % 10) / 10, h = 3 + ((i * 53) % 70) / 10, w = 1.4 + ((i * 17) % 10) / 10, zz = -9 - ((i * 31) % 12);
      if (Math.abs(x - 5) < 1.2) continue;
      s.add(M(GEO.box(w, h, 1.6), basic(0xffffff, { map: wins[i % 3] }), x, h / 2, zz));
    }
    const tw = new THREE.Group(); tw.position.set(5.2, 0, -16);
    tw.add(M(GEO.cyl(.28, .42, 12, 8), lam(0x5a4c78), 0, 6, 0)); tw.add(M(GEO.sph(1.1, 10), lam(0x8070a8), 0, 9.2, 0)); tw.add(M(GEO.cyl(.5, .5, .5, 10), lam(0x2a2236), 0, 10.4, 0));
    tw.add(M(GEO.cyl(.06, .06, 3.4, 5), lam(0x9a9aaa), 0, 12.3, 0)); const red = M(GEO.sph(.14, 6), basic(0xff3030, { fog: false }), 0, 14.1, 0); tw.add(red); s.add(tw);
    const bunker = M(GEO.box(7, 3.6, 3), lam(0x4a4552, { map: getTex('steel') }), 0, 1.8, -4); s.add(bunker);
    const door = M(new THREE.PlaneGeometry(1.1, 2), basic(0xff4fa8, { fog: false }), 0, 1.0, -2.48); s.add(door);
    const dl = new THREE.PointLight(0xff4fa8, 2, 6); dl.position.set(0, 1.2, -1.6); s.add(dl);
    const pos = []; for (let i = 0; i < 160; i++) pos.push(-40 + ((i * 97) % 800) / 10, 8 + ((i * 53) % 140) / 10, -30 - ((i * 29) % 10));
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    s.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, sizeAttenuation: false, fog: false })));
    const fr = new THREE.PointLight(0xffe0c0, 1.6, 9); fr.position.set(0, 2.6, 4.5); s.add(fr);
    const b1 = makeBear(0); b1.position.set(-.85, 0, 1.4); b1.rotation.y = .2; s.add(b1);
    const b2 = makeBear(1); b2.position.set(.85, 0, 1.4); b2.rotation.y = -.2; s.add(b2);
    return { s, k, red, door, dl, b1, b2 };
  }
  function animCity(Y, t, lt, o) {
    const b = beat();
    Y.red.visible = Math.sin(t * 3) > 0;
    Y.dl.intensity = 1 + 2.5 * (1 - b); Y.door.material.color.setHSL(.91, 1, .45 + .15 * (1 - b));
    const show = !!o.bears; Y.b1.visible = Y.b2.visible = show;
    if (show) { poseBear(Y.b1, Math.floor(t * 2) % 2 ? 'U' : null); Y.b1.position.y = Math.abs(Math.sin(t * 6)) * .06; poseBear(Y.b2, Math.floor(t * 2 + 1) % 2 ? 'U' : 'R'); Y.b2.position.y = Math.abs(Math.sin(t * 6 + 1)) * .06; }
    Y.k.position.set(Math.sin(t * .2) * .3, 1.6, o.z);
    Y.k.lookAt(0, o.lookY || 2.4, -4);
  }

  const CLUB = renderer ? buildClub() : null, GRILL = renderer ? buildGrill() : null, CITY = renderer ? buildCity() : null;

  // ================= rendering helpers =================
  function view(scene, camera, vx, vy, vw, vh) {
    camera.aspect = vw / vh; camera.updateProjectionMatrix();
    const x = Math.round(vx / 2), y = Math.round((H - vy - vh) / 2), w = Math.round(vw / 2), h = Math.round(vh / 2);
    renderer.setViewport(x, y, w, h); renderer.setScissor(x, y, w, h); renderer.setScissorTest(true);
    renderer.render(scene, camera);
  }
  function full(scene, camera) { renderer.setScissorTest(false); camera.aspect = 16 / 9; camera.updateProjectionMatrix(); renderer.setViewport(0, 0, LW, LH); renderer.render(scene, camera); }
  function clearAll(col) { renderer.setScissorTest(false); renderer.setViewport(0, 0, LW, LH); renderer.setClearColor(col, 1); renderer.clear(); }
  function proj(camera, x, y, z) { const v = new THREE.Vector3(x, y, z).project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }

  // ================= 2D overlay helpers =================
  function txt(s, x, y, font, col, align) { c.font = font; c.fillStyle = col; c.textAlign = align || 'left'; c.fillText(s, x, y); }
  function stroked(s, x, y, size, col, align) { c.font = size + 'px Bungee, sans-serif'; c.textAlign = align || 'center'; c.lineWidth = Math.max(3, size / 6); c.strokeStyle = '#000c'; c.strokeText(s, x, y); c.fillStyle = col; c.fillText(s, x, y); }
  function caption(main, sub, a, y, col) {
    if (a <= 0) return;
    c.save(); c.globalAlpha = a;
    c.font = '34px Bungee, sans-serif'; const w1 = c.measureText(main).width;
    c.font = '700 16px Archivo, sans-serif'; const w2 = sub ? c.measureText(sub).width : 0;
    const bw = Math.max(w1, w2) + 40, bx = W / 2 - bw / 2, by = y - 40, bh = sub ? 82 : 56;
    c.fillStyle = 'rgba(12,7,20,.84)'; rr(c, bx, by, bw, bh, 12); c.fill();
    c.fillStyle = col || '#ffb238'; c.fillRect(bx, by, 6, bh);
    txt(main, W / 2, y, '34px Bungee, sans-serif', '#fff', 'center');
    if (sub) txt(sub, W / 2, y + 28, '700 16px Archivo, sans-serif', 'rgba(255,255,255,.85)', 'center');
    c.restore();
  }
  function kicker(s, a, col) {
    if (a <= 0) return;
    c.save(); c.globalAlpha = a; c.font = '800 13px Archivo, sans-serif'; const w = c.measureText(s).width + 24;
    c.fillStyle = col || '#ff4fa8'; rr(c, 18, 16, w, 28, 14); c.fill(); txt(s, 30, 35, '800 13px Archivo, sans-serif', '#fff'); c.restore();
  }
  function logo(x, y, s, a) {
    if (a <= 0) return;
    c.save(); c.globalAlpha = a; c.translate(x, y); c.scale(s, s);
    c.textAlign = 'center'; c.font = '78px Bungee, Impact, sans-serif';
    c.shadowColor = 'rgba(255,154,42,.6)'; c.shadowBlur = 30;
    c.fillStyle = '#b3261e'; c.fillText('BERLIN', 4, 4); c.fillText('BEARS', 4, 84);
    c.fillStyle = '#ffb238'; c.fillText('BERLIN', 0, 0); c.fillText('BEARS', 0, 80);
    c.restore();
  }
  const BAR_KEYS = ['m', 'l', 't', 'o', 'g', 'h', '+', '-'];
  function signPos(keys, k, w, gap) { const n = keys.length, x0 = W / 2 - (n * w + (n - 1) * gap) / 2, i = keys.indexOf(k); return [x0 + i * (w + gap) + w / 2, 505]; }
  function signBar(keys, hl, labels, w, gap) {
    w = w || 64; gap = gap == null ? 8 : gap;
    const n = keys.length, x0 = W / 2 - (n * w + (n - 1) * gap) / 2;
    keys.forEach((k, i) => {
      const x = x0 + i * (w + gap);
      c.fillStyle = hl === k ? '#6a4a8a' : '#2b1f38'; rr(c, x, 476, w, 58, 12); c.fill();
      c.strokeStyle = hl === k ? '#ffe14a' : '#ffffff22'; c.lineWidth = 2; c.stroke();
      drawSignIcon(c, k, x + w / 2, 501, .8);
      c.fillStyle = '#bba9c8'; c.font = '10px Archivo, sans-serif'; c.textAlign = 'center'; c.fillText(labels ? (i + 1) + ' ' + NAMES[k] : NAMES[k], x + w / 2, 528);
    });
  }
  function brunoBar(hl, arrowHl) {
    c.fillStyle = '#120a18'; c.fillRect(0, 470, W, 70);
    ['L', 'U', 'D', 'R'].forEach((d, i) => { const x = 12 + i * 48; c.fillStyle = arrowHl === d ? '#ff4fa8' : '#2b1f38'; rr(c, x, 476, 44, 58, 12); c.fill(); c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = '28px Archivo, sans-serif'; c.fillText(ARROW[d], x + 22, 515); });
    signBar(BAR_KEYS, hl, true, 58, 6);
    c.textAlign = 'right'; c.fillStyle = '#bba9c8'; c.font = '12px Archivo, sans-serif'; c.fillText('Dance: arrows', W - 14, 496); c.fillText('Sign to Bärbel: 1–8', W - 14, 514);
  }
  function barbelBar() {
    c.fillStyle = '#120a18'; c.fillRect(0, 470, W, 70);
    signBar(['+', '-', '?', 'w'], null, false);
    c.textAlign = 'left'; c.fillStyle = '#bba9c8'; c.font = '12px Archivo, sans-serif'; c.fillText('You can’t see the orders.', 14, 496); c.fillText('Watch Bruno’s paws in the hatch.', 14, 514);
  }
  function hud(t, sc) {
    c.textAlign = 'right'; c.font = '30px Bungee, sans-serif'; c.lineWidth = 5; c.strokeStyle = '#000c';
    const s = Math.max(0, Math.ceil(t)), ts = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    c.strokeText(ts, W - 16, 40); c.fillStyle = '#ffcf5a'; c.fillText(ts, W - 16, 40);
    c.font = '22px Bungee, sans-serif'; c.strokeText('€' + sc, W - 16, 68); c.fillStyle = '#fff'; c.fillText('€' + sc, W - 16, 68);
  }
  function ticket(camera, revealed, prog, focus) {
    const [x, y0] = proj(camera, SLOTX[1], SLOTY + .62, SLOTZ); const y = y0 - 58;
    const bw = revealed ? RECIPE.length * 34 + 20 : 150, bx = x - bw / 2;
    c.fillStyle = '#fff'; rr(c, bx, y, bw, 58, 14); c.fill(); c.beginPath(); c.moveTo(x - 10, y + 58); c.lineTo(x + 2, y + 72); c.lineTo(x + 12, y + 58); c.fill();
    if (!revealed) {
      c.font = '30px Archivo, sans-serif'; c.textAlign = 'center';
      [...SEQ].forEach((d, j) => { c.fillStyle = j < prog ? '#20a060' : '#2a1a14'; c.fillText(ARROW[d], bx + 30 + j * 45, y + 40); });
      if (focus) { c.strokeStyle = '#ffe14a'; c.lineWidth = 3; rr(c, bx - 3, y - 3, bw + 6, 64, 16); c.stroke(); }
    } else {
      [...RECIPE].forEach((k, j) => drawItem(c, k, bx + 27 + j * 34, y + 28, .72));
      c.fillStyle = '#7a6a60'; c.font = '10px Archivo, sans-serif'; c.textAlign = 'center'; c.fillText('Mit Alles', x, y + 54);
    }
    bar(c, bx + 8, y - 12, bw - 16, 7, .8, '#3fbf5f');
  }
  function cursor(x, y, kind, press) { paw(c, x + 6, y + 10, press ? 10.5 : 12, kind ? '#efe6d2' : '#8b5a33', -.4); }
  function label3(camera, x, y, z, s, col, size) { const [sx, sy] = proj(camera, x, y, z); c.font = (size || 11) + 'px Bungee, sans-serif'; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = '#000c'; c.strokeText(s, sx, sy); c.fillStyle = col || '#fff'; c.fillText(s, sx, sy); }
  function popAt(x, y, s, col, age) { if (age < 0 || age > 1.4) return; c.save(); c.globalAlpha = Math.max(0, 1 - age / 1.4); stroked(s, x, y - age * 40, 26, col); c.restore(); }
  function path(lt, keys) {
    if (lt <= keys[0][0]) return [keys[0][1], keys[0][2]];
    for (let i = 1; i < keys.length; i++) if (lt <= keys[i][0]) { const k = ease((lt - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])); return [lerp(keys[i - 1][1], keys[i][1], k), lerp(keys[i - 1][2], keys[i][2], k)]; }
    const l = keys[keys.length - 1]; return [l[1], l[2]];
  }

  // ================= scenes =================
  const R = {};
  R.cold = (lt, t) => {
    animCity(CITY, t, lt, { z: 7 - ease(lt / 6) * 2.4, bears: false });
    full(CITY.s, CITY.k);
    const on = lt < 1.2 ? 0 : lt < 1.5 ? (Math.floor(lt * 30) % 2) : 1;
    logo(480, 170, .9 + .1 * ease((lt - 1.2) / .5), on);
    caption('A DÖNER CO-OP FOR TWO', 'Berlin, 03:00. A döner window inside a techno bunker.', fade(lt, 2.6, 5.8), 440, '#ffb238');
  };
  R.club = (lt, t) => {
    CLUB.fp.position.x = Math.sin(t * .4) * .05;
    animClub(CLUB, t, {});
    full(CLUB.s, CLUB.fp);
    CLUB.fp.position.x = 0;
    hud(178 - lt, 0);
    kicker('BUNKER CLUB · 03:00', fade(lt, .2, 5.8), '#ff4fa8');
    const a = fade(lt, .8, 5.8);
    if (a > 0) {
      c.save(); c.globalAlpha = a; c.translate(80, 110);
      c.fillStyle = 'rgba(18,12,28,.85)'; c.beginPath(); c.arc(0, 0, 40, 0, 7); c.fill(); c.strokeStyle = '#ff4fa8'; c.lineWidth = 4; c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-18, -8); c.lineTo(-6, -8); c.lineTo(8, -20); c.lineTo(8, 20); c.lineTo(-6, 8); c.lineTo(-18, 8); c.closePath(); c.fill();
      c.strokeStyle = '#ff3b3b'; c.lineWidth = 6; c.beginPath(); c.moveTo(-26, -26); c.lineTo(26, 26); c.stroke(); c.restore();
    }
    caption('NOBODY CAN HEAR A THING', 'So the customers order by dancing.', fade(lt, 1.6, 5.8), 420, '#ff4fa8');
  };
  R.roles = (lt, t) => {
    clearAll(0x120c1c);
    const sx = 480;
    animClub(CLUB, t, { showBruno: true, brunoPose: Math.floor(t * 2) % 2 ? 'U' : 'R', hideAll: true });
    view(CLUB.s, CLUB.rev, 0, 0, sx - 4, H);
    animGrill(GRILL, t, { showBaer: true, noStrobe: true, plate: 'Dml', board: 't' });
    view(GRILL.s, GRILL.rev, sx + 4, 0, W - sx - 4, H);
    renderer.setScissorTest(false);
    c.fillStyle = '#120c1c'; c.fillRect(sx - 4, 0, 8, H);
    const a1 = fade(lt, .3, 7.8), a2 = fade(lt, 1.2, 7.8), a3 = fade(lt, 2.8, 7.8);
    c.save(); c.globalAlpha = a1; c.fillStyle = 'rgba(216,50,43,.95)'; rr(c, 22, 22, 420, 92, 14); c.fill();
    txt('BRUNO · KASSE', 40, 58, '24px Bungee, sans-serif', '#fff'); txt('Sees the orders. Can’t touch meat or veg.', 40, 90, '700 16px Archivo, sans-serif', '#fff'); c.restore();
    c.save(); c.globalAlpha = a2; c.fillStyle = 'rgba(34,176,162,.95)'; rr(c, W - 442, 22, 420, 92, 14); c.fill();
    txt('BÄRBEL · GRILL', W - 424, 58, '24px Bungee, sans-serif', '#fff'); txt('Makes the food. Never sees an order.', W - 424, 90, '700 16px Archivo, sans-serif', '#fff'); c.restore();
    if (a3 > 0) {
      c.save(); c.globalAlpha = a3; c.fillStyle = 'rgba(12,7,20,.9)'; rr(c, 110, 440, 740, 72, 14); c.fill();
      txt('Bruno sees the orders. Bärbel makes the food.', W / 2, 471, '20px Bungee, sans-serif', '#fff', 'center');
      txt('Nobody can hear a thing.', W / 2, 498, '700 16px Archivo, sans-serif', '#ffb238', 'center'); c.restore();
    }
  };
  R.dance = (lt, t) => {
    const I = st.inter;
    const live = !I.done && lt >= 3.2 - .001;
    const revealed = I.done && lt >= 3.2;
    let mainPose = null;
    if (!revealed) { const k = Math.floor((live ? t : lt) * 1.7) % 4; mainPose = k < 3 ? SEQ[k] : null; }
    else mainPose = Math.floor(t * 2) % 2 ? 'U' : null;
    animClub(CLUB, t, { mainPose, mainGlow: !live && !revealed && lt > 1.6, hop: revealed ? Math.abs(Math.sin(t * 8)) * .05 : 0 });
    full(CLUB.s, CLUB.fp);
    hud(171 - Math.min(lt, 3.2), 0);
    ticket(CLUB.fp, revealed, I.done ? 3 : I.prog, !revealed);
    const myPose = live ? (st.poseT > 0 ? st.pose : null) : (lt > 1.6 && lt < 3.1 ? SEQ[Math.floor((lt - 1.6) / .5) % 3] : null);
    brunoBar(null, myPose);
    if (myPose) { c.font = '64px Archivo, sans-serif'; c.textAlign = 'center'; c.fillStyle = '#ffe14a'; c.fillText(ARROW[myPose], 480, 430); }
    kicker('BRUNO’S VIEW · KASSE', 1, '#d8322b');
    if (lt < 3.2) {
      caption('READ THE DANCE', 'Bruno copies every move to take the order.', fade(lt, .3, 3.1), 360, '#ff4fa8');
      const [cx, cy] = path(lt, [[0, 700, 380], [1.4, 420, 300], [1.8, 60, 505], [3.2, 120, 505]]);
      cursor(cx, cy, 0, lt > 1.6 && Math.floor(lt * 2) % 2 === 0);
    }
    if (live) {
      c.fillStyle = 'rgba(16,8,28,.94)'; rr(c, 560, 240, 380, 104, 18); c.fill(); c.strokeStyle = '#ff4fa8'; c.lineWidth = 4; c.stroke();
      txt('YOUR TURN', 750, 280, '30px Bungee, sans-serif', '#fff', 'center');
      txt('Copy the dance: arrow keys, WASD or the pad', 750, 308, '700 15px Archivo, sans-serif', 'rgba(255,255,255,.85)', 'center');
      const left = Math.max(0, 10 - (performance.now() - (I.since || performance.now())) / 1000);
      txt(Math.ceil(left) + 's', 750, 332, '700 13px Archivo, sans-serif', 'rgba(255,255,255,.55)', 'center');
      if (I.wrongT > 0) stroked('Falsch! Again', 750, 380, 20, '#ff6060');
    } else if (revealed) {
      const [x, y] = proj(CLUB.fp, SLOTX[1], SLOTY + .9, SLOTZ);
      popAt(x, y - 70, I.result === 'win' ? 'Bestellt!' : 'Bestellt.', '#ffd25a', lt - 3.25);
      caption(I.result === 'win' ? 'ORDER TAKEN!' : 'BRUNO GOT IT', 'Now only Bruno knows what to cook.', fade(lt, 3.6, 8.8), 400, '#3fbf5f');
    }
  };
  R.signs = (lt, t) => {
    const seq = ['m', 'l', 'o', 'h'];
    if (lt < 4.2) {
      const k = clamp(Math.floor((lt - .6) / .85), -1, 3);
      const cur = k >= 0 ? seq[k] : null;
      animClub(CLUB, t, { mainPose: Math.floor(t * 2) % 2 ? 'U' : null, mySign: cur });
      full(CLUB.s, CLUB.fp);
      hud(165 - lt, 0);
      ticket(CLUB.fp, true, 3, false);
      brunoBar(cur);
      kicker('BRUNO’S VIEW · PAW SIGNS', 1, '#d8322b');
      const tgt = cur ? signPos(BAR_KEYS, cur, 58, 6) : [600, 380];
      const prev = k > 0 ? signPos(BAR_KEYS, seq[k - 1], 58, 6) : [600, 380];
      const ph = k >= 0 ? (lt - .6) % .85 : 0;
      const kk = k >= 0 ? ease(ph / .35) : 0;
      cursor(lerp(prev[0], tgt[0], kk), lerp(prev[1], tgt[1], kk), 0, k >= 0 && ph > .4 && ph < .55);
      caption('TALK WITH YOUR PAWS', 'Eight hand signs. No words.', fade(lt, .3, 4.1), 380, '#22b0a2');
    } else {
      const l2 = lt - 4.2;
      const k = clamp(Math.floor(l2 / .9), 0, 3);
      animGrill(GRILL, t, { brunoSign: seq[k], signPop: Math.max(0, .25 - (l2 % .9)), plate: 'D', fog: clamp(l2 - 2.2, 0, 1) * .8 });
      full(GRILL.s, GRILL.fp);
      label3(GRILL.fp, 1.1, 2.3, -1.0, l2 > 2.2 ? 'NEBELMASCHINE!' : 'BRUNO', '#ffb238', 12);
      barbelBar(); hud(161 - l2, 0);
      kicker('BÄRBEL’S VIEW · GRILL', 1, '#22b0a2');
      c.save(); c.fillStyle = 'rgba(12,7,20,.8)'; rr(c, 18, 56, 64 + 4 * 46, 60, 12); c.fill();
      txt('READ:', 30, 92, '800 12px Archivo, sans-serif', '#bba9c8');
      for (let i = 0; i <= k; i++) drawSignIcon(c, seq[i], 96 + i * 46, 86, .7);
      c.restore();
      caption('THROUGH THE STROBE', 'Bärbel has to catch every sign through the hatch.', fade(l2, .2, 3.7), 420, '#22b0a2');
    }
  };
  R.grill = (lt, t) => {
    if (lt < 5.4) {
      let hover = null, plate = 'D', board = null, shaving = false, chopping = false, pass = null;
      if (lt < 1.6) { hover = 'spit'; shaving = lt > .4 && lt < 1.4; plate = lt > 1.4 ? 'Dm' : 'D'; }
      else if (lt < 2.0) { hover = 'T'; plate = 'Dm'; board = lt > 1.85 ? 'T' : null; }
      else if (lt < 3.2) { hover = 'board'; plate = 'Dm'; board = lt > 2.9 ? 't' : 'T'; chopping = lt < 2.9; }
      else if (lt < 3.6) { hover = 'board'; plate = 'Dmt'; board = null; }
      else if (lt < 4.6) { hover = 'L'; plate = lt > 4.1 ? 'Dmlt' : 'Dmt'; }
      else { hover = 'plate'; plate = lt > 5.0 ? null : 'Dmlt'; pass = lt > 5.0 ? 'Dmlt' : null; }
      animGrill(GRILL, t, { hover, plate, board, shaving, chopping, pass });
      full(GRILL.s, GRILL.fp);
      const P = (x, y, z) => proj(GRILL.fp, x, y, z);
      label3(GRILL.fp, -1.3, .98, -.4, 'HOLD TO SHAVE', '#ffcf5a', 10);
      if (shaving) { const [x, y] = P(-1.3, 2.05, -.62); bar(c, x - 50, y, 100, 9, (lt - .4) / 1.0, '#7dff9a'); }
      if (chopping) { const [x, y] = P(-.08, 1.25, -.12); bar(c, x - 50, y - 14, 100, 8, (lt - 2.0) / .9, '#7dff9a'); label3(GRILL.fp, -.08, .86, .05, 'HOLD TO CHOP', '#fff', 10); }
      if (plate && lt > 4.6) label3(GRILL.fp, .68, .86, .08, 'TAP: PASS TO BRUNO', '#7dff9a', 10);
      barbelBar(); hud(150 - lt, 0);
      kicker('BÄRBEL’S VIEW · GRILL', 1, '#22b0a2');
      const tgt = { spit: P(-1.3, 1.5, -.62), T: P(.08, 1.1, -.62), board: P(-.08, 1.05, -.12), L: P(-.24, 1.1, -.62), plate: P(.68, 1.05, -.1) }[hover];
      const bob = (shaving || chopping) ? Math.abs(Math.sin(t * 20)) * 6 : 0;
      cursor(tgt[0], tgt[1] + bob, 1, shaving || chopping);
      caption('SHAVE · CHOP · PASS', null, fade(lt, .2, 5.2), 120, '#22b0a2');
    } else {
      const l2 = lt - 5.4;
      const held = l2 < .5 ? null : l2 < 1.0 ? 'Dmlt' : l2 < 1.5 ? 'Dmltg' : l2 < 2.0 ? 'Dmltgh' : null;
      animClub(CLUB, t, { tray: l2 < .5 ? 'Dmlt' : null, held, trayGlow: l2 < .5, sauceGlow: l2 >= .5 && l2 < 1.0 ? 'g' : l2 >= 1.0 && l2 < 1.5 ? 'h' : null, mainGlow: l2 >= 1.5 && l2 < 2.0, mainPose: l2 > 2.0 ? (Math.floor(t * 3) % 2 ? 'U' : null) : null, hop: l2 > 2.0 ? Math.abs(Math.sin(t * 9)) * .07 : 0 });
      full(CLUB.s, CLUB.fp);
      const P = (x, y, z) => proj(CLUB.fp, x, y, z);
      if (l2 < .5) label3(CLUB.fp, 1.55, 1.32, .05, 'DÖNER!', '#7dff9a', 13);
      label3(CLUB.fp, -1.25, .88, .45, 'KNOBLAUCH', '#fff', 9); label3(CLUB.fp, -.98, .88, .45, 'SCHARF', '#fff', 9);
      brunoBar(null, null); hud(142 - l2, l2 > 2.0 ? 12 : 0);
      kicker('BRUNO SAUCES + SERVES', 1, '#d8322b');
      const tgt = l2 < .5 ? P(1.55, 1.08, .05) : l2 < 1.0 ? P(-1.25, 1.2, .4) : l2 < 1.5 ? P(-.98, 1.2, .4) : P(SLOTX[1], SLOTY, SLOTZ);
      cursor(tgt[0], tgt[1], 0, (l2 % .5) > .3);
      const [x, y] = P(SLOTX[1], SLOTY + .5, SLOTZ);
      popAt(x, y, '+€12', '#7dff9a', l2 - 2.0);
    }
  };
  function phone(x, y, w, h, label, col) {
    c.fillStyle = '#0a0a0e'; rr(c, x - 12, y - 12, w + 24, h + 24, 26); c.fill(); c.strokeStyle = '#3a3a44'; c.lineWidth = 3; c.stroke();
    c.fillStyle = col; rr(c, x + w / 2 - 110, y + h + 22, 220, 34, 17); c.fill();
    txt(label, x + w / 2, y + h + 45, '15px Bungee, sans-serif', '#fff', 'center');
  }
  R.devices = (lt, t) => {
    clearAll(0x120c1c);
    const pw = 400, ph = 225, y = Math.round(150 + (1 - ease(lt / .8)) * 50), lx = 40, rx = W - 40 - pw;
    animClub(CLUB, t, { mainPose: 'URD'[Math.floor(t * 1.7) % 3], mySign: 'mlo'[Math.floor(t * .8) % 3] });
    view(CLUB.s, CLUB.fp, lx, y, pw, ph);
    animGrill(GRILL, t, { brunoSign: 'mlo'[Math.floor(t * .8) % 3], plate: 'Dml', board: 't' });
    view(GRILL.s, GRILL.fp, rx, y, pw, ph);
    renderer.setScissorTest(false);
    // background + bezels on the overlay, leaving the two screens see-through
    c.save(); c.beginPath(); c.rect(0, 0, W, H); c.roundRect(lx, y, pw, ph, 14); c.roundRect(rx, y, pw, ph, 14);
    c.clip('evenodd');
    c.fillStyle = '#120c1c'; c.fillRect(0, 0, W, H);
    const g = c.createRadialGradient(480, 260, 40, 480, 260, 520); g.addColorStop(0, 'rgba(255,79,168,.2)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    phone(lx, y, pw, ph, 'BRUNO’S PHONE', '#d8322b'); phone(rx, y, pw, ph, 'BÄRBEL’S PHONE', '#22b0a2');
    c.restore();
    caption('TWO PHONES. TWO VIEWS. ONE DÖNER.', 'Online co-op on phones or laptops.', fade(lt, .6, 5.9), 70, '#ffb238');
  };
  R.end = (lt, t) => {
    animCity(CITY, t, lt, { z: 4.6, bears: true, lookY: 1.4 });
    full(CITY.s, CITY.k);
    c.fillStyle = 'rgba(12,7,20,.3)'; c.fillRect(0, 0, W, H);
    logo(480, 110, .8 + .05 * ease(lt / .6), 1);
    txt('A döner co-op for two bears who can’t hear each other.', 480, 236, '700 18px Archivo, sans-serif', '#fff', 'center');
  };

  // ================= timeline + controls =================
  function sceneAt(tt) { for (let i = SCENES.length - 1; i >= 0; i--) if (tt >= SCENES[i].t0) return i; return 0; }
  const S0 = id => SCENES.find(s => s.id === id).t0;
  const CUES = [
    [S0('cold') + 1.25, () => BB.Audio.sfx('start')],
    [S0('dance') + .1, () => BB.Audio.sfx('order')],
    ...[0, 1, 2].map(k => [S0('dance') + 1.6 + k * .5, () => BB.Audio.sfx('step', SEQ[k])]),
    ...[0, 1, 2, 3].map(k => [S0('signs') + 1.0 + k * .85, () => BB.Audio.sfx('sign')]),
    [S0('grill') + .5, () => BB.Audio.sfx('shave')], [S0('grill') + 1.0, () => BB.Audio.sfx('shave')], [S0('grill') + 1.45, () => BB.Audio.sfx('grab')],
    [S0('grill') + 2.2, () => BB.Audio.sfx('chop')], [S0('grill') + 2.5, () => BB.Audio.sfx('chop')], [S0('grill') + 2.8, () => BB.Audio.sfx('chop')],
    [S0('grill') + 4.1, () => BB.Audio.sfx('grab')], [S0('grill') + 5.0, () => BB.Audio.sfx('place')],
    [S0('grill') + 5.9, () => BB.Audio.sfx('sauce')], [S0('grill') + 6.4, () => BB.Audio.sfx('sauce')], [S0('grill') + 7.4, () => BB.Audio.sfx('serve')],
    [S0('end') + .2, () => BB.Audio.sfx('end')],
  ];
  function setScene(i) {
    if (st.sceneIdx === i) return;
    st.sceneIdx = i; const S = SCENES[i];
    if (st.playing) { BB.Audio.play(S.music); BB.Audio.muffle(!!S.muffle); }
    document.querySelectorAll('#tv-chapters button').forEach((b, k) => b.classList.toggle('on', k === i));
    $('#tv-cta').hidden = S.id !== 'end';
  }
  function seek(tt, user) {
    st.tt = clamp(tt, 0, TOTAL);
    if (user) {
      if (st.tt > DANCE_AT + .05 && !st.inter.done) { st.inter.done = true; st.inter.result = 'skip'; }
      if (st.tt < DANCE_AT - .05) st.inter = freshInter();
      st.fired = new Set(CUES.map((q, k) => (q[0] < st.tt ? k : -1)).filter(k => k >= 0));
    }
    st.sceneIdx = -1; setScene(sceneAt(st.tt));
  }
  function play() {
    BB.Audio.init();
    if (st.tt >= TOTAL - .05) seek(0, true);
    st.playing = true; st.started = true;
    const S = SCENES[sceneAt(st.tt)]; BB.Audio.play(S.music); BB.Audio.muffle(!!S.muffle);
    $('#tv-play').textContent = 'Pause';
  }
  function pause() { st.playing = false; BB.Audio.stop(); BB.Audio.muffle(false); $('#tv-play').textContent = st.tt >= TOTAL - .05 ? 'Replay' : 'Play'; }
  const interLive = () => !st.inter.done && st.tt >= DANCE_AT - .001 && st.tt < DANCE_AT + 1;
  function danceInput(d) {
    if (!interLive()) return;
    const I = st.inter; st.pose = d; st.poseT = .45;
    if (SEQ[I.prog] === d) { I.prog++; BB.Audio.sfx('step', d); if (I.prog >= SEQ.length) { I.done = true; I.result = 'win'; BB.Audio.sfx('decoded'); } }
    else { I.prog = SEQ[0] === d ? 1 : 0; I.wrongT = .9; BB.Audio.sfx('miss'); }
  }
  let last = performance.now();
  function step(dt) {
    st.poseT = Math.max(0, st.poseT - dt); st.inter.wrongT = Math.max(0, st.inter.wrongT - dt);
    if (!st.playing) return;
    if (interLive() && st.tt >= DANCE_AT) {
      if (!st.inter.since) st.inter.since = performance.now();
      if (performance.now() - st.inter.since > 10000) { st.inter.done = true; st.inter.result = 'auto'; BB.Audio.sfx('decoded'); }
    } else {
      const prev = st.tt; st.tt = Math.min(TOTAL, st.tt + dt);
      if (prev < DANCE_AT && st.tt >= DANCE_AT && !st.inter.done) st.tt = DANCE_AT;
      CUES.forEach((q, k) => { if (!st.fired.has(k) && q[0] <= st.tt) { st.fired.add(k); q[1](); } });
      if (st.tt >= TOTAL) { st.tt = TOTAL; pause(); }
    }
    setScene(sceneAt(st.tt));
  }
  function tick(now) {
    now = performance.now();
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    step(dt); draw(now / 1000);
    requestAnimationFrame(tick);
  }
  setInterval(() => { const now = performance.now(); if (now - last > 250) { const dt = Math.min(.25, (now - last) / 1000); last = now; step(dt); } }, 120);
  const fmt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  function draw(t) {
    c.setTransform(ov.width / W, 0, 0, ov.height / H, 0, 0);
    c.clearRect(0, 0, W, H);
    if (!renderer) { c.fillStyle = '#120c1c'; c.fillRect(0, 0, W, H); logo(480, 200, 1, 1); txt('This trailer needs WebGL, which is turned off in this browser.', 480, 360, '700 16px Archivo, sans-serif', '#fff', 'center'); return; }
    const i = sceneAt(st.tt), S = SCENES[i];
    const lt = st.started ? st.tt - S.t0 : 2.2;
    try { R[st.started ? S.id : 'cold'](lt, t); } catch (e) { console.error(e); }
    const into = st.tt - S.t0;
    if (st.started && i > 0 && into < .25) { c.fillStyle = `rgba(10,6,16,${1 - into / .25})`; c.fillRect(0, 0, W, H); }
    if (!st.started) {
      c.fillStyle = 'rgba(10,6,16,.3)'; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(255,79,168,.95)'; c.beginPath(); c.arc(480, 400, 44, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 4; c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(468, 378); c.lineTo(500, 400); c.lineTo(468, 422); c.closePath(); c.fill();
      txt('Watch the trailer · 56 s · interactive', 480, 474, '700 15px Archivo, sans-serif', '#fff', 'center');
    }
    $('#tv-pad').hidden = !(st.playing && interLive() && st.tt >= DANCE_AT);
    const sc = $('#tv-scrub'); if (document.activeElement !== sc) sc.value = Math.round(st.tt / TOTAL * 1000);
    $('#tv-time').textContent = fmt(st.tt) + ' / ' + fmt(TOTAL);
  }
  function fit() {
    const r = ov.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1);
    ov.width = Math.max(320, Math.round(r.width * dpr)); ov.height = Math.round(ov.width * H / W);
  }

  const chapters = $('#tv-chapters');
  SCENES.forEach(S => { const b = document.createElement('button'); b.type = 'button'; b.textContent = S.label; b.addEventListener('click', () => { st.started = true; seek(S.t0 + .01, true); if (!st.playing) play(); }); chapters.appendChild(b); });
  $('#tv-play').addEventListener('click', () => (st.playing ? pause() : play()));
  ov.addEventListener('click', () => { if (interLive() && st.playing) return; st.playing ? pause() : play(); });
  $('#tv-scrub').addEventListener('input', e => { st.started = true; seek(e.target.value / 1000 * TOTAL, true); });
  $('#tv-replay').addEventListener('click', () => { seek(0, true); play(); });
  document.querySelectorAll('#tv-pad button').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); danceInput(b.dataset.d); }));
  const KEYD = { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R', KeyW: 'U', KeyS: 'D', KeyA: 'L', KeyD: 'R' };
  window.addEventListener('keydown', e => {
    if (KEYD[e.code] && interLive() && st.playing) { e.preventDefault(); if (!e.repeat) danceInput(KEYD[e.code]); return; }
    if ((e.code === 'Space' || e.code === 'KeyK') && (e.target === document.body || e.target === ov)) { e.preventDefault(); st.playing ? pause() : play(); }
    if (e.code === 'KeyM') toggleMute();
  });
  function toggleMute() { BB.Audio.init(); const m = BB.Audio.toggleMute(); document.querySelectorAll('.b-mute').forEach(b => (b.textContent = m ? 'Sound off' : 'Sound on')); }
  document.querySelectorAll('.b-mute').forEach(b => { b.textContent = BB.Audio.muted ? 'Sound off' : 'Sound on'; b.addEventListener('click', toggleMute); });
  const gameLink = $('#tv-game'); if (gameLink) { if (GAME_URL) gameLink.href = GAME_URL; else gameLink.hidden = true; }
  window.addEventListener('resize', fit);
  const start = () => { fit(); setScene(0); $('#tv-cta').hidden = true; requestAnimationFrame(tick); };
  if (document.fonts && document.fonts.load) Promise.race([Promise.all([document.fonts.load('20px Bungee'), document.fonts.load('700 14px Archivo')]), new Promise(r => setTimeout(r, 1500))]).then(start, start);
  else start();
  BB.Trailer = { seek, play, pause, st, SCENES, danceInput, draw };
})();
