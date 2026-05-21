import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

// ======================================================
// Glovety Observatory MVP
// - UI fallback
// - coordinate scale and gravity radius are fully separated
// - search focus
// - hamburger menu
// ======================================================

// ---------- UI fallback ----------
ensureUI();

function ensureUI() {
  if (!document.getElementById('glovety-ui-style')) {
    const style = document.createElement('style');
    style.id = 'glovety-ui-style';
    style.textContent = `
      html, body {
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: #02040a;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      canvas {
        display: block;
      }

      #ui-layer {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 10;
      }

      #top-left {
        position: absolute;
        top: 24px;
        left: 24px;
        display: flex;
        align-items: center;
        gap: 16px;
        pointer-events: auto;
      }

      #hamburger {
        width: 42px;
        height: 42px;
        border-radius: 12px;
        border: 1px solid rgba(180, 220, 255, 0.25);
        background: rgba(6, 12, 24, 0.72);
        color: #eaf6ff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        cursor: pointer;
        backdrop-filter: blur(14px);
        box-shadow: 0 0 24px rgba(80, 160, 255, 0.18);
      }

      #logo {
        height: 48px;
        display: flex;
        align-items: center;
      }

      .glovety-logo-img {
        height: 48px;
        width: auto;
        max-width: 220px;
        display: block;
        object-fit: contain;
        filter: drop-shadow(0 0 18px rgba(120, 190, 255, 0.35));
      }

      @media (max-width: 640px) {
        #top-left {
          top: 16px;
          left: 16px;
          gap: 10px;
        }

        #hamburger {
          width: 38px;
          height: 38px;
          font-size: 20px;
        }

        .glovety-logo-img {
          height: 36px;
          max-width: 170px;
        }
      }

      #search-box {
        position: absolute;
        top: 24px;
        left: 50%;
        transform: translateX(-50%);
        width: min(420px, calc(100vw - 220px));
        pointer-events: auto;
      }

      #company-search {
        width: 100%;
        height: 44px;
        border-radius: 999px;
        border: 1px solid rgba(180, 220, 255, 0.25);
        background: rgba(6, 12, 24, 0.72);
        color: #f4fbff;
        padding: 0 20px;
        outline: none;
        font-size: 14px;
        backdrop-filter: blur(14px);
        box-shadow: 0 0 30px rgba(80, 160, 255, 0.16);
      }

      #company-search::placeholder {
        color: rgba(220, 240, 255, 0.5);
      }

      #side-menu {
        position: absolute;
        top: 82px;
        left: 24px;
        width: 240px;
        padding: 18px;
        border-radius: 18px;
        border: 1px solid rgba(180, 220, 255, 0.2);
        background: rgba(6, 12, 24, 0.86);
        backdrop-filter: blur(18px);
        box-shadow: 0 0 36px rgba(80, 160, 255, 0.18);
        display: none;
        pointer-events: auto;
      }

      #side-menu.open {
        display: block;
      }

      #side-menu .menu-title {
        color: #ffffff;
        font-weight: 700;
        margin-bottom: 14px;
      }

      #side-menu a {
        display: block;
        color: rgba(230, 246, 255, 0.82);
        text-decoration: none;
        padding: 10px 0;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        font-size: 14px;
      }

      #side-menu a:hover {
        color: #ffffff;
      }

      #infoPanel {
        position: absolute;
        bottom: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.62);
        color: white;
        font-family: sans-serif;
        padding: 12px;
        border-radius: 10px;
        display: none;
        min-width: 260px;
        z-index: 20;
        border: 1px solid rgba(180, 220, 255, 0.18);
        backdrop-filter: blur(12px);
        line-height: 1.5;
      }
    `;
    document.head.appendChild(style);
  }

  if (!document.getElementById('ui-layer')) {
    const ui = document.createElement('div');
    ui.id = 'ui-layer';
    ui.innerHTML = `
      <div id="top-left">
        <div id="hamburger">☰</div>

        <div id="logo">
          <img class="glovety-logo-img" src="/glovety-logo.png" alt="Glovety Observatory" />
        </div>
      </div>

      <div id="search-box">
        <input id="company-search" type="text" placeholder="Search company planet..." />
      </div>

      <div id="side-menu">
        <div class="menu-title">Glovety Observatory</div>
        <a href="/">Gravity Map</a>
        <a href="#">Analytics</a>
        <a href="#">Theory</a>
        <a href="https://note.com/" target="_blank">note</a>
        <a href="#">Contact</a>
      </div>
    `;
    document.body.appendChild(ui);
  }

  if (!document.getElementById('infoPanel')) {
    const panel = document.createElement('div');
    panel.id = 'infoPanel';
    document.body.appendChild(panel);
  }
}

// ======================================================
// SCALE SETTINGS
// ======================================================

// ======================================================
// SCALE SETTINGS
// ======================================================

// HNE座標1.0あたりの表示距離。
// ここは「座標メモリの見た目間隔」だけを決める。
const COORDINATE_UNIT_SCALE = 450;

// CSV座標の中心。
// CSVが2.5中心の座標体系ならこのまま。
const HNE_CENTER = new THREE.Vector3(2.5, 2.5, 2.5);

// 重力値1.0を、座標メモリ1.0に対してどれくらいの半径にするか。
// 0.001 = 座標メモリ1.0の0.1%
// COORDINATE_UNIT_SCALE=600なら、重力1.0の半径増加 = 0.6
const GRAVITY_RADIUS_RATIO_TO_COORDINATE_UNIT = 0.005;

// 重力0でも最低限見えるようにする視認性補正。
// 0.0003 = 座標メモリ1.0の0.03%
// COORDINATE_UNIT_SCALE=600なら、最低半径 = 0.18
const PLANET_BASE_RADIUS_RATIO_TO_COORDINATE_UNIT = 0.001;

// 色の濃さだけを決める参照最大値。
// 半径の上限ではない。
const GRAVITY_COLOR_REFERENCE_MAX = 7;

// 実際にThree.jsで使うworld unitに変換。
// ここで初めて、座標メモリに対する比率をworld unitへ落とす。
const PLANET_BASE_RADIUS_WORLD =
  COORDINATE_UNIT_SCALE * PLANET_BASE_RADIUS_RATIO_TO_COORDINATE_UNIT;

const GRAVITY_RADIUS_WORLD_SCALE =
  COORDINATE_UNIT_SCALE * GRAVITY_RADIUS_RATIO_TO_COORDINATE_UNIT;

function toWorldPosition(x, y, z) {
  return new THREE.Vector3(
    (parseFloat(x) - HNE_CENTER.x) * COORDINATE_UNIT_SCALE,
    (parseFloat(y) - HNE_CENTER.y) * COORDINATE_UNIT_SCALE,
    (parseFloat(z) - HNE_CENTER.z) * COORDINATE_UNIT_SCALE
  );
}

function radiusFromGravity(gravity) {
  const g = Number.isFinite(gravity) ? Math.max(gravity, 0) : 0;

  return PLANET_BASE_RADIUS_WORLD + g * GRAVITY_RADIUS_WORLD_SCALE;
}

function colorIntensityFromGravity(gravity) {
  const g = Number.isFinite(gravity) ? Math.max(gravity, 0) : 0;
  return Math.min(g / GRAVITY_COLOR_REFERENCE_MAX, 1);
}
// ======================================================
// SCENE
// ======================================================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0c2a);
scene.fog = new THREE.Fog(new THREE.Color(0x0b0c2a), 800, 3600);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  8000
);

// カメラを遠くしすぎると密集して見えるので、まずはこの距離。
camera.position.set(80, 60, 120);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.04;
controls.target.set(0, 0, 0);

// ---------- lights ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.42));

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.15);
directionalLight.position.set(500, 800, 650);
scene.add(directionalLight);

const animateCallbacks = [];
const planetMeshes = [];
const shootingStars = [];

const infoPanel = document.getElementById('infoPanel');

// ======================================================
// SUN
// ======================================================

addSun(new THREE.Vector3(650, 540, 900));

function addSun(position = new THREE.Vector3(650, 540, 900)) {
  const geometry = new THREE.SphereGeometry(10, 64, 64);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffaa00
  });

  const sun = new THREE.Mesh(geometry, material);
  sun.position.copy(position);
  scene.add(sun);

  const pointLight = new THREE.PointLight(0xffcc88, 2.4, 5000, 2);
  pointLight.position.copy(position);
  scene.add(pointLight);

  const flareTexture = new THREE.TextureLoader().load(
    'https://threejs.org/examples/textures/lensflare/lensflare0.png'
  );

  const spriteMaterial = new THREE.SpriteMaterial({
    map: flareTexture,
    color: 0xffaa00,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const flare = new THREE.Sprite(spriteMaterial);
  flare.scale.set(80, 80, 1);
  flare.position.copy(position);
  scene.add(flare);

  const swirlMaterial = new THREE.MeshStandardMaterial({
    color: 0xffcc66,
    metalness: 0.8,
    roughness: 0.2,
    emissive: 0xff6600,
    emissiveIntensity: 0.25,
    opacity: 0.6,
    transparent: true
  });

  const swirl = new THREE.Mesh(
    new THREE.SphereGeometry(11.5, 64, 64),
    swirlMaterial
  );
  swirl.position.copy(position);
  scene.add(swirl);

  animateCallbacks.push(() => {
    swirl.rotation.y += 0.006;
    swirl.rotation.x += 0.004;
    const scale = 84 + Math.sin(performance.now() * 0.002) * 8;
    flare.scale.set(scale, scale, 1);
  });
}

// ======================================================
// AXES
// ======================================================

function addCustomAxes(center = new THREE.Vector3(0, 0, 0), length = 3000) {
  const axisDefs = [
    { name: 'Human', dir: new THREE.Vector3(1, 0, 0), color: 0x5da9ff },
    { name: 'Nature', dir: new THREE.Vector3(0, 0, 1), color: 0x64ff9b },
    { name: 'Economic', dir: new THREE.Vector3(0, 1, 0), color: 0xff8d6b }
  ];

  axisDefs.forEach(({ dir, color }) => {
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.45
    });

    const points = [
      center.clone().add(dir.clone().multiplyScalar(-length)),
      center.clone().add(dir.clone().multiplyScalar(length))
    ];

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    scene.add(line);
  });

  addAxisNameLabels(axisDefs, center, length);
}

function addAxisNameLabels(axisDefs, center, length) {
  const loader = new FontLoader();

  loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
    axisDefs.forEach(({ name, dir, color }) => {
      const textGeo = new TextGeometry(name, {
        font,
        size: 14,
        height: 0.1
      });

      const textMaterial = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(textGeo, textMaterial);
      mesh.position.copy(center.clone().add(dir.clone().multiplyScalar(length + 80)));
      scene.add(mesh);
    });
  });
}

addCustomAxes();

// ======================================================
// BACKGROUND STARS
// ======================================================

function addGalaxyStars(count = 7000) {
  const geometry = new THREE.BufferGeometry();
  const positions = [];

  for (let i = 0; i < count; i++) {
    const r = Math.random() * 2600 + 300;
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.random() * Math.PI;

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    positions.push(x, y, z);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.2,
    transparent: true,
    opacity: 0.82
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);
}

addGalaxyStars();

// ======================================================
// SHOOTING STARS
// ======================================================

function addShootingStar() {
  const geometry = new THREE.SphereGeometry(1.2, 8, 8);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const star = new THREE.Mesh(geometry, material);

  star.position.set(
    Math.random() * 3000 - 1500,
    Math.random() * 1600 - 400,
    Math.random() * 3000 - 1500
  );

  star.velocity = new THREE.Vector3(
    Math.random() * -4.0 - 1.0,
    Math.random() * -3.0 - 0.8,
    Math.random() * -3.5 - 0.8
  );

  shootingStars.push(star);
  scene.add(star);
}

setInterval(addShootingStar, 3200);

// ======================================================
// SUPERNOVA
// ======================================================

function triggerSupernova() {
  const particleCount = 320;
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const velocities = [];
  const origin = new THREE.Vector3(0, 0, 0);

  for (let i = 0; i < particleCount; i++) {
    positions.push(origin.x, origin.y, origin.z);

    const speed = Math.random() * 0.8 + 0.25;
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);

    velocities.push(
      speed * Math.sin(phi) * Math.cos(theta),
      speed * Math.sin(phi) * Math.sin(theta),
      speed * Math.cos(phi)
    );
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xffffcc,
    size: 1.6,
    transparent: true,
    opacity: 0.9
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  const startTime = performance.now();
  const duration = 1500;

  function animateExplosion(time) {
    const elapsed = time - startTime;
    const progress = elapsed / duration;

    if (progress < 1) {
      const newPositions = [];

      for (let i = 0; i < particleCount; i++) {
        newPositions.push(
          positions[i * 3] + velocities[i * 3] * elapsed,
          positions[i * 3 + 1] + velocities[i * 3 + 1] * elapsed,
          positions[i * 3 + 2] + velocities[i * 3 + 2] * elapsed
        );
      }

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
      requestAnimationFrame(animateExplosion);
    } else {
      scene.remove(particles);
      geometry.dispose();
      material.dispose();
    }
  }

  requestAnimationFrame(animateExplosion);
}

setInterval(() => {
  if (Math.random() < 0.06) triggerSupernova();
}, 4000);

// ======================================================
// PLANETS
// ======================================================

function createPlanet({ name, position, gravity, colorOverride, rawPosition }) {
  const safeGravity = Number.isFinite(gravity) ? gravity : 0;
  const radius = radiusFromGravity(safeGravity);
  const gravityIntensity = colorIntensityFromGravity(safeGravity);

  const geometry = new THREE.SphereGeometry(radius, 32, 32);

  let color;
  if (colorOverride) {
    color = new THREE.Color(colorOverride);
  } else {
    const hue = 0.6;
    const saturation = 0.25 + gravityIntensity * 0.55;
    const lightness = 0.28 + gravityIntensity * 0.35;
    color = new THREE.Color().setHSL(hue, saturation, lightness);
  }

  const material = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.35,
    roughness: 0.55,
    emissive: color.clone().multiplyScalar(0.08)
  });

  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.copy(position);
  sphere.name = name;
  sphere.userData = {
    name,
    gravity: safeGravity,
    rawPosition,
    radius
  };

  scene.add(sphere);

  const wireframe = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({
      color: 0x88aaff,
      transparent: true,
      opacity: 0.18
    })
  );
  wireframe.position.copy(position);
  scene.add(wireframe);

  planetMeshes.push(sphere);

  addPlanetLabel(name, position, radius);
}

function addPlanetLabel(name, position, radius) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = '28px sans-serif';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(80, 180, 255, 0.9)';
  ctx.shadowBlur = 18;
  ctx.fillText(name, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;

  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false
  });

  const sprite = new THREE.Sprite(spriteMaterial);

  // ラベルは惑星半径と完全連動させすぎない。
  // 巨大惑星でもラベルが巨大化しないよう控えめにする。
  const labelWidth = Math.max(38, Math.min(90, radius * 2.2));
  sprite.scale.set(labelWidth, labelWidth * 0.45, 1);

  sprite.position.copy(position).add(new THREE.Vector3(0, radius + 12, 0));
  scene.add(sprite);
}

// ======================================================
// CSV
// ======================================================

function loadPlanetsFromCSV(url) {
  fetch(url)
    .then((response) => response.text())
    .then((data) => {
      const lines = data.split('\n').slice(1);
      const companyPositions = [];

      lines.forEach((line) => {
        if (!line.trim()) return;

        const [name, x, y, z, gravity] = line.split(',');

        const rawX = parseFloat(x);
        const rawY = parseFloat(y);
        const rawZ = parseFloat(z);
        const rawGravity = parseFloat(gravity);

        const position = toWorldPosition(rawX, rawY, rawZ);
        companyPositions.push(position);

        createPlanet({
          name: name.trim(),
          position,
          gravity: rawGravity,
          rawPosition: new THREE.Vector3(rawX, rawY, rawZ)
        });
      });

      if (companyPositions.length > 0) {
        const center = new THREE.Vector3();

        companyPositions.forEach((p) => {
          center.add(p);
        });

        center.divideScalar(companyPositions.length);

        // 初期表示：企業惑星が多いエリアを見る
        controls.target.copy(center);

        camera.position.set(
          center.x + 150,
          center.y + 110,
          center.z + 220
        );

        controls.update();
      }

      checkAndAddGalaxies(COORDINATE_UNIT_SCALE * 0.12);
    })
    .catch((error) => {
      console.error('Failed to load CSV:', error);
    });
}

loadPlanetsFromCSV('companies_002.csv');
// ======================================================
// AXIS PLANETS
// ======================================================

function createAxisPlanets() {
  createPlanet({
    name: 'Humanus',
    position: toWorldPosition(8, 2, 2),
    gravity: 0.8,
    colorOverride: '#003366',
    rawPosition: new THREE.Vector3(8, 2, 2)
  });

  const naturePosition = toWorldPosition(2, 2, 8);

  createPlanet({
    name: 'Naturis',
    position: naturePosition,
    gravity: 0.8,
    colorOverride: '#008844',
    rawPosition: new THREE.Vector3(2, 2, 8)
  });

  const ringRadiusInner = COORDINATE_UNIT_SCALE * 0.012;
  const ringRadiusOuter = COORDINATE_UNIT_SCALE * 0.014;

  const ringGeometry = new THREE.RingGeometry(ringRadiusInner, ringRadiusOuter, 64);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: '#00ff88',
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.35
  });

  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = Math.PI / 3;
  ring.position.copy(naturePosition);
  scene.add(ring);

  createPlanet({
    name: 'Economos',
    position: toWorldPosition(2, 8, 2),
    gravity: 0.8,
    colorOverride: '#ff5533',
    rawPosition: new THREE.Vector3(2, 8, 2)
  });
}

createAxisPlanets();

// ======================================================
// GALAXY CLUSTERING
// ======================================================

function addGalaxyAround(center, radius = COORDINATE_UNIT_SCALE * 0.08, count = 1000) {
  const geometry = new THREE.BufferGeometry();
  const positions = [];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * radius;

    const x = center.x + r * Math.cos(angle);
    const y = center.y + (Math.random() - 0.5) * radius * 0.12;
    const z = center.z + r * Math.sin(angle);

    positions.push(x, y, z);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0x8899ff,
    size: 1.0,
    transparent: true,
    opacity: 0.34
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);
}

function checkAndAddGalaxies(threshold = COORDINATE_UNIT_SCALE * 0.12) {
  const maxGalaxies = 6;
  let added = 0;

  for (let i = 0; i < planetMeshes.length; i++) {
    for (let j = i + 1; j < planetMeshes.length; j++) {
      if (added >= maxGalaxies) return;

      const a = planetMeshes[i].position;
      const b = planetMeshes[j].position;

      if (a.distanceTo(b) < threshold) {
        const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
        addGalaxyAround(mid);
        added += 1;
      }
    }
  }
}

// ======================================================
// RSS OBSERVATION POINT
// ======================================================

function addSpiralRSSGalaxy(center, armCount = 8, particleCount = 5600, radius = COORDINATE_UNIT_SCALE * 0.16, baseSpeed = 0.0007) {
  const positions = [];

  const a = 0.8;
  const b = 0.23;

  for (let i = 0; i < particleCount; i++) {
    const arm = i % armCount;
    const t = Math.random();
    const theta = t * 6 * Math.PI + (arm * 2 * Math.PI / armCount);
    const r = Math.min(a * Math.exp(b * theta), radius);

    const noise = (Math.random() - 0.5) * 0.7;
    const x = r * Math.cos(theta + noise);
    const y = (Math.random() - 0.5) * radius * 0.08;
    const z = r * Math.sin(theta + noise);

    positions.push(x, y, z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.9,
    transparent: true,
    opacity: 0.88,
    depthWrite: false
  });

  const points = new THREE.Points(geometry, material);

  const group = new THREE.Group();
  group.add(points);
  group.position.copy(center);
  group.rotation.x = Math.PI / 4;

  scene.add(group);

  const markerRadius = COORDINATE_UNIT_SCALE * 0.01;

  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(markerRadius, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9
    })
  );
  marker.position.copy(center);
  scene.add(marker);

  addPlanetLabel('GRSS Observation Point', center, markerRadius);

  animateCallbacks.push(() => {
    group.rotation.y += baseSpeed;
  });
}

addSpiralRSSGalaxy(toWorldPosition(5.602, 2.28, 2.812));

// ======================================================
// CLICK INFO
// ======================================================

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

window.addEventListener('pointerdown', (event) => {
  const clickedElement = event.target;

  if (
    clickedElement.closest &&
    (clickedElement.closest('#ui-layer') || clickedElement.closest('#infoPanel'))
  ) {
    return;
  }

  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(planetMeshes);

  if (intersects.length > 0) {
    const obj = intersects[0].object;

    if (obj.name) {
      showCompanyInfo(obj);
    }
  }
});

function showCompanyInfo(planet) {
  if (!planet || !infoPanel) return;

  const { name, gravity, rawPosition, radius } = planet.userData;
  const worldPosition = planet.position;

  const rawText = rawPosition
    ? `HNE: (${rawPosition.x.toFixed(2)}, ${rawPosition.y.toFixed(2)}, ${rawPosition.z.toFixed(2)})`
    : '';

  infoPanel.innerHTML = `
    <strong>${name}</strong><br>
    Gravity: ${gravity.toFixed(2)}<br>
    Radius: ${radius.toFixed(1)}<br>
    ${rawText}<br>
    World: (${worldPosition.x.toFixed(1)}, ${worldPosition.y.toFixed(1)}, ${worldPosition.z.toFixed(1)})<br>
    Coord Unit: ${COORDINATE_UNIT_SCALE}
  `;

  infoPanel.style.display = 'block';
}

// ======================================================
// HAMBURGER
// ======================================================

const hamburger = document.getElementById('hamburger');
const sideMenu = document.getElementById('side-menu');

if (hamburger && sideMenu) {
  hamburger.addEventListener('click', () => {
    sideMenu.classList.toggle('open');
  });
}

// ======================================================
// SEARCH
// ======================================================

const searchInput = document.getElementById('company-search');

if (searchInput) {
  searchInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;

    const keyword = searchInput.value.trim().toLowerCase();
    if (!keyword) return;

    const target = planetMeshes.find((planet) =>
      planet.name.toLowerCase().includes(keyword)
    );

    if (!target) {
      console.log('Company not found:', keyword);
      return;
    }

    focusOnPlanet(target);
    showCompanyInfo(target);
  });
}

function focusOnPlanet(planet) {
  const p = planet.position;
  const radius = planet.userData.radius || 10;

  camera.position.set(
    p.x + Math.max(80, radius * 4),
    p.y + Math.max(65, radius * 3),
    p.z + Math.max(120, radius * 6)
  );

  controls.target.copy(p);
  controls.update();
}

// ======================================================
// RESIZE
// ======================================================

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ======================================================
// ANIMATION
// ======================================================

function animate() {
  requestAnimationFrame(animate);

  scene.rotation.y += 0.00005;

  controls.update();

  shootingStars.forEach((star, i) => {
    star.position.add(star.velocity);

    if (star.position.length() > 4200) {
      scene.remove(star);
      shootingStars.splice(i, 1);
    }
  });

  animateCallbacks.forEach((fn) => fn());

  renderer.render(scene, camera);
}

animate();
