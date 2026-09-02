/* ============================================================
   MERIDIANO — aplicación React
   React 18 + htm (plantillas etiquetadas, JSX sin compilador).
   El globo three.js se monta UNA sola vez y sobrevive a los
   cambios de vista: solo se oculta con CSS, nunca se desmonta.
   ============================================================ */
(function () {
  'use strict';

  var React = window.React;
  var h = htm.bind(React.createElement);
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useRef = React.useRef;
  var useMemo = React.useMemo;
  var useCallback = React.useCallback;

  var DATA = window.MERIDIANO_DATA;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- Utilidades ------------------------------------------ */

  function img(id, w, q) {
    return 'https://images.unsplash.com/photo-' + id +
           '?auto=format&fit=crop&w=' + (w || 1600) + '&q=' + (q || 72);
  }

  function dms(v, pos, neg) {
    var d = Math.abs(v);
    var deg = Math.floor(d);
    var min = Math.round((d - deg) * 60);
    return deg + '°' + String(min).padStart(2, '0') + "' " + (v >= 0 ? pos : neg);
  }

  function euros(n) {
    return n.toLocaleString('es-ES');
  }

  /* ==========================================================
     Globo — puente entre three.js y React
     ========================================================== */
  function GlobeStage(props) {
    var hostRef = useRef(null);
    var globeRef = useRef(null);
    var pinsRef = useRef([]);
    var selRef = useRef(props.index);

    // El índice vive también en una ref para que el bucle de
    // animación lo lea sin recrear la escena en cada cambio.
    selRef.current = props.index;

    useEffect(function () {
      var host = hostRef.current;
      if (!host || !window.THREE) return;

      var g = new window.Globe(host, {
        points: DATA.map(function (d) { return { lat: d.lat, lon: d.lon }; }),
        reducedMotion: reduced
      });
      globeRef.current = g;

      // Cada fotograma reposicionamos los marcadores HTML.
      // Escribimos estilos directamente: pasar por el estado de
      // React 60 veces por segundo sería tirar el presupuesto.
      g.onFrame = function () {
        var p = g.project();
        for (var i = 0; i < pinsRef.current.length; i++) {
          var el = pinsRef.current[i];
          if (!el) continue;
          var s = p[i];
          el.style.transform = 'translate3d(' + s.x + 'px,' + s.y + 'px,0)';
          el.style.opacity = s.visible ? (0.35 + Math.max(0, s.depth) * 0.65) : 0;
          el.style.pointerEvents = s.visible ? 'auto' : 'none';
          el.style.zIndex = s.visible ? String(10 + Math.round(s.depth * 10)) : '0';
        }
      };

      g.focus(selRef.current);

      var ro = new ResizeObserver(function () { g.resize(); });
      ro.observe(host);

      var onVis = function () {
        // Sin pestaña visible no hay nada que animar
        if (document.hidden) { cancelAnimationFrame(g.raf); }
        else if (!g.disposed) { g._loop(); }
      };
      document.addEventListener('visibilitychange', onVis);

      props.onReady && props.onReady();

      return function () {
        document.removeEventListener('visibilitychange', onVis);
        ro.disconnect();
        g.dispose();
        globeRef.current = null;
      };
    }, []);

    // Al cambiar de destino, el globo gira hasta ponerlo de frente
    useEffect(function () {
      if (globeRef.current) globeRef.current.focus(props.index);
    }, [props.index]);

    var onSelect = props.onSelect;

    return h`
      <div className="globe" ref=${hostRef}>
        ${DATA.map(function (d, i) {
          return h`
            <button
              key=${d.id}
              ref=${function (el) { pinsRef.current[i] = el; }}
              className=${'pin' + (i === props.index ? ' is-on' : '')}
              style=${{ left: 0, top: 0, opacity: 0 }}
              onClick=${function () { onSelect(i); }}
              aria-label=${'Ver ' + d.name + ', ' + d.region}
              aria-pressed=${i === props.index}>
              <span className="pin__d"></span>
              <span className="pin__l">${d.name}</span>
            </button>`;
        })}
        <p className="globe__hint">arrastra para girar</p>
      </div>`;
  }

  /* ==========================================================
     Vistas
     ========================================================== */

  function Explore(props) {
    var d = props.dest;
    return h`
      <section className=${'view explore' + (props.on ? ' is-on' : '')}
               aria-hidden=${!props.on}>
        <div className="dossier">
          <p className="eyebrow">Expedición ${String(props.index + 1).padStart(2, '0')} / ${String(DATA.length).padStart(2, '0')}</p>

          <h1 className="dossier__n">${d.name}</h1>
          <p className="dossier__r">${d.region}</p>

          <p className="coord">
            <span>${dms(d.lat, 'N', 'S')}</span>
            <span>${dms(d.lon, 'E', 'O')}</span>
            <span>${d.altitude} m</span>
          </p>

          <p className="lead">${d.lead}</p>
          <p className="body">${d.body}</p>

          <div className="stats">
            <div className="stat"><b className="stat__n">${d.days}</b><span className="stat__k">días</span></div>
            <div className="stat"><b className="stat__n">${d.level}</b><span className="stat__k">nivel</span></div>
            <div className="stat"><b className="stat__n">${d.season}</b><span className="stat__k">temporada</span></div>
            <div className="stat"><b className="stat__n">${euros(d.price)} €</b><span className="stat__k">desde</span></div>
          </div>

          <ul className="tags">
            ${d.tags.map(function (t) { return h`<li key=${t}>${t}</li>`; })}
          </ul>

          <button className="cta" onClick=${function () { props.onOpen(); }}>
            Ver la ficha <b>→</b>
          </button>
        </div>

        ${props.globe}
      </section>`;
  }

  function Gallery(props) {
    return h`
      <section className=${'view gallery' + (props.on ? ' is-on' : '')}
               aria-hidden=${!props.on}>
        ${DATA.map(function (d, i) {
          return h`
            <button
              key=${d.id}
              className=${'gcard' + (i === props.index ? ' is-on' : '')}
              onClick=${function () { props.onSelect(i); props.onOpen(); }}
              aria-label=${'Abrir ficha de ' + d.name}>
              <span className="gcard__i" style=${{ backgroundImage: 'url(' + img(d.photo, 900, 66) + ')' }}></span>
              <span className="gcard__m">${d.days} d · ${euros(d.price)} €</span>
              <span className="gcard__b">
                <span className="gcard__n">${d.name}</span>
                <span className="gcard__r">${d.region}</span>
              </span>
            </button>`;
        })}
      </section>`;
  }

  function Detail(props) {
    var d = props.dest;
    var note = props.note;
    return h`
      <section className=${'view detail' + (props.on ? ' is-on' : '')}
               aria-hidden=${!props.on}>
        <div className="shots">
          ${d.gallery.map(function (g, i) {
            return h`<div key=${g + i} className="shot"
                          style=${{ backgroundImage: 'url(' + img(g, i === 0 ? 1400 : 700, 70) + ')' }}
                          role="img"
                          aria-label=${d.name + ', imagen ' + (i + 1)}></div>`;
          })}
        </div>

        <div className="sheet">
          <p className="eyebrow">Ficha técnica</p>
          <h2 className="sheet__n">${d.name}</h2>

          <div className="kv">
            <div className="kv__row"><span className="kv__k">Región</span><span className="kv__v">${d.region}</span></div>
            <div className="kv__row"><span className="kv__k">Coordenadas</span><span className="kv__v">${dms(d.lat, 'N', 'S')} · ${dms(d.lon, 'E', 'O')}</span></div>
            <div className="kv__row"><span className="kv__k">Altitud máxima</span><span className="kv__v">${d.altitude} m</span></div>
            <div className="kv__row"><span className="kv__k">Duración</span><span className="kv__v">${d.days} días</span></div>
            <div className="kv__row"><span className="kv__k">Exigencia</span><span className="kv__v">${d.level}</span></div>
            <div className="kv__row"><span className="kv__k">Temporada</span><span className="kv__v">${d.season}</span></div>
            <div className="kv__row"><span className="kv__k">Grupo</span><span className="kv__v">máx. 8 personas</span></div>
          </div>

          <div className="price">
            <span className="price__n">${euros(d.price)} €</span>
            <span className="price__k">por persona</span>
          </div>

          <div className="detail__acts">
            <button className="cta" onClick=${props.onBook}>Reservar plaza <b>→</b></button>
            <button className="ghost" onClick=${props.onBack}>Volver al globo</button>
          </div>

          <p className="note" role="status">${note}</p>
        </div>
      </section>`;
  }

  /* ==========================================================
     Aplicación
     ========================================================== */
  function App() {
    var _i = useState(0); var index = _i[0], setIndex = _i[1];
    var _v = useState('explore'); var view = _v[0], setView = _v[1];
    var _b = useState(false); var booted = _b[0], setBooted = _b[1];
    var _n = useState(''); var note = _n[0], setNote = _n[1];

    var railRef = useRef(null);
    var dest = DATA[index];

    var select = useCallback(function (i) {
      setIndex(((i % DATA.length) + DATA.length) % DATA.length);
      setNote('');
    }, []);

    /* --- Precarga: las fotos de fondo no deben aparecer a trozos */
    useEffect(function () {
      var done = 0;
      DATA.forEach(function (d) {
        var im = new Image();
        im.onload = im.onerror = function () {
          done++;
          if (done >= Math.min(3, DATA.length)) setBooted(true);
        };
        im.src = img(d.photo, 1600, 72);
      });
      // Red muy lenta: no dejamos la pantalla de carga colgada
      var t = setTimeout(function () { setBooted(true); }, 4000);
      return function () { clearTimeout(t); };
    }, []);

    /* --- Teclado: la app se maneja entera sin ratón --------- */
    useEffect(function () {
      function onKey(e) {
        if (e.target.matches && e.target.matches('input,textarea')) return;

        if (e.key === 'ArrowRight') { select(index + 1); e.preventDefault(); }
        else if (e.key === 'ArrowLeft') { select(index - 1); e.preventDefault(); }
        else if (e.key === 'Escape') { setView('explore'); }
        else if (e.key === 'Enter' && view === 'explore') { setView('detail'); }
        else if (e.key.toLowerCase() === 'g') {
          setView(function (v) { return v === 'gallery' ? 'explore' : 'gallery'; });
        }
      }
      window.addEventListener('keydown', onKey);
      return function () { window.removeEventListener('keydown', onKey); };
    }, [index, view, select]);

    /* --- El carrusel sigue a la selección ------------------- */
    useEffect(function () {
      var rail = railRef.current;
      if (!rail) return;
      var card = rail.children[index];
      if (!card) return;
      var left = card.offsetLeft - (rail.clientWidth - card.clientWidth) / 2;
      rail.scrollTo({ left: left, behavior: reduced ? 'auto' : 'smooth' });
    }, [index]);

    /* --- El globo se crea una vez y se reutiliza ------------ */
    var globe = useMemo(function () {
      return h`<${GlobeStage} index=${index} onSelect=${select} />`;
    }, [index, select]);

    var VIEWS = [
      { k: 'explore', l: 'Explorar' },
      { k: 'gallery', l: 'Galería' },
      { k: 'detail', l: 'Ficha' }
    ];

    return h`
      <${React.Fragment}>
        <div className="backdrop" aria-hidden="true">
          ${DATA.map(function (d, i) {
            return h`<div key=${d.id}
                          className=${'backdrop__img' + (i === index ? ' is-on' : '')}
                          style=${{ backgroundImage: 'url(' + img(d.photo, 1900, 74) + ')' }}></div>`;
          })}
        </div>

        <div className="app">
          <header className="bar">
            <a className="brand" href="#" onClick=${function (e) { e.preventDefault(); setView('explore'); }}>
              <span className="brand__n">MERIDIANO</span>
              <span className="brand__t">expediciones</span>
            </a>

            <nav className="tabs" aria-label="Vistas">
              ${VIEWS.map(function (v) {
                return h`
                  <button key=${v.k}
                          className=${'tab' + (view === v.k ? ' is-on' : '')}
                          onClick=${function () { setView(v.k); }}
                          aria-pressed=${view === v.k}>${v.l}</button>`;
              })}
            </nav>

            <div className="bar__end">
              <span className="meta">${String(index + 1).padStart(2, '0')} / ${String(DATA.length).padStart(2, '0')}</span>
              <span className="keyhint">
                <span className="key">←</span><span className="key">→</span>
                <span className="key">G</span><span className="key">Esc</span>
              </span>
            </div>
          </header>

          <main className="stage">
            <${Explore} on=${view === 'explore'} dest=${dest} index=${index}
                        globe=${globe} onOpen=${function () { setView('detail'); }} />
            <${Gallery} on=${view === 'gallery'} index=${index}
                        onSelect=${select} onOpen=${function () { setView('detail'); }} />
            <${Detail}  on=${view === 'detail'} dest=${dest} note=${note}
                        onBack=${function () { setView('explore'); }}
                        onBook=${function () {
                          setNote('Plaza bloqueada 48 h · te escribimos para confirmar');
                        }} />
          </main>

          <nav className="rail" ref=${railRef} aria-label="Destinos">
            ${DATA.map(function (d, i) {
              return h`
                <button key=${d.id}
                        className=${'rcard' + (i === index ? ' is-on' : '')}
                        onClick=${function () { select(i); }}
                        aria-label=${d.name + ', ' + d.region}
                        aria-current=${i === index ? 'true' : 'false'}>
                  <span className="rcard__bar"></span>
                  <span className="rcard__i" style=${{ backgroundImage: 'url(' + img(d.photo, 420, 60) + ')' }}></span>
                  <span className="rcard__b">
                    <span className="rcard__n">${d.name}</span>
                    <span className="rail__i">${String(i + 1).padStart(2, '0')} · ${d.country}</span>
                  </span>
                </button>`;
            })}
          </nav>
        </div>

        <div className=${'boot' + (booted ? ' is-gone' : '')} aria-hidden=${booted}>
          <p className="boot__n">MERIDIANO</p>
          <div className="boot__b"><i></i></div>
        </div>
      <//>`;
  }

  var root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(h`<${App} />`);
})();
