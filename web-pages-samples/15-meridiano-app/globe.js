/* ============================================================
   MERIDIANO — globo (three.js, sin dependencia de React)
   Nube de puntos en distribución de Fibonacci + anillos de
   latitud + arcos entre destinos. Los marcadores NO se dibujan
   en la escena: se proyectan a 2D y los pinta React como botones
   HTML, que así son enfocables, etiquetables y accesibles.
   ============================================================ */
(function () {
  'use strict';

  var R = 1;                 // radio del globo en unidades de escena
  var TAU = Math.PI * 2;

  /** Lat/lon (grados) → vector cartesiano sobre la esfera. */
  function latLonToVec3(lat, lon, radius) {
    var phi = (90 - lat) * Math.PI / 180;
    var theta = (lon + 180) * Math.PI / 180;
    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  /** Textura de punto: un disco con bordes suaves, generado al vuelo. */
  function dotTexture() {
    var s = 64;
    var c = document.createElement('canvas');
    c.width = c.height = s;
    var g = c.getContext('2d');
    var grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.45, 'rgba(255,255,255,0.85)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, s, s);
    var t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  }

  function Globe(container, opts) {
    opts = opts || {};
    this.el = container;
    this.points = opts.points || [];      // [{lat, lon}]
    this.reduced = !!opts.reducedMotion;

    this.spin = 0;                         // rotación acumulada en Y
    this.tiltY = 0;                        // inclinación en X
    this.targetSpin = 0;
    this.targetTilt = -0.12;
    this.autoSpin = true;
    this.dragging = false;
    this.raf = null;
    this.disposed = false;

    this._initScene();
    this._buildGlobe();
    this._buildArcs();
    this._bind();
    this.resize();
    this._loop();
  }

  Globe.prototype._initScene = function () {
    var w = this.el.clientWidth || 1;
    var h = this.el.clientHeight || 1;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
    this.camera.position.set(0, 0, 3.35);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    this.el.appendChild(this.renderer.domElement);

    /* root desplaza el conjunto dentro del lienzo; world gira.
       Separarlos deja que el halo acompañe al globo sin girar. */
    this.root = new THREE.Group();
    this.world = new THREE.Group();
    this.root.add(this.world);
    this.scene.add(this.root);
  };

  Globe.prototype._buildGlobe = function () {
    /* --- Nube de puntos: espiral de Fibonacci ---------------
       Reparte N puntos sobre la esfera de forma casi uniforme,
       sin la acumulación en los polos de una malla lat/lon. */
    var N = 2600;
    var pos = new Float32Array(N * 3);
    var golden = Math.PI * (3 - Math.sqrt(5));

    for (var i = 0; i < N; i++) {
      var y = 1 - (i / (N - 1)) * 2;
      var r = Math.sqrt(Math.max(0, 1 - y * y));
      var th = golden * i;
      pos[i * 3] = Math.cos(th) * r * R;
      pos[i * 3 + 1] = y * R;
      pos[i * 3 + 2] = Math.sin(th) * r * R;
    }

    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    this.dotTex = dotTexture();
    this.dots = new THREE.Points(g, new THREE.PointsMaterial({
      size: 0.025,
      map: this.dotTex,
      color: new THREE.Color(0xd7e2ea),
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    }));
    this.world.add(this.dots);

    /* --- Anillos de latitud, muy tenues ------------------- */
    this.rings = new THREE.Group();
    var lats = [-60, -30, 0, 30, 60];
    for (var k = 0; k < lats.length; k++) {
      var lat = lats[k];
      var rr = Math.cos(lat * Math.PI / 180) * R * 1.001;
      var yy = Math.sin(lat * Math.PI / 180) * R * 1.001;
      var segs = 128;
      var rp = new Float32Array((segs + 1) * 3);
      for (var s = 0; s <= segs; s++) {
        var a = (s / segs) * TAU;
        rp[s * 3] = Math.cos(a) * rr;
        rp[s * 3 + 1] = yy;
        rp[s * 3 + 2] = Math.sin(a) * rr;
      }
      var rg = new THREE.BufferGeometry();
      rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
      this.rings.add(new THREE.Line(rg, new THREE.LineBasicMaterial({
        color: 0x8fa6b8,
        transparent: true,
        opacity: lat === 0 ? 0.28 : 0.12
      })));
    }
    this.world.add(this.rings);

    /* --- Halo: una esfera un poco mayor, vista por dentro,
           con el color cayendo hacia el borde. Da atmósfera sin
           postprocesado. ------------------------------------ */
    var haloMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color(0x79a8c8) } },
      vertexShader: [
        'varying vec3 vN;',
        'void main(){',
        '  vN = normalize(normalMatrix * normal);',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform vec3 uColor;',
        'varying vec3 vN;',
        'void main(){',
        '  float i = pow(0.62 - dot(vN, vec3(0.0,0.0,1.0)), 2.6);',
        '  gl_FragColor = vec4(uColor, clamp(i,0.0,1.0) * 0.38);',
        '}'
      ].join('\n')
    });
    this.halo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.19, 48, 48), haloMat);
    this.root.add(this.halo);
  };

  Globe.prototype._buildArcs = function () {
    /* Un arco entre cada destino y el siguiente: la ruta del
       catálogo dibujada sobre la esfera. */
    this.arcs = new THREE.Group();
    var self = this;

    this.points.forEach(function (p, i) {
      var q = self.points[(i + 1) % self.points.length];
      var a = latLonToVec3(p.lat, p.lon, R);
      var b = latLonToVec3(q.lat, q.lon, R);

      // Altura del arco proporcional a la distancia angular
      var lift = 1 + a.distanceTo(b) * 0.38;
      var mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(R * lift);

      var curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      var pts = curve.getPoints(64);
      var geo = new THREE.BufferGeometry().setFromPoints(pts);

      var line = new THREE.Line(geo, new THREE.LineBasicMaterial({
        color: 0xd8a556,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      }));
      line.userData.from = i;
      self.arcs.add(line);
    });

    this.world.add(this.arcs);
  };

  /* --- Interacción: arrastrar para girar -------------------- */
  Globe.prototype._bind = function () {
    var self = this;
    var last = null;

    this._onDown = function (e) {
      self.dragging = true;
      self.autoSpin = false;
      last = { x: e.clientX, y: e.clientY };
      self.el.setPointerCapture && self.el.setPointerCapture(e.pointerId);
      self.el.classList.add('is-dragging');
    };
    this._onMove = function (e) {
      if (!self.dragging || !last) return;
      self.targetSpin += (e.clientX - last.x) * 0.006;
      self.targetTilt += (e.clientY - last.y) * 0.004;
      // Sin dar la vuelta por los polos
      self.targetTilt = Math.max(-0.85, Math.min(0.85, self.targetTilt));
      last = { x: e.clientX, y: e.clientY };
    };
    this._onUp = function () {
      self.dragging = false;
      last = null;
      self.el.classList.remove('is-dragging');
      // Vuelve a girar solo tras un respiro
      clearTimeout(self._idle);
      self._idle = setTimeout(function () { self.autoSpin = true; }, 2600);
    };

    this.el.addEventListener('pointerdown', this._onDown);
    this.el.addEventListener('pointermove', this._onMove);
    this.el.addEventListener('pointerup', this._onUp);
    this.el.addEventListener('pointercancel', this._onUp);
    this.el.addEventListener('pointerleave', this._onUp);
  };

  /** Gira el globo para poner un destino de frente a la cámara. */
  Globe.prototype.focus = function (index) {
    var p = this.points[index];
    if (!p) return;
    this.autoSpin = false;
    clearTimeout(this._idle);

    // Longitud → giro en Y. El +90° alinea con el sistema de latLonToVec3.
    var want = -(p.lon + 90) * Math.PI / 180;

    // Elegimos la vuelta equivalente más cercana para no cruzar el globo entero
    var cur = this.targetSpin;
    var diff = want - cur;
    diff = ((diff + Math.PI) % TAU + TAU) % TAU - Math.PI;

    this.targetSpin = cur + diff;
    this.targetTilt = Math.max(-0.6, Math.min(0.6, p.lat * Math.PI / 180 * 0.55));

    var self = this;
    this._idle = setTimeout(function () { self.autoSpin = true; }, 5200);
  };

  /** Posiciones 2D de los marcadores, en píxeles del contenedor. */
  Globe.prototype.project = function () {
    var out = [];
    var w = this.el.clientWidth;
    var h = this.el.clientHeight;
    var v = new THREE.Vector3();
    var camDir = this.camera.position.clone().normalize();

    for (var i = 0; i < this.points.length; i++) {
      var p = this.points[i];
      v.copy(latLonToVec3(p.lat, p.lon, R)).applyMatrix4(this.world.matrixWorld);

      // Cara oculta: el punto mira al lado contrario de la cámara
      var facing = v.clone().normalize().dot(camDir);

      var s = v.clone().project(this.camera);
      out.push({
        x: (s.x * 0.5 + 0.5) * w,
        y: (-s.y * 0.5 + 0.5) * h,
        depth: facing,
        visible: facing > -0.12
      });
    }
    return out;
  };

  Globe.prototype.resize = function () {
    var w = this.el.clientWidth || 1;
    var h = this.el.clientHeight || 1;
    var aspect = w / h;

    this.camera.aspect = aspect;

    /* Distancia calculada, no fija: el globo (halo incluido) debe
       caber SIEMPRE dentro del lienzo. Antes estaba a 3.35 fijo y
       en columnas altas se salía por arriba y por la derecha. */
    var rVisible = R * 1.19;
    var fovV = this.camera.fov * Math.PI / 180;
    var distV = rVisible / Math.tan(fovV / 2);                 // límite vertical
    var fovH = 2 * Math.atan(Math.tan(fovV / 2) * aspect);
    var distH = rVisible / Math.tan(fovH / 2);                 // límite horizontal

    // Margen: deja aire alrededor en vez de tocar los bordes
    var margin = w < 720 ? 1.12 : 1.34;
    this.camera.position.z = Math.max(distV, distH) * margin;

    // Un poco a la derecha en escritorio, centrado en móvil
    this.root.position.x = w < 720 ? 0 : rVisible * 0.14;

    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
  };

  Globe.prototype._loop = function () {
    var self = this;

    function frame() {
      if (self.disposed) return;
      self.raf = requestAnimationFrame(frame);

      if (self.autoSpin && !self.reduced) self.targetSpin += 0.0013;

      // Interpolación: el globo llega al objetivo con inercia
      self.spin += (self.targetSpin - self.spin) * 0.055;
      self.tiltY += (self.targetTilt - self.tiltY) * 0.055;

      self.world.rotation.y = self.spin;
      self.world.rotation.x = self.tiltY;
      self.world.updateMatrixWorld();

      self.renderer.render(self.scene, self.camera);
      if (self.onFrame) self.onFrame();
    }

    frame();
  };

  Globe.prototype.dispose = function () {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    clearTimeout(this._idle);

    this.el.removeEventListener('pointerdown', this._onDown);
    this.el.removeEventListener('pointermove', this._onMove);
    this.el.removeEventListener('pointerup', this._onUp);
    this.el.removeEventListener('pointercancel', this._onUp);
    this.el.removeEventListener('pointerleave', this._onUp);

    this.scene.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (o.material.map) o.material.map.dispose();
        o.material.dispose();
      }
    });
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  };

  window.Globe = Globe;
})();
