import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

// ======================================================
// Glovety Observatory MVP
// - UI fallback
// - expanded space scale
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
        display: flex;
        align-items: center;
        gap: 12px;
        color: #f4fbff;
      }

      .logo-mark {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: radial-gradient(circle at 30% 25%, #ffffff, #6fd4ff 30%, #1a4fff 65%, #08122e 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        letter-spacing: -0.04em;
        box-shadow:
          0 0 24px rgba(80, 180, 255, 0.75),
          inset 0 0 12px rgba(255, 255, 255, 0.5);
      }

      .logo-title {
        font-size: 16px;
        font-weight: 700;
        letter-spacing: 0.04em;
      }

      .logo-subtitle {
        margin-top: 2px;
        font-size: 11px;
        color: rgba(220, 240, 255, 0.68);
        letter-spacing: 0.12em;
        text-transform: uppercase;
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
        min-width: 230px;
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
          <div class="logo-mark">G</div>
          <div class="logo-text">
            <div class="logo-title">Glovety Observatory</div>
            <div class="logo-subtitle">Corporate Gravity Map</div>
          </div>
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

// ---------- scale settings ----------
// 数字を大きくすると企業惑星同士がさらに離れます。
// まずは 24。もっと宇宙っぽく広げたい場合は 35 / 50 に上げる。
const SPACE_SCALE = 24;
const HNE_CENTER = new THREE.Vector3(2.5, 2.5, 2.5);

function toWorldPosition(x, y, z) {
  return new THREE.Vector3(
    (parseFloat(x) - HNE_CENTER.x) * SPACE_SCALE,
    (parseFloat(y) - HNE_CENTER.y) * SPACE_SCALE,
    (parseFloat(z) - HNE_CENTER.z) * SPACE_SCALE
  );
}

// ---------- scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0c2a);
scene.fog = new THREE.Fog(new THREE.Color(0x0b0c2a), 140, 620);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(90, 90, 150);

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
directionalLight.position.set(70, 120, 90);
scene.add(directionalLight);

const animateCallbacks = [];
const planetMeshes = [];
const shootingStars = [];

// ---------- info panel ----------
const infoPanel = document.getElementById('infoPanel');

// ---------- sun ----------
addSun(new THREE.Vector3(90, 90, 120));

function addSun(position = new THREE.Vector3(90, 90, 120)) {
  const geometry = new THREE.SphereGeometry(5, 64, 64);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffaa00
  });

  const sun = new THREE.Mesh(geometry, material);
  sun.position.copy(position);
  scene.add(sun);

  const pointLight = new THREE.PointLight(0xffcc88, 2.2, 520, 2);
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
  flare.scale.set(32, 32, 1);
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
    new THREE.SphereGeometry(5.8, 64, 64),
    swirlMaterial
  );
  swirl.position.copy(position);
  scene.add(swirl);

  animateCallbacks.push(() => {
    swirl.rotation.y += 0.006;
    swirl.rotation.x += 0.004;
    const scale = 34 + Math.sin(performance.now() * 0.002) * 3;
    flare.scale.set(scale, scale, 1);
  });
}

// ---------- axes ----------
function addCustomAxes(center = new THREE.Vector3(0, 0, 0), length = 140) {
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
        size: 3.4,
        height: 0.08
      });

      const textMaterial = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(textGeo, textMaterial);
      mesh.position.copy(center.clone().add(dir.clone().multiplyScalar(length + 8)));
      scene.add(mesh);
    });
  });
}

addCustomAxes();

// ---------- galaxy stars ----------
function addGalaxyStars(count = 5200) {
  const geometry = new THREE.BufferGeometry();
  const positions = [];

  for (let i = 0; i < count; i++) {
    const r = Math.random() * 420 + 80;
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
    size: 0.55,
    transparent: true,
    opacity: 0.85
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);
}

addGalaxyStars();

// ---------- shooting stars ----------
function addShootingStar() {
  const geometry = new THREE.SphereGeometry(0.65, 8, 8);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const star = new THREE.Mesh(geometry, material);

  star.position.set(
    Math.random() * 420 - 210,
    Math.random() * 220 - 20,
    Math.random() * 420 - 210
  );

  star.velocity = new THREE.Vector3(
    Math.random() * -1.3 - 0.4,
    Math.random() * -1.0 - 0.3,
    Math.random() * -1.1 - 0.2
  );

  shootingStars.push(star);
  scene.add(star);
}

setInterval(addShootingStar, 3200);

// ---------- supernova ----------
function triggerSupernova() {
  const particleCount = 320;
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const velocities = [];
  const origin = new THREE.Vector3(0, 0, 0);

  for (let i = 0; i < particleCount; i++) {
    positions.push(origin.x, origin.y, origin.z);

    const speed = Math.random() * 0.35 + 0.12;
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
    size: 0.8,
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
  if (Math.random() < 0.08) triggerSupernova();
}, 4000);

// ---------- planets ----------
function createPlanet({ name, position, gravity, colorOverride, rawPosition }) {
  const safeGravity = Number.isFinite(gravity) ? gravity : 0.5;

  const baseRadius = 2.2;
  const radius = baseRadius * (0.8 + safeGravity);

  const geometry = new THREE.SphereGeometry(radius, 32, 32);

  let color;
  if (colorOverride) {
    color = new THREE.Color(colorOverride);
  } else {
    const hue = 0.6;
    const saturation = 0.1 + safeGravity * 0.7;
    const lightness = 0.25 + safeGravity * 0.5;
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
    rawPosition
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
  sprite.scale.set(18, 9, 1);
  sprite.position.copy(position).add(new THREE.Vector3(0, radius + 5.5, 0));
  scene.add(sprite);
}

// ---------- CSV ----------
function loadPlanetsFromCSV(url) {
  fetch(url)
    .then((response) => response.text())
    .then((data) => {
      const lines = data.split('\n').slice(1);

      lines.forEach((line) => {
        if (!line.trim()) return;

        const [name, x, y, z, gravity] = line.split(',');
        const rawX = parseFloat(x);
        const rawY = parseFloat(y);
        const rawZ = parseFloat(z);

        createPlanet({
          name: name.trim(),
          position: toWorldPosition(rawX, rawY, rawZ),
          gravity: parseFloat(gravity),
          rawPosition: new THREE.Vector3(rawX, rawY, rawZ)
        });
      });

      checkAndAddGalaxies(24);
    })
    .catch((error) => {
      console.error('Failed to load CSV:', error);
    });
}

loadPlanetsFromCSV('companies_002.csv');

// ---------- axis planets ----------
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

  const ringGeometry = new THREE.RingGeometry(5.8, 6.3, 64);
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

// ---------- galaxy clustering ----------
function addGalaxyAround(center, radius = 14, count = 1000) {
  const geometry = new THREE.BufferGeometry();
  const positions = [];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * radius;

    const x = center.x + r * Math.cos(angle);
    const y = center.y + (Math.random() - 0.5) * 2.2;
    const z = center.z + r * Math.sin(angle);

    positions.push(x, y, z);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0x8899ff,
    size: 0.8,
    transparent: true,
    opacity: 0.34
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);
}

function checkAndAddGalaxies(threshold = 24) {
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

// ---------- RSS observation point / spiral galaxy ----------
function addSpiralRSSGalaxy(center, armCount = 8, particleCount = 5600, radius = 28, baseSpeed = 0.0007) {
  const positions = [];

  const a = 0.3;
  const b = 0.23;

  for (let i = 0; i < particleCount; i++) {
    const arm = i % armCount;
    const t = Math.random();
    const theta = t * 6 * Math.PI + (arm * 2 * Math.PI / armCount);
    const r = Math.min(a * Math.exp(b * theta), radius);

    const noise = (Math.random() - 0.5) * 0.7;
    const x = r * Math.cos(theta + noise);
    const y = (Math.random() - 0.5) * 2.2;
    const z = r * Math.sin(theta + noise);

    positions.push(x, y, z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.22,
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

  // 観測点の中心マーカー
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9
    })
  );
  marker.position.copy(center);
  scene.add(marker);

  addPlanetLabel('GRSS Observation Point', center, 2.2);

  animateCallbacks.push(() => {
    group.rotation.y += baseSpeed;
  });
}

addSpiralRSSGalaxy(toWorldPosition(5.602, 2.28, 2.812));

// ---------- click info ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

window.addEventListener('pointerdown', (event) => {
  const clickedElement = event.target;

  // UIクリック時は3Dクリック判定しない
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

  const { name, gravity, rawPosition } = planet.userData;
  const worldPosition = planet.position;

  const rawText = rawPosition
    ? `HNE: (${rawPosition.x.toFixed(2)}, ${rawPosition.y.toFixed(2)}, ${rawPosition.z.toFixed(2)})`
    : '';

  infoPanel.innerHTML = `
    <strong>${name}</strong><br>
    Gravity: ${gravity.toFixed(2)}<br>
    ${rawText}<br>
    World: (${worldPosition.x.toFixed(1)}, ${worldPosition.y.toFixed(1)}, ${worldPosition.z.toFixed(1)})
  `;

  infoPanel.style.display = 'block';
}

// ---------- hamburger ----------
const hamburger = document.getElementById('hamburger');
const sideMenu = document.getElementById('side-menu');

if (hamburger && sideMenu) {
  hamburger.addEventListener('click', () => {
    sideMenu.classList.toggle('open');
  });
}

// ---------- search ----------
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

  camera.position.set(
    p.x + 28,
    p.y + 24,
    p.z + 42
  );

  controls.target.copy(p);
  controls.update();
}

// ---------- resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- animation ----------
function animate() {
  requestAnimationFrame(animate);

  scene.rotation.y += 0.00045;

  controls.update();

  shootingStars.forEach((star, i) => {
    star.position.add(star.velocity);

    if (star.position.length() > 520) {
      scene.remove(star);
      shootingStars.splice(i, 1);
    }
  });

  animateCallbacks.forEach((fn) => fn());

  renderer.render(scene, camera);
}

animate();
