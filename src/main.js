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

// Ticker speed: smaller number = faster. Recommended: 24.
const TICKER_SPEED_SECONDS = 24;

// Attention signal layer. These are display/update intervals, not external API polling intervals.
const ATTENTION_SCAN_INTERVAL_MS = 10000;
const SNS_PARTICLE_MAX_AGE_MS = 180000;
const NEWS_PARTICLE_MAX_AGE_MS = 55000;
const FLOATING_CAPTION_INTERVAL_MS = 4500;
const MAX_SIGNAL_PARTICLES = 700;

ensureUI();

function ensureUI() {
  // StackBlitz / HMR 対策：古いUIを必ず消してから再生成する
  document.getElementById('glovety-ui-style')?.remove();
  document.getElementById('ui-layer')?.remove();
  document.getElementById('infoPanel')?.remove();
  if (!document.getElementById('glovety-ui-style')) {
    const style = document.createElement('style');
    style.id = 'glovety-ui-style';
    style.textContent = `
      html, body { margin: 0; padding: 0; overflow: hidden; background: #02040a; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      canvas { display: block; }
      #ui-layer { position: fixed; inset: 0; pointer-events: none; z-index: 10; }
      #top-left { position: absolute; top: 24px; left: 24px; display: flex; align-items: center; gap: 16px; pointer-events: auto; }
      #hamburger { width: 42px; height: 42px; border-radius: 2px; border: 1px solid rgba(180,220,255,.25); background: rgba(6,12,24,.72); color: #eaf6ff; display: flex; align-items: center; justify-content: center; font-size: 22px; cursor: pointer; backdrop-filter: blur(14px); box-shadow: 0 0 24px rgba(80,160,255,.18); }
      #logo { height: 48px; display: flex; align-items: center; }
      .glovety-logo-img { height: 48px; width: auto; max-width: 220px; display: block; object-fit: contain; filter: drop-shadow(0 0 18px rgba(120,190,255,.35)); }
      #search-box { position: absolute; top: 24px; left: 50%; transform: translateX(-50%); width: min(420px, calc(100vw - 220px)); pointer-events: auto; }
      #company-search { width: 100%; height: 44px; border-radius: 2px; border: 1px solid rgba(180,220,255,.25); background: rgba(6,12,24,.72); color: #f4fbff; padding: 0 20px; outline: none; font-size: 14px; backdrop-filter: blur(14px); box-shadow: 0 0 30px rgba(80,160,255,.16); }
      #company-search::placeholder { color: rgba(220,240,255,.5); }
      #side-menu { position: absolute; top: 82px; left: 24px; width: 240px; padding: 18px; border-radius: 2px; border: 1px solid rgba(180,220,255,.2); background: rgba(6,12,24,.86); backdrop-filter: blur(18px); box-shadow: 0 0 36px rgba(80,160,255,.18); display: none; pointer-events: auto; }
      #side-menu.open { display: block; }
      #side-menu .menu-title { color: #fff; font-weight: 700; margin-bottom: 14px; }
      #side-menu a { display: block; color: rgba(230,246,255,.82); text-decoration: none; padding: 10px 0; border-top: 1px solid rgba(255,255,255,.06); font-size: 14px; }
      #side-menu a:hover { color: #fff; }
      #infoPanel { position: absolute; bottom: 74px; left: 24px; right: auto; background: rgba(0,0,0,.68); color: white; font-family: sans-serif; padding: 16px; border-radius: 2px; display: none; min-width: 300px; max-width: 410px; z-index: 32; border: 1px solid rgba(180,220,255,.2); backdrop-filter: blur(14px); line-height: 1.55; box-shadow: 0 0 42px rgba(80,160,255,.2); }
      .company-detail-title { font-size: 18px; font-weight: 850; letter-spacing: .02em; margin-bottom: 4px; }
.company-detail-subtitle { color: rgba(230,246,255,.68); font-size: 12px; margin-bottom: 14px; }
.company-score-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 10px 0; border-top: 1px solid rgba(255,255,255,.08); border-bottom: 1px solid rgba(255,255,255,.08); margin-bottom: 12px; }
.company-score-label { color: rgba(230,246,255,.72); font-size: 12px; }
.company-score-value { font-size: 26px; font-weight: 900; color: #ffffff; text-shadow: 0 0 18px rgba(120,220,255,.62); }
.hne-bars { display: flex; flex-direction: column; gap: 9px; margin: 12px 0 14px; }
.hne-bar-row { display: grid; grid-template-columns: 72px 1fr 52px; align-items: center; gap: 9px; font-size: 12px; }
.hne-bar-label { color: rgba(230,246,255,.76); font-weight: 700; }
.hne-bar-track { height: 8px; border-radius: 2px; background: rgba(255,255,255,.12); overflow: hidden; box-shadow: inset 0 0 8px rgba(0,0,0,.26); }
.hne-bar-fill { height: 100%; border-radius: 2px; box-shadow: 0 0 14px rgba(120,220,255,.44); }
.hne-human { background: linear-gradient(90deg, rgba(93,169,255,.55), rgba(93,169,255,1)); }
.hne-nature { background: linear-gradient(90deg, rgba(100,255,155,.5), rgba(100,255,155,1)); }
.hne-economic { background: linear-gradient(90deg, rgba(255,141,107,.5), rgba(255,141,107,1)); }
.hne-bar-value { text-align: right; color: rgba(230,246,255,.72); font-variant-numeric: tabular-nums; }
.company-interpretation { margin-top: 10px; padding: 12px; border-radius: 2px; background: rgba(255,255,255,.07); color: rgba(236,248,255,.86); font-size: 12px; line-height: 1.55; }
.company-meta { margin-top: 10px; color: rgba(230,246,255,.52); font-size: 11px; }
.info-panel-close { position: absolute; top: 8px; right: 10px; width: 24px; height: 24px; border: 1px solid rgba(255,255,255,.28); background: rgba(255,255,255,.12); color: rgba(255,255,255,.86); cursor: pointer; font-size: 16px; line-height: 20px; border-radius: 1px; }
.info-panel-close:hover { background: rgba(255,255,255,.24); color: #fff; }
.compare-clear-button { margin-top: 12px; width: 100%; height: 34px; border: 1px solid rgba(255,255,255,.32); background: rgba(255,255,255,.12); color: rgba(255,255,255,.92); cursor: pointer; border-radius: 1px; font-weight: 800; }
.compare-clear-button:hover { background: rgba(255,255,255,.22); }

/* Bottom ticker */
#gravity-ticker { position: absolute; left: 24px; right: 24px; bottom: 18px; height: 40px; display: flex; align-items: center; gap: 10px; pointer-events: none; z-index: 31; }
#gravity-ticker-label { flex: 0 0 auto; height: 30px; padding: 0 12px; border-radius: 2px; display: flex; align-items: center; background: rgba(255,255,255,.78); color: #101827; font-size: 11px; font-weight: 900; letter-spacing: .08em; border: 1px solid rgba(255,255,255,.6); box-shadow: 0 0 24px rgba(120,190,255,.16); }
#gravity-ticker-window { flex: 1; height: 34px; overflow: hidden; border-radius: 2px; border: 1px solid rgba(255,255,255,.58); background: rgba(255,255,255,.72); backdrop-filter: blur(14px); box-shadow: 0 0 30px rgba(80,160,255,.16); }
#gravity-ticker-track { height: 34px; display: flex; align-items: center; width: max-content; white-space: nowrap; will-change: transform; animation: tickerMoveContinuous ${TICKER_SPEED_SECONDS}s linear infinite; }
.ticker-item { flex: 0 0 auto; padding: 0 30px; color: rgba(10,18,32,.92); font-size: 13px; line-height: 34px; font-weight: 650; letter-spacing: .01em; }
.ticker-separator { color: rgba(30,64,120,.6); margin-left: 6px; }
@keyframes tickerMoveContinuous { from { transform: translateX(0); } to { transform: translateX(-50%); } }

/* Observation log */
#observation-log { position: absolute; top: 84px; left: 24px; width: 306px; box-sizing: border-box; padding: 12px; border-radius: 2px; background: rgba(6,12,24,.62); color: rgba(235,248,255,.9); border: 1px solid rgba(180,220,255,.18); backdrop-filter: blur(14px); box-shadow: 0 0 30px rgba(80,160,255,.14); pointer-events: none; z-index: 21; }
#observation-log .panel-title { color: rgba(235,248,255,.72); margin-bottom: 8px; }
#observation-log-list { display: flex; flex-direction: column; gap: 5px; max-height: 146px; overflow: hidden; }
.observation-log-row { font-size: 11px; line-height: 1.35; color: rgba(235,248,255,.78); border-top: 1px solid rgba(255,255,255,.06); padding-top: 5px; }
.observation-log-time { color: rgba(120,220,255,.78); font-variant-numeric: tabular-nums; margin-right: 4px; }

/* Signal tooltip / floating captions */
#signal-tooltip { position: fixed; display: none; max-width: 300px; padding: 10px 12px; border-radius: 2px; background: rgba(255,255,255,.88); color: #101827; border: 1px solid rgba(255,255,255,.72); backdrop-filter: blur(14px); box-shadow: 0 18px 48px rgba(0,0,0,.28); pointer-events: none; z-index: 80; font-size: 12px; line-height: 1.45; }
.signal-tooltip-kicker { font-size: 10px; letter-spacing: .08em; text-transform: uppercase; font-weight: 900; color: rgba(30,64,120,.86); margin-bottom: 4px; }
.signal-tooltip-title { font-size: 13px; font-weight: 850; color: #101827; margin-bottom: 4px; }
.signal-tooltip-meta { color: rgba(16,24,39,.62); font-size: 11px; margin-top: 6px; }
.signal-tooltip-hint { color: rgba(30,64,120,.74); font-size: 11px; margin-top: 6px; font-weight: 800; }
.floating-signal-caption { position: fixed; max-width: 280px; padding: 7px 10px; border-radius: 2px; background: rgba(255,255,255,.84); color: rgba(10,18,32,.9); border: 1px solid rgba(255,255,255,.64); box-shadow: 0 12px 36px rgba(0,0,0,.26); pointer-events: none; z-index: 65; font-size: 12px; font-weight: 750; line-height: 1.35; text-shadow: none; animation: signalCaptionFloat 2.8s ease-out forwards; }
@keyframes signalCaptionFloat { 0% { transform: translate(-50%, 0); opacity: 0; } 12% { opacity: 1; } 78% { opacity: .95; } 100% { transform: translate(-50%, -28px); opacity: 0; } }

      #infoPanel strong { font-size: 16px; }

      #top-right-controls { position: absolute; top: 24px; right: 24px; display: flex; gap: 10px; pointer-events: auto; z-index: 30; }
      .observatory-icon-button { width: 44px; height: 44px; border-radius: 2px; border: 1px solid rgba(255,255,255,.35); background: rgba(255,255,255,.16); color: #fff; font-size: 20px; cursor: pointer; backdrop-filter: blur(16px); box-shadow: 0 0 24px rgba(120,190,255,.22); transition: transform .2s ease, background .2s ease, box-shadow .2s ease; }
      .observatory-icon-button:hover { transform: translateY(-1px) scale(1.04); background: rgba(255,255,255,.26); box-shadow: 0 0 34px rgba(120,190,255,.36); }

      #ranking-panel { position: absolute; top: 84px; right: 24px; width: 286px; box-sizing: border-box; padding: 16px; border-radius: 2px; background: rgba(255,255,255,.78); color: #101827; border: 1px solid rgba(255,255,255,.72); box-shadow: 0 18px 60px rgba(0,0,0,.28); backdrop-filter: blur(18px); pointer-events: auto; z-index: 25; }
      #control-panel { position: absolute; top: 470px; right: 24px; width: 286px; box-sizing: border-box; padding: 16px; border-radius: 2px; background: rgba(255,255,255,.76); color: #101827; border: 1px solid rgba(255,255,255,.65); box-shadow: 0 18px 60px rgba(0,0,0,.26); backdrop-filter: blur(18px); pointer-events: auto; z-index: 24; }
      .panel-title { font-size: 13px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 10px; color: rgba(12,20,38,.78); }
      #ranking-list { display: flex; flex-direction: column; gap: 6px; }
      .ranking-row { width: 100%; box-sizing: border-box; display: grid; grid-template-columns: 28px 1fr auto; align-items: center; gap: 8px; border: 0; border-radius: 2px; padding: 8px 10px; background: rgba(255,255,255,.58); color: #101827; cursor: pointer; text-align: left; transition: background .2s ease, transform .2s ease; }
      .ranking-row:hover { background: rgba(230,244,255,.95); transform: translateX(-2px); }
      .ranking-index { font-weight: 800; color: rgba(30,64,120,.9); }
      .ranking-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 700; font-size: 13px; }
      .ranking-score { font-variant-numeric: tabular-nums; font-size: 12px; color: rgba(20,30,50,.72); }
      .compare-input { width: 100%; height: 38px; box-sizing: border-box; border-radius: 2px; border: 1px solid rgba(30,60,100,.18); background: rgba(255,255,255,.72); color: #101827; padding: 0 12px; outline: none; margin-bottom: 8px; font-size: 13px; }
      .compare-input::placeholder { color: rgba(16,24,39,.45); }
      #compare-button { width: 100%; height: 40px; border-radius: 2px; border: 0; background: linear-gradient(135deg, #173b68, #3277c6); color: white; font-weight: 800; cursor: pointer; box-shadow: 0 10px 26px rgba(40,110,190,.3); margin-top: 4px; }
      #compare-button:hover { filter: brightness(1.08); }
      #compare-result-mini { margin-top: 12px; padding: 12px; border-radius: 2px; background: rgba(7,16,30,.06); font-size: 12px; line-height: 1.55; color: rgba(16,24,39,.78); display: none; }
      .compare-mini-title { font-weight: 800; color: #101827; margin-bottom: 6px; }
      .compare-note { font-size: 11px; margin-top: 8px; color: rgba(16,24,39,.54); }

      @media (max-width: 760px) {
        #top-left { top: 16px; left: 16px; gap: 10px; }
        #hamburger { width: 38px; height: 38px; font-size: 20px; }
        .glovety-logo-img { height: 36px; max-width: 170px; }
        #search-box { top: 72px; width: calc(100vw - 32px); }
        #ranking-panel { display: none; }
        #observation-log { display: none; }
        #control-panel { left: 16px; right: 16px; bottom: 18px; top: auto; width: auto; }
        #top-right-controls { top: 16px; right: 16px; }
        #infoPanel { right: 16px; left: 16px; bottom: 76px; min-width: 0; max-width: none; }
        #gravity-ticker { left: 12px; right: 12px; bottom: 12px; }
        #gravity-ticker-label { display: none; }
        .ticker-item { font-size: 12px; }
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

      <div id="observation-log">
        <div class="panel-title">Observation Log</div>
        <div id="observation-log-list"></div>
      </div>

      <div id="signal-tooltip"></div>

      <div id="side-menu">
        <div class="menu-title">Glovety Observatory</div>
        <a href="/">Gravity Map</a>
        <a href="#">Analytics</a>
        <a href="#">Theory</a>
        <a href="https://note.com/" target="_blank">note</a>
        <a href="#">Contact</a>
      </div>
      <div id="gravity-ticker">
        <div id="gravity-ticker-label">OBSERVATORY FEED</div>
        <div id="gravity-ticker-window">
          <div id="gravity-ticker-track">
            <span class="ticker-item">Initializing Glovety Observatory...</span>
            <span class="ticker-item">Loading semantic gravity field...</span>
          </div>
        </div>
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
const signalParticles = [];
const compareGroup = new THREE.Group();
scene.add(compareGroup);

let activeCompareVisual = null;
let gravityTickerTimer = null;
let attentionScanTimer = null;
let floatingCaptionTimer = null;
let initialView = { cameraPosition: camera.position.clone(), controlsTarget: controls.target.clone() };
let cameraTween = null;
const infoPanel = document.getElementById('infoPanel');

if (infoPanel) {
  infoPanel.addEventListener('click', (event) => {
    if (event.target.closest('.info-panel-close')) {
      infoPanel.style.display = 'none';
      return;
    }

    if (event.target.closest('#clear-compare-button')) {
      clearCompareVisual();

      const miniResult = document.getElementById('compare-result-mini');
      if (miniResult) {
        miniResult.style.display = 'none';
        miniResult.innerHTML = '';
      }

      infoPanel.style.display = 'none';
    }
  });
}

function setInfoPanelContent(html) {
  if (!infoPanel) return;

  infoPanel.innerHTML = `
    <button class="info-panel-close" type="button" aria-label="Close">×</button>
    ${html}
  `;

  infoPanel.style.display = 'block';
}

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

const signalParticleTexture = createRadialTexture(128, [
  [0.0, 'rgba(255,255,255,1)'],
  [0.24, 'rgba(190,230,255,.92)'],
  [0.62, 'rgba(120,180,255,.24)'],
  [1.0, 'rgba(120,180,255,0)']
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
      startGravityTicker();
      startAttentionSignalLayer();
      if (SHOW_CLUSTER_GALAXIES) checkAndAddGalaxies(COORDINATE_UNIT_SCALE * 0.12);
    })
    .catch((error) => console.error('Failed to load CSV:', error));
}

function startGravityTicker() {
  if (gravityTickerTimer) {
    clearInterval(gravityTickerTimer);
    gravityTickerTimer = null;
  }

  updateGravityTickerMessage();

  // The ticker itself is a continuous CSS marquee.
  // We only refresh the content occasionally, so it never stops after one pass.
  gravityTickerTimer = setInterval(() => {
    updateGravityTickerMessage();
  }, TICKER_SPEED_SECONDS * 1000);
}

function updateGravityTickerMessage() {
  const track = document.getElementById('gravity-ticker-track');
  if (!track || companyPlanetMeshes.length === 0) return;

  const messages = [];

  for (let i = 0; i < 12; i++) {
    messages.push(generateGravityMessage());
  }

  const renderMessages = (list) => list.map((message) => `
    <span class="ticker-item">${escapeHTML(message)} <span class="ticker-separator">◆</span></span>
  `).join('');

  // Duplicate the same message sequence twice.
  // The CSS translates exactly -50%, so the loop connects seamlessly.
  track.innerHTML = renderMessages(messages) + renderMessages(messages);

  track.style.animation = 'none';
  void track.offsetWidth;
  track.style.animation = `tickerMoveContinuous ${TICKER_SPEED_SECONDS}s linear infinite`;
}

function escapeHTML(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function generateGravityMessage() {
  const company = pickRandom(companyPlanetMeshes);
  const data = company.userData;
  const raw = data.rawPosition;

  if (!raw) {
    return `Observation update: ${data.name} has entered the Glovety field.`;
  }

  const h = raw.x;
  const n = raw.z;
  const e = raw.y;
  const g = data.gravity;

  const dominant = getDominantAxis(h, n, e);
  const gravityClass = getGravityClass(g);
  const rank = getGravityRank(company);
  const nearest = findNearestCompany(company);

  const templates = [
    () => `Observation update: ${data.name}'s current gravity is ${g.toFixed(3)}, classified as ${gravityClass}.`,
    () => `HNE scan: ${data.name} is leaning toward the ${dominant.key} axis with a score of ${dominant.value.toFixed(3)}.`,
    () => `Gravity ranking: ${data.name} is currently ranked #${rank} among observed company planets.`,
    () => `Semantic field alert: ${data.name} shows a ${dominant.key}-dominant profile within the HNE space.`,
    () => nearest
      ? `Proximity signal: ${data.name} is semantically closest to ${nearest.userData.name}, with distance ${data.position.distanceTo(nearest.position).toFixed(1)} in visual space.`
      : `Proximity signal: ${data.name} is isolated in the current observation window.`,
    () => `Glovety feed: ${data.name} combines H=${h.toFixed(2)}, N=${n.toFixed(2)}, E=${e.toFixed(2)} with gravity ${g.toFixed(2)}.`
  ];

  return pickRandom(templates)();
}

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getGravityRank(targetPlanet) {
  const ranked = companyPlanetMeshes
    .slice()
    .sort((a, b) => b.userData.gravity - a.userData.gravity);

  const index = ranked.findIndex((p) => p === targetPlanet);
  return index >= 0 ? index + 1 : '-';
}

function findNearestCompany(targetPlanet) {
  let nearest = null;
  let nearestDistance = Infinity;

  companyPlanetMeshes.forEach((planet) => {
    if (planet === targetPlanet) return;

    const d = targetPlanet.position.distanceTo(planet.position);

    if (d < nearestDistance) {
      nearestDistance = d;
      nearest = planet;
    }
  });

  return nearest;
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
// Attention Signal Layer: SNS orbit + News curl particles
// ======================================================

const SIGNAL_TOPIC_LIBRARY = [
  { label: 'AI strategy', summary: 'Public conversation is clustering around AI strategy and product roadmap.', keywords: ['AI', 'roadmap', 'platform'] },
  { label: 'Earnings outlook', summary: 'Attention is focused on earnings, guidance and margin expectations.', keywords: ['earnings', 'guidance', 'margin'] },
  { label: 'Customer experience', summary: 'Discussion is forming around customer experience, pricing and service quality.', keywords: ['customers', 'pricing', 'service'] },
  { label: 'Supply chain shift', summary: 'Signals point to logistics, automation and supplier network changes.', keywords: ['supply chain', 'automation', 'logistics'] },
  { label: 'Sustainability signal', summary: 'Recent attention is related to climate, circularity and environmental commitments.', keywords: ['climate', 'sustainability', 'emissions'] },
  { label: 'Labor and culture', summary: 'Conversation is clustering around employment, culture and workplace conditions.', keywords: ['labor', 'workers', 'culture'] },
  { label: 'Product momentum', summary: 'Signals indicate rising discussion around product launches and category momentum.', keywords: ['product', 'launch', 'demand'] }
];

function startAttentionSignalLayer() {
  if (attentionScanTimer) clearInterval(attentionScanTimer);
  if (floatingCaptionTimer) clearInterval(floatingCaptionTimer);

  performAttentionScan();

  attentionScanTimer = setInterval(() => {
    performAttentionScan();
  }, ATTENTION_SCAN_INTERVAL_MS);

  floatingCaptionTimer = setInterval(() => {
    spawnRandomFloatingCaption();
  }, FLOATING_CAPTION_INTERVAL_MS);
}

function performAttentionScan() {
  const candidates = companyPlanetMeshes.filter((planet) => planet.userData.type === 'company');
  if (candidates.length === 0) return;

  const planet = pickRandom(candidates);
  const signal = buildMockSignalForPlanet(planet);

  spawnSNSOrbitParticles(planet, signal.snsItems);
  spawnNewsCurlParticles(planet, signal.newsItems);
  enforceSignalParticleLimit();

  addObservationLog(`${planet.userData.name} signal scan: ${signal.snsItems.length} SNS / ${signal.newsItems.length} News particles released.`);
}

function buildMockSignalForPlanet(planet) {
  const name = planet.userData.name;
  const gravity = planet.userData.gravity || 0;

  const snsCount = THREE.MathUtils.clamp(Math.round(3 + gravity * 1.2 + Math.random() * 5), 3, 18);
  const newsCount = THREE.MathUtils.clamp(Math.round(1 + gravity * 0.35 + Math.random() * 2), 1, 6);

  const snsItems = Array.from({ length: snsCount }, (_, index) => {
    const topic = pickRandom(SIGNAL_TOPIC_LIBRARY);
    return {
      kind: 'sns',
      title: `${topic.label} discussion`,
      topicLabel: topic.label,
      summary: topic.summary,
      source: 'SNS Signal',
      publishedAt: `${Math.max(1, Math.round(Math.random() * 58))}m ago`,
      url: `https://x.com/search?q=${encodeURIComponent(`${name} ${topic.keywords[0]}`)}&src=typed_query`,
      weight: 1 + Math.random(),
      index
    };
  });

  const newsItems = Array.from({ length: newsCount }, (_, index) => {
    const topic = pickRandom(SIGNAL_TOPIC_LIBRARY);
    return {
      kind: 'news',
      title: `${topic.label} coverage`,
      topicLabel: topic.label,
      summary: topic.summary,
      source: 'News Signal',
      publishedAt: `${Math.max(1, Math.round(Math.random() * 24))}h ago`,
      url: `https://www.google.com/search?tbm=nws&q=${encodeURIComponent(`${name} ${topic.keywords[0]}`)}`,
      weight: 1.4 + Math.random() * 1.2,
      index
    };
  });

  return { snsItems, newsItems };
}

function spawnSNSOrbitParticles(planet, items) {
  items.forEach((item) => {
    const radius = planet.userData.radius || 1;
    const orbitRadius = Math.max(14, radius * (16 + Math.random() * 18));
    const material = new THREE.SpriteMaterial({
      map: signalParticleTexture,
      color: new THREE.Color(0x94d7ff),
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const particle = new THREE.Sprite(material);
    particle.scale.set(4.2, 4.2, 1);
    particle.position.copy(planet.position);
    particle.userData = {
      isSignalParticle: true,
      kind: 'sns',
      mode: 'orbit',
      targetPlanet: planet,
      bornAt: performance.now(),
      maxAge: SNS_PARTICLE_MAX_AGE_MS * (0.75 + Math.random() * 0.5),
      fadeInMs: 1600,
      orbitRadius,
      orbitSpeed: 0.0035 + Math.random() * 0.006,
      orbitAngle: Math.random() * Math.PI * 2,
      orbitTiltX: Math.random() * Math.PI,
      orbitTiltZ: Math.random() * Math.PI,
      phase: Math.random() * Math.PI * 2,
      baseOpacity: 0.44 + Math.random() * 0.34,
      url: item.url,
      title: item.title,
      topicLabel: item.topicLabel,
      summary: item.summary,
      source: item.source,
      publishedAt: item.publishedAt,
      createdOrder: performance.now() + Math.random()
    };

    scene.add(particle);
    signalParticles.push(particle);
  });
}

function spawnNewsCurlParticles(planet, items) {
  items.forEach((item) => {
    const target = planet.position.clone();
    const orbitRadius = Math.max(18, (planet.userData.radius || 1) * (22 + Math.random() * 18));
    const startDirection = randomUnitVector();
    const startDistance = 260 + Math.random() * 420;
    const startPosition = target.clone().add(startDirection.multiplyScalar(startDistance));
    const tangent = randomUnitVector().cross(startDirection).normalize();

    const material = new THREE.SpriteMaterial({
      map: signalParticleTexture,
      color: new THREE.Color(0xffffff),
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const particle = new THREE.Sprite(material);
    particle.scale.set(6.5, 6.5, 1);
    particle.position.copy(startPosition);
    particle.userData = {
      isSignalParticle: true,
      kind: 'news',
      mode: 'incoming',
      targetPlanet: planet,
      bornAt: performance.now(),
      maxAge: NEWS_PARTICLE_MAX_AGE_MS * (0.82 + Math.random() * 0.36),
      startPosition,
      startDirection,
      tangent,
      orbitRadius,
      orbitAngle: Math.random() * Math.PI * 2,
      curlTurns: 1.05 + Math.random() * 0.65,
      phase: Math.random() * Math.PI * 2,
      baseOpacity: 0.72 + Math.random() * 0.24,
      hasCaptioned: false,
      url: item.url,
      title: item.title,
      topicLabel: item.topicLabel,
      summary: item.summary,
      source: item.source,
      publishedAt: item.publishedAt,
      createdOrder: performance.now() + Math.random()
    };

    scene.add(particle);
    signalParticles.push(particle);
  });
}

function updateSignalParticles(now) {
  for (let i = signalParticles.length - 1; i >= 0; i--) {
    const particle = signalParticles[i];
    const data = particle.userData;
    const age = now - data.bornAt;
    const progress = THREE.MathUtils.clamp(age / data.maxAge, 0, 1);

    if (progress >= 1) {
      removeSignalParticleAtIndex(i);
      continue;
    }

    if (data.kind === 'sns') {
      updateSNSOrbitParticle(particle, data, age, progress);
    } else if (data.kind === 'news') {
      updateNewsCurlParticle(particle, data, age, progress);
    }
  }
}

function updateSNSOrbitParticle(particle, data, age, progress) {
  const planet = data.targetPlanet;
  if (!planet) return;

  data.orbitAngle += data.orbitSpeed;
  const x = Math.cos(data.orbitAngle) * data.orbitRadius;
  const z = Math.sin(data.orbitAngle) * data.orbitRadius;
  const y = Math.sin(data.orbitAngle + data.phase) * data.orbitRadius * 0.26;

  const offset = new THREE.Vector3(x, y, z);
  offset.applyAxisAngle(new THREE.Vector3(1, 0, 0), data.orbitTiltX);
  offset.applyAxisAngle(new THREE.Vector3(0, 0, 1), data.orbitTiltZ);

  particle.position.copy(planet.position).add(offset);

  const fadeIn = THREE.MathUtils.clamp(age / data.fadeInMs, 0, 1);
  const fadeOut = progress > 0.72 ? 1 - (progress - 0.72) / 0.28 : 1;
  const pulse = 0.72 + 0.28 * Math.sin(performance.now() * 0.003 + data.phase);
  particle.material.opacity = Math.max(0, data.baseOpacity * fadeIn * fadeOut * pulse);
}

function updateNewsCurlParticle(particle, data, age, progress) {
  const planet = data.targetPlanet;
  if (!planet) return;

  const target = planet.position.clone();
  const incomingEnd = target.clone().add(data.startDirection.clone().multiplyScalar(data.orbitRadius));

  if (progress < 0.52) {
    const t = easeOutCubic(progress / 0.52);
    const curveLift = Math.sin(t * Math.PI) * 52;
    const curved = new THREE.Vector3().lerpVectors(data.startPosition, incomingEnd, t)
      .add(data.tangent.clone().multiplyScalar(curveLift));
    particle.position.copy(curved);
    particle.material.opacity = data.baseOpacity * Math.min(1, progress / 0.12);
  } else {
    const curlT = (progress - 0.52) / 0.48;
    const angle = data.orbitAngle + curlT * Math.PI * 2 * data.curlTurns;
    const radius = data.orbitRadius * (1.25 - curlT * 0.45);
    const offset = new THREE.Vector3(
      Math.cos(angle) * radius,
      Math.sin(angle * 1.25 + data.phase) * radius * 0.25,
      Math.sin(angle) * radius
    );
    offset.applyAxisAngle(data.tangent, 0.65);
    particle.position.copy(target).add(offset);

    const fade = Math.max(0, 1 - curlT);
    const flash = 0.75 + 0.25 * Math.sin(performance.now() * 0.014 + data.phase);
    particle.material.opacity = data.baseOpacity * fade * flash;

    if (!data.hasCaptioned && curlT > 0.16) {
      data.hasCaptioned = true;
      createFloatingSignalCaption(particle, true);
    }
  }
}

function removeSignalParticleAtIndex(index) {
  const particle = signalParticles[index];
  if (!particle) return;
  scene.remove(particle);
  if (particle.material) particle.material.dispose();
  signalParticles.splice(index, 1);
}

function enforceSignalParticleLimit() {
  while (signalParticles.length > MAX_SIGNAL_PARTICLES) {
    let oldestIndex = 0;
    let oldestOrder = Infinity;
    signalParticles.forEach((particle, index) => {
      const order = particle.userData.createdOrder || 0;
      if (order < oldestOrder) {
        oldestOrder = order;
        oldestIndex = index;
      }
    });
    removeSignalParticleAtIndex(oldestIndex);
  }
}

function getSignalHit() {
  const activeParticles = signalParticles.filter((particle) => particle.material && particle.material.opacity > 0.04);
  const hits = raycaster.intersectObjects(activeParticles, false);
  return hits.length > 0 ? hits[0].object : null;
}

function handleSignalPointerMove(event) {
  const clickedElement = event.target;
  if (clickedElement.closest && (clickedElement.closest('#ui-layer') || clickedElement.closest('#infoPanel'))) {
    hideSignalTooltip();
    return;
  }

  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const particle = getSignalHit();
  if (!particle) {
    hideSignalTooltip();
    document.body.style.cursor = '';
    return;
  }

  showSignalTooltip(event, particle);
  document.body.style.cursor = 'pointer';
}

function showSignalTooltip(event, particle) {
  const tooltip = document.getElementById('signal-tooltip');
  if (!tooltip) return;
  const data = particle.userData;
  const kindLabel = data.kind === 'news' ? 'NEWS SIGNAL' : 'SNS SIGNAL';
  tooltip.innerHTML = `
    <div class="signal-tooltip-kicker">${kindLabel}</div>
    <div class="signal-tooltip-title">${escapeHTML(data.title || data.topicLabel || 'Observed signal')}</div>
    <div>${escapeHTML(data.summary || '')}</div>
    <div class="signal-tooltip-meta">${escapeHTML(data.source || '')}${data.publishedAt ? ` / ${escapeHTML(data.publishedAt)}` : ''}</div>
    <div class="signal-tooltip-hint">Click to open source</div>
  `;
  tooltip.style.left = `${event.clientX + 14}px`;
  tooltip.style.top = `${event.clientY + 14}px`;
  tooltip.style.display = 'block';
}

function hideSignalTooltip() {
  const tooltip = document.getElementById('signal-tooltip');
  if (tooltip) tooltip.style.display = 'none';
}

function spawnRandomFloatingCaption() {
  const candidates = signalParticles.filter((particle) => {
    const data = particle.userData;
    if (!data || !particle.material || particle.material.opacity < 0.12) return false;
    const age = performance.now() - data.bornAt;
    return age > 1000 && age < data.maxAge * 0.82;
  });

  if (candidates.length === 0) return;
  const particle = pickRandom(candidates);
  createFloatingSignalCaption(particle, false);
}

function createFloatingSignalCaption(particle, preferSummary = false) {
  const data = particle.userData;
  const uiLayer = document.getElementById('ui-layer') || document.body;
  const screen = toScreenPosition(particle.position);
  if (!screen || screen.x < -40 || screen.x > window.innerWidth + 40 || screen.y < -40 || screen.y > window.innerHeight + 40) return;

  const text = preferSummary
    ? (data.summary || data.topicLabel || data.title)
    : (data.topicLabel || data.summary || 'Observed signal');

  const caption = document.createElement('div');
  caption.className = 'floating-signal-caption';
  caption.textContent = text;
  caption.style.left = `${screen.x}px`;
  caption.style.top = `${screen.y - 12}px`;
  uiLayer.appendChild(caption);

  setTimeout(() => caption.remove(), 3000);
}

function toScreenPosition(position) {
  const vector = position.clone().project(camera);
  if (vector.z < -1 || vector.z > 1) return null;
  return {
    x: (vector.x * 0.5 + 0.5) * window.innerWidth,
    y: (-vector.y * 0.5 + 0.5) * window.innerHeight
  };
}

function addObservationLog(message) {
  const logList = document.getElementById('observation-log-list');
  if (!logList) return;
  const time = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const row = document.createElement('div');
  row.className = 'observation-log-row';
  row.innerHTML = `<span class="observation-log-time">${time}</span>${escapeHTML(message)}`;
  logList.prepend(row);
  while (logList.children.length > 8) {
    logList.lastElementChild.remove();
  }
}

function randomUnitVector() {
  const theta = Math.random() * Math.PI * 2;
  const z = Math.random() * 2 - 1;
  const r = Math.sqrt(1 - z * z);
  return new THREE.Vector3(r * Math.cos(theta), z, r * Math.sin(theta)).normalize();
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// ======================================================
// Interactions
// ======================================================

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

window.addEventListener('pointermove', handleSignalPointerMove);

window.addEventListener('pointerdown', (event) => {
  const clickedElement = event.target;
  if (clickedElement.closest && (clickedElement.closest('#ui-layer') || clickedElement.closest('#infoPanel'))) return;

  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const signalHit = getSignalHit();
  if (signalHit) {
    const url = signalHit.userData.url;
    if (url) {
      addObservationLog(`Opened ${signalHit.userData.kind.toUpperCase()} signal: ${signalHit.userData.title || signalHit.userData.topicLabel}`);
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    return;
  }

  const intersects = raycaster.intersectObjects(planetMeshes);
  if (intersects.length > 0 && intersects[0].object.name) showCompanyInfo(intersects[0].object);
});

function showCompanyInfo(planet) {
  if (!planet || !infoPanel) return;

  const { name, gravity, rawPosition, radius, type } = planet.userData;

  if (!rawPosition) {
    setInfoPanelContent(`
      <div class="company-detail-title">${name}</div>
      <div class="company-detail-subtitle">Glovety object</div>
      <div class="company-score-row">
        <div>
          <div class="company-score-label">Gravity Score</div>
        </div>
        <div class="company-score-value">${gravity.toFixed(3)}</div>
      </div>
    `);
    return;
  }

  const h = rawPosition.x;
  const n = rawPosition.z;
  const e = rawPosition.y;

  const dominantAxis = getDominantAxis(h, n, e);
  const gravityClass = getGravityClass(gravity);
  const interpretation = buildCompanyInterpretation(name, h, n, e, gravity, dominantAxis, gravityClass);

  setInfoPanelContent(`
    <div class="company-detail-title">${name}</div>
    <div class="company-detail-subtitle">${type || 'company'} / HNE semantic position</div>

    <div class="company-score-row">
      <div>
        <div class="company-score-label">Gravity Score</div>
        <div class="company-detail-subtitle">${gravityClass}</div>
      </div>
      <div class="company-score-value">${gravity.toFixed(3)}</div>
    </div>

    <div class="hne-bars">
      ${renderHNEBar('Human', h, 'hne-human')}
      ${renderHNEBar('Nature', n, 'hne-nature')}
      ${renderHNEBar('Economic', e, 'hne-economic')}
    </div>

    <div class="company-interpretation">
      ${interpretation}
    </div>

    <div class="company-meta">
      HNE: (${h.toFixed(3)}, ${n.toFixed(3)}, ${e.toFixed(3)}) /
      Visual radius: ${radius.toFixed(3)}
    </div>
  `);
}
function normalizeHNEValue(value) {
  // 今の座標系はだいたい 0〜8 くらいまで出る前提。
  // バー表示では 0〜8 を 0〜100% に丸める。
  return THREE.MathUtils.clamp((Number(value) / 8) * 100, 0, 100);
}

function renderHNEBar(label, value, className) {
  const pct = normalizeHNEValue(value);

  return `
    <div class="hne-bar-row">
      <div class="hne-bar-label">${label}</div>
      <div class="hne-bar-track">
        <div class="hne-bar-fill ${className}" style="width:${pct.toFixed(1)}%"></div>
      </div>
      <div class="hne-bar-value">${value.toFixed(3)}</div>
    </div>
  `;
}

function getDominantAxis(h, n, e) {
  const axes = [
    { key: 'Human', value: h },
    { key: 'Nature', value: n },
    { key: 'Economic', value: e }
  ];

  return axes.sort((a, b) => b.value - a.value)[0];
}

function getGravityClass(gravity) {
  if (gravity >= 6) return 'High gravity field';
  if (gravity >= 3) return 'Medium gravity field';
  if (gravity > 0) return 'Emerging gravity field';
  return 'Weak or unobserved gravity field';
}

function buildCompanyInterpretation(name, h, n, e, gravity, dominantAxis, gravityClass) {
  const secondAxis = [
    { key: 'Human', value: h },
    { key: 'Nature', value: n },
    { key: 'Economic', value: e }
  ].sort((a, b) => b.value - a.value)[1];

  return `
    ${name} is currently positioned closest to the <strong>${dominantAxis.key}</strong> axis,
    with <strong>${secondAxis.key}</strong> as a secondary semantic component.
    Its gravity is classified as <strong>${gravityClass}</strong>, suggesting that this company
    exerts a ${gravity >= 3 ? 'visible' : 'limited'} pull within the observed HNE semantic space.
  `;
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
      setInfoPanelContent(`
        <strong>GRSS Observation Point</strong><br>
        General RSS Cloud Center<br><br>
        HNE: (${GRSS_RAW_POSITION.x.toFixed(3)}, ${GRSS_RAW_POSITION.z.toFixed(3)}, ${GRSS_RAW_POSITION.y.toFixed(3)})<br>
        This point represents the general observation center in the semantic space.
      `);
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

  setInfoPanelContent(`
    <strong>Company Comparison</strong><br>
    ${planetA.userData.name} × ${planetB.userData.name}<br><br>
    Distance in HNE Space: ${hneDistance.toFixed(3)}<br>
    Visual Distance: ${worldDistance.toFixed(1)}<br>
    Gravity Difference: ${gravityDiff.toFixed(3)}<br><br>
    Human Difference: ${humanDiff.toFixed(3)}<br>
    Nature Difference: ${natureDiff.toFixed(3)}<br>
    Economic Difference: ${economicDiff.toFixed(3)}<br><br>
    ${planetA.userData.name}: g=${planetA.userData.gravity.toFixed(2)}<br>
    ${planetB.userData.name}: g=${planetB.userData.gravity.toFixed(2)}<br><br>

    <button id="clear-compare-button" type="button" class="compare-clear-button">
      Clear Compare
    </button>
  `);
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
  scene.rotation.y += 0.000001;
  updateCameraTween();
  updateCompareVisual(now);
  updateSignalParticles(now);
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