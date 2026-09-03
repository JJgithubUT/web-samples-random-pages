/* ============================================================
   MERIDIANO — Globo 3D Táctico (Three.js - Módulo independiente)
   - Paleta: Continentes Azul Azurita / Conexiones Amarillo Dorado
   - Glow posterior difuminado integrado hacia el exterior
   - Muestreo preciso de continentes mediante mapa equirrectangular
   - Proyección 2D para marcadores HTML/React
   ============================================================ */
(function () {
  'use strict';

  var R = 1;
  var TAU = Math.PI * 2;

  /** Lat/lon (grados) → Vector 3D sobre la esfera */
  function latLonToVec3(lat, lon, radius) {
    var phi = (90 - lat) * Math.PI / 180;
    var theta = (lon + 180) * Math.PI / 180;
    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  /** Textura para los puntos de la tierra: disco azul sólido de alta nitidez */
  function createDotTexture() {
    var s = 64;
    var c = document.createElement('canvas');
    c.width = c.height = s;
    var g = c.getContext('2d');
    g.beginPath();
    g.arc(s / 2, s / 2, s * 0.42, 0, TAU);
    g.fillStyle = '#ffffff';
    g.fill();
    var t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  }

  /** Carga y muestrea el mapa equirrectangular para filtrar puntos de continentes */
  function loadLandMask(callback) {
    var img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_specular_2048.jpg';

    img.onload = function () {
      var canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      var imgData = ctx.getImageData(0, 0, img.width, img.height);
      callback(imgData, img.width, img.height);
    };

    img.onerror = function () {
      // Fallback básico si la textura tarda o falla
      callback(null, 0, 0);
    };
  }

  function Globe(container, opts) {
    opts = opts || {};
    this.el = container;
    this.points = opts.points || [];
    this.reduced = !!opts.reducedMotion;

    this.spin = 0;
    this.tiltY = 0;
    this.targetSpin = 0;
    this.targetTilt = -0.12;
    this.autoSpin = true;
    this.dragging = false;
    this.raf = null;
    this.disposed = false;

    this._initScene();

    var self = this;
    loadLandMask(function (imgData, w, h) {
      if (self.disposed) return;
      self._buildGlobe(imgData, w, h);
      self._buildArcs();
      self._bind();
      self.resize();
      self._loop();
    });
  }

  Globe.prototype._initScene = function () {
    var w = this.el.clientWidth || 1;
    var h = this.el.clientHeight || 1;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
    this.camera.position.set(0, 0, 3.35);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true, // Fondo transparente para acoplarse a tu página web
      powerPreference: 'high-performance'
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    this.el.appendChild(this.renderer.domElement);

    this.root = new THREE.Group();
    this.world = new THREE.Group();
    this.root.add(this.world);
    this.scene.add(this.root);
  };

  Globe.prototype._buildGlobe = function (imgData, imgW, imgH) {
    /* --- Nube de puntos azulada sobre continentes ------------------- */
    var N = 14000;
    var pos = [];
    var golden = Math.PI * (3 - Math.sqrt(5));

    for (var i = 0; i < N; i++) {
      var y = 1 - (i / (N - 1)) * 2;
      var r = Math.sqrt(Math.max(0, 1 - y * y));
      var th = golden * i;

      var lat = Math.asin(y) * (180 / Math.PI);
      var lon = (th % TAU) * (180 / Math.PI) - 180;

      var isLand = false;
      if (imgData) {
        var u = (lon + 180) / 360;
        var v = (90 - lat) / 180;
        var px = Math.floor(u * imgW);
        var py = Math.floor(v * imgH);
        var idx = (py * imgW + px) * 4;
        isLand = imgData.data[idx] > 30; // Umbral para tierra firme
      } else {
        isLand = true;
      }

      if (isLand) {
        pos.push(
          Math.cos(th) * r * R,
          y * R,
          Math.sin(th) * r * R
        );
      }
    }

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));

    this.dotTex = createDotTexture();
    this.dots = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.022,
      map: this.dotTex,
      color: new THREE.Color(0x38bdf8), // Azul vibrante (Cian / Electric Blue)
      transparent: false,
      depthWrite: true,
      sizeAttenuation: true
    }));
    this.world.add(this.dots);

    /* --- Núcleo Esférico Azul Oscuro (Da densidad visual sólida) ---- */
    var coreGeo = new THREE.SphereGeometry(R * 0.995, 48, 48);
    var coreMat = new THREE.MeshBasicMaterial({
      color: 0x031024,
      transparent: false
    });
    this.world.add(new THREE.Mesh(coreGeo, coreMat));

    /* --- Retícula de latitud (Grid azul tenues) ---------------------- */
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
        color: 0x1d4ed8,
        transparent: true,
        opacity: lat === 0 ? 0.4 : 0.18
      })));
    }
    this.world.add(this.rings);

    /* --- Difuminado posterior (Halo radiante azul desde dentro) --- */
    var haloMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color(0x0284c7) } },
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
        '  float intensity = pow(0.65 - dot(vN, vec3(0.0,0.0,1.0)), 2.8);',
        '  gl_FragColor = vec4(uColor, clamp(intensity, 0.0, 1.0) * 0.85);',
        '}'
      ].join('\n')
    });
    this.halo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.25, 48, 48), haloMat);
    this.root.add(this.halo);
  };

  Globe.prototype._buildArcs = function () {
    /* --- Rutas / Interconexiones entre puntos (Amarillo Dorado) ---- */
    this.arcs = new THREE.Group();
    var self = this;

    this.points.forEach(function (p, i) {
      var q = self.points[(i + 1) % self.points.length];
      var a = latLonToVec3(p.lat, p.lon, R * 1.002);
      var b = latLonToVec3(q.lat, q.lon, R * 1.002);

      // Elevación de los arcos
      var lift = 1 + a.distanceTo(b) * 0.32;
      var mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(R * lift);

      var curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      var pts = curve.getPoints(64);
      var geo = new THREE.BufferGeometry().setFromPoints(pts);

      // Línea de arco en color Amarillo vibrante
      var line = new THREE.Line(geo, new THREE.LineBasicMaterial({
        color: 0xffd700, // Amarillo brillante (Gold)
        linewidth: 2,
        transparent: true,
        opacity: 0.85,
        depthWrite: false
      }));
      line.userData.from = i;
      self.arcs.add(line);

      // Puntos clave de conexión en el origen/destino (Nodos amarillos)
      [a, b].forEach(function (nodeVec) {
        var nodeGeo = new THREE.SphereGeometry(0.02, 16, 16);
        var nodeMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
        var nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
        nodeMesh.position.copy(nodeVec);
        self.arcs.add(nodeMesh);
      });
    });

    this.world.add(this.arcs);
  };

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
      self.targetTilt = Math.max(-0.85, Math.min(0.85, self.targetTilt));
      last = { x: e.clientX, y: e.clientY };
    };
    this._onUp = function () {
      self.dragging = false;
      last = null;
      self.el.classList.remove('is-dragging');
      clearTimeout(self._idle);
      self._idle = setTimeout(function () { self.autoSpin = true; }, 2600);
    };

    this.el.addEventListener('pointerdown', this._onDown);
    this.el.addEventListener('pointermove', this._onMove);
    this.el.addEventListener('pointerup', this._onUp);
    this.el.addEventListener('pointercancel', this._onUp);
    this.el.addEventListener('pointerleave', this._onUp);
  };

  Globe.prototype.focus = function (index) {
    var p = this.points[index];
    if (!p) return;
    this.autoSpin = false;
    clearTimeout(this._idle);

    var want = -(p.lon + 90) * Math.PI / 180;
    var cur = this.targetSpin;
    var diff = want - cur;
    diff = ((diff + Math.PI) % TAU + TAU) % TAU - Math.PI;

    this.targetSpin = cur + diff;
    this.targetTilt = Math.max(-0.6, Math.min(0.6, p.lat * Math.PI / 180 * 0.55));

    var self = this;
    this._idle = setTimeout(function () { self.autoSpin = true; }, 5200);
  };

  Globe.prototype.project = function () {
    var out = [];
    var w = this.el.clientWidth;
    var h = this.el.clientHeight;
    var v = new THREE.Vector3();
    var camDir = this.camera.position.clone().normalize();

    for (var i = 0; i < this.points.length; i++) {
      var p = this.points[i];
      v.copy(latLonToVec3(p.lat, p.lon, R)).applyMatrix4(this.world.matrixWorld);

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

    var rVisible = R * 1.25;
    var fovV = this.camera.fov * Math.PI / 180;
    var distV = rVisible / Math.tan(fovV / 2);
    var fovH = 2 * Math.atan(Math.tan(fovV / 2) * aspect);
    var distH = rVisible / Math.tan(fovH / 2);

    var margin = w < 720 ? 1.12 : 1.34;
    this.camera.position.z = Math.max(distV, distH) * margin;
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