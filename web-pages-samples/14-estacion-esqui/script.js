/* ============================================================
   VALDÔRE — interfaz
   Todo dato que se ve en pantalla vive aquí en métrico; el
   conversor de unidades reescribe la página entera de una vez.
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ==========================================================
     1 · Unidades
     Cada cifra se marca en el HTML con su magnitud en métrico
     (data-temp, data-cm, data-m, data-kmh). Un único punto de
     verdad: al cambiar de sistema no hay nada que quede a medias.
     ========================================================== */
  var imperial = false;

  function fmt(n, dec) {
    return n.toFixed(dec || 0).replace('.', ',');
  }

  /* toLocaleString('es-ES') omite el punto en los números de cuatro
     cifras, y entonces «1.640 – 2480 m» queda descuadrado. Aquí las
     altitudes siempre llevan separador. */
  function miles(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function paintUnits() {
    document.querySelectorAll('[data-temp]').forEach(function (el) {
      var c = parseFloat(el.dataset.temp);
      el.innerHTML = imperial
        ? fmt(c * 9 / 5 + 32) + '<u>°F</u>'
        : fmt(c) + '<u>°C</u>';
    });

    document.querySelectorAll('[data-cm]').forEach(function (el) {
      var cm = parseFloat(el.dataset.cm);
      el.innerHTML = imperial
        ? fmt(cm / 2.54) + '<u>in</u>'
        : fmt(cm) + '<u>cm</u>';
    });

    document.querySelectorAll('[data-m]').forEach(function (el) {
      var m = parseFloat(el.dataset.m);
      el.innerHTML = imperial
        ? miles(m * 3.28084) + '<u>ft</u>'
        : miles(m) + '<u>m</u>';
    });

    document.querySelectorAll('[data-kmh]').forEach(function (el) {
      var k = parseFloat(el.dataset.kmh);
      el.innerHTML = imperial
        ? fmt(k * 0.621371) + '<u>mph</u>'
        : fmt(k) + '<u>km/h</u>';
    });
  }

  document.querySelectorAll('.unit').forEach(function (btn) {
    btn.addEventListener('click', function () {
      imperial = btn.dataset.u === 'i';
      document.querySelectorAll('.unit').forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', String(on));
      });
      paintUnits();
      renderBoard();
      renderForecast();
    });
  });

  /* ==========================================================
     2 · Datos de la estación
     ========================================================== */
  var LIFTS = [
    { n: 'Telecabina Valdôre',  s: 'Base',    k: 'Telecabina', st: 'open', cap: 2800, load: 62, from: 1640, to: 2180 },
    { n: 'Telesilla Roca Alta', s: 'Norte',   k: 'Telesilla 6p', st: 'open', cap: 2400, load: 48, from: 2180, to: 2480 },
    { n: 'Telesilla El Circo',  s: 'Norte',   k: 'Telesilla 4p', st: 'open', cap: 1800, load: 71, from: 2050, to: 2320 },
    { n: 'Telesilla Solana',    s: 'Sur',     k: 'Telesilla 6p', st: 'open', cap: 2400, load: 35, from: 1720, to: 2100 },
    { n: 'Telesquí Bosque',     s: 'Sur',     k: 'Telesquí',   st: 'open', cap: 900,  load: 22, from: 1640, to: 1810 },
    { n: 'Telesilla Ventisca',  s: 'Cumbre',  k: 'Telesilla 4p', st: 'soon', cap: 1600, load: 0,  from: 2320, to: 2480 },
    { n: 'Cinta Debutantes',    s: 'Base',    k: 'Cinta',      st: 'open', cap: 600,  load: 18, from: 1640, to: 1690 },
    { n: 'Telesilla Lago',      s: 'Cumbre',  k: 'Telesilla 6p', st: 'shut', cap: 2200, load: 0,  from: 2100, to: 2400 },
    { n: 'Telesquí Escuela',    s: 'Base',    k: 'Telesquí',   st: 'open', cap: 800,  load: 44, from: 1660, to: 1740 },
    { n: 'Telecabina Peñas',    s: 'Sur',     k: 'Telecabina', st: 'open', cap: 3000, load: 56, from: 1700, to: 2260 }
  ];

  var SLOPES = [
    { n: 'Prado Largo',      s: 'Base',   d: 'verde', st: 'open', len: 1.9, drop: 180 },
    { n: 'Debutantes',       s: 'Base',   d: 'verde', st: 'open', len: 0.8, drop: 60 },
    { n: 'Solana',           s: 'Sur',    d: 'azul',  st: 'open', len: 3.4, drop: 380 },
    { n: 'Bosque Bajo',      s: 'Sur',    d: 'azul',  st: 'open', len: 2.6, drop: 290 },
    { n: 'Camino del Lago',  s: 'Cumbre', d: 'azul',  st: 'shut', len: 4.1, drop: 300 },
    { n: 'Roca Alta',        s: 'Norte',  d: 'roja',  st: 'open', len: 2.2, drop: 420 },
    { n: 'El Circo',         s: 'Norte',  d: 'roja',  st: 'open', len: 1.7, drop: 270 },
    { n: 'Canal Norte',      s: 'Norte',  d: 'negra', st: 'open', len: 1.3, drop: 340 },
    { n: 'Tubo de Ventisca', s: 'Cumbre', d: 'negra', st: 'soon', len: 0.9, drop: 290 },
    { n: 'Travesía Peñas',   s: 'Sur',    d: 'azul',  st: 'open', len: 7.4, drop: 560 },
    { n: 'Muro del Circo',   s: 'Norte',  d: 'negra', st: 'shut', len: 1.1, drop: 310 },
    { n: 'Serpentina',       s: 'Sur',    d: 'roja',  st: 'open', len: 3.1, drop: 410 },
    { n: 'Pinar',            s: 'Sur',    d: 'verde', st: 'open', len: 2.4, drop: 190 },
    { n: 'Cornisa',          s: 'Cumbre', d: 'roja',  st: 'soon', len: 2.8, drop: 380 }
  ];

  var ST_LABEL = { open: 'Abierto', soon: 'Previsto', shut: 'Cerrado' };
  var ST_LABEL_F = { open: 'Abierta', soon: 'Prevista', shut: 'Cerrada' };
  var D_MARK = { verde: '●', azul: '●', roja: '●', negra: '●' };

  /* ==========================================================
     3 · Tablero de montaña
     ========================================================== */
  var view = 'lifts';
  var sector = 'Todos';
  var query = '';

  var rowsEl = document.getElementById('rows');
  var boardCount = document.getElementById('boardCount');
  var boardEmpty = document.getElementById('boardEmpty');
  var sectorsEl = document.getElementById('sectors');
  var qEl = document.getElementById('q');

  function data() { return view === 'lifts' ? LIFTS : SLOPES; }

  function sectors() {
    var set = ['Todos'];
    data().forEach(function (x) { if (set.indexOf(x.s) < 0) set.push(x.s); });
    return set;
  }

  function renderSectors() {
    sectorsEl.innerHTML = '';
    sectors().forEach(function (s) {
      var b = document.createElement('button');
      b.className = 'chip' + (s === sector ? ' is-on' : '');
      b.type = 'button';
      b.textContent = s;
      b.addEventListener('click', function () {
        sector = s;
        renderSectors();
        renderBoard();
      });
      sectorsEl.appendChild(b);
    });
  }

  function renderBoard() {
    var list = data();
    var open = list.filter(function (x) { return x.st === 'open'; }).length;

    document.getElementById('nLifts').textContent =
      LIFTS.filter(function (x) { return x.st === 'open'; }).length + '/' + LIFTS.length;
    document.getElementById('nSlopes').textContent =
      SLOPES.filter(function (x) { return x.st === 'open'; }).length + '/' + SLOPES.length;

    var shown = list.filter(function (x) {
      var okSector = sector === 'Todos' || x.s === sector;
      var okQuery = !query || x.n.toLowerCase().indexOf(query) >= 0;
      return okSector && okQuery;
    });

    rowsEl.innerHTML = '';

    shown.forEach(function (x) {
      var row = document.createElement('div');
      row.className = 'row' + (x.st === 'shut' ? ' is-closed' : '');

      var badge, meta, prog, progLbl;

      if (view === 'lifts') {
        badge = '<span class="row__b">▲</span>';
        meta = x.k + ' · ' + (imperial
          ? miles(x.from * 3.28084) + '–' + miles(x.to * 3.28084) + ' ft'
          : miles(x.from) + '–' + miles(x.to) + ' m');
        prog = x.st === 'open' ? x.load : 0;
        progLbl = x.st === 'open'
          ? 'Ocupación ' + x.load + '% · ' + miles(x.cap) + ' p/h'
          : '—';
      } else {
        badge = '<span class="row__b" data-d="' + x.d + '">' + D_MARK[x.d] + '</span>';
        meta = x.d.charAt(0).toUpperCase() + x.d.slice(1) + ' · ' + (imperial
          ? fmt(x.len * 0.621371, 1) + ' mi'
          : fmt(x.len, 1) + ' km');
        prog = Math.min(100, (x.len / 7.4) * 100);
        progLbl = imperial
          ? 'Desnivel ' + Math.round(x.drop * 3.28084) + ' ft'
          : 'Desnivel ' + x.drop + ' m';
      }

      var lbl = view === 'lifts' ? ST_LABEL[x.st] : ST_LABEL_F[x.st];

      row.innerHTML =
        badge +
        '<div><span class="row__n">' + x.n + '</span>' +
          '<span class="row__meta" style="display:block">' + meta + '</span></div>' +
        '<span class="row__sector">' + x.s + '</span>' +
        '<div class="row__prog"><span class="row__bar"><i></i></span>' +
          '<span class="row__barlbl">' + progLbl + '</span></div>' +
        '<span class="st st--' + x.st + '"><i></i>' + lbl + '</span>';

      rowsEl.appendChild(row);

      // La barra crece después de pintar, para que se vea el gesto
      var bar = row.querySelector('.row__bar i');
      if (reduceMotion) bar.style.width = prog + '%';
      else requestAnimationFrame(function () {
        requestAnimationFrame(function () { bar.style.width = prog + '%'; });
      });
    });

    var noun = view === 'lifts' ? 'remontes' : 'pistas';
    boardCount.textContent = shown.length === list.length
      ? open + ' de ' + list.length + ' ' + noun + ' abiertos'
      : 'Mostrando ' + shown.length + ' de ' + list.length + ' ' + noun;

    boardEmpty.hidden = shown.length > 0;

    document.getElementById('pillLifts').textContent =
      LIFTS.filter(function (x) { return x.st === 'open'; }).length + '/' + LIFTS.length;
    document.getElementById('pillSlopes').textContent =
      SLOPES.filter(function (x) { return x.st === 'open'; }).length + '/' + SLOPES.length;
  }

  document.querySelectorAll('.seg__b').forEach(function (b) {
    b.addEventListener('click', function () {
      view = b.dataset.v;
      sector = 'Todos';
      document.querySelectorAll('.seg__b').forEach(function (o) {
        var on = o === b;
        o.classList.toggle('is-on', on);
        o.setAttribute('aria-selected', String(on));
      });
      renderSectors();
      renderBoard();
    });
  });

  // Búsqueda con pequeño retardo: no repintamos en cada tecla
  var qTimer;
  qEl.addEventListener('input', function () {
    clearTimeout(qTimer);
    qTimer = setTimeout(function () {
      query = qEl.value.trim().toLowerCase();
      renderBoard();
    }, 140);
  });

  /* ==========================================================
     4 · Perfil de cotas
     ========================================================== */
  var PTS = [
    { x: 0,    y: 330, n: 'Base Valdôre',      alt: 1640 },
    { x: 270,  y: 240, n: 'Telesquí Bosque',   alt: 1810 },
    { x: 450,  y: 170, n: 'Mirador Solana',    alt: 2100 },
    { x: 620,  y: 120, n: 'Collado Norte',     alt: 2180 },
    { x: 780,  y: 64,  n: 'Circo del Lago',    alt: 2320 },
    { x: 940,  y: 42,  n: 'Cima Valdôre',      alt: 2480 }
  ];

  var profPts = document.getElementById('profPts');
  var tip = document.getElementById('profTip');
  var tipName = document.getElementById('tipName');
  var tipAlt = document.getElementById('tipAlt');
  var profSvg = document.querySelector('.prof');

  PTS.forEach(function (p) {
    var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'pt');
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', p.n + ', ' + p.alt + ' metros');
    g.innerHTML =
      '<circle cx="' + p.x + '" cy="' + p.y + '" r="7"/>' +
      '<circle cx="' + p.x + '" cy="' + p.y + '" r="18" fill="transparent" stroke="none"/>';

    function show() {
      tipName.textContent = p.n;
      tipAlt.innerHTML = imperial
        ? miles(p.alt * 3.28084) + ' ft'
        : miles(p.alt) + ' m';
      tip.hidden = false;

      // Del sistema de coordenadas del SVG al de la página
      var box = profSvg.getBoundingClientRect();
      var vb = profSvg.viewBox.baseVal;
      tip.style.left = (p.x / vb.width * box.width) + 'px';
      tip.style.top = (p.y / vb.height * box.height) + 'px';
    }
    function hide() { tip.hidden = true; }

    g.addEventListener('pointerenter', show);
    g.addEventListener('pointerleave', hide);
    g.addEventListener('focus', show);
    g.addEventListener('blur', hide);

    profPts.appendChild(g);
  });

  /* ==========================================================
     5 · Previsión
     ========================================================== */
  var FC = [
    { d: 'Hoy',    n: '14', snow: 22, max: -3, min: -9,  ico: 'snow', today: true },
    { d: 'Jueves', n: '15', snow: 14, max: -4, min: -11, ico: 'snow' },
    { d: 'Viernes',n: '16', snow: 0,  max: -1, min: -8,  ico: 'sun' },
    { d: 'Sábado', n: '17', snow: 6,  max: -2, min: -7,  ico: 'cloud' },
    { d: 'Domingo',n: '18', snow: 31, max: -5, min: -12, ico: 'snow' }
  ];

  var ICONS = {
    snow: '<svg viewBox="0 0 40 40" fill="none"><path d="M11 24a6 6 0 0 1 .6-12 8.5 8.5 0 0 1 16.2 2.2A5.5 5.5 0 0 1 28 24H11z" fill="#93a3bb" opacity=".55"/><g stroke="#6cc4f5" stroke-width="2.2" stroke-linecap="round"><path d="M14 29v3M20 30v4M26 29v3"/></g></svg>',
    sun:  '<svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="8" fill="#ffc46b"/><g stroke="#ffc46b" stroke-width="2.2" stroke-linecap="round"><path d="M20 4v4M20 32v4M4 20h4M32 20h4M8.7 8.7l2.8 2.8M28.5 28.5l2.8 2.8M31.3 8.7l-2.8 2.8M11.5 28.5l-2.8 2.8"/></g></svg>',
    cloud:'<svg viewBox="0 0 40 40" fill="none"><circle cx="26" cy="15" r="6" fill="#ffc46b" opacity=".7"/><path d="M11 28a6 6 0 0 1 .6-12 8.5 8.5 0 0 1 16.2 2.2A5.5 5.5 0 0 1 28 28H11z" fill="#93a3bb" opacity=".7"/></svg>'
  };

  var fcEl = document.getElementById('fc');
  var maxSnow = 35;

  function renderForecast() {
    fcEl.innerHTML = '';
    FC.forEach(function (f) {
      var card = document.createElement('div');
      card.className = 'fcd' + (f.today ? ' fcd--today' : '');

      var snowTxt = f.snow === 0
        ? '—'
        : (imperial ? fmt(f.snow / 2.54, 1) + '<u>in</u>' : f.snow + '<u>cm</u>');

      var t = function (c) {
        return imperial ? fmt(c * 9 / 5 + 32) + '°' : fmt(c) + '°';
      };

      card.innerHTML =
        '<div class="fcd__d"><span class="fcd__day">' + f.d + '</span>' +
          '<span class="fcd__num">' + f.n + '</span></div>' +
        '<div class="fcd__ico">' + ICONS[f.ico] + '</div>' +
        '<div class="fcd__snow"><span class="fcd__col"><i></i></span>' +
          '<span class="fcd__cm">' + snowTxt + '</span></div>' +
        '<div class="fcd__t"><b>' + t(f.max) + '</b><s>' + t(f.min) + '</s></div>';

      fcEl.appendChild(card);

      var bar = card.querySelector('.fcd__col i');
      var h = (f.snow / maxSnow) * 100;
      if (reduceMotion) bar.style.height = h + '%';
      else setTimeout(function () { bar.style.height = h + '%'; }, 120);
    });
  }

  /* ==========================================================
     6 · Forfait
     ========================================================== */
  var PRICE = { ad: 52, ni: 34, se: 42 };
  var LABEL = { ad: 'Adulto', ni: 'Infantil', se: 'Sénior' };

  // Multiplicador por número de días: cuantos más, más barato el día
  var MULT = { 1: 1, 2: 1.92, 3: 2.79, 4: 3.60, 5: 4.35, 6: 5.04, 7: 5.67 };

  var people = { ad: 2, ni: 0, se: 0 };
  var days = 1;

  var daysEl = document.getElementById('days');
  var totalEl = document.getElementById('total');
  var perDayEl = document.getElementById('perDay');
  var linesEl = document.getElementById('lines');
  var saveEl = document.getElementById('save');
  var ctaEl = document.getElementById('cta');
  var noteEl = document.getElementById('note');

  for (var d = 1; d <= 7; d++) {
    (function (n) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'day' + (n === days ? ' is-on' : '');
      b.innerHTML = n + '<u>' + (n === 1 ? 'día' : 'días') + '</u>';
      b.setAttribute('aria-pressed', String(n === days));
      b.addEventListener('click', function () {
        days = n;
        daysEl.querySelectorAll('.day').forEach(function (o, i) {
          var on = i + 1 === n;
          o.classList.toggle('is-on', on);
          o.setAttribute('aria-pressed', String(on));
        });
        recalc();
      });
      daysEl.appendChild(b);
    })(d);
  }

  document.querySelectorAll('.step__b').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.dataset.k;
      var next = people[k] + parseInt(b.dataset.d, 10);
      people[k] = Math.max(0, Math.min(9, next));
      recalc();
    });
  });

  ['xSeg', 'xAlq', 'xCla'].forEach(function (id) {
    document.getElementById(id).addEventListener('change', recalc);
  });

  function euros(n) {
    return n.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function recalc() {
    document.getElementById('nAd').textContent = people.ad;
    document.getElementById('nNi').textContent = people.ni;
    document.getElementById('nSe').textContent = people.se;

    // Los botones se apagan al llegar al límite en vez de fallar en silencio
    document.querySelectorAll('.step__b').forEach(function (b) {
      var k = b.dataset.k, dir = parseInt(b.dataset.d, 10);
      b.disabled = (dir < 0 && people[k] === 0) || (dir > 0 && people[k] === 9);
    });

    var head = people.ad + people.ni + people.se;
    var mult = MULT[days];
    var lines = [];
    var passes = 0;
    var single = 0;   // lo que costaría comprando días sueltos

    ['ad', 'ni', 'se'].forEach(function (k) {
      if (!people[k]) return;
      var sub = PRICE[k] * mult * people[k];
      passes += sub;
      single += PRICE[k] * days * people[k];
      lines.push({
        l: LABEL[k] + ' × ' + people[k] + ' · ' + days + (days === 1 ? ' día' : ' días'),
        v: sub
      });
    });

    var extras = 0;
    if (document.getElementById('xSeg').checked && head) {
      var seg = 4 * head * days;
      extras += seg;
      lines.push({ l: 'Seguro × ' + head, v: seg });
    }
    if (document.getElementById('xAlq').checked && head) {
      var alq = 26 * head * days;
      extras += alq;
      lines.push({ l: 'Alquiler × ' + head, v: alq });
    }
    if (document.getElementById('xCla').checked && head) {
      var cla = 38 * head * days;
      extras += cla;
      lines.push({ l: 'Clase colectiva × ' + head, v: cla });
    }

    var total = passes + extras;

    totalEl.textContent = euros(Math.round(total));

    perDayEl.textContent = head
      ? euros(Math.round(total / head / days)) + ' € por persona y día · ' + head +
        (head === 1 ? ' esquiador' : ' esquiadores')
      : 'Añade al menos un esquiador';

    linesEl.innerHTML = lines.map(function (x) {
      return '<li><span>' + x.l + '</span><b>' + euros(Math.round(x.v)) + ' €</b></li>';
    }).join('');

    var saved = Math.round(single - passes);
    if (saved > 0) {
      saveEl.hidden = false;
      saveEl.textContent = 'Ahorras ' + euros(saved) + ' € frente a comprar ' + days + ' días sueltos.';
    } else {
      saveEl.hidden = true;
    }

    ctaEl.disabled = head === 0;
    ctaEl.textContent = head === 0 ? 'Añade esquiadores' : 'Comprar forfait';
  }

  ctaEl.addEventListener('click', function () {
    noteEl.classList.add('is-ok');
    noteEl.textContent = 'Reserva guardada. Recoge los forfaits en taquilla con el localizador.';
  });

  /* ==========================================================
     7 · Ambiente y navegación
     ========================================================== */

  // Nevada
  if (!reduceMotion) {
    var fall = document.getElementById('snowfall');
    for (var i = 0; i < 34; i++) {
      var f = document.createElement('span');
      var size = 2 + Math.random() * 4;
      f.className = 'flake';
      f.style.left = (Math.random() * 100) + '%';
      f.style.width = size + 'px';
      f.style.height = size + 'px';
      f.style.opacity = (0.25 + Math.random() * 0.45).toFixed(2);
      f.style.setProperty('--dx', (Math.random() * 90 - 45) + 'px');
      f.style.animationDuration = (7 + Math.random() * 11) + 's';
      f.style.animationDelay = (-Math.random() * 18) + 's';
      fall.appendChild(f);
    }
  }

  // Hora de actualización, para que el tablero parezca vivo
  (function () {
    var now = new Date();
    document.getElementById('updTime').textContent =
      'hoy a las ' + String(now.getHours()).padStart(2, '0') + ':' +
      String(Math.floor(now.getMinutes() / 10) * 10).padStart(2, '0');
  })();

  var bar = document.getElementById('bar');
  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu');

  function onScroll() { bar.classList.toggle('is-stuck', window.scrollY > 8); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  burger.addEventListener('click', function () {
    var open = burger.getAttribute('aria-expanded') === 'true';
    burger.setAttribute('aria-expanded', String(!open));
    menu.classList.toggle('is-open', !open);
  });
  menu.addEventListener('click', function (e) {
    if (e.target.tagName !== 'A') return;
    burger.setAttribute('aria-expanded', 'false');
    menu.classList.remove('is-open');
  });

  // Aparición
  var risers = document.querySelectorAll('.sec__h, .board, .profile, .fc, .cam, .buy');
  if (!('IntersectionObserver' in window) || reduceMotion) {
    risers.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    risers.forEach(function (el) { el.classList.add('rise'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -50px' });
    risers.forEach(function (el) { io.observe(el); });
  }

  document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.scrollY - 84;
      window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  /* ==========================================================
     Arranque
     ========================================================== */
  paintUnits();
  renderSectors();
  renderBoard();
  renderForecast();
  recalc();
})();
