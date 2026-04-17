/* ============================================================
   SHIRO — interacciones
   Lo justo. Nada se mueve si no hace falta.
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

  /* --- 2. Aparición al entrar en pantalla -------------------
     Marcamos desde JS para que sin JS todo se vea igualmente. */
  var targets = document.querySelectorAll('.q-body, .obj, .stores li, .mats > div');

  if (!('IntersectionObserver' in window) || reduceMotion) {
    targets.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    targets.forEach(function (el) { el.classList.add('fade'); });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px' });

    targets.forEach(function (el) { io.observe(el); });
  }

  /* --- 3. La línea se dibuja una sola vez ------------------- */
  var line = document.getElementById('line');

  if (!('IntersectionObserver' in window) || reduceMotion) {
    line.classList.add('is-in');
  } else {
    var lineIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        lineIo.unobserve(entry.target);
      });
    }, { threshold: 0.5 });
    lineIo.observe(line);
  }

  /* --- 4. Correo -------------------------------------------- */
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
      msg.textContent = 'Revisa la dirección.';
      mail.focus();
      return;
    }

    form.classList.remove('is-bad');
    msg.classList.remove('is-bad');
    msg.textContent = 'Gracias. Escribimos poco.';
    form.reset();
  });

  /* --- 5. Scroll suave -------------------------------------- */
  document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });
})();
