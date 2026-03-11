/* ============================================================
   Rueda Norte — interacciones
   JS puro, sin dependencias.
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- 1. Nav: sombra + menú móvil -------------------------- */
  var nav = document.getElementById('nav');
  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu');

  function onScroll() {
    nav.classList.toggle('is-stuck', window.scrollY > 10);
  }
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

  /* --- 2. Reveal -------------------------------------------- */
  var revealables = document.querySelectorAll('.reveal');

  if (!('IntersectionObserver' in window) || reduceMotion) {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px' });

    revealables.forEach(function (el) { io.observe(el); });
  }

  /* --- 3. Toast reutilizable -------------------------------- */
  var toast = document.getElementById('toast');
  var toastTimer;

  function showToast(text) {
    toast.textContent = text;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('is-on');
    }, 2600);
  }

  /* --- 4. Botones "Añadir" del catálogo --------------------- */
  var cart = 0;

  document.querySelectorAll('.add').forEach(function (btn) {
    btn.addEventListener('click', function () {
      cart += 1;
      showToast(btn.dataset.name + ' en la cesta · ' + cart + ' artículo' + (cart === 1 ? '' : 's'));

      // pequeño feedback en el propio botón
      var original = btn.textContent;
      btn.textContent = 'Añadido ✓';
      btn.disabled = true;
      setTimeout(function () {
        btn.textContent = original;
        btn.disabled = false;
      }, 1200);
    });
  });

  /* --- 5. Pestañas de la carta ------------------------------ */
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

  /* --- 6. Slider de testimonios ----------------------------- */
  var track = document.getElementById('track');
  var slides = track.children.length;
  var dotsBox = document.getElementById('dots');
  var index = 0;
  var autoTimer;

  for (var i = 0; i < slides; i++) {
    var dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', 'Ir al testimonio ' + (i + 1));
    dot.dataset.i = i;
    dotsBox.appendChild(dot);
  }
  var dots = dotsBox.querySelectorAll('button');

  function goTo(n) {
    index = (n + slides) % slides;
    track.style.transform = 'translateX(' + (-index * 100) + '%)';
    dots.forEach(function (d, di) { d.classList.toggle('is-on', di === index); });
  }

  function restartAuto() {
    if (reduceMotion) return;
    clearInterval(autoTimer);
    autoTimer = setInterval(function () { goTo(index + 1); }, 6500);
  }

  document.getElementById('next').addEventListener('click', function () { goTo(index + 1); restartAuto(); });
  document.getElementById('prev').addEventListener('click', function () { goTo(index - 1); restartAuto(); });

  dots.forEach(function (d) {
    d.addEventListener('click', function () {
      goTo(parseInt(d.dataset.i, 10));
      restartAuto();
    });
  });

  // Swipe táctil
  var startX = null;
  track.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', function (e) {
    if (startX === null) return;
    var dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 45) { goTo(index + (dx < 0 ? 1 : -1)); restartAuto(); }
    startX = null;
  });

  goTo(0);
  restartAuto();

  /* --- 7. Calculadora de la suscripción --------------------- */
  var qty = document.getElementById('qty');
  var freq = document.getElementById('freq');
  var totalEl = document.getElementById('total');

  // Precio base por 250 g, con descuento por volumen
  var PRICE_250 = 14.50;
  var volumeFactor = { '250': 1, '500': 1.9, '1000': 3.6 };

  function recalc() {
    var base = PRICE_250 * volumeFactor[qty.value];
    var withDiscount = base * 0.85;              // 15% de suscripción
    totalEl.textContent = withDiscount.toFixed(2).replace('.', ',') + ' €';
  }

  qty.addEventListener('change', recalc);
  freq.addEventListener('change', recalc);
  recalc();

  /* --- 8. Envío del formulario ------------------------------ */
  var subForm = document.getElementById('subForm');
  var subEmail = document.getElementById('subEmail');
  var subMsg = document.getElementById('subMsg');
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var freqLabel = { '1': 'cada semana', '2': 'cada dos semanas', '4': 'cada mes' };

  subForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var value = subEmail.value.trim();

    if (!emailRe.test(value)) {
      subEmail.classList.add('is-bad');
      subMsg.classList.add('is-bad');
      subMsg.textContent = 'Necesitamos un correo válido para mandarte el café.';
      subEmail.focus();
      return;
    }

    subEmail.classList.remove('is-bad');
    subMsg.classList.remove('is-bad');
    subMsg.textContent = 'Plan guardado: ' + qty.value + ' g ' + freqLabel[freq.value] + '. Te escribimos a ' + value + '.';
    showToast('¡Suscripción creada! Primer envío el próximo martes.');
    subEmail.value = '';
  });

  /* --- 9. Scroll suave con offset de la barra --------------- */
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
