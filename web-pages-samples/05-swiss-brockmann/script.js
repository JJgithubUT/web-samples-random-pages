/* ============================================================
   Ciclo Sinfónico 26 — interacciones
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- 1. Superposición de retícula -------------------------
     Dibuja una columna por cada columna del grid leyendo la
     variable CSS, para que overlay y maqueta no se desincronicen. */
  var overlay = document.getElementById('gridOverlay');
  var gridBtn = document.getElementById('gridBtn');

  function buildOverlay() {
    var cols = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--cols'),
      10
    ) || 12;

    if (overlay.children.length === cols) return;
    overlay.innerHTML = '';
    for (var i = 0; i < cols; i++) overlay.appendChild(document.createElement('span'));
  }

  buildOverlay();
  window.addEventListener('resize', buildOverlay);

  gridBtn.addEventListener('click', function () {
    var on = gridBtn.getAttribute('aria-pressed') === 'true';
    gridBtn.setAttribute('aria-pressed', String(!on));
    overlay.classList.toggle('is-on', !on);
  });

  /* --- 2. Menú móvil ---------------------------------------- */
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

  /* --- 3. Filtro del programa ------------------------------- */
  var filts = document.querySelectorAll('.filt');
  var events = document.querySelectorAll('.ev');

  filts.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var m = btn.dataset.m;
      filts.forEach(function (b) { b.classList.toggle('is-on', b === btn); });

      var n = 0;
      events.forEach(function (ev) {
        var show = m === 'todos' || ev.dataset.m === m;
        ev.classList.toggle('is-hidden', !show);
        // Renumera lo visible para que la lista siga leyéndose 01, 02, 03…
        if (show) {
          n += 1;
          ev.querySelector('.ev__n').textContent = String(n).padStart(2, '0');
        }
      });
    });
  });

  /* --- 4. Formulario ---------------------------------------- */
  var form = document.getElementById('form');
  var mail = document.getElementById('mail');
  var tipo = document.getElementById('tipo');
  var msg = document.getElementById('msg');
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var value = mail.value.trim();

    if (!emailRe.test(value)) {
      mail.classList.add('is-bad');
      msg.classList.add('is-bad');
      msg.textContent = 'Revisa la dirección de correo.';
      mail.focus();
      return;
    }

    mail.classList.remove('is-bad');
    msg.classList.remove('is-bad');
    msg.textContent = 'Solicitud registrada: ' + tipo.value + '. Escribimos a ' + value + '.';
    form.reset();
  });

  /* --- 5. Scroll suave -------------------------------------- */
  document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.scrollY - 20;
      window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });
})();
