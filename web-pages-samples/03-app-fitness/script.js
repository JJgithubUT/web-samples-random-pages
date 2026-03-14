/* ============================================================
   PULSO — interacciones
   JS puro, sin dependencias.
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- 1. Nav ----------------------------------------------- */
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

  /* --- 3. Pantallas del móvil ------------------------------- */
  var ptabs = document.querySelectorAll('.ptab');
  var screens = document.querySelectorAll('.scr');
  var autoScreens;

  function showScreen(name) {
    ptabs.forEach(function (t) {
      var on = t.dataset.screen === name;
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-selected', String(on));
    });
    screens.forEach(function (s) {
      s.classList.toggle('is-on', s.dataset.screen === name);
    });
    if (name === 'progreso') drawSpark();
  }

  ptabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      showScreen(tab.dataset.screen);
      clearInterval(autoScreens);   // el usuario toma el control
    });
  });

  // Rotación automática hasta que alguien interactúe
  if (!reduceMotion) {
    var order = ['hoy', 'plan', 'progreso', 'social'];
    var idx = 0;
    autoScreens = setInterval(function () {
      idx = (idx + 1) % order.length;
      showScreen(order[idx]);
    }, 4200);
  }

  /* --- 4. Mini gráfico de progreso -------------------------- */
  var spark = document.getElementById('spark');
  var sparkValues = [30, 38, 34, 46, 52, 49, 61, 58, 70, 66, 82, 92];
  var sparkDrawn = false;

  function drawSpark() {
    if (sparkDrawn) return;
    sparkDrawn = true;

    sparkValues.forEach(function (v, i) {
      var bar = document.createElement('i');
      spark.appendChild(bar);
      setTimeout(function () { bar.style.height = v + '%'; }, 60 * i);
    });
  }

  /* --- 5. Filtro de programas ------------------------------- */
  var chips = document.querySelectorAll('.chip');
  var progs = document.querySelectorAll('.prog');
  var empty = document.getElementById('empty');

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var filter = chip.dataset.filter;

      chips.forEach(function (c) { c.classList.toggle('is-on', c === chip); });

      var visible = 0;
      progs.forEach(function (p) {
        var show = filter === 'todos' || p.dataset.cat === filter;
        p.classList.toggle('is-hidden', !show);
        if (show) visible++;
      });

      empty.hidden = visible > 0;
    });
  });

  /* --- 6. Calculadora de calorías --------------------------- */
  var calcForm = document.getElementById('calcForm');
  var age = document.getElementById('age');
  var height = document.getElementById('height');
  var weight = document.getElementById('weight');
  var activity = document.getElementById('activity');
  var tdeeEl = document.getElementById('tdee');
  var cutEl = document.getElementById('cut');
  var bulkEl = document.getElementById('bulk');
  var macrosEl = document.getElementById('macros');
  var sexBtns = document.querySelectorAll('.sex');
  var sex = 'f';

  function clamp(value, min, max) {
    if (isNaN(value)) return min;
    return Math.min(Math.max(value, min), max);
  }

  function format(n) {
    return Math.round(n).toLocaleString('es-ES');
  }

  function calculate() {
    var a = clamp(parseFloat(age.value), 14, 90);
    var h = clamp(parseFloat(height.value), 120, 220);
    var w = clamp(parseFloat(weight.value), 35, 220);
    var act = parseFloat(activity.value);

    // Mifflin-St Jeor
    var bmr = (10 * w) + (6.25 * h) - (5 * a) + (sex === 'm' ? 5 : -161);
    var tdee = bmr * act;

    tdeeEl.textContent = format(tdee);
    cutEl.textContent = format(tdee - 400);
    bulkEl.textContent = format(tdee + 300);

    // Reparto de macros orientativo: 1,8 g/kg proteína, 25% grasa, resto hidratos
    var protein = w * 1.8;
    var fat = (tdee * 0.25) / 9;
    var carbs = (tdee - (protein * 4) - (fat * 9)) / 4;

    macrosEl.innerHTML =
      'Reparto orientativo en mantenimiento: <b>' + format(protein) + ' g</b> de proteína · ' +
      '<b>' + format(carbs) + ' g</b> de hidratos · <b>' + format(fat) + ' g</b> de grasa.';
  }

  sexBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      sex = btn.dataset.sex;
      sexBtns.forEach(function (b) { b.classList.toggle('is-on', b === btn); });
      calculate();
    });
  });

  [age, height, weight, activity].forEach(function (el) {
    el.addEventListener('input', calculate);
    el.addEventListener('change', calculate);
  });

  calcForm.addEventListener('submit', function (e) { e.preventDefault(); });

  calculate();

  /* --- 7. Scroll suave -------------------------------------- */
  document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.scrollY - 82;
      window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });
})();
