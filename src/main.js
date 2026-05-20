import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

// --- シーン初期化 ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0c2a);
scene.fog = new THREE.Fog(new THREE.Color(0x0b0c2a), 15, 30);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(8.5, 8.5, 12.5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

//惑星グループ
const planetGroup = new THREE.Group();
scene.add(planetGroup);


//情報パネル
const infoPanel = document.createElement('div');
infoPanel.id = 'infoPanel';
infoPanel.style.position = 'absolute';
infoPanel.style.bottom = '20px';
infoPanel.style.right = '20px';
infoPanel.style.background = 'rgba(0,0,0,0.6)';
infoPanel.style.color = 'white';
infoPanel.style.fontFamily = 'sans-serif';
infoPanel.style.padding = '12px';
infoPanel.style.borderRadius = '8px';
infoPanel.style.display = 'none';
infoPanel.style.minWidth = '200px';
infoPanel.style.zIndex = '10';
document.body.appendChild(infoPanel);


//sun
const animateCallbacks = [];
addSun();

//太陽
function addSun(position = new THREE.Vector3(8, 8, 10)) {
  // 太陽の本体
  const geometry = new THREE.SphereGeometry(0.4, 64, 64);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffaa00,
    emissive: 0xff6600,
    emissiveIntensity: 1,
    wireframe: false
  });
  const sun = new THREE.Mesh(geometry, material);
  sun.position.copy(position);
  scene.add(sun);

  // 点光源
  const pointLight = new THREE.PointLight(0xffcc88, 2, 25, 2);
  pointLight.position.copy(position);
  scene.add(pointLight);

  // フレアっぽい Sprite（外側の光のにじみ）
  const flareTexture = new THREE.TextureLoader().load('https://threejs.org/examples/textures/lensflare/lensflare0.png');
  const spriteMaterial = new THREE.SpriteMaterial({
    map: flareTexture,
    color: 0xffaa00,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const flare = new THREE.Sprite(spriteMaterial);
  flare.scale.set(1, 1, 1);
  flare.position.copy(position);
  scene.add(flare);

  // 表面の渦（小さなノイズ球を回転させる）
  const swirlMaterial = new THREE.MeshStandardMaterial({
    color: 0xffcc66,
    metalness: 0.8,
    roughness: 0.2,
    emissive: 0xff6600,
    emissiveIntensity: 0.2,
    opacity: 0.6,
    transparent: true
  });
  
  const swirl = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 64, 64),
    swirlMaterial
  );
  swirl.position.copy(position);
  scene.add(swirl);
  
  // ゆっくり回転（アニメーション登録）
  animateCallbacks.push(() => {
    swirl.rotation.y += 0.002;
    swirl.rotation.z += 0.001;
  });
  
  // アニメーションに追加（回転とフレアの揺らぎ）
  animateCallbacks.push(() => {
    swirl.rotation.y += 0.01;
    swirl.rotation.x += 0.01;
    const scale = 3 + Math.sin(performance.now() * 0.002) * 0.3;
    flare.scale.set(scale, scale, 1);
  });
}



// --- カスタム軸 ---
function addCustomAxes(center, length = 5) {
  const directions = [
    new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)
  ];
  directions.forEach(dir => {
    const material = new THREE.LineBasicMaterial({ color: 0xcccccc });
    const points = [
      center.clone(),
      center.clone().add(dir.clone().multiplyScalar(length))
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    scene.add(line);
  });
}
addCustomAxes(new THREE.Vector3(2, 2, 2));

//軸目盛
function addAxisLabels(center, length = 5, step = 1) {
  const loader = new FontLoader();
  loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (font) {
    const directions = [
      { axis: 'X', dir: new THREE.Vector3(1, 0, 0) },
      { axis: 'Y', dir: new THREE.Vector3(0, 1, 0) },
      { axis: 'Z', dir: new THREE.Vector3(0, 0, 1) }
    ];
    directions.forEach(({ axis, dir }) => {
      for (let i = -length; i <= length; i += step) {
        if (i === 0) continue;
        const pos = center.clone().add(dir.clone().multiplyScalar(i));
        const textGeo = new TextGeometry(i.toString(), {
          font: font,
          size: 0.1,
          height: 0.01,
        });
        const textMaterial = new THREE.MeshBasicMaterial({ color: 0xaaaaaa });
        const mesh = new THREE.Mesh(textGeo, textMaterial);
        mesh.position.copy(pos);
        mesh.position.add(new THREE.Vector3(0.05, 0.05, 0.05)); // 微調整
        scene.add(mesh);
      }
    });
  });
}
addAxisLabels(new THREE.Vector3(2, 2, 2));


// --- 星粒子背景 ---
function addGalaxyStars(count = 3000) {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  for (let i = 0; i < count; i++) {
    const r = Math.random() * 10 + 5;
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.random() * Math.PI;
    const x = 2.5 + r * Math.sin(phi) * Math.cos(theta);
    const y = 2.5 + r * Math.sin(phi) * Math.sin(theta);
    const z = 2.5 + r * Math.cos(phi);
    positions.push(x, y, z);
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.02 });
  const points = new THREE.Points(geometry, material);
  scene.add(points);
}
addGalaxyStars();

// --- 流れ星 ---
const shootingStars = [];
function addShootingStar() {
  const geometry = new THREE.SphereGeometry(0.03, 6, 6);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const star = new THREE.Mesh(geometry, material);
  star.position.set(Math.random() * 20 - 10, Math.random() * 10, Math.random() * 20 - 10);
  star.velocity = new THREE.Vector3(Math.random() * -0.1 - 0.02, Math.random() * -0.1 - 0.02, Math.random() * -0.1 - 0.02);
  shootingStars.push(star);
  scene.add(star);
}
setInterval(addShootingStar, 3000);




// --- 超新星爆発 ---
function triggerSupernova() {
  const particleCount = 300;
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const velocities = [];

  const origin = new THREE.Vector3(2.5, 2.5, 2.5);

  for (let i = 0; i < particleCount; i++) {
    positions.push(origin.x, origin.y, origin.z);
    const speed = Math.random() * 0.1 + 0.05;
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);
    const vx = speed * Math.sin(phi) * Math.cos(theta);
    const vy = speed * Math.sin(phi) * Math.sin(theta);
    const vz = speed * Math.cos(phi);
    velocities.push(vx, vy, vz);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: 0xffffcc, size: 0.05 });
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
        const x = positions[i * 3] + velocities[i * 3] * elapsed;
        const y = positions[i * 3 + 1] + velocities[i * 3 + 1] * elapsed;
        const z = positions[i * 3 + 2] + velocities[i * 3 + 2] * elapsed;
        newPositions.push(x, y, z);
      }
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
      requestAnimationFrame(animateExplosion);
    } else {
      scene.remove(particles);
    }
  }
  requestAnimationFrame(animateExplosion);
}
setInterval(() => {
  if (Math.random() < 0.1) triggerSupernova();
}, 3000);


//惑星
const planetMeshes = [];
function createPlanet({ name, position, gravity, colorOverride }) {
  const baseRadius = 0.2;
  const radius = baseRadius * (0.8 + gravity);
  const geometry = new THREE.SphereGeometry(radius, 32, 32);

  let color;
  if (colorOverride) {
    color = new THREE.Color(colorOverride);
  } else {
    const hue = 0.6; // 青系
    const saturation = 0.1 + gravity * 0.7;
    const lightness = 0.25 + gravity * 0.5;
    color = new THREE.Color().setHSL(hue, saturation, lightness);
  }

  const material = new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.6 });
  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.copy(position);
  scene.add(sphere);
  sphere.name = name;

  const wireframe = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color: '#444444' })
  );
  wireframe.position.copy(position);
  scene.add(wireframe);

  planetMeshes.push(sphere);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = '20px sans-serif';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(2.5, 1.25, 1);
  sprite.position.copy(position).add(new THREE.Vector3(0, radius + 0.4, 0));
  scene.add(sprite);
}
// --- 銀河クラスタリング ---
function addGalaxyAround(center, radius = 5, count = 1000) {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * radius;
    const x = center.x + r * Math.cos(angle);
    const y = center.y + (Math.random() - 0.5) * 0.2;
    const z = center.z + r * Math.sin(angle);
    positions.push(x, y, z);
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: 0x8899ff, size: 1.1, transparent: true, opacity: 0.6 });
  const points = new THREE.Points(geometry, material);
  scene.add(points);
}

function checkAndAddGalaxies(threshold = 1.5) {
  for (let i = 0; i < planetMeshes.length; i++) {
    for (let j = i + 1; j < planetMeshes.length; j++) {
      const a = planetMeshes[i].position;
      const b = planetMeshes[j].position;
      if (a.distanceTo(b) < threshold) {
        const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
        addGalaxyAround(mid);
      }
    }
  }
}


function showCompanyInfo(name) {
  const obj = planetMeshes.find(p => p.name === name);
  if (!obj) return;

  const gravity = (obj.geometry.parameters.radius / 0.2) - 0.8;
  const position = obj.position;
  infoPanel.innerHTML = `
    <strong>${name}</strong><br>
    Gravity: ${gravity.toFixed(2)}<br>
    Position: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})
  `;
  infoPanel.style.display = 'block';
}




function loadPlanetsFromCSV(url) {
  fetch(url)
    .then(response => response.text())
    .then(data => {
      const lines = data.split('\n').slice(1);
      lines.forEach(line => {
        if (!line.trim()) return;
        const [name, x, y, z, gravity] = line.split(',');
        createPlanet({
          name: name.trim(),
          position: new THREE.Vector3(parseFloat(x), parseFloat(y), parseFloat(z)),
          gravity: parseFloat(gravity)
        });
      });
    });
}
loadPlanetsFromCSV('companies_002.csv');

//惑星を傾ける時に使う
planetGroup.rotation.z = Math.PI / 8;



function createAxisPlanets() {
  // Human軸（X方向）→ 濃青
  createPlanet({
    name: 'Humanus',
    position: new THREE.Vector3(8, 2, 2),
    gravity: 0.8,
    colorOverride: '#003366' // ← 文字列に！
  });

  // Nature軸（Z方向）→ 緑＋輪
  const name = 'Naturis';
  const position = new THREE.Vector3(2, 2, 8);
  const gravity = 0.8;
  createPlanet({ name, position, gravity });

  const ringGeometry = new THREE.RingGeometry(0.5, 0.55, 64);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: '#008000',
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.4
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = Math.PI / 3;
  ring.position.copy(position);
  scene.add(ring);

  // Economic軸（Y方向）→ 赤系
  createPlanet({
    name: 'Economos',
    position: new THREE.Vector3(2, 8, 2),
    gravity: 0.8,
    colorOverride: '#ff5533'
  });
  
}

createAxisPlanets();

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
window.addEventListener('pointerdown', (event) => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(planetMeshes);
  for (let i = 0; i < intersects.length; i++) {
    const obj = intersects[i].object;
    if (obj.name) {
      showCompanyInfo(obj.name);
      break;
    }
  }
});


//渦巻RSS重心
function addSpiralRSSGalaxy(center, armCount = 8, particleCount = 5500, radius = 2.5, baseSpeed = 0.0007) {
  const positions = [];
  const angles = [];
  const radii = [];

  const a = 0.05;    // 渦の起点
  const b = 0.27;    // 渦の巻き密度（小さいほど密）

  for (let i = 0; i < particleCount; i++) {
    const arm = i % armCount;
    const t = Math.random(); // 0〜1で外周へ
    const theta = t * 6 * Math.PI + (arm * 2 * Math.PI / armCount); // アーム分割
    const r = a * Math.exp(b * theta);

    const noise = (Math.random() - 0.5) * 4.5; // 軌道に揺らぎを加える
    const x = r * Math.cos(theta + noise);
    const y = (Math.random() - 0.5) * 0.25;
    const z = r * Math.sin(theta + noise);

    positions.push(x, y, z);
    angles.push(theta);
    radii.push(r);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.007,
    transparent: true,
    opacity: 0.9,
    depthWrite: false
  });

  const points = new THREE.Points(geometry, material);
  const group = new THREE.Group();
  group.add(points);
  group.position.copy(center);
  group.rotation.x = Math.PI / 4; // 傾けるとリアル

  scene.add(group);

  animateCallbacks.push(() => {
    group.rotation.y += baseSpeed;
  });
}

addSpiralRSSGalaxy(new THREE.Vector3(5.602, 2.28, 2.812));









const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(2.5, 2.5, 2.5);

scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);


function animate() {
  requestAnimationFrame(animate);
  scene.rotation.y += 0.001;
  controls.update();
  shootingStars.forEach((star, i) => {
    star.position.add(star.velocity);
    if (star.position.length() > 30) {
      scene.remove(star);
      shootingStars.splice(i, 1);
    }
  });
  
  animateCallbacks.forEach(fn => fn());
  renderer.render(scene, camera);
  
}
animate();

const hamburger = document.getElementById("hamburger");
const sideMenu = document.getElementById("side-menu");

if (hamburger && sideMenu) {
  hamburger.addEventListener("click", () => {
    sideMenu.classList.toggle("open");
  });
}

