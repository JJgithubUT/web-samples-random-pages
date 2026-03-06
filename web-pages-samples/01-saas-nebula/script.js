/* ============================================================
   Nebula — interacciones de la landing
   JS puro, sin dependencias.
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- 1. Nav: sombra al hacer scroll + menú móvil ---------- */
  var nav = document.getElementById('nav');
  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu');

  function onScroll() {
    nav.classList.toggle('is-stuck', window.scrollY > 12);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  burger.addEventListener('click', function () {
    var open = burger.getAttribute('aria-expanded') === 'true';
    burger.setAttribute('aria-expanded', String(!open));
    menu.classList.toggle('is-open', !open);
  });

  menu.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      burger.setAttribute('aria-expanded', 'false');
      menu.classList.remove('is-open');
    }
  });

  /* --- 2. Reveal al entrar en viewport ---------------------- */
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
    }, { threshold: 0.15, rootMargin: '0px 0px -60px' });

    revealables.forEach(function (el) { io.observe(el); });
  }

  /* --- 3. Contadores animados ------------------------------- */
  function formatNumber(value, decimals) {
    return value.toLocaleString('es-ES', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function animateCount(el) {
    var target = parseFloat(el.dataset.count);
    var decimals = parseInt(el.dataset.decimals || '0', 10);
    var suffix = el.dataset.suffix || '';
    var duration = 1500;
    var start = null;

    if (reduceMotion) {
      el.textContent = formatNumber(target, decimals) + suffix;
      return;
    }

    function step(now) {
      if (start === null) start = now;
      var p = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = formatNumber(target * eased, decimals) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var counters = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window) {
    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        countObserver.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { countObserver.observe(el); });
  } else {
    counters.forEach(animateCount);
  }

  /* --- 4. Gráfico de barras del mock ------------------------ */
  var chart = document.getElementById('chartBars');
  var heights = [38, 52, 44, 66, 58, 74, 62, 81, 70, 88, 79, 95];

  heights.forEach(function (h, i) {
    var bar = document.createElement('div');
    bar.className = 'bar' + (i % 3 === 2 ? ' alt' : '');
    chart.appendChild(bar);
    // Escalonado para que "crezcan" de izquierda a derecha
    setTimeout(function () { bar.style.height = h + '%'; }, 500 + i * 70);
  });

  /* --- 5. Toggle de precios mensual / anual ----------------- */
  var toggleBtns = document.querySelectorAll('.toggle__btn');
  var priceEls = document.querySelectorAll('.plan__price');

  toggleBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var period = btn.dataset.period;

      toggleBtns.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', String(on));
      });

      priceEls.forEach(function (priceEl) {
        var num = priceEl.querySelector('.num');
        priceEl.classList.add('is-swapping');
        setTimeout(function () {
          num.textContent = num.dataset[period];
          priceEl.classList.remove('is-swapping');
        }, 160);
      });
    });
  });

  /* --- 6. Acordeón de FAQ ----------------------------------- */
  var faqItems = document.querySelectorAll('.faq__item');

  faqItems.forEach(function (item) {
    var btn = item.querySelector('.faq__q');

    btn.addEventListener('click', function () {
      var willOpen = !item.classList.contains('is-open');

      // Comportamiento acordeón: solo uno abierto a la vez
      faqItems.forEach(function (other) {
        other.classList.remove('is-open');
        other.querySelector('.faq__q').setAttribute('aria-expanded', 'false');
      });

      if (willOpen) {
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* --- 7. Formulario del CTA (validación local) ------------- */
  var form = document.getElementById('ctaForm');
  var msg = document.getElementById('ctaMsg');
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var input = form.querySelector('input');
    var value = input.value.trim();

    if (!emailRe.test(value)) {
      form.classList.add('is-bad');
      msg.classList.add('is-bad');
      msg.textContent = 'Escribe un correo válido para continuar.';
      input.focus();
      return;
    }

    form.classList.remove('is-bad');
    msg.classList.remove('is-bad');
    msg.textContent = '¡Listo! Te enviamos el acceso a ' + value + '.';
    input.value = '';
  });

  /* --- 8. Scroll suave con compensación de la barra fija ---- */
  document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });
})();
