/* ============================================================
   RUIDO — interacciones
   La portada se puede desmontar arrastrando cada pieza.
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- 1. Arrastrar las piezas de la portada ----------------
     Guardamos el desplazamiento en un transform, no tocamos
     left/top, para no pelearnos con la maqueta original. */
  var pieces = document.querySelectorAll('[data-drag]');
  var offsets = new WeakMap();
  var zTop = 10;

  pieces.forEach(function (el) {
    offsets.set(el, { x: 0, y: 0 });

    var start = null;

    el.addEventListener('pointerdown', function (e) {
      var o = offsets.get(el);
      start = { px: e.clientX, py: e.clientY, ox: o.x, oy: o.y };
      zTop += 1;
      el.style.zIndex = zTop;
      el.classList.add('is-held');
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    el.addEventListener('pointermove', function (e) {
      if (!start) return;
      var o = {
        x: start.ox + (e.clientX - start.px),
        y: start.oy + (e.clientY - start.py)
      };
      offsets.set(el, o);
      // Conservamos la rotación original que trae cada pieza del CSS
      el.style.transform = 'translate(' + o.x + 'px,' + o.y + 'px) ' + baseTransform(el);
    });

    ['pointerup', 'pointercancel'].forEach(function (evt) {
      el.addEventListener(evt, function () {
        start = null;
        el.classList.remove('is-held');
      });
    });
  });

  // Rotaciones de partida, leídas una sola vez del CSS
  var BASE = {};
  pieces.forEach(function (el, i) {
    el.dataset.i = i;
    var t = getComputedStyle(el).transform;
    BASE[i] = (t && t !== 'none') ? t : '';
  });

  function baseTransform(el) {
    return BASE[el.dataset.i] || '';
  }

  /* --- 2. Reordenar: todo vuelve a su sitio ----------------- */
  document.getElementById('reset').addEventListener('click', function () {
    pieces.forEach(function (el) {
      offsets.set(el, { x: 0, y: 0 });
      el.style.transform = '';
      el.style.zIndex = '';
    });
    zTop = 10;
  });

  /* --- 3. Formulario ---------------------------------------- */
  var form = document.getElementById('form');
  var mail = document.getElementById('mail');
  var msg = document.getElementById('msg');
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var LABEL = { '32': '4 números', '58': '8 números', '9': 'el n.º 14 suelto' };

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var value = mail.value.trim();

    if (!emailRe.test(value)) {
      mail.classList.add('is-bad');
      msg.classList.add('is-bad');
      msg.textContent = '> ese correo no cuela';
      mail.focus();
      return;
    }

    var plan = document.querySelector('input[name="plan"]:checked').value;

    mail.classList.remove('is-bad');
    msg.classList.remove('is-bad');
    msg.textContent = '> anotado: ' + LABEL[plan] + ' a ' + value;
    form.reset();
  });

  /* --- 4. Scroll suave -------------------------------------- */
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
