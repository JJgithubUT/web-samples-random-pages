/* ============================================================
   T-7 — interacciones
   El dial y el interruptor son el producto: se manejan con
   ratón, con dedo y con teclado.
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- 1. Menú móvil ---------------------------------------- */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu');

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

  /* --- 2. Dial de volumen -----------------------------------
     Recorrido de 0 a 10 repartido en 270°, de -135° a +135°,
     como en un potenciómetro real. */
  var MIN = 0, MAX = 10, SWEEP = 270, START = -135;

  var knob = document.getElementById('knob');
  var volEl = document.getElementById('vol');
  var unit = document.getElementById('unit');
  var volume = 4;

  function renderKnob() {
    var pct = (volume - MIN) / (MAX - MIN);
    knob.style.transform = 'rotate(' + (START + pct * SWEEP) + 'deg)';
    knob.setAttribute('aria-valuenow', String(volume));
    volEl.textContent = String(volume);
  }

  function setVolume(v) {
    volume = Math.max(MIN, Math.min(MAX, Math.round(v)));
    renderKnob();
  }

  // Arrastre: el ángulo del puntero respecto al centro manda
  var dragging = false;

  function angleFromEvent(e) {
    var r = knob.getBoundingClientRect();
    var cx = r.left + r.width / 2;
    var cy = r.top + r.height / 2;
    var deg = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI + 90;
    if (deg > 180) deg -= 360;
    return deg;
  }

  knob.addEventListener('pointerdown', function (e) {
    dragging = true;
    knob.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  knob.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var deg = angleFromEvent(e);
    // Fuera del recorrido útil, se queda pegado al extremo más cercano
    if (deg < START) deg = START;
    if (deg > START + SWEEP) deg = START + SWEEP;
    setVolume(MIN + ((deg - START) / SWEEP) * (MAX - MIN));
  });

  ['pointerup', 'pointercancel'].forEach(function (evt) {
    knob.addEventListener(evt, function () { dragging = false; });
  });

  // Rueda del ratón
  knob.addEventListener('wheel', function (e) {
    e.preventDefault();
    setVolume(volume + (e.deltaY < 0 ? 1 : -1));
  }, { passive: false });

  // Teclado
  knob.addEventListener('keydown', function (e) {
    var k = e.key;
    if (k === 'ArrowUp' || k === 'ArrowRight') { setVolume(volume + 1); e.preventDefault(); }
    else if (k === 'ArrowDown' || k === 'ArrowLeft') { setVolume(volume - 1); e.preventDefault(); }
    else if (k === 'Home') { setVolume(MIN); e.preventDefault(); }
    else if (k === 'End') { setVolume(MAX); e.preventDefault(); }
  });

  renderKnob();

  /* --- 3. Interruptor de encendido -------------------------- */
  var sw = document.getElementById('sw');
  var led = document.getElementById('led');

  function toggleUnit() {
    var on = sw.getAttribute('aria-checked') !== 'true';
    sw.setAttribute('aria-checked', String(on));
    led.classList.toggle('is-off', !on);
    unit.classList.toggle('is-off', !on);
  }

  sw.addEventListener('click', toggleUnit);
  sw.addEventListener('keydown', function (e) {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleUnit(); }
  });

  /* --- 4. Acabados ------------------------------------------ */
  var TONES = {
    claro:   { wood: '#dcd8d0', face: '#e9e7e2', name: 'Arce claro' },
    grafito: { wood: '#3a3a38', face: '#4a4a47', name: 'Grafito' },
    blanco:  { wood: '#f2f1ee', face: '#fbfbfa', name: 'Blanco señal' }
  };

  var fins = document.querySelectorAll('.fin');
  var finName = document.getElementById('finName');

  fins.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var tone = TONES[btn.dataset.fin];
      fins.forEach(function (b) { b.classList.toggle('is-on', b === btn); });
      unit.style.setProperty('--wood', tone.wood);
      unit.style.setProperty('--face', tone.face);
      finName.textContent = tone.name;
    });
  });

  /* --- 5. Fichas técnicas ----------------------------------- */
  var tabs = document.querySelectorAll('.tab');
  var panels = document.querySelectorAll('.panel');

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle('is-on', on);
        t.setAttribute('aria-selected', String(on));
      });
      panels.forEach(function (p) {
        p.classList.toggle('is-on', p.dataset.panel === tab.dataset.tab);
      });
    });
  });

  /* --- 6. Carrito ------------------------------------------- */
  var buyBtn = document.getElementById('buyBtn');
  var buyMsg = document.getElementById('buyMsg');

  buyBtn.addEventListener('click', function () {
    buyMsg.textContent = 'T-7 en ' + finName.textContent.toLowerCase() + ' añadido al carrito.';
  });

  /* --- 7. Scroll suave -------------------------------------- */
  document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });
})();
