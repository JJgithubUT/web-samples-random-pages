/* ============================================================
   ATRIO — galería virtual
   Todo el arte de esta página se genera en el navegador: no hay
   una sola imagen externa. Cada obra tiene una semilla estable
   derivada de su título, así que siempre se dibuja igual.
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ==========================================================
     PARTE 1 — Motor generativo
     ========================================================== */

  // PRNG determinista. Misma semilla, misma obra, siempre.
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // Paletas de sala: cada una es una armonía cerrada.
  var PALETTES = [
    ['#e7ddcb', '#c2472c', '#1f2536', '#e0a33c', '#7d8b6a'],
    ['#f0ebe1', '#2f4858', '#86a5a9', '#d9a441', '#b6503c'],
    ['#1b1b1f', '#e8e3d8', '#c0492f', '#7a6a52', '#3f5c58'],
    ['#efe7dc', '#5a3a52', '#c98b6b', '#2d4a45', '#d4c05a'],
    ['#ddd6ca', '#12263a', '#3e7c8c', '#e2704a', '#f0c987'],
    ['#f4f1ea', '#111114', '#b8391f', '#8d8577', '#2b4a3f'],
    ['#e3dccf', '#6b3f2a', '#c99a53', '#3c4a3a', '#a8563c'],
    ['#eae4d9', '#31355c', '#9a4f6e', '#e6a15c', '#5d8a80']
  ];

  var uid = 0;

  // Con width/height explícitos el SVG tiene dimensiones intrínsecas,
  // y así `max-height` puede reducirlo sin deformarlo ni recortarlo.
  function svgOpen(W, H) {
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" ' +
           'xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" role="img">';
  }

  // Grano fino sobre toda la obra: da textura de pigmento sin
  // usar filtros caros que se notarían con veinte piezas en pantalla.
  function grain(W, H, id) {
    return '<defs><pattern id="g' + id + '" width="4" height="4" patternUnits="userSpaceOnUse">' +
           '<circle cx="1" cy="1" r=".55" fill="#000" opacity=".055"/>' +
           '<circle cx="3" cy="3" r=".45" fill="#fff" opacity=".045"/>' +
           '</pattern></defs>' +
           '<rect width="' + W + '" height="' + H + '" fill="url(#g' + id + ')"/>';
    }

  /* --- Los ocho lenguajes plásticos del generador ----------- */

  // Homenaje al cuadrado: rectángulos anidados, más aire abajo.
  function sAlbers(r, W, H, p) {
    var out = '<rect width="' + W + '" height="' + H + '" fill="' + p[0] + '"/>';
    var n = 3 + Math.floor(r() * 2);
    var order = [1, 2, 3, 4].sort(function () { return r() - 0.5; });

    for (var i = 0; i < n; i++) {
      var k = (i + 1) / (n + 1);
      var w = W * (1 - k * 0.78);
      var h = H * (1 - k * 0.78);
      var x = (W - w) / 2;
      var y = (H - h) / 2 - h * 0.09;
      out += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) +
             '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) +
             '" fill="' + p[order[i % order.length]] + '"/>';
    }
    return out;
  }

  // Retícula de primitivas: círculo, medio círculo, cuarto, barra.
  function sBauhaus(r, W, H, p) {
    var cols = 3 + Math.floor(r() * 2);
    var cw = W / cols;
    var rows = Math.max(2, Math.round(H / cw));
    var ch = H / rows;
    var out = '<rect width="' + W + '" height="' + H + '" fill="' + p[0] + '"/>';

    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var c = p[1 + Math.floor(r() * 4)];
        var ox = x * cw, oy = y * ch;
        var t = r();

        if (t < 0.14) continue;                                   // celda vacía
        if (t < 0.36) {                                           // círculo
          out += '<circle cx="' + (ox + cw / 2) + '" cy="' + (oy + ch / 2) +
                 '" r="' + (Math.min(cw, ch) / 2) + '" fill="' + c + '"/>';
        } else if (t < 0.58) {                                    // medio círculo
          var rot = Math.floor(r() * 4) * 90;
          out += '<path d="M' + ox + ' ' + (oy + ch / 2) + ' a' + (cw / 2) + ' ' + (ch / 2) +
                 ' 0 0 1 ' + cw + ' 0 z" fill="' + c + '" transform="rotate(' + rot + ' ' +
                 (ox + cw / 2) + ' ' + (oy + ch / 2) + ')"/>';
        } else if (t < 0.78) {                                    // cuarto de círculo
          var q = Math.floor(r() * 4) * 90;
          out += '<path d="M' + ox + ' ' + (oy + ch) + ' L' + ox + ' ' + oy +
                 ' A' + cw + ' ' + ch + ' 0 0 1 ' + (ox + cw) + ' ' + (oy + ch) + ' z"' +
                 ' fill="' + c + '" transform="rotate(' + q + ' ' + (ox + cw / 2) + ' ' + (oy + ch / 2) + ')"/>';
        } else {                                                  // barra
          var vert = r() > 0.5;
          out += '<rect x="' + (vert ? ox + cw * 0.36 : ox) + '" y="' + (vert ? oy : oy + ch * 0.36) +
                 '" width="' + (vert ? cw * 0.28 : cw) + '" height="' + (vert ? ch : ch * 0.28) +
                 '" fill="' + c + '"/>';
        }
      }
    }
    return out;
  }

  // Arcos concéntricos naciendo de una esquina.
  // Pocas bandas y solo dos o tres colores: con más anillos la pieza
  // se convierte en un arcoíris y deja de leerse como pintura.
  function sArcs(r, W, H, p) {
    var out = '<rect width="' + W + '" height="' + H + '" fill="' + p[0] + '"/>';
    var corner = Math.floor(r() * 4);
    var cx = (corner === 1 || corner === 2) ? W : 0;
    var cy = (corner === 2 || corner === 3) ? H : 0;
    var max = Math.hypot(W, H) * (0.85 + r() * 0.3);
    var n = 3 + Math.floor(r() * 3);
    var duo = [p[1 + Math.floor(r() * 4)], p[1 + Math.floor(r() * 4)], p[0]];

    for (var i = n; i > 0; i--) {
      var rad = max * (i / n);
      out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + rad.toFixed(1) +
             '" fill="' + duo[i % duo.length] + '"/>';
    }
    // Una línea que corta la composición: la nota discordante.
    var ly = H * (0.2 + r() * 0.6);
    out += '<rect x="0" y="' + ly.toFixed(1) + '" width="' + W + '" height="' +
           (H * 0.012).toFixed(1) + '" fill="' + p[0] + '" opacity=".9"/>';
    return out;
  }

  // Estratos: bandas horizontales de altura irregular.
  function sStrata(r, W, H, p) {
    var out = '<rect width="' + W + '" height="' + H + '" fill="' + p[0] + '"/>';
    var y = 0;
    var i = 0;
    while (y < H) {
      var h = H * (0.03 + r() * 0.16);
      var c = p[1 + Math.floor(r() * 4)];
      out += '<rect x="0" y="' + y.toFixed(1) + '" width="' + W + '" height="' +
             Math.min(h, H - y).toFixed(1) + '" fill="' + c + '"/>';
      // Cada pocas bandas, una interrupción vertical
      if (r() > 0.72) {
        var bx = W * r() * 0.8;
        out += '<rect x="' + bx.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' +
               (W * (0.04 + r() * 0.1)).toFixed(1) + '" height="' + h.toFixed(1) +
               '" fill="' + p[0] + '" opacity=".55"/>';
      }
      y += h;
      i++;
      if (i > 60) break;
    }
    return out;
  }

  // Muaré: dos tramas de líneas giradas una sobre otra.
  function sMoire(r, W, H, p) {
    var out = '<rect width="' + W + '" height="' + H + '" fill="' + p[0] + '"/>';
    var diag = Math.hypot(W, H);

    function field(step, sw, color, angle, op) {
      var g = '<g transform="rotate(' + angle + ' ' + (W / 2) + ' ' + (H / 2) + ')" opacity="' + op + '">';
      for (var x = -diag; x < diag; x += step) {
        g += '<rect x="' + x.toFixed(1) + '" y="' + (H / 2 - diag) + '" width="' + sw +
             '" height="' + (diag * 2) + '" fill="' + color + '"/>';
      }
      return g + '</g>';
    }

    // Tramas anchas y de poco contraste: si se aprietan, la obra
    // acaba pareciendo una muestra de tejido.
    var step = 30 + r() * 40;
    out += field(step, step * 0.30, p[1], r() * 40 - 20, '.85');
    out += field(step * 1.22, step * 0.22, p[2], r() * 40 + 58, '.45');
    return out;
  }

  // Manchas: elipses superpuestas en multiply, como veladuras.
  function sBlobs(r, W, H, p) {
    var out = '<rect width="' + W + '" height="' + H + '" fill="' + p[0] + '"/>';
    var n = 3 + Math.floor(r() * 4);
    out += '<g style="mix-blend-mode:multiply">';
    for (var i = 0; i < n; i++) {
      var rx = W * (0.2 + r() * 0.42);
      var ry = H * (0.16 + r() * 0.36);
      out += '<ellipse cx="' + (W * (0.15 + r() * 0.7)).toFixed(1) +
             '" cy="' + (H * (0.15 + r() * 0.7)).toFixed(1) +
             '" rx="' + rx.toFixed(1) + '" ry="' + ry.toFixed(1) +
             '" fill="' + p[1 + Math.floor(r() * 4)] + '" opacity="' + (0.55 + r() * 0.4).toFixed(2) +
             '" transform="rotate(' + (r() * 180).toFixed(1) + ' ' + (W / 2) + ' ' + (H / 2) + ')"/>';
    }
    return out + '</g>';
  }

  // Matriz: retícula de puntos que crecen hacia un foco.
  function sMatrix(r, W, H, p) {
    var out = '<rect width="' + W + '" height="' + H + '" fill="' + p[0] + '"/>';
    var cols = 10 + Math.floor(r() * 9);
    var cw = W / cols;
    var rows = Math.round(H / cw);
    var fx = r(), fy = r();
    var c1 = p[1 + Math.floor(r() * 2)];
    var c2 = p[3 + Math.floor(r() * 2)];

    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var dx = (x + 0.5) / cols - fx;
        var dy = (y + 0.5) / rows - fy;
        var d = Math.min(1, Math.hypot(dx, dy) * 1.7);
        var rad = cw * 0.48 * (1 - d) + cw * 0.05;
        out += '<circle cx="' + ((x + 0.5) * cw).toFixed(1) + '" cy="' + ((y + 0.5) * cw).toFixed(1) +
               '" r="' + rad.toFixed(2) + '" fill="' + (d < 0.45 ? c1 : c2) + '"/>';
      }
    }
    return out;
  }

  // Cortes: planos diagonales que atraviesan el lienzo.
  function sSlice(r, W, H, p) {
    var out = '<rect width="' + W + '" height="' + H + '" fill="' + p[0] + '"/>';
    var n = 3 + Math.floor(r() * 4);
    var prev = 0;
    for (var i = 0; i < n; i++) {
      var a = prev;
      var b = prev + (0.12 + r() * 0.3);
      var skew = (r() - 0.5) * 0.5;
      out += '<polygon points="0,' + (H * a).toFixed(1) +
             ' ' + W + ',' + (H * (a + skew)).toFixed(1) +
             ' ' + W + ',' + (H * (b + skew)).toFixed(1) +
             ' 0,' + (H * b).toFixed(1) + '" fill="' + p[1 + Math.floor(r() * 4)] + '"/>';
      prev = b;
      if (prev > 1.1) break;
    }
    // Un círculo pequeño que fija la mirada
    out += '<circle cx="' + (W * (0.2 + r() * 0.6)).toFixed(1) +
           '" cy="' + (H * (0.2 + r() * 0.6)).toFixed(1) +
           '" r="' + (W * (0.04 + r() * 0.06)).toFixed(1) + '" fill="' + p[0] + '"/>';
    return out;
  }

  var STYLES = {
    albers: sAlbers, bauhaus: sBauhaus, arcs: sArcs, strata: sStrata,
    moire: sMoire, blobs: sBlobs, matrix: sMatrix, slice: sSlice
  };
  var STYLE_KEYS = Object.keys(STYLES);

  /**
   * Devuelve el SVG de una obra.
   * @param {string} seed  semilla estable (usamos el título)
   * @param {string} style clave de STYLES, o null para elegir por semilla
   * @param {number} ratio ancho / alto
   */
  /**
   * Una sala entera a plena saturación cansa. Cuatro de cada diez
   * piezas se pintan en versión tonal: el fondo y solo dos colores,
   * repetidos. Da respiro al conjunto sin tocar los generadores.
   */
  function paletteFor(r) {
    var base = PALETTES[Math.floor(r() * PALETTES.length)];
    if (r() > 0.42) return base;
    var a = base[1 + Math.floor(r() * 4)];
    var b = base[1 + Math.floor(r() * 4)];
    return [base[0], a, b, a, b];
  }

  function art(seed, style, ratio) {
    var r = mulberry32(hash(seed));
    var W = 1000;
    var H = Math.round(1000 / ratio);
    var pal = paletteFor(r);
    var key = style || STYLE_KEYS[Math.floor(r() * STYLE_KEYS.length)];
    var id = ++uid;

    return svgOpen(W, H) +
           (STYLES[key] || sAlbers)(r, W, H, pal) +
           grain(W, H, id) +
           '</svg>';
  }

  /* ==========================================================
     PARTE 2 — El fondo de la galería
     ========================================================== */

  var WORKS = [
    { t: 'Umbral III',              a: 'Ilaria Benes',      y: 2026, c: 'pintura',     tech: 'Pigmento y aglutinante sobre lino crudo', d: '180 × 145 cm', p: '18.500 €', ratio: 0.80, s: 'albers' },
    { t: 'Materia dócil (díptico)', a: 'Andrea Sasso',      y: 2025, c: 'pintura',     tech: 'Óleo y cera sobre tabla',                 d: '120 × 160 cm', p: '12.000 €', ratio: 1.30, s: 'blobs' },
    { t: 'Interferencia n.º 7',     a: 'Kwan Ferrer',       y: 2026, c: 'digital',     tech: 'Impresión de pigmento, edición de 5',     d: '90 × 90 cm',   p: '3.200 €',  ratio: 1.00, s: 'moire' },
    { t: 'Estratos del sur',        a: 'Nuria Elorza',      y: 2024, c: 'pintura',     tech: 'Acrílico sobre algodón',                  d: '200 × 150 cm', p: '21.000 €', ratio: 0.75, s: 'strata' },
    { t: 'Ejercicio de rejilla',    a: 'Bruno Costa',       y: 2025, c: 'grafica',     tech: 'Serigrafía a cinco tintas, ed. de 30',    d: '70 × 50 cm',   p: '850 €',    ratio: 0.72, s: 'bauhaus' },
    { t: 'Campo de puntos',         a: 'Rin Nakamura',      y: 2026, c: 'digital',     tech: 'Plóter sobre papel Hahnemühle',           d: '100 × 70 cm',  p: '2.400 €',  ratio: 1.42, s: 'matrix' },
    { t: 'Corte limpio',            a: 'Marta Elizalde',    y: 2023, c: 'grafica',     tech: 'Litografía sobre papel Rives',            d: '56 × 76 cm',   p: '1.100 €',  ratio: 0.74, s: 'slice' },
    { t: 'Eco, eco, eco',           a: 'Tomás Iriarte',     y: 2026, c: 'digital',     tech: 'Impresión lambda montada en dibond',      d: '120 × 120 cm', p: '4.600 €',  ratio: 1.00, s: 'arcs' },
    { t: 'Umbral I',                a: 'Ilaria Benes',      y: 2024, c: 'pintura',     tech: 'Pigmento sobre lino crudo',               d: '150 × 120 cm', p: '15.000 €', ratio: 0.82, s: 'albers' },
    { t: 'Sin título (niebla)',     a: 'Alba Ferrán',       y: 2025, c: 'fotografia',  tech: 'Gelatina de plata virada, ed. de 7',      d: '80 × 100 cm',  p: '2.900 €',  ratio: 1.24, s: 'blobs' },
    { t: 'Muro medianero',          a: 'Kwame Osei',        y: 2024, c: 'fotografia',  tech: 'Impresión cromogénica',                   d: '110 × 88 cm',  p: '3.400 €',  ratio: 1.26, s: 'strata' },
    { t: 'Doce maneras de doblar',  a: 'Andrea Sasso',      y: 2026, c: 'grafica',     tech: 'Aguafuerte y aguatinta, ed. de 15',       d: '50 × 65 cm',   p: '980 €',    ratio: 0.77, s: 'bauhaus' },
    { t: 'Ruido de fondo',          a: 'Kwan Ferrer',       y: 2023, c: 'digital',     tech: 'Vídeo de un canal, bucle de 4 min',       d: 'variable',     p: '5.500 €',  ratio: 1.78, s: 'moire' },
    { t: 'La hora azul',            a: 'Nuria Elorza',      y: 2026, c: 'pintura',     tech: 'Óleo sobre lino',                         d: '90 × 70 cm',   p: '7.800 €',  ratio: 0.79, s: 'arcs' }
  ];

  var MORE = [
    { t: 'Umbral VII',              a: 'Ilaria Benes',      y: 2026, c: 'pintura',    tech: 'Pigmento sobre lino crudo',            d: '160 × 130 cm', p: '16.200 €', ratio: 0.81, s: 'albers' },
    { t: 'Contrapunto',             a: 'Bruno Costa',       y: 2025, c: 'grafica',    tech: 'Serigrafía a tres tintas, ed. de 40',  d: '60 × 60 cm',   p: '720 €',    ratio: 1.00, s: 'slice' },
    { t: 'Tarde del jueves',        a: 'Alba Ferrán',       y: 2024, c: 'fotografia', tech: 'Impresión de pigmento, ed. de 10',     d: '70 × 105 cm',  p: '2.100 €',  ratio: 0.66, s: 'strata' },
    { t: 'Sistema abierto',         a: 'Rin Nakamura',      y: 2026, c: 'digital',    tech: 'Dibujo generativo, plóter',            d: '90 × 90 cm',   p: '2.800 €',  ratio: 1.00, s: 'matrix' },
    { t: 'Peso muerto',             a: 'Marta Elizalde',    y: 2025, c: 'pintura',    tech: 'Óleo y arena sobre tabla',             d: '75 × 95 cm',   p: '6.400 €',  ratio: 1.26, s: 'blobs' },
    { t: 'Cuatro esquinas',         a: 'Tomás Iriarte',     y: 2024, c: 'grafica',    tech: 'Xilografía sobre papel japonés',       d: '45 × 60 cm',   p: '640 €',    ratio: 0.75, s: 'bauhaus' },
    { t: 'Marea baja',              a: 'Kwame Osei',        y: 2026, c: 'fotografia', tech: 'Impresión cromogénica, ed. de 5',      d: '100 × 140 cm', p: '4.900 €',  ratio: 0.71, s: 'arcs' },
    { t: 'Nada se repite',          a: 'Kwan Ferrer',       y: 2025, c: 'digital',    tech: 'Impresión de pigmento sobre aluminio', d: '120 × 80 cm',  p: '3.700 €',  ratio: 1.50, s: 'moire' }
  ];

  var CAT_LABEL = {
    pintura: 'Pintura', grafica: 'Obra gráfica',
    fotografia: 'Fotografía', digital: 'Digital'
  };

  /* ==========================================================
     PARTE 3 — Favoritos (persistentes en el navegador)
     ========================================================== */

  var FAV_KEY = 'atrio:favoritos';
  var favs = new Set();

  try {
    var raw = localStorage.getItem(FAV_KEY);
    if (raw) JSON.parse(raw).forEach(function (t) { favs.add(t); });
  } catch (e) { /* navegador sin almacenamiento: seguimos en memoria */ }

  function saveFavs() {
    try { localStorage.setItem(FAV_KEY, JSON.stringify([].concat(Array.from(favs)))); }
    catch (e) { /* si no deja guardar, al menos funciona durante la visita */ }
  }

  var favCount = document.getElementById('favCount');
  var favBtn = document.getElementById('favBtn');

  function paintFavCount() {
    favCount.textContent = favs.size;
    favBtn.classList.toggle('is-active', favs.size > 0);
  }

  /* ==========================================================
     PARTE 4 — El mosaico
     ========================================================== */

  var masonry = document.getElementById('masonry');
  var countEl = document.getElementById('count');
  var emptyEl = document.getElementById('empty');
  var moreBtn = document.getElementById('moreBtn');

  var shown = [];            // obras ya montadas en el DOM
  var filter = 'todas';

  var tileObserver = ('IntersectionObserver' in window && !reduceMotion)
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.classList.add('is-in');
          tileObserver.unobserve(en.target);
        });
      }, { threshold: 0.06, rootMargin: '0px 0px -40px' })
    : null;

  function buildTile(w, index) {
    var el = document.createElement('article');
    el.className = 'tile';
    el.dataset.cat = w.c;
    el.dataset.i = index;
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', w.t + ', ' + w.a + ', ' + w.y + '. Abrir en el visor.');

    el.innerHTML =
      '<div class="tile__art">' + art(w.t, w.s, w.ratio) +
        '<div class="tile__veil">' +
          '<span class="tile__artist">' + w.a + '</span>' +
          '<span class="tile__title">' + w.t + '</span>' +
          '<span class="tile__meta">' + w.y + ' · ' + CAT_LABEL[w.c] + ' · ' + w.d + '</span>' +
        '</div>' +
      '</div>' +
      '<button class="tile__fav' + (favs.has(w.t) ? ' is-on' : '') + '" ' +
        'aria-label="Guardar «' + w.t + '»" aria-pressed="' + favs.has(w.t) + '">♥</button>';

    // Abrir el visor
    el.addEventListener('click', function (e) {
      if (e.target.closest('.tile__fav')) return;
      openViewer(parseInt(el.dataset.i, 10));
    });
    el.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      openViewer(parseInt(el.dataset.i, 10));
    });

    // Guardar / quitar
    el.querySelector('.tile__fav').addEventListener('click', function (e) {
      e.stopPropagation();
      toggleFav(w.t);
    });

    if (tileObserver) tileObserver.observe(el);
    else el.classList.add('is-in');

    return el;
  }

  function addWorks(list) {
    var frag = document.createDocumentFragment();
    list.forEach(function (w) {
      shown.push(w);
      frag.appendChild(buildTile(w, shown.length - 1));
    });
    masonry.appendChild(frag);
    applyFilter();
  }

  function applyFilter() {
    var visible = 0;

    Array.prototype.forEach.call(masonry.children, function (el) {
      var w = shown[parseInt(el.dataset.i, 10)];
      var ok = filter === 'todas' ? true
             : filter === 'guardadas' ? favs.has(w.t)
             : w.c === filter;
      el.classList.toggle('is-hidden', !ok);
      if (ok) visible++;
    });

    countEl.textContent = visible === shown.length
      ? 'Mostrando las ' + visible + ' obras del fondo visible'
      : 'Mostrando ' + visible + ' de ' + shown.length + ' obras';

    emptyEl.hidden = !(visible === 0 && filter === 'guardadas');
    if (visible === 0 && filter !== 'guardadas') {
      emptyEl.hidden = false;
      emptyEl.textContent = 'No hay obras de esa técnica en la parte del fondo que has cargado.';
    } else if (filter === 'guardadas') {
      emptyEl.textContent = 'Todavía no has guardado ninguna obra. Pulsa el corazón de cualquier pieza.';
    }
  }

  function toggleFav(title) {
    if (favs.has(title)) favs.delete(title); else favs.add(title);
    saveFavs();
    paintFavCount();

    // Repintamos los corazones de esa obra allá donde aparezca
    Array.prototype.forEach.call(masonry.children, function (el) {
      var w = shown[parseInt(el.dataset.i, 10)];
      if (w.t !== title) return;
      var b = el.querySelector('.tile__fav');
      b.classList.toggle('is-on', favs.has(title));
      b.setAttribute('aria-pressed', String(favs.has(title)));
    });

    if (vIndex !== null && shown[vIndex] && shown[vIndex].t === title) paintViewerFav();
    if (filter === 'guardadas') applyFilter();
  }

  addWorks(WORKS);
  paintFavCount();

  /* --- Filtros, densidad y "cargar más" --------------------- */
  var chips = document.querySelectorAll('.chip');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      filter = chip.dataset.f;
      chips.forEach(function (c) { c.classList.toggle('is-on', c === chip); });
      applyFilter();
    });
  });

  favBtn.addEventListener('click', function () {
    var favChip = document.querySelector('.chip--fav');
    favChip.click();
    document.getElementById('coleccion')
      .scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });

  var dbtns = document.querySelectorAll('.dbtn');
  dbtns.forEach(function (b) {
    b.addEventListener('click', function () {
      document.documentElement.style.setProperty('--cols', b.dataset.c);
      dbtns.forEach(function (o) { o.classList.toggle('is-on', o === b); });
    });
  });

  moreBtn.addEventListener('click', function () {
    addWorks(MORE);
    moreBtn.textContent = 'No queda más fondo digitalizado';
    moreBtn.disabled = true;
  });

  /* ==========================================================
     PARTE 5 — Visor
     ========================================================== */

  var viewer = document.getElementById('viewer');
  var vArt = document.getElementById('vArt');
  var vArtist = document.getElementById('vArtist');
  var vTitle = document.getElementById('vTitle');
  var vYear = document.getElementById('vYear');
  var vSpecs = document.getElementById('vSpecs');
  var vFav = document.getElementById('vFav');
  var vFavTxt = document.getElementById('vFavTxt');
  var vNote = document.getElementById('vNote');
  var vIndex = null;
  var lastFocus = null;

  function visibleIndexes() {
    return shown.map(function (w, i) { return i; }).filter(function (i) {
      return !masonry.children[i].classList.contains('is-hidden');
    });
  }

  function paintViewerFav() {
    var on = favs.has(shown[vIndex].t);
    vFav.querySelector('.heart').classList.toggle('is-on', on);
    vFavTxt.textContent = on ? 'Guardada' : 'Guardar';
    vFav.setAttribute('aria-pressed', String(on));
  }

  function renderViewer() {
    var w = shown[vIndex];

    vArt.innerHTML = art(w.t, w.s, w.ratio);
    vArtist.textContent = w.a;
    vTitle.textContent = w.t;
    vYear.textContent = w.y;
    vSpecs.innerHTML =
      '<div><dt>Técnica</dt><dd>' + w.tech + '</dd></div>' +
      '<div><dt>Medidas</dt><dd>' + w.d + '</dd></div>' +
      '<div><dt>Categoría</dt><dd>' + CAT_LABEL[w.c] + '</dd></div>' +
      '<div><dt>Precio</dt><dd>' + w.p + '</dd></div>' +
      '<div><dt>Referencia</dt><dd>ATR-' + String(1000 + vIndex) + '</dd></div>';
    vNote.textContent = '';
    paintViewerFav();
  }

  function openViewer(i) {
    vIndex = i;
    lastFocus = document.activeElement;
    viewer.hidden = false;
    document.body.classList.add('is-locked');
    renderViewer();
    document.getElementById('vClose').focus();
  }

  function closeViewer() {
    viewer.hidden = true;
    document.body.classList.remove('is-locked');
    vIndex = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // Navegar solo entre las obras visibles con el filtro puesto
  function step(dir) {
    var list = visibleIndexes();
    if (!list.length) return;
    var at = list.indexOf(vIndex);
    vIndex = list[(at + dir + list.length) % list.length];
    renderViewer();
  }

  document.getElementById('vClose').addEventListener('click', closeViewer);
  document.getElementById('vPrev').addEventListener('click', function () { step(-1); });
  document.getElementById('vNext').addEventListener('click', function () { step(1); });
  viewer.querySelector('[data-close]').addEventListener('click', closeViewer);

  vFav.addEventListener('click', function () { toggleFav(shown[vIndex].t); });
  document.getElementById('vAsk').addEventListener('click', function () {
    vNote.textContent = 'Consulta enviada. Respondemos en menos de 48 h con disponibilidad y condiciones.';
  });

  document.addEventListener('keydown', function (e) {
    if (viewer.hidden) return;
    if (e.key === 'Escape') closeViewer();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  });

  /* ==========================================================
     PARTE 6 — Pórtico y obra del artista
     ========================================================== */

  var heroArt = document.getElementById('heroArt');
  var heroTitle = document.getElementById('heroTitle');
  var heroSeed = 0;

  var HERO_NAMES = [
    'Estudio para Umbral', 'Sin título (mañana)', 'Variación sobre un gris',
    'Segundo intento', 'Nota al margen', 'Lo que quedó debajo',
    'Ejercicio de paciencia', 'Contraluz'
  ];

  function drawHero() {
    heroSeed++;
    var seed = 'atrio-portico-' + heroSeed;
    var r = mulberry32(hash(seed));
    var name = HERO_NAMES[Math.floor(r() * HERO_NAMES.length)];
    heroArt.innerHTML = art(seed, null, 0.8);
    heroTitle.textContent = '«' + name + '», generada en tu navegador · n.º ' + heroSeed;
  }

  drawHero();
  document.getElementById('regen').addEventListener('click', drawHero);

  document.getElementById('portraitArt').innerHTML = art('Ilaria Benes retrato', 'blobs', 0.8);

  // Tres obras de la artista, tomadas del propio fondo
  var artistWorks = document.getElementById('artistWorks');
  shown.forEach(function (w, i) {
    if (w.a !== 'Ilaria Benes') return;
    var fig = document.createElement('figure');
    fig.className = 'frame';
    fig.style.cursor = 'pointer';
    fig.innerHTML = '<div class="frame__art">' + art(w.t, w.s, w.ratio) + '</div>';
    fig.addEventListener('click', function () { openViewer(i); });
    artistWorks.appendChild(fig);
  });

  /* ==========================================================
     PARTE 7 — Salas
     ========================================================== */

  var ROOMS = [
    { wall: '#1f1c26', works: ['Umbral III', 'Umbral I', 'La hora azul'],
      txt: 'Sala 1 — «Umbral». Veintidós lienzos de Ilaria Benes en dos alturas, con luz rasante desde el norte. Del 2 de octubre al 18 de enero.' },
    { wall: '#232028', works: ['Materia dócil (díptico)', 'Doce maneras de doblar', 'Estratos del sur'],
      txt: 'Sala 2 — «Materia dócil». Once artistas y un montaje que cambia cada tres semanas. Comisariada por Andrea Sasso.' },
    { wall: '#1b2024', works: ['Ejercicio de rejilla', 'Corte limpio', 'Campo de puntos'],
      txt: 'Sala 3 — «Papel y tinta». Obra gráfica sobre papel, en vitrina y en pared. Iluminación reducida a 50 lux por conservación.' },
    { wall: '#191821', works: ['Interferencia n.º 7', 'Eco, eco, eco', 'Ruido de fondo'],
      txt: 'Sala 4 — Fondo permanente. Rotación trimestral de la colección propia. Siempre abierta, siempre distinta.' }
  ];

  var hangBack = document.getElementById('hangBack');
  var roomInfo = document.getElementById('roomInfo');
  var rtabs = document.querySelectorAll('.rtab');
  var stage = document.getElementById('stage');
  var scene = document.getElementById('scene');

  function showRoom(n) {
    var room = ROOMS[n];

    rtabs.forEach(function (t, i) {
      t.classList.toggle('is-on', i === n);
      t.setAttribute('aria-selected', String(i === n));
    });

    stage.style.setProperty('--wall', room.wall);
    roomInfo.textContent = room.txt;
    hangBack.innerHTML = '';

    room.works.forEach(function (title) {
      var idx = shown.findIndex(function (w) { return w.t === title; });
      if (idx < 0) return;
      var w = shown[idx];

      var el = document.createElement('div');
      el.className = 'hung';
      el.setAttribute('data-label', w.a + ' · ' + w.y);
      el.setAttribute('role', 'button');
      el.tabIndex = 0;
      el.setAttribute('aria-label', 'Ver «' + w.t + '» en el visor');
      el.innerHTML = art(w.t, w.s, w.ratio);
      el.addEventListener('click', function () { openViewer(idx); });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openViewer(idx); }
      });
      hangBack.appendChild(el);
    });
  }

  rtabs.forEach(function (t, i) {
    t.addEventListener('click', function () { showRoom(i); });
  });
  showRoom(0);

  // Mirar alrededor: la escena gira muy poco, lo justo para dar volumen
  if (finePointer && !reduceMotion) {
    stage.addEventListener('pointermove', function (e) {
      var r = stage.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      scene.style.transform =
        'translateZ(-40px) rotateY(' + (-x * 9).toFixed(2) + 'deg) rotateX(' + (y * 5).toFixed(2) + 'deg)';
    });
    stage.addEventListener('pointerleave', function () {
      scene.style.transform = 'translateZ(-40px)';
    });
  }

  /* ==========================================================
     PARTE 8 — Resto de la interfaz
     ========================================================== */

  /* Modo de sala: oscura / clara */
  var roomBtn = document.getElementById('roomBtn');
  var root = document.documentElement;

  try {
    var savedRoom = localStorage.getItem('atrio:sala');
    if (savedRoom) root.setAttribute('data-room', savedRoom);
  } catch (e) { /* sin almacenamiento, arrancamos en sala oscura */ }

  function paintRoomBtn() {
    var dark = root.getAttribute('data-room') === 'oscura';
    roomBtn.querySelector('.tool__lbl').textContent = dark ? 'Sala oscura' : 'Sala clara';
    roomBtn.setAttribute('aria-pressed', String(dark));
  }
  paintRoomBtn();

  roomBtn.addEventListener('click', function () {
    var next = root.getAttribute('data-room') === 'oscura' ? 'clara' : 'oscura';
    root.setAttribute('data-room', next);
    paintRoomBtn();
    try { localStorage.setItem('atrio:sala', next); } catch (e) {}
  });

  /* Nav */
  var nav = document.getElementById('nav');
  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu');

  function onScroll() { nav.classList.toggle('is-stuck', window.scrollY > 10); }
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

  /* Exposiciones */
  var etabs = document.querySelectorAll('.etab');
  var expos = document.querySelectorAll('.expos');
  etabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      etabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle('is-on', on);
        t.setAttribute('aria-selected', String(on));
      });
      expos.forEach(function (p) { p.classList.toggle('is-on', p.dataset.e === tab.dataset.e); });
    });
  });

  /* Boletín */
  var form = document.getElementById('form');
  var mail = document.getElementById('mail');
  var msg = document.getElementById('msg');
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var value = mail.value.trim();

    if (!emailRe.test(value)) {
      form.classList.add('is-bad');
      msg.classList.add('is-bad');
      msg.textContent = 'Esa dirección no parece válida.';
      mail.focus();
      return;
    }
    form.classList.remove('is-bad');
    msg.classList.remove('is-bad');
    msg.textContent = 'Apuntado. La próxima carta sale en diciembre.';
    form.reset();
  });

  /* Aparición de titulares y bloques */
  var risers = document.querySelectorAll('.ln, .sec__head, .artist, .expo, .visit__data > div, .hero__facts');

  if (!('IntersectionObserver' in window) || reduceMotion) {
    risers.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    risers.forEach(function (el) { if (!el.classList.contains('ln')) el.classList.add('rise'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px' });
    risers.forEach(function (el) { io.observe(el); });
  }

  /* Scroll suave con hueco para la barra */
  document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.scrollY - 88;
      window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });
})();
