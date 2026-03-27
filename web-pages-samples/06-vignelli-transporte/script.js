/* ============================================================
   LÍNEA — interacciones
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

  /* --- 2. Aislar líneas del mapa ----------------------------
     Un clic aísla esa línea; volver a pulsarla devuelve la red
     completa. Así se puede leer un trazado sin perder el conjunto. */
  var lineBtns = document.querySelectorAll('.line');
  var routes = document.querySelectorAll('.rt');
  var isolated = null;

  function paint() {
    routes.forEach(function (r) {
      var on = isolated === null || r.dataset.line === isolated;
      r.classList.toggle('is-off', !on);
    });
    lineBtns.forEach(function (b) {
      var on = isolated === null || b.dataset.line === isolated;
      b.classList.toggle('is-on', on);
    });
  }

  lineBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      isolated = isolated === btn.dataset.line ? null : btn.dataset.line;
      paint();
    });
  });

  paint();

  /* --- 3. ¿Me sale a cuenta el abono? -----------------------
     Compara lo que gastarías con tu billete actual contra el
     abono mensual de 42 €. */
  var MONTHLY = 42;
  var trips = document.getElementById('trips');
  var cur = document.getElementById('cur');
  var nowEl = document.getElementById('now');
  var verdict = document.getElementById('verdict');

  function euros(n) {
    return n.toFixed(2).replace('.', ',') + ' €';
  }

  function recalc() {
    var n = Math.max(0, Math.min(400, parseInt(trips.value, 10) || 0));
    var unit = parseFloat(cur.value);
    var spend = n * unit;
    var diff = spend - MONTHLY;

    nowEl.textContent = euros(spend);

    if (diff > 0.005) {
      verdict.classList.remove('is-neutral');
      verdict.textContent = 'El abono mensual te ahorra ' + euros(diff) + '.';
    } else if (diff < -0.005) {
      verdict.classList.add('is-neutral');
      verdict.textContent = 'Con esos viajes te sale mejor el billete suelto: ' +
        euros(-diff) + ' menos que el abono.';
    } else {
      verdict.classList.add('is-neutral');
      verdict.textContent = 'Justo el punto de equilibrio: cuesta lo mismo.';
    }
  }

  trips.addEventListener('input', recalc);
  cur.addEventListener('change', recalc);
  recalc();

  /* --- 4. Scroll suave -------------------------------------- */
  document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.scrollY - 16;
      window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });
})();
