/* ============================================================
   HÍBRIDA 2026 — interacciones
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

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

  /* --- 2. Paralaje por capas -------------------------------
     Cada capa lleva su propia profundidad en data-depth; las
     negativas se mueven al contrario que el ratón. */
  var stage = document.getElementById('stage');
  var coords = document.getElementById('coords');
  var layers = stage.querySelectorAll('[data-depth]');

  if (finePointer && !reduceMotion) {
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;

    stage.addEventListener('pointermove', function (e) {
      var r = stage.getBoundingClientRect();
      // -1 .. 1 respecto al centro del escenario
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;

      coords.textContent =
        'x:' + String(Math.round(e.clientX - r.left)).padStart(3, '0') +
        ' y:' + String(Math.round(e.clientY - r.top)).padStart(3, '0');

      if (!raf) raf = requestAnimationFrame(step);
    });

    stage.addEventListener('pointerleave', function () {
      tx = 0; ty = 0;
      if (!raf) raf = requestAnimationFrame(step);
    });

    var step = function () {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;

      layers.forEach(function (el) {
        var d = parseFloat(el.dataset.depth) || 0;
        el.style.transform = 'translate(' + (cx * d * 14) + 'px,' + (cy * d * 14) + 'px)';
      });

      // Se detiene sola cuando ya no queda movimiento apreciable
      if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) {
        raf = requestAnimationFrame(step);
      } else {
        raf = null;
      }
    };
  }

  /* --- 3. Programa por días --------------------------------- */
  var dtabs = document.querySelectorAll('.dtab');
  var agendas = document.querySelectorAll('.agenda');

  dtabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      dtabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle('is-on', on);
        t.setAttribute('aria-selected', String(on));
      });
      agendas.forEach(function (a) {
        a.classList.toggle('is-on', a.dataset.d === tab.dataset.d);
      });
    });
  });

  /* --- 4. Inscripción --------------------------------------- */
  var form = document.getElementById('form');
  var nom = document.getElementById('nom');
  var mail = document.getElementById('mail');
  var mod = document.getElementById('mod');
  var msg = document.getElementById('msg');
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var badName = nom.value.trim().length < 2;
    var badMail = !emailRe.test(mail.value.trim());

    nom.classList.toggle('is-bad', badName);
    mail.classList.toggle('is-bad', badMail);

    if (badName || badMail) {
      msg.classList.add('is-bad');
      msg.textContent = badName && badMail
        ? '> faltan el nombre y un correo válido'
        : badName ? '> falta tu nombre' : '> ese correo no es válido';
      (badName ? nom : mail).focus();
      return;
    }

    msg.classList.remove('is-bad');
    msg.textContent = '> plaza reservada: ' + mod.value + ' — confirmación en ' + mail.value.trim();
    form.reset();
  });

  /* --- 5. Scroll suave -------------------------------------- */
  document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.scrollY - 62;
      window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });
})();
