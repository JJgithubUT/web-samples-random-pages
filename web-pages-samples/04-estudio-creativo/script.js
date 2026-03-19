/* ============================================================
   TALLER OESTE — interacciones
   JS puro, sin dependencias.
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* --- 1. Cursor personalizado ------------------------------ */
  var cursor = document.getElementById('cursor');

  if (finePointer && !reduceMotion) {
    var mx = 0, my = 0, cx = 0, cy = 0;

    window.addEventListener('mousemove', function (e) {
      mx = e.clientX;
      my = e.clientY;
      cursor.classList.add('is-on');
    });

    (function loop() {
      // Interpolación para que el punto siga al ratón con retardo
      cx += (mx - cx) * 0.18;
      cy += (my - cy) * 0.18;
      cursor.style.transform = 'translate(' + cx + 'px,' + cy + 'px) translate(-50%,-50%)';
      requestAnimationFrame(loop);
    })();

    document.addEventListener('mouseleave', function () { cursor.classList.remove('is-on'); });

    var growTargets = document.querySelectorAll('a, button, .work, [data-cursor="grow"]');
    growTargets.forEach(function (el) {
      el.addEventListener('mouseenter', function () { cursor.classList.add('is-grown'); });
      el.addEventListener('mouseleave', function () { cursor.classList.remove('is-grown'); });
    });
  }

  /* --- 2. Reloj del estudio (hora de Madrid) ---------------- */
  var clock = document.getElementById('clock');

  function tick() {
    var now = new Date().toLocaleTimeString('es-ES', {
      timeZone: 'Europe/Madrid',
      hour12: false
    });
    clock.textContent = now + ' MAD';
  }
  tick();
  setInterval(tick, 1000);

  /* --- 3. Nav: se esconde al bajar, vuelve al subir --------- */
  var nav = document.getElementById('nav');
  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu');
  var lastY = window.scrollY;

  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    var menuOpen = menu.classList.contains('is-open');
    nav.classList.toggle('is-hidden', y > lastY && y > 240 && !menuOpen);
    lastY = y;
  }, { passive: true });

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

  /* --- 4. Reveal de líneas y titular ------------------------ */
  var lines = document.querySelectorAll('.line, .ln');

  if (!('IntersectionObserver' in window) || reduceMotion) {
    lines.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px' });

    lines.forEach(function (el) { io.observe(el); });
  }

  /* --- 5. Validación del formulario ------------------------- */
  var form = document.getElementById('form');
  var formMsg = document.getElementById('formMsg');
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function markBad(field, bad) {
    field.classList.toggle('is-bad', bad);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var nombre = document.getElementById('nombre');
    var mail = document.getElementById('mail');
    var msgField = document.getElementById('msg');
    var errors = [];

    markBad(nombre, false);
    markBad(mail, false);
    markBad(msgField, false);

    if (nombre.value.trim().length < 2) { markBad(nombre, true); errors.push('tu nombre'); }
    if (!emailRe.test(mail.value.trim())) { markBad(mail, true); errors.push('un correo válido'); }
    if (msgField.value.trim().length < 12) { markBad(msgField, true); errors.push('un mensaje algo más largo'); }

    if (errors.length) {
      formMsg.classList.add('is-bad');
      formMsg.textContent = 'Nos falta ' + errors.join(', ') + '.';
      form.querySelector('.is-bad').focus();
      return;
    }

    var servicios = Array.prototype.map.call(
      form.querySelectorAll('input[name="serv"]:checked'),
      function (i) { return i.value; }
    );

    formMsg.classList.remove('is-bad');
    formMsg.textContent = 'Recibido' + (servicios.length ? ' (' + servicios.join(', ') + ')' : '') +
      '. Te contestamos en menos de 48 h.';
    form.reset();
  });

  /* --- 6. Volver arriba ------------------------------------- */
  document.getElementById('top').addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  /* --- 7. Scroll suave con offset --------------------------- */
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
