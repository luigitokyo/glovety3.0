import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

// ======================================================
// Glovety Observatory MVP+
// - ranking panel
// - observation / compass buttons
// - company compare mode
// - safer production performance
// ======================================================

const BASE_URL = import.meta.env.BASE_URL || './';
const publicAsset = (path) => `${BASE_URL}${String(path).replace(/^\/+/, '')}`;

ensureUI();

function ensureUI() {
  if (!document.getElementById('glovety-ui-style')) {
    const style = document.createElement('style');
    style.id = 'glovety-ui-style';
    style.textContent = `
      html, body { margin: 0; padding: 0; overflow: hidden; background: #02040a; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      canvas { display: block; }
      #ui-layer { position: fixed; inset: 0; pointer-events: none; z-index: 10; }
      #top-left { position: absolute; top: 24px; left: 24px; display: flex; align-items: center; gap: 16px; pointer-events: auto; }
      #hamburger { width: 42px; height: 42px; border-radius: 12px; border: 1px solid rgba(180,220,255,.25); background: rgba(6,12,24,.72); color: #eaf6ff; display: flex; align-items: center; justify-content: center; font-size: 22px; cursor: pointer; backdrop-filter: blur(14px); box-shadow: 0 0 24px rgba(80,160,255,.18); }
      #logo { height: 48px; display: flex; align-items: center; }
      .glovety-logo-img { height: 48px; width: auto; max-width: 220px; display: block; object-fit: contain; filter: drop-shadow(0 0 18px rgba(120,190,255,.35)); }
      #search-box { position: absolute; top: 24px; left: 50%; transform: translateX(-50%); width: min(420px, calc(100vw - 220px)); pointer-events: auto; }
      #company-search { width: 100%; height: 44px; border-radius: 999px; border: 1px solid rgba(180,220,255,.25); background: rgba(6,12,24,.72); color: #f4fbff; padding: 0 20px; outline: none; font-size: 14px; backdrop-filter: blur(14px); box-shadow: 0 0 30px rgba(80,160,255,.16); }
      #company-search::placeholder { color: rgba(220,240,255,.5); }
      #side-menu { position: absolute; top: 82px; left: 24px; width: 240px; padding: 18px; border-radius: 18px; border: 1px solid rgba(180,220,255,.2); background: rgba(6,12,24,.86); backdrop-filter: blur(18px); box-shadow: 0 0 36px rgba(80,160,255,.18); display: none; pointer-events: auto; }
      #side-menu.open { display: block; }
      #side-menu .menu-title { color: #fff; font-weight: 700; margin-bottom: 14px; }
      #side-menu a { display: block; color: rgba(230,246,255,.82); text-decoration: none; padding: 10px 0; border-top: 1px solid rgba(255,255,255,.06); font-size: 14px; }
      #side-menu a:hover { color: #fff; }
      #infoPanel { position: absolute; bottom: 20px; right: 20px; background: rgba(0,0,0,.62); color: white; font-family: sans-serif; padding: 14px; border-radius: 14px; display: none; min-width: 280px; max-width: 390px; z-index: 20; border: 1px solid rgba(180,220,255,.18); backdrop-filter: blur(12px); line-height: 1.55; box-shadow: 0 0 36px rgba(80,160,255,.18); }
      #infoPanel strong { font-size: 16px; }

      #top-right-controls { position: absolute; top: 24px; right: 24px; display: flex; gap: 10px; pointer-events: auto; z-index: 30; }
      .observatory-icon-button { width: 44px; height: 44px; border-radius: 999px; border: 1px solid rgba(255,255,255,.35); background: rgba(255,255,255,.16); color: #fff; font-size: 20px; cursor: pointer; backdrop-filter: blur(16px); box-shadow: 0 0 24px rgba(120,190,255,.22); transition: transform .2s ease, background .2s ease, box-shadow .2s ease; }
      .observatory-icon-button:hover { transform: translateY(-1px) scale(1.04); background: rgba(255,255,255,.26); box-shadow: 0 0 34px rgba(120,190,255,.36); }

      #ranking-panel { position: absolute; top: 84px; right: 24px; width: 270px; padding: 16px; border-radius: 20px; background: rgba(255,255,255,.78); color: #101827; border: 1px solid rgba(255,255,255,.72); box-shadow: 0 18px 60px rgba(0,0,0,.28); backdrop-filter: blur(18px); pointer-events: auto; z-index: 25; }
      #control-panel { position: absolute; top: 150px; left: 24px; width: 286px; padding: 16px; border-radius: 20px; background: rgba(255,255,255,.76); color: #101827; border: 1px solid rgba(255,255,255,.65); box-shadow: 0 18px 60px rgba(0,0,0,.26); backdrop-filter: blur(18px); pointer-events: auto; z-index: 24; }
      .panel-title { font-size: 13px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 10px; color: rgba(12,20,38,.78); }
      #ranking-list { display: flex; flex-direction: column; gap: 6px; }
      .ranking-row { width: 100%; display: grid; grid-template-columns: 28px 1fr auto; align-items: center; gap: 8px; border: 0; border-radius: 12px; padding: 8px 10px; background: rgba(255,255,255,.58); color: #101827; cursor: pointer; text-align: left; transition: background .2s ease, transform .2s ease; }
      .ranking-row:hover { background: rgba(230,244,255,.95); transform: translateX(-2px); }
      .ranking-index { font-weight: 800; color: rgba(30,64,120,.9); }
      .ranking-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 700; font-size: 13px; }
      .ranking-score { font-variant-numeric: tabular-nums; font-size: 12px; color: rgba(20,30,50,.72); }
      .compare-input { width: 100%; height: 38px; box-sizing: border-box; border-radius: 12px; border: 1px solid rgba(30,60,100,.18); background: rgba(255,255,255,.72); color: #101827; padding: 0 12px; outline: none; margin-bottom: 8px; font-size: 13px; }
      .compare-input::placeholder { color: rgba(16,24,39,.45); }
      #compare-button { width: 100%; height: 40px; border-radius: 14px; border: 0; background: linear-gradient(135deg, #173b68, #3277c6); color: white; font-weight: 800; cursor: pointer; box-shadow: 0 10px 26px rgba(40,110,190,.3); margin-top: 4px; }
      #compare-button:hover { filter: brightness(1.08); }
      #compare-result-mini { margin-top: 12px; padding: 12px; border-radius: 14px; background: rgba(7,16,30,.06); font-size: 12px; line-height: 1.55; color: rgba(16,24,39,.78); display: none; }
      .compare-mini-title { font-weight: 800; color: #101827; margin-bottom: 6px; }
      .compare-note { font-size: 11px; margin-top: 8px; color: rgba(16,24,39,.54); }

      @media (max-width: 760px) {
        #top-left { top: 16px; left: 16px; gap: 10px; }
        #hamburger { width: 38px; height: 38px; font-size: 20px; }
        .glovety-logo-img { height: 36px; max-width: 170px; }
        #search-box { top: 72px; width: calc(100vw - 32px); }
        #ranking-panel { display: none; }
        #control-panel { left: 16px; right: 16px; bottom: 18px; top: auto; width: auto; }
        #top-right-controls { top: 16px; right: 16px; }
        #infoPanel { right: 16px; left: 16px; bottom: 190px; min-width: 0; max-width: none; }
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
        <div id="logo"><img class="glovety-logo-img" src="${publicAsset('glovety-logo.png')}" alt="Glovety Observatory" /></div>
      </div>

      <div id="search-box"><input id="company-search" type="text" placeholder="Search company planet..." /></div>

      <div id="top-right-controls">
        <button id="observation-button" class="observatory-icon-button" title="Go to GRSS observation point">◎</button>
        <button id="compass-button" class="observatory-icon-button" title="Return to initial view">⌖</button>
      </div>

      <div id="ranking-panel">
        <div class="panel-title">Gravity Ranking</div>
        <div id="ranking-list"></div>
      </div>

      <div id="control-panel">
        <div class="panel-title">Compare Companies</div>
        <input id="compare-company-a" class="compare-input" type="text" placeholder="Company A" />
        <input id="compare-company-b" class="compare-input" type="text" placeholder="Company B" />
        <button id="compare-button">Compare</button>
        <div id="compare-result-mini"></div>
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
// Scale settings
// ======================================================

const COORDINATE_UNIT_SCALE = 300;
const COMPANY_POSITION_EXPANSION = 8;
const HNE_CENTER = new THREE.Vector3(2.5, 2.5, 2.5);
const GRAVITY_RADIUS_RATIO_TO_COORDINATE_UNIT = 0.0003;
const PLANET_BASE_RADIUS_RATIO_TO_COORDINATE_UNIT = 0.0001;
const GRAVITY_COLOR_REFERENCE_MAX = 7;
const PLANET_BASE_RADIUS_WORLD = COORDINATE_UNIT_SCALE * PLANET_BASE_RADIUS_RATIO_TO_COORDINATE_UNIT;
const GRAVITY_RADIUS_WORLD_SCALE = COORDINATE_UNIT_SCALE * GRAVITY_RADIUS_RATIO_TO_COORDINATE_UNIT;
const SHOW_CLUSTER_GALAXIES = false;
const SHOW_RSS_OBSERVATION_GALAXY = true;

function toWorldPosition(x, y, z) {
  const visualScale = COORDINATE_UNIT_SCALE * COMPANY_POSITION_EXPANSION;
  return new THREE.Vector3(
    (parseFloat(x) - HNE_CENTER.x) * visualScale,
    (parseFloat(y) - HNE_CENTER.y) * visualScale,
    (parseFloat(z) - HNE_CENTER.z) * visualScale
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

const GRSS_RAW_POSITION = new THREE.Vector3(5.602, 2.28, 2.812);
const GRSS_WORLD_POSITION = toWorldPosition(GRSS_RAW_POSITION.x, GRSS_RAW_POSITION.y, GRSS_RAW_POSITION.z);

// ======================================================
// Scene
// ======================================================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0c2a);
scene.fog = new THREE.Fog(new THREE.Color(0x0b0c2a), 800, 3600);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 8000);
camera.position.set(20, 15, 30);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.04;
controls.target.set(0, 0, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.42));
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.15);
directionalLight.position.set(500, 800, 650);
scene.add(directionalLight);

const animateCallbacks = [];
const planetMeshes = [];
const companyPlanetMeshes = [];
const shootingStars = [];
const compareGroup = new THREE.Group();
scene.add(compareGroup);

let activeCompareVisual = null;
let initialView = { cameraPosition: camera.position.clone(), controlsTarget: controls.target.clone() };
let cameraTween = null;
const infoPanel = document.getElementById('infoPanel');

function saveInitialView() {
  initialView = { cameraPosition: camera.position.clone(), controlsTarget: controls.target.clone() };
}

function moveCameraTo(targetCameraPosition, targetLookAt, duration = 1200) {
  cameraTween = {
    startTime: performance.now(),
    duration,
    fromCameraPosition: camera.position.clone(),
    toCameraPosition: targetCameraPosition.clone(),
    fromTarget: controls.target.clone(),
    toTarget: targetLookAt.clone()
  };
}

function updateCameraTween() {
  if (!cameraTween) return;
  const t = Math.min((performance.now() - cameraTween.startTime) / cameraTween.duration, 1);
  const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  camera.position.lerpVectors(cameraTween.fromCameraPosition, cameraTween.toCameraPosition, eased);
  controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, eased);
  if (t >= 1) cameraTween = null;
}

// ======================================================
// Sun / axes / stars
// ======================================================

addSun(new THREE.Vector3(650, 540, 900));
addCustomAxes();
addGalaxyStars();

function addSun(position) {
  const sun = new THREE.Mesh(new THREE.SphereGeometry(10, 64, 64), new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
  sun.position.copy(position);
  scene.add(sun);

  const pointLight = new THREE.PointLight(0xffcc88, 2.4, 5000, 2);
  pointLight.position.copy(position);
  scene.add(pointLight);

  const flareTexture = new THREE.TextureLoader().load('https://threejs.org/examples/textures/lensflare/lensflare0.png');
  const flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: flareTexture, color: 0xffaa00, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  flare.scale.set(80, 80, 1);
  flare.position.copy(position);
  scene.add(flare);

  const swirl = new THREE.Mesh(
    new THREE.SphereGeometry(11.5, 64, 64),
    new THREE.MeshStandardMaterial({ color: 0xffcc66, metalness: 0.8, roughness: 0.2, emissive: 0xff6600, emissiveIntensity: 0.25, opacity: 0.6, transparent: true })
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

function addCustomAxes(center = new THREE.Vector3(0, 0, 0), length = 3000) {
  const axisDefs = [
    { name: 'Human', dir: new THREE.Vector3(1, 0, 0), color: 0x5da9ff },
    { name: 'Nature', dir: new THREE.Vector3(0, 0, 1), color: 0x64ff9b },
    { name: 'Economic', dir: new THREE.Vector3(0, 1, 0), color: 0xff8d6b }
  ];

  axisDefs.forEach(({ dir, color }) => {
    const points = [center.clone().add(dir.clone().multiplyScalar(-length)), center.clone().add(dir.clone().multiplyScalar(length))];
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.45 }));
    scene.add(line);
  });

  const loader = new FontLoader();
  loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
    axisDefs.forEach(({ name, dir, color }) => {
      const textGeo = new TextGeometry(name, { font, size: 14, height: 0.1 });
      const mesh = new THREE.Mesh(textGeo, new THREE.MeshBasicMaterial({ color }));
      mesh.position.copy(center.clone().add(dir.clone().multiplyScalar(length + 80)));
      scene.add(mesh);
    });
  });
}

function addGalaxyStars(count = 200000) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = Math.random() * 10000 + 100;
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.random() * Math.PI;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  scene.add(new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, transparent: true, opacity: 0.82 })));
}

// ======================================================
// Textures / shooting stars
// ======================================================

const shootingStarHeadTexture = createRadialTexture(128, [
  [0.0, 'rgba(255,255,255,1)'],
  [0.25, 'rgba(120,220,255,.95)'],
  [0.65, 'rgba(80,160,255,.22)'],
  [1.0, 'rgba(80,160,255,0)']
]);

const compareGlowTexture = createRadialTexture(256, [
  [0.0, 'rgba(255,255,255,1)'],
  [0.25, 'rgba(120,220,255,.85)'],
  [0.62, 'rgba(70,170,255,.22)'],
  [1.0, 'rgba(70,170,255,0)']
]);

const shootingStarTailTexture = createTailTexture();

function createRadialTexture(size, stops) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.46);
  stops.forEach(([stop, color]) => gradient.addColorStop(stop, color));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createTailTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0.0, 'rgba(80,180,255,0)');
  gradient.addColorStop(0.25, 'rgba(80,180,255,.10)');
  gradient.addColorStop(0.65, 'rgba(90,190,255,.85)');
  gradient.addColorStop(0.92, 'rgba(255,255,255,.95)');
  gradient.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(0, 48);
  ctx.bezierCurveTo(140, 18, 360, 20, 512, 44);
  ctx.bezierCurveTo(360, 76, 140, 78, 0, 48);
  ctx.closePath();
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function addShootingStar() {
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  const depth = 140 + Math.random() * 900;
  const depthScale = THREE.MathUtils.clamp(420 / depth, 0.35, 1.6);
  const spawnCenter = camera.position.clone().add(forward.clone().multiplyScalar(depth));
  const startPosition = spawnCenter.clone()
    .add(right.clone().multiplyScalar((Math.random() * 360 - 180) * depthScale))
    .add(up.clone().multiplyScalar((Math.random() * 180 + 40) * depthScale));
  const side = Math.random() < 0.5 ? -1 : 1;
  const moveDir = right.clone().multiplyScalar(side).add(up.clone().multiplyScalar(-0.55)).normalize();
  const velocity = moveDir.clone().multiplyScalar(10 + Math.random() * 8);
  const group = new THREE.Group();
  group.position.copy(startPosition);
  group.userData = { velocity, life: 0, maxLife: 90 + Math.floor(Math.random() * 50) };
  const angle = Math.atan2(moveDir.dot(up), moveDir.dot(right));
  const tailLength = (120 + Math.random() * 100) * depthScale;
  const tailHeight = (1 + Math.random() * 0.5) * depthScale;
  const tail = new THREE.Sprite(new THREE.SpriteMaterial({ map: shootingStarTailTexture, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, rotation: angle }));
  tail.scale.set(tailLength, tailHeight, 1);
  tail.position.copy(moveDir.clone().multiplyScalar(-tailLength * 0.42));
  group.add(tail);
  const head = new THREE.Sprite(new THREE.SpriteMaterial({ map: shootingStarHeadTexture, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, rotation: angle }));
  head.scale.set(18, 18, 1);
  group.add(head);
  shootingStars.push(group);
  scene.add(group);
}

setInterval(() => { addShootingStar(); if (Math.random() < 0.25) addShootingStar(); }, 18900);
setInterval(addShootingStar, 9800);

// ======================================================
// Planets / CSV
// ======================================================

function createPlanet({ name, position, gravity, colorOverride, rawPosition, type = 'company' }) {
  const safeGravity = Number.isFinite(gravity) ? gravity : 0;
  const radius = radiusFromGravity(safeGravity);
  const intensity = colorIntensityFromGravity(safeGravity);
  const color = colorOverride ? new THREE.Color(colorOverride) : new THREE.Color().setHSL(0.6, 0.25 + intensity * 0.55, 0.28 + intensity * 0.35);
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 32),
    new THREE.MeshStandardMaterial({ color, metalness: 0.35, roughness: 0.55, emissive: color.clone().multiplyScalar(0.08) })
  );
  sphere.position.copy(position);
  sphere.name = name;
  sphere.userData = { name, gravity: safeGravity, rawPosition, radius, type };
  scene.add(sphere);

  const wireframe = new THREE.LineSegments(
    new THREE.EdgesGeometry(sphere.geometry),
    new THREE.LineBasicMaterial({ color: 0x88aaff, transparent: true, opacity: 0.18 })
  );
  wireframe.position.copy(position);
  scene.add(wireframe);

  planetMeshes.push(sphere);
  if (type === 'company') companyPlanetMeshes.push(sphere);
  addPlanetLabel(name, position, radius);
}

function addPlanetLabel(name, position, radius) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.font = '28px sans-serif';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(80,180,255,.9)';
  ctx.shadowBlur = 18;
  ctx.fillText(name, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  const labelWidth = Math.max(16, Math.min(45, radius * 1.1));
  sprite.scale.set(labelWidth, labelWidth * 0.45, 0.5);
  sprite.position.copy(position).add(new THREE.Vector3(0, radius + 2, 0));
  scene.add(sprite);
}

function findDensestCompanyArea(positions) {
  const denseRadius = COORDINATE_UNIT_SCALE * 0.35;
  let bestNeighbors = [];
  let bestPosition = positions[0];
  positions.forEach((candidate) => {
    const neighbors = positions.filter((p) => candidate.distanceTo(p) <= denseRadius);
    if (neighbors.length > bestNeighbors.length) {
      bestNeighbors = neighbors;
      bestPosition = candidate;
    }
  });
  if (bestNeighbors.length === 0) return bestPosition.clone();
  const denseCenter = new THREE.Vector3();
  bestNeighbors.forEach((p) => denseCenter.add(p));
  return denseCenter.divideScalar(bestNeighbors.length);
}

function loadPlanetsFromCSV(url) {
  fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`CSV not found: ${response.status} ${response.url}`);
      return response.text();
    })
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
        if (!name || !Number.isFinite(rawX) || !Number.isFinite(rawY) || !Number.isFinite(rawZ)) return;
        const position = toWorldPosition(rawX, rawY, rawZ);
        companyPositions.push(position);
        createPlanet({ name: name.trim(), position, gravity: rawGravity, rawPosition: new THREE.Vector3(rawX, rawY, rawZ), type: 'company' });
      });
      if (companyPositions.length > 0) {
        const denseCenter = findDensestCompanyArea(companyPositions);
        controls.target.copy(denseCenter);
        camera.position.set(denseCenter.x + 35, denseCenter.y + 25, denseCenter.z + 55);
        controls.update();
        saveInitialView();
      }
      renderRankingPanel();
      if (SHOW_CLUSTER_GALAXIES) checkAndAddGalaxies(COORDINATE_UNIT_SCALE * 0.12);
    })
    .catch((error) => console.error('Failed to load CSV:', error));
}

loadPlanetsFromCSV(publicAsset('companies_002.csv'));
createAxisPlanets();
if (SHOW_RSS_OBSERVATION_GALAXY) addSpiralRSSGalaxy(GRSS_WORLD_POSITION);

function createAxisPlanets() {
  createPlanet({ name: 'Humanus', position: toWorldPosition(8, 2, 2), gravity: 0.8, colorOverride: '#003366', rawPosition: new THREE.Vector3(8, 2, 2), type: 'axis' });
  const naturePosition = toWorldPosition(2, 2, 8);
  createPlanet({ name: 'Naturis', position: naturePosition, gravity: 0.8, colorOverride: '#008844', rawPosition: new THREE.Vector3(2, 2, 8), type: 'axis' });
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(COORDINATE_UNIT_SCALE * 0.012, COORDINATE_UNIT_SCALE * 0.014, 64),
    new THREE.MeshBasicMaterial({ color: '#00ff88', side: THREE.DoubleSide, transparent: true, opacity: 0.35 })
  );
  ring.rotation.x = Math.PI / 3;
  ring.position.copy(naturePosition);
  scene.add(ring);
  createPlanet({ name: 'Economos', position: toWorldPosition(2, 8, 2), gravity: 0.8, colorOverride: '#ff5533', rawPosition: new THREE.Vector3(2, 8, 2), type: 'axis' });
}

function addGalaxyAround(center, radius = COORDINATE_UNIT_SCALE * 0.08, count = 1000) {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * radius;
    positions.push(center.x + r * Math.cos(angle), center.y + (Math.random() - 0.5) * radius * 0.12, center.z + r * Math.sin(angle));
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  scene.add(new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0x8899ff, size: 1, transparent: true, opacity: 0.34 })));
}

function checkAndAddGalaxies(threshold = COORDINATE_UNIT_SCALE * 0.12) {
  let added = 0;
  for (let i = 0; i < planetMeshes.length; i++) {
    for (let j = i + 1; j < planetMeshes.length; j++) {
      if (added >= 6) return;
      const a = planetMeshes[i].position;
      const b = planetMeshes[j].position;
      if (a.distanceTo(b) < threshold) {
        addGalaxyAround(new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5));
        added += 1;
      }
    }
  }
}

function addSpiralRSSGalaxy(center, armCount = 8, particleCount = 5600, radius = COORDINATE_UNIT_SCALE * 0.16, baseSpeed = 0.0007) {
  const positions = [];
  for (let i = 0; i < particleCount; i++) {
    const arm = i % armCount;
    const t = Math.random();
    const theta = t * 6 * Math.PI + (arm * 2 * Math.PI / armCount);
    const r = Math.min(0.8 * Math.exp(0.23 * theta), radius);
    const noise = (Math.random() - 0.5) * 0.7;
    positions.push(r * Math.cos(theta + noise), (Math.random() - 0.5) * radius * 0.08, r * Math.sin(theta + noise));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.9, transparent: true, opacity: 0.88, depthWrite: false }));
  const group = new THREE.Group();
  group.add(points);
  group.position.copy(center);
  group.rotation.x = Math.PI / 4;
  scene.add(group);
  const markerRadius = COORDINATE_UNIT_SCALE * 0.01;
  const marker = new THREE.Mesh(new THREE.SphereGeometry(markerRadius, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }));
  marker.position.copy(center);
  scene.add(marker);
  addPlanetLabel('GRSS Observation Point', center, markerRadius);
  animateCallbacks.push(() => { group.rotation.y += baseSpeed; });
}

// ======================================================
// Interactions
// ======================================================

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

window.addEventListener('pointerdown', (event) => {
  const clickedElement = event.target;
  if (clickedElement.closest && (clickedElement.closest('#ui-layer') || clickedElement.closest('#infoPanel'))) return;
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(planetMeshes);
  if (intersects.length > 0 && intersects[0].object.name) showCompanyInfo(intersects[0].object);
});

function showCompanyInfo(planet) {
  if (!planet || !infoPanel) return;
  const { name, gravity, rawPosition, radius, type } = planet.userData;
  const rawText = rawPosition ? `HNE: (${rawPosition.x.toFixed(3)}, ${rawPosition.z.toFixed(3)}, ${rawPosition.y.toFixed(3)})` : '';
  infoPanel.innerHTML = `
    <strong>${name}</strong><br>
    Type: ${type || 'company'}<br>
    Gravity Score: ${gravity.toFixed(3)}<br>
    Visual Radius: ${radius.toFixed(3)}<br>
    ${rawText}<br>
    World: (${planet.position.x.toFixed(1)}, ${planet.position.y.toFixed(1)}, ${planet.position.z.toFixed(1)})
  `;
  infoPanel.style.display = 'block';
}

const hamburger = document.getElementById('hamburger');
const sideMenu = document.getElementById('side-menu');
if (hamburger && sideMenu) hamburger.addEventListener('click', () => sideMenu.classList.toggle('open'));

const searchInput = document.getElementById('company-search');
if (searchInput) {
  searchInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    const target = findCompanyPlanet(searchInput.value);
    if (!target) return console.log('Company not found:', searchInput.value);
    focusOnPlanet(target);
    showCompanyInfo(target);
  });
}

function focusOnPlanet(planet) {
  const p = planet.position;
  const radius = planet.userData.radius || 10;
  moveCameraTo(new THREE.Vector3(
    p.x + Math.max(20, radius * 2),
    p.y + Math.max(30, radius * 1.5),
    p.z + Math.max(50, radius * 3)
  ), p, 1000);
}

function renderRankingPanel(limit = 8) {
  const rankingList = document.getElementById('ranking-list');
  if (!rankingList) return;
  const ranked = companyPlanetMeshes.slice().sort((a, b) => b.userData.gravity - a.userData.gravity).slice(0, limit);
  rankingList.innerHTML = ranked.map((planet, index) => `
    <button class="ranking-row" data-company="${encodeURIComponent(planet.userData.name)}">
      <span class="ranking-index">${index + 1}</span>
      <span class="ranking-name">${planet.userData.name}</span>
      <span class="ranking-score">${planet.userData.gravity.toFixed(2)}</span>
    </button>
  `).join('');
  rankingList.querySelectorAll('.ranking-row').forEach((button) => {
    button.addEventListener('click', () => {
      const name = decodeURIComponent(button.dataset.company);
      const planet = companyPlanetMeshes.find((p) => p.userData.name === name);
      if (!planet) return;
      focusOnPlanet(planet);
      showCompanyInfo(planet);
    });
  });
}

function setupNavigationButtons() {
  const observationButton = document.getElementById('observation-button');
  const compassButton = document.getElementById('compass-button');

  if (observationButton) {
    observationButton.addEventListener('click', () => {
      const target = GRSS_WORLD_POSITION.clone();
      const cameraPosition = target.clone().add(new THREE.Vector3(COORDINATE_UNIT_SCALE * 0.35, COORDINATE_UNIT_SCALE * 0.25, COORDINATE_UNIT_SCALE * 0.45));
      moveCameraTo(cameraPosition, target, 1200);
      if (infoPanel) {
        infoPanel.innerHTML = `
          <strong>GRSS Observation Point</strong><br>
          General RSS Cloud Center<br><br>
          HNE: (${GRSS_RAW_POSITION.x.toFixed(3)}, ${GRSS_RAW_POSITION.z.toFixed(3)}, ${GRSS_RAW_POSITION.y.toFixed(3)})<br>
          This point represents the general observation center in the semantic space.
        `;
        infoPanel.style.display = 'block';
      }
    });
  }

  if (compassButton) {
    compassButton.addEventListener('click', () => moveCameraTo(initialView.cameraPosition, initialView.controlsTarget, 1200));
  }
}

function normalizeCompanyName(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function findCompanyPlanet(keyword) {
  const q = normalizeCompanyName(keyword);
  if (!q) return null;
  return companyPlanetMeshes.find((p) => normalizeCompanyName(p.userData.name) === q)
    || companyPlanetMeshes.find((p) => normalizeCompanyName(p.userData.name).includes(q));
}

function clearCompareVisual() {
  while (compareGroup.children.length > 0) {
    const child = compareGroup.children.pop();
    compareGroup.remove(child);
    if (child.geometry) child.geometry.dispose();
    if (child.material) child.material.dispose();
  }
  activeCompareVisual = null;
}

function addPlanetGlow(planet) {
  const material = new THREE.SpriteMaterial({ map: compareGlowTexture, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.position.copy(planet.position);
  const glowSize = Math.max(18, (planet.userData.radius || 1) * 16);
  sprite.scale.set(glowSize, glowSize, 1);
  compareGroup.add(sprite);
  return sprite;
}

function createCompareBeam(planetA, planetB) {
  clearCompareVisual();
  const start = planetA.position.clone();
  const end = planetB.position.clone();
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  if (length === 0) return;
  direction.normalize();
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const beamMaterial = new THREE.MeshBasicMaterial({ color: 0x8edcff, transparent: true, opacity: 0.36, blending: THREE.AdditiveBlending, depthWrite: false });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, length, 24, 1, true), beamMaterial);
  beam.position.copy(mid);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  compareGroup.add(beam);

  const trailSprites = [];
  const baseSize = Math.max(5, Math.min(16, length * 0.015));
  for (let i = 0; i < 20; i++) {
    const material = new THREE.SpriteMaterial({ map: compareGlowTexture, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.position.lerpVectors(start, end, i / 19);
    sprite.scale.set(baseSize, baseSize, 1);
    compareGroup.add(sprite);
    trailSprites.push({ sprite, phase: i * 0.42, baseSize });
  }

  activeCompareVisual = { beamMaterial, trailSprites, glows: [addPlanetGlow(planetA), addPlanetGlow(planetB)] };
}

function updateCompareVisual(time) {
  if (!activeCompareVisual) return;
  const pulse = 0.5 + 0.5 * Math.sin(time * 0.0018);
  activeCompareVisual.beamMaterial.opacity = 0.18 + pulse * 0.36;
  activeCompareVisual.trailSprites.forEach(({ sprite, phase, baseSize }) => {
    const localPulse = 0.5 + 0.5 * Math.sin(time * 0.0016 - phase);
    sprite.material.opacity = 0.12 + localPulse * 0.62;
    const s = baseSize * (0.85 + localPulse * 0.45);
    sprite.scale.set(s, s, 1);
  });
  activeCompareVisual.glows.forEach((glow, index) => {
    const glowPulse = 0.5 + 0.5 * Math.sin(time * 0.0014 + index);
    glow.material.opacity = 0.35 + glowPulse * 0.48;
  });
}

function runCompare() {
  const inputA = document.getElementById('compare-company-a');
  const inputB = document.getElementById('compare-company-b');
  const miniResult = document.getElementById('compare-result-mini');
  if (!inputA || !inputB) return;

  const planetA = findCompanyPlanet(inputA.value);
  const planetB = findCompanyPlanet(inputB.value);

  if (!planetA || !planetB) {
    if (miniResult) {
      miniResult.style.display = 'block';
      miniResult.innerHTML = `<div class="compare-mini-title">Company not found</div>Please check the company names.`;
    }
    return;
  }

  if (planetA === planetB) {
    if (miniResult) {
      miniResult.style.display = 'block';
      miniResult.innerHTML = `<div class="compare-mini-title">Same company selected</div>Please choose two different companies.`;
    }
    return;
  }

  createCompareBeam(planetA, planetB);

  const rawA = planetA.userData.rawPosition;
  const rawB = planetB.userData.rawPosition;
  const hneDistance = rawA && rawB ? rawA.distanceTo(rawB) : 0;
  const worldDistance = planetA.position.distanceTo(planetB.position);
  const gravityDiff = Math.abs(planetA.userData.gravity - planetB.userData.gravity);
  const humanDiff = rawA && rawB ? Math.abs(rawA.x - rawB.x) : 0;
  const natureDiff = rawA && rawB ? Math.abs(rawA.z - rawB.z) : 0;
  const economicDiff = rawA && rawB ? Math.abs(rawA.y - rawB.y) : 0;

  showCompareInfo({ planetA, planetB, hneDistance, worldDistance, gravityDiff, humanDiff, natureDiff, economicDiff });

  if (miniResult) {
    miniResult.style.display = 'block';
    miniResult.innerHTML = `
      <div class="compare-mini-title">${planetA.userData.name} × ${planetB.userData.name}</div>
      Distance: ${hneDistance.toFixed(3)}<br>
      Gravity Difference: ${gravityDiff.toFixed(3)}
      <div class="compare-note">A glowing semantic bridge has been activated.</div>
    `;
  }

  const center = new THREE.Vector3().addVectors(planetA.position, planetB.position).multiplyScalar(0.5);
  const distance = planetA.position.distanceTo(planetB.position);
  const cameraPosition = center.clone().add(new THREE.Vector3(
    Math.max(40, distance * 0.35),
    Math.max(45, distance * 0.22),
    Math.max(70, distance * 0.55)
  ));
  moveCameraTo(cameraPosition, center, 1200);
}

function showCompareInfo({ planetA, planetB, hneDistance, worldDistance, gravityDiff, humanDiff, natureDiff, economicDiff }) {
  if (!infoPanel) return;
  infoPanel.innerHTML = `
    <strong>Company Comparison</strong><br>
    ${planetA.userData.name} × ${planetB.userData.name}<br><br>
    Distance in HNE Space: ${hneDistance.toFixed(3)}<br>
    Visual Distance: ${worldDistance.toFixed(1)}<br>
    Gravity Difference: ${gravityDiff.toFixed(3)}<br><br>
    Human Difference: ${humanDiff.toFixed(3)}<br>
    Nature Difference: ${natureDiff.toFixed(3)}<br>
    Economic Difference: ${economicDiff.toFixed(3)}<br><br>
    ${planetA.userData.name}: g=${planetA.userData.gravity.toFixed(2)}<br>
    ${planetB.userData.name}: g=${planetB.userData.gravity.toFixed(2)}
  `;
  infoPanel.style.display = 'block';
}

function setupComparePanel() {
  const compareButton = document.getElementById('compare-button');
  const inputA = document.getElementById('compare-company-a');
  const inputB = document.getElementById('compare-company-b');
  if (compareButton) compareButton.addEventListener('click', runCompare);
  [inputA, inputB].forEach((input) => {
    if (!input) return;
    input.addEventListener('keydown', (event) => { if (event.key === 'Enter') runCompare(); });
  });
}

setupNavigationButtons();
setupComparePanel();

// ======================================================
// Resize / animation
// ======================================================

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  scene.rotation.y += 0.000005;
  updateCameraTween();
  updateCompareVisual(now);
  controls.update();

  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const star = shootingStars[i];
    star.position.add(star.userData.velocity);
    star.userData.life += 1;
    const progress = star.userData.life / star.userData.maxLife;
    star.children.forEach((child) => {
      if (child.material && typeof child.material.opacity === 'number') {
        child.material.opacity = Math.max(0, child.material.opacity * (1 - progress * 0.02));
      }
    });
    if (star.userData.life > star.userData.maxLife) {
      scene.remove(star);
      shootingStars.splice(i, 1);
      star.traverse((child) => { if (child.material) child.material.dispose(); });
    }
  }

  animateCallbacks.forEach((fn) => fn());
  renderer.render(scene, camera);
}

animate();
