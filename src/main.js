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
const COORDINATE_UNIT_SCALE = 300;

// 企業群の微小な座標差を見えるようにする可視化倍率
const COMPANY_POSITION_EXPANSION = 8;


// CSV座標の中心。
// CSVが2.5中心の座標体系ならこのまま。
const HNE_CENTER = new THREE.Vector3(2.5, 2.5, 2.5);

// 重力値1.0を、座標メモリ1.0に対してどれくらいの半径にするか。
// 0.001 = 座標メモリ1.0の0.1%
// COORDINATE_UNIT_SCALE=600なら、重力1.0の半径増加 = 0.6
const GRAVITY_RADIUS_RATIO_TO_COORDINATE_UNIT = 0.0003;

// 重力0でも最低限見えるようにする視認性補正。
// 0.0003 = 座標メモリ1.0の0.03%
// COORDINATE_UNIT_SCALE=600なら、最低半径 = 0.18
const PLANET_BASE_RADIUS_RATIO_TO_COORDINATE_UNIT = 0.0001;

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

// 表示切替
const SHOW_CLUSTER_GALAXIES = false;      // 企業間の銀河クラスタ表示
const SHOW_RSS_OBSERVATION_GALAXY = true; // GRSS観測点の渦巻き表示



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
camera.position.set(20, 15, 30);

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

function addGalaxyStars(count = 2000000) {
  const geometry = new THREE.BufferGeometry();
  const positions = [];

  for (let i = 0; i < count; i++) {
    const r = Math.random() * 10000 + 100;
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
    size: 0.8,
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

// ======================================================
// SHOOTING STARS
// ======================================================

const SHOOTING_STAR_COLOR = {
  core: 'rgba(255,255,255,1)',
  glow: 'rgba(120,220,255,0.95)',
  tail: 'rgba(90,190,255,0.85)'
};

function createShootingStarHeadTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);

  // outer glow
  const glow = ctx.createRadialGradient(64, 64, 0, 64, 64, 58);
  glow.addColorStop(0.0, 'rgba(255,255,255,1)');
  glow.addColorStop(0.25, SHOOTING_STAR_COLOR.glow);
  glow.addColorStop(0.65, 'rgba(80,160,255,0.22)');
  glow.addColorStop(1.0, 'rgba(80,160,255,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(64, 64, 58, 0, Math.PI * 2);
  ctx.fill();

  // sharp diamond star
  ctx.save();
  ctx.translate(64, 64);
  ctx.rotate(Math.PI / 4);

  const starGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 28);
  starGradient.addColorStop(0.0, 'rgba(255,255,255,1)');
  starGradient.addColorStop(0.45, 'rgba(190,240,255,0.95)');
  starGradient.addColorStop(1.0, 'rgba(80,180,255,0)');

  ctx.fillStyle = starGradient;
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.lineTo(8, -8);
  ctx.lineTo(34, 0);
  ctx.lineTo(8, 8);
  ctx.lineTo(0, 34);
  ctx.lineTo(-8, 8);
  ctx.lineTo(-34, 0);
  ctx.lineTo(-8, -8);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createShootingStarTailTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // horizontal luminous tail, head on right side
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0.0, 'rgba(80,180,255,0)');
  gradient.addColorStop(0.25, 'rgba(80,180,255,0.10)');
  gradient.addColorStop(0.65, SHOOTING_STAR_COLOR.tail);
  gradient.addColorStop(0.92, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(1.0, 'rgba(255,255,255,0)');

  ctx.fillStyle = gradient;

  // tapered comet shape
  ctx.beginPath();
  ctx.moveTo(0, 48);
  ctx.bezierCurveTo(140, 18, 360, 20, 512, 44);
  ctx.bezierCurveTo(360, 76, 140, 78, 0, 48);
  ctx.closePath();
  ctx.fill();

  // inner white streak
  const inner = ctx.createLinearGradient(120, 0, 512, 0);
  inner.addColorStop(0.0, 'rgba(255,255,255,0)');
  inner.addColorStop(0.7, 'rgba(255,255,255,0.55)');
  inner.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = inner;
  ctx.beginPath();
  ctx.moveTo(90, 48);
  ctx.bezierCurveTo(230, 40, 390, 41, 512, 47);
  ctx.bezierCurveTo(390, 55, 230, 56, 90, 48);
  ctx.closePath();
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

const shootingStarHeadTexture = createShootingStarHeadTexture();
const shootingStarTailTexture = createShootingStarTailTexture();

function addShootingStar() {
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);

  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

  // カメラ前方、つまり画面内に出す
  // 近く〜遠くにランダム発生
const depth = 140 + Math.random() * 900;

// 近いほど大きく、遠いほど小さくする係数
const depthScale = THREE.MathUtils.clamp(420 / depth, 0.35, 1.6);

const spawnCenter = camera.position
  .clone()
  .add(forward.clone().multiplyScalar(depth));

const startPosition = spawnCenter
  .clone()
  .add(right.clone().multiplyScalar((Math.random() * 360 - 180) * depthScale))
  .add(up.clone().multiplyScalar((Math.random() * 180 + 40) * depthScale));  // 右上から左下 or 左上から右下に流す
  const side = Math.random() < 0.5 ? -1 : 1;

  const moveDir = right
    .clone()
    .multiplyScalar(side)
    .add(up.clone().multiplyScalar(-0.55))
    .normalize();

  const speed = 10 + Math.random() * 8;
  const velocity = moveDir.clone().multiplyScalar(speed);

  const group = new THREE.Group();
  group.position.copy(startPosition);

  // 既存animate互換
  group.velocity = velocity;
  group.userData.velocity = velocity;

  // 角度計算：カメラ平面上で尾の向きを合わせる
  const angle = Math.atan2(moveDir.dot(up), moveDir.dot(right));

  const tailLength = (120 + Math.random() * 100) * depthScale;
  const tailHeight = (1 + Math.random() * 0.5) * depthScale;

  const tailMaterial = new THREE.SpriteMaterial({
    map: shootingStarTailTexture,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    rotation: angle
  });

  const tail = new THREE.Sprite(tailMaterial);
  tail.scale.set(tailLength, tailHeight, 1);
  tail.position.copy(moveDir.clone().multiplyScalar(-tailLength * 0.42));
  group.add(tail);

  const headMaterial = new THREE.SpriteMaterial({
    map: shootingStarHeadTexture,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    rotation: angle
  });

  const head = new THREE.Sprite(headMaterial);
  head.scale.set(18, 18, 1);
  head.position.set(0, 0, 0);
  group.add(head);

  shootingStars.push(group);
  scene.add(group);
}

setInterval(() => {
  addShootingStar();

  // たまに2本流す
  if (Math.random() < 0.25) {
    addShootingStar();
  }
}, 18900);

setInterval(addShootingStar, 9800);

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
  const labelWidth = Math.max(16, Math.min(45, radius * 1.1));
  sprite.scale.set(labelWidth, labelWidth * 0.45, 0.5);

  sprite.position.copy(position).add(new THREE.Vector3(0, radius + 2, 0));
  scene.add(sprite);
}


function findDensestCompanyArea(positions) {
  // 密集地帯を判定する半径。
  // COMPANY_POSITION_EXPANSION を使っているので、少し大きめにする。
  const DENSE_RADIUS = COORDINATE_UNIT_SCALE * 0.35;

  let bestNeighbors = [];
  let bestPosition = positions[0];

  positions.forEach((candidate) => {
    const neighbors = positions.filter((p) => {
      return candidate.distanceTo(p) <= DENSE_RADIUS;
    });

    if (neighbors.length > bestNeighbors.length) {
      bestNeighbors = neighbors;
      bestPosition = candidate;
    }
  });

  if (bestNeighbors.length === 0) {
    return bestPosition.clone();
  }

  const denseCenter = new THREE.Vector3();

  bestNeighbors.forEach((p) => {
    denseCenter.add(p);
  });

  denseCenter.divideScalar(bestNeighbors.length);

  return denseCenter;
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
        const denseCenter = findDensestCompanyArea(companyPositions);

        // 初期表示：平均点ではなく、企業惑星が最も密集しているエリアを見る
        controls.target.copy(denseCenter);

        camera.position.set(
          denseCenter.x + 35,
          denseCenter.y + 25,
          denseCenter.z + 55
        );

        controls.update();
      }

      if (SHOW_CLUSTER_GALAXIES) {
        checkAndAddGalaxies(COORDINATE_UNIT_SCALE * 0.12);
      }
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

if (SHOW_RSS_OBSERVATION_GALAXY) {
  addSpiralRSSGalaxy(toWorldPosition(5.602, 2.28, 2.812));
}

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
    p.x + Math.max(20, radius * 2),
    p.y + Math.max(30, radius * 1.5),
    p.z + Math.max(50, radius * 3)
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

  scene.rotation.y += 0.000005;

  controls.update();

  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const star = shootingStars[i];
  
    star.position.add(star.userData.velocity);
    star.userData.life += 1;
  
    if (star.userData.trailMaterial) {
      const progress = star.userData.life / star.userData.maxLife;
      star.userData.trailMaterial.opacity = Math.max(0, 0.9 * (1 - progress));
    }
  
    if (star.userData.life > star.userData.maxLife) {
      scene.remove(star);
      shootingStars.splice(i, 1);
    }
  }

  animateCallbacks.forEach((fn) => fn());

  renderer.render(scene, camera);
}

animate();
