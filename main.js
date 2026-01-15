import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, Vector3 } from 'three';

let textCreated = false;

const TEXT_FINAL_Y = 0.6;

let particles = [];
const PARTICLE_COUNT = 25;

let glowMesh = null;

let textMesh = null;
let textOpacity = 0;

let music = new Audio('./audio/theme.mp3');
music.loop = true;
music.volume = 0;
let musicStarted = false;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let activated = false; // para que solo pase una vez
let activationProgress = 0; // 0 → 1
let rose = null;
let innerLight = null;
let baseScale = 1;
let t = 0;


const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  50, // más cinematográfico que 60
  window.innerWidth / window.innerHeight,
  0.1,
  100
);

camera.position.set(0, 0.3, 4.2);
camera.lookAt(0, 0, 0);


const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('scene'),
  antialias: true,
  alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Luces
scene.add(new THREE.AmbientLight(0x6688ff, 0.8));

const light = new THREE.PointLight(0x88ccff, 1.5);
light.position.set(2, 3, 4);
scene.add(light);

// Rosa

const loader = new GLTFLoader();

loader.load('./rose.glb', (gltf) => {
  rose = gltf.scene;

  // Añadir a escena
  scene.add(rose);

  // AUTO ESCALA Y CENTRADO
  const box = new THREE.Box3().setFromObject(rose);
  const size = new THREE.Vector3();
  box.getSize(size);

  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 6 / maxDim;
  rose.scale.setScalar(scale);
  baseScale = scale;
  box.getCenter(rose.position).multiplyScalar(-1);
  
  // FORZAR MATERIAL AZUL
  rose.traverse((child) => {
    if (child.isMesh) {
      child.material = new THREE.MeshStandardMaterial({
        color: 0x3a7bff,
        roughness: 0.25,
        metalness: 0.4,
        transparent: true,
        opacity: 0.95
      });
    }

    rose.rotation.y = -Math.PI / 1;
    rose.rotation.z = Math.PI / 2;
    
  });

  // LUZ INTERNA
  innerLight = new THREE.PointLight(0x66aaff, 2, 10);
  rose.add(innerLight);
});

function animateFlower() {
  // respiración base (siempre)
  const breathe = 1 + Math.sin(t) * 0.02;
  rose.scale.setScalar(baseScale * breathe);

  // activación suave
  if (activated) {
    const ease = activationProgress * activationProgress * (3 - 2 * activationProgress);
    applyActivation(ease);
  }

  if (musicStarted && music.volume < 0.6) {
  music.volume = Math.min(0.6, music.volume + 0.003);
}
if (innerLight && musicStarted) {
  innerLight.intensity += Math.sin(performance.now() * 0.002) * 0.02;
}


}

function applyActivation(ease) {
  // luz central
  if (innerLight) {
    innerLight.intensity = 2 + ease * 4;
  }

  // apertura mínima de pétalos
  rose.traverse((child) => {
    if (child.isMesh) {
      const dir = child.position.clone().normalize();
      child.position.addScaledVector(dir, ease * 0.015);
    }
  });
}

function createText() {
  // ───────── CANVAS TEXTO ─────────
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(240,245,255,0.95)';

  // Halo interno MUY suave (no exagerado)
  ctx.shadowColor = 'rgba(120,170,255,0.25)';
  ctx.shadowBlur = 10;

  // TÍTULO
  ctx.font = '600 56px "Playfair Display"';
  ctx.fillText('VALE x1', canvas.width / 2, 185);

  // TEXTO PRINCIPAL
  ctx.shadowBlur = 8;
  ctx.font = '400 36px "Playfair Display"';
  ctx.fillText('Acompañamiento a una salida', canvas.width / 2, 255);

  // SUBTEXTO
  ctx.shadowBlur = 6;
  ctx.font = 'italic 26px "Playfair Display"';
  ctx.fillText('Sin quejas / excusas', canvas.width / 2, 310);

  const texture = new THREE.CanvasTexture(canvas);

  // ───────── MESH TEXTO ─────────
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });

  const geometry = new THREE.PlaneGeometry(2.6, 1.3);
  textMesh = new THREE.Mesh(geometry, material);

  // empieza más abajo
  textMesh.position.set(0, TEXT_FINAL_Y - 0.4, 0.1);

  // ───────── HALO SUAVE (PLANO, NO TEXTO) ─────────
  const haloCanvas = document.createElement('canvas');
  haloCanvas.width = 512;
  haloCanvas.height = 512;

  const hctx = haloCanvas.getContext('2d');
  const gradient = hctx.createRadialGradient(
    256, 256, 0,
    256, 256, 256
  );

  gradient.addColorStop(0, 'rgba(120,170,255,0.35)');
  gradient.addColorStop(0.4, 'rgba(120,170,255,0.18)');
  gradient.addColorStop(0.7, 'rgba(120,170,255,0.05)');
  gradient.addColorStop(1, 'rgba(120,170,255,0)');

  hctx.fillStyle = gradient;
  hctx.fillRect(0, 0, 512, 512);

  const haloTexture = new THREE.CanvasTexture(haloCanvas);

  const haloMaterial = new THREE.MeshBasicMaterial({
    map: haloTexture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0
  });

  const haloGeometry = new THREE.PlaneGeometry(3.2, 1.6);
  const haloMesh = new THREE.Mesh(haloGeometry, haloMaterial);

  haloMesh.position.set(0, 0, -0.02);
  haloMesh.scale.set(1.05, 1.05, 1);

  // parentado correcto
  textMesh.add(haloMesh);
  textMesh.userData.halo = haloMesh;

  scene.add(textMesh);
}



function createGlow() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );

  gradient.addColorStop(0, 'rgba(120,180,255,0.8)');
  gradient.addColorStop(0.4, 'rgba(120,180,255,0.4)');
  gradient.addColorStop(0.7, 'rgba(120,180,255,0.15)');
  gradient.addColorStop(1, 'rgba(120,180,255,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0
  });

  const geometry = new THREE.PlaneGeometry(1.6, 1.6);
  glowMesh = new THREE.Mesh(geometry, material);

  glowMesh.position.set(0, 0, -0.05);

  scene.add(glowMesh);
}

function createParticles() {
  const geometry = new THREE.SphereGeometry(0.03, 8, 8);

  const material = new THREE.MeshBasicMaterial({
    color: 0x88aaff,
    transparent: true,
    opacity: 0.1,
    depthWrite: false
  });

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = new THREE.Mesh(geometry, material.clone());

    p.position.set(
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 4,
      -1 - Math.random() * 3
    );

    p.userData.speed = 0.0002 + Math.random() * 0.0003;
    p.userData.offset = Math.random() * Math.PI * 2;

    scene.add(p);
    particles.push(p);
  }
}


function animate() {
  requestAnimationFrame(animate);

  t += 0.01;

  if (activated && activationProgress < 2) {
    activationProgress += 0.005;
    activationProgress = Math.min(activationProgress, 1);
    rose.rotation.z += 0.0015;

  }

  if (activated && activationProgress > 0.4 && !textCreated) {
  createText();
  textCreated = true;
}


if (activated && activationProgress > 0.25 && !glowMesh) {
  createGlow();
}

if (textMesh && textOpacity < 1) {
  textOpacity += 0.01;
  textOpacity = Math.min(textOpacity, 1);

  textMesh.material.opacity = textOpacity;

  // interpolación limpia hacia la posición final
  textMesh.position.y = THREE.MathUtils.lerp(
    TEXT_FINAL_Y - 0.4,
    TEXT_FINAL_Y,
    textOpacity
  );

  const pulse = 1 + Math.sin(performance.now() * 0.002) * 0.015;
  textMesh.scale.set(pulse, pulse, 1);

  if (textMesh.userData.halo) {
    const slowPulse = Math.sin(performance.now() * 0.0012) * 0.08;
    textMesh.userData.halo.material.opacity =
      textOpacity * (0.25 + slowPulse);
  }
}







if (glowMesh) {
  const pulse = Math.sin(performance.now() * 0.002) * 0.05 + 0.95;

  glowMesh.material.opacity = Math.min(0.25, activationProgress * 0.35);
  glowMesh.scale.setScalar(pulse * (1 + activationProgress * 0.2));
}

if (glowMesh && rose) {
  glowMesh.position.copy(rose.position);
}

if (activated && activationProgress > 0.15 && particles.length === 0) {
  createParticles();
}

particles.forEach((p) => {
  p.position.y += p.userData.speed;
  p.position.x += Math.sin(performance.now() * 0.0003 + p.userData.offset) * 0.0003;

  if (p.position.y > 2) {
    p.position.y = -2;
  }
});





  if (rose) {
    animateFlower();
  }

camera.position.y = 0.3 + Math.sin(performance.now() * 0.0005) * 0.05;
camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
}

animate();


window.addEventListener('pointerdown', (event) => {
  if (!rose || activated) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObject(rose, true);

  if (intersects.length > 0) {
  activated = true;

  if (!musicStarted) {
    music.play();
    musicStarted = true;
  }
}

});

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

scene.background = new THREE.Color(0x050b1e);
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});