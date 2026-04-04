/* ============================================================
   TEATRO PÚBLICO — interacciones
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

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

  /* --- 2. Paletas ------------------------------------------
     Cada una está pensada como un cartel distinto de la misma
     temporada: cuatro planos saturados sobre un papel. */
  var PALETTES = [
    { c1:'#ff3b00', c2:'#ffd400', c3:'#0047ff', c4:'#ff5ea8', ink:'#0a0a0a', paper:'#f5f2eb' },
    { c1:'#0047ff', c2:'#00e0b8', c3:'#ff2d55', c4:'#ffd400', ink:'#0d0d18', paper:'#eef0f7' },
    { c1:'#e6007e', c2:'#ffcf00', c3:'#00a67d', c4:'#1b1b1b', ink:'#1b1b1b', paper:'#faf6ef' },
    { c1:'#ff5c00', c2:'#111111', c3:'#7b2fff', c4:'#00c2ff', ink:'#111111', paper:'#f0ece2' },
    { c1:'#d40000', c2:'#f2f0e6', c3:'#2b2b2b', c4:'#ff9500', ink:'#161616', paper:'#e8e4d9' }
  ];

  var pIndex = 0;

  function applyPalette(p) {
    Object.keys(p).forEach(function (key) {
      root.style.setProperty('--' + key, p[key]);
    });
  }

  document.getElementById('shuffle').addEventListener('click', function () {
    pIndex = (pIndex + 1) % PALETTES.length;
    applyPalette(PALETTES[pIndex]);
  });

  /* --- 3. Cada montaje tiene su color al pasar por encima --- */
  var shows = document.querySelectorAll('.show');
  var HOVERS = ['--c1', '--c2', '--c3', '--c4'];

  shows.forEach(function (show, i) {
    // Reparte los cuatro colores de la paleta activa por la lista
    show.style.setProperty('--hover', 'var(' + HOVERS[i % HOVERS.length] + ')');
  });

  /* --- 4. Formulario ---------------------------------------- */
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
      msg.textContent = 'ESE CORREO NO NOS VALE.';
      mail.focus();
      return;
    }

    mail.classList.remove('is-bad');
    msg.classList.remove('is-bad');
    msg.textContent = 'HECHO. TE AVISAMOS ANTES QUE A NADIE.';
    form.reset();
  });

  /* --- 5. Scroll suave -------------------------------------- */
  document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.scrollY - 56;
      window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });
})();
