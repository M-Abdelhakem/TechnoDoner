(function () {
  const BB = (window.BB = window.BB || {});
  BB.COLS = 15; BB.ROWS = 8; BB.T = 64; BB.HUD = 128; BB.W = 960; BB.H = 640;
  BB.ORDER_CHARS = 'mltogh';
  BB.ING = {
    m: 'Fleisch', l: 'Salat', t: 'Tomate', o: 'Zwiebel', g: 'Knoblauch', h: 'Scharf',
  };
  // Hand signs (keys 1-6): one per ingredient
  BB.SIGNS = ['m', 'l', 't', 'o', 'g', 'h'];
  BB.RECIPES = {
    klassik: { name: 'Klassik', c: 'mltog' },
    fleisch: { name: 'Nur Fleisch', c: 'mg' },
    scharf: { name: 'Scharf', c: 'mloh' },
    ohnez: { name: 'Ohne Zwiebel', c: 'mltg' },
    gemuese: { name: 'Gemüse', c: 'ltog' },
    alles: { name: 'Mit Alles', c: 'mltogh' },
  };
  // Tiles: . floor  # counter  B bread  L/T/O crates  C board  S spit
  // G garlic sauce  H hot sauce  W window  X trash  P pole  D train door
  BB.LEVELS = [
    {
      id: 'kotti', name: 'Kotti Imbiss', clock: '18:00', theme: 'kotti', music: 'kotti',
      blurb: 'Feierabend at Kottbusser Tor. Learn the line: bread, meat, veg, sauce, serve.',
      twist: 'No twist yet. Just hungry Berliners.',
      map: [
        '##X##GWWWH##B##',
        'L.............S',
        'T.............#',
        'O....##C##....S',
        '#....##C##....#',
        'C.............B',
        'C.............#',
        '#####X####CC###',
      ],
      recipes: ['klassik', 'fleisch', 'scharf'],
      duration: 150, maxOrders: 3, spawn: [1.5, 17], patience: 75,
      stars: [30, 60, 90], spawnPos: [[3.5, 2.5], [11.5, 5.5]],
    },
    {
      id: 'bunker', name: 'Bunker Club', clock: '03:00', theme: 'bunker', music: 'bunker',
      blurb: 'A döner window inside a techno bunker. Nobody can hear a thing.',
      twist: 'Too loud to talk. Customers order by dancing. Stand at the window, press DANCE and copy their moves to decode the ticket. Online, only the bear who decoded it can read it, so sign it to your partner with 1–6.',
      map: [
        '#GH###WWW###X##',
        '#.............S',
        'L......#......#',
        'T......#......S',
        'O......C......#',
        '#......#......B',
        '#.............#',
        '##CC#######XB##',
      ],
      recipes: ['klassik', 'fleisch', 'scharf', 'ohnez', 'gemuese'],
      duration: 160, maxOrders: 3, spawn: [1.5, 18], patience: 85,
      dance: true, dlen: 4,
      stars: [25, 50, 80], spawnPos: [[3.5, 3.5], [11.5, 3.5]],
    },
    {
      id: 'u8', name: 'U8 Nachtzug', clock: '05:00', theme: 'u8', music: 'u8',
      blurb: 'A pop-up Imbiss in the last U8 car before sunrise.',
      twist: 'You can only serve while the doors are open at a station. Tunnels are pitch dark, and the driver brakes hard.',
      map: [
        '##B#DD###DD#X##',
        'L.............S',
        'T...P.....P...#',
        'O.....###.....S',
        '#.....#C#.....#',
        'C...P.....P...G',
        'C.............H',
        '###B######X####',
      ],
      recipes: ['klassik', 'fleisch', 'scharf', 'ohnez', 'gemuese', 'alles'],
      duration: 160, maxOrders: 4, spawn: [1, 999], patience: 95,
      train: true, station: 10, tunnel: 11,
      stars: [30, 60, 95], spawnPos: [[2.5, 3.5], [12.5, 4.5]],
    },
  ];
})();
