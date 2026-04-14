/* ============================================================
   Festival de Cine de Otoño — interacciones
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

  /* --- 2. Programa por días --------------------------------- */
  var days = document.querySelectorAll('.day');
  var scheds = document.querySelectorAll('.sched');

  function showDay(key) {
    days.forEach(function (d) {
      var on = d.dataset.day === key;
      d.classList.toggle('is-on', on);
      d.setAttribute('aria-selected', String(on));
    });
    scheds.forEach(function (s) {
      s.classList.toggle('is-on', s.dataset.day === key);
    });
  }

  days.forEach(function (d) {
    d.addEventListener('click', function () { showDay(d.dataset.day); });
  });

  // Flechas izquierda/derecha para moverse entre días
  document.getElementById('days').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    var list = Array.prototype.slice.call(days);
    var i = list.findIndex(function (d) { return d.classList.contains('is-on'); });
    var next = list[(i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length];
    showDay(next.dataset.day);
    next.focus();
    e.preventDefault();
  });

  /* --- 3. Formulario ---------------------------------------- */
  var form = document.getElementById('form');
  var mail = document.getElementById('mail');
  var msg = document.getElementById('msg');
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var value = mail.value.trim();

    if (!emailRe.test(value)) {
      mail.classList.add('is-bad');
      msg.classList.add('is-bad');
      msg.textContent = 'Ese correo no parece válido.';
      mail.focus();
      return;
    }

    mail.classList.remove('is-bad');
    msg.classList.remove('is-bad');
    msg.textContent = 'Listo. Te avisamos en cuanto abra la venta de abonos.';
    form.reset();
  });

  /* --- 4. Scroll suave -------------------------------------- */
  document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.scrollY - 84;
      window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });
})();
