import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Compass,
  FlaskConical,
  Footprints,
  Mountain,
  Music,
  Rocket,
  Sparkles,
  Volume2,
  VolumeX
} from 'lucide-react';
import { MARS_TREK_SITES } from '../data/scienceData';
import { DifficultyMode, MarsSite, WorldBody } from '../types/game';
import { haptics } from '../utils/haptics';
import { soundEngine } from '../utils/soundEngine';

interface SpaceLandingPageProps {
  world: WorldBody;
  mode: DifficultyMode;
  selectedMarsSite: MarsSite;
  muted: boolean;
  musicEnabled: boolean;
  onSelectWorld: (world: WorldBody) => void;
  onSelectMode: (mode: DifficultyMode) => void;
  onSelectMarsSite: (site: MarsSite) => void;
  onToggleMute: () => void;
  onToggleMusic: () => void;
  onStart: (skipStory?: boolean) => void;
}

// Pre-allocated math helpers for zero per-frame GC allocations
const _raycaster = new THREE.Raycaster();
const _pointerNdc = new THREE.Vector2();
const _targetMoonPos = new THREE.Vector3();
const _targetMarsPos = new THREE.Vector3();
const _camTarget = new THREE.Vector3();

function makeGlowSpriteTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.28, 'rgba(220,200,255,0.65)');
  grad.addColorStop(0.62, 'rgba(139,92,246,0.18)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makePlanetMaps(kind: WorldBody): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const w = 512;
  const h = 256;
  const col = document.createElement('canvas');
  col.width = w;
  col.height = h;
  const ctx = col.getContext('2d')!;

  const bmp = document.createElement('canvas');
  bmp.width = w;
  bmp.height = h;
  const btx = bmp.getContext('2d')!;

  if (kind === 'MOON') {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#cbd5e1');
    grad.addColorStop(0.5, '#94a3b8');
    grad.addColorStop(1, '#64748b');
    ctx.fillStyle = grad;
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#fed7aa');
    grad.addColorStop(0.14, '#c2410c');
    grad.addColorStop(0.5, '#9a3412');
    grad.addColorStop(0.86, '#c2410c');
    grad.addColorStop(1, '#fde68a');
    ctx.fillStyle = grad;
  }
  ctx.fillRect(0, 0, w, h);

  btx.fillStyle = '#808080';
  btx.fillRect(0, 0, w, h);

  // Maria / canyon bands
  for (let i = 0; i < 36; i++) {
    const x = Math.random() * w;
    const y = 24 + Math.random() * (h - 48);
    const rx = 20 + Math.random() * 56;
    const ry = 10 + Math.random() * 24;
    ctx.fillStyle =
      kind === 'MOON' ? 'rgba(51,65,85,0.28)' : 'rgba(67,20,7,0.28)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, (Math.random() - 0.5) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Impact craters & bright rims
  for (let c = 0; c < 65; c++) {
    const cx = Math.random() * w;
    const cy = 18 + Math.random() * (h - 36);
    const r = 4 + Math.random() * 18;

    const cg = ctx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r);
    if (kind === 'MOON') {
      cg.addColorStop(0, 'rgba(30,41,59,0.52)');
      cg.addColorStop(0.75, 'rgba(100,116,139,0.24)');
      cg.addColorStop(0.92, 'rgba(226,232,240,0.45)');
      cg.addColorStop(1, 'rgba(148,163,184,0)');
    } else {
      cg.addColorStop(0, 'rgba(67,20,7,0.45)');
      cg.addColorStop(0.75, 'rgba(154,52,18,0.22)');
      cg.addColorStop(0.92, 'rgba(251,146,60,0.38)');
      cg.addColorStop(1, 'rgba(194,65,12,0)');
    }
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    const bg = btx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r);
    bg.addColorStop(0, 'rgba(20,20,20,0.75)');
    bg.addColorStop(0.85, 'rgba(240,240,240,0.65)');
    bg.addColorStop(1, 'rgba(128,128,128,0)');
    btx.fillStyle = bg;
    btx.beginPath();
    btx.arc(cx, cy, r, 0, Math.PI * 2);
    btx.fill();
  }

  const map = new THREE.CanvasTexture(col);
  map.colorSpace = THREE.SRGBColorSpace;
  const bumpMap = new THREE.CanvasTexture(bmp);
  return { map, bumpMap };
}

function createZeroGAstronaut() {
  const group = new THREE.Group();

  const suitMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.42,
    metalness: 0.15
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.3,
    metalness: 0.4
  });
  const kaptonMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.25,
    metalness: 0.88
  });
  const visorMat = new THREE.MeshPhysicalMaterial({
    color: 0xfbbf24,
    metalness: 0.94,
    roughness: 0.08,
    clearcoat: 1.0
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.65,
    metalness: 0.3
  });

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.72, 16), suitMat);
  torso.scale.set(1.05, 1, 0.78);
  group.add(torso);

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.31, 0.14, 16), trimMat);
  belt.scale.set(1.06, 1, 0.8);
  belt.position.y = -0.32;
  group.add(belt);

  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.58, 0.26), kaptonMat);
  backpack.position.set(0, 0.05, -0.28);
  group.add(backpack);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.3, 22, 16), suitMat);
  helmet.position.set(0, 0.6, 0.02);
  group.add(helmet);

  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 20, 14, 0, Math.PI * 2, 0.2, Math.PI * 0.55),
    visorMat
  );
  visor.rotation.x = Math.PI * 0.48;
  visor.position.set(0, 0.6, 0.1);
  group.add(visor);

  const limbGeo = new THREE.CapsuleGeometry(0.095, 0.36, 8, 10);
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.38, 0.26, 0);
  const leftArm = new THREE.Mesh(limbGeo, suitMat);
  leftArm.position.y = -0.22;
  const leftGlove = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), trimMat);
  leftGlove.position.y = -0.46;
  leftArmPivot.add(leftArm, leftGlove);
  group.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.38, 0.26, 0);
  const rightArm = new THREE.Mesh(limbGeo, suitMat);
  rightArm.position.y = -0.22;
  const rightGlove = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), trimMat);
  rightGlove.position.y = -0.46;
  rightArmPivot.add(rightArm, rightGlove);
  group.add(rightArmPivot);

  const legGeo = new THREE.CapsuleGeometry(0.115, 0.38, 8, 10);
  const bootGeo = new THREE.BoxGeometry(0.24, 0.15, 0.34);

  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.18, -0.42, 0);
  const leftLeg = new THREE.Mesh(legGeo, suitMat);
  leftLeg.position.y = -0.24;
  const leftBoot = new THREE.Mesh(bootGeo, darkMat);
  leftBoot.position.set(0, -0.54, 0.05);
  leftLegPivot.add(leftLeg, leftBoot);
  group.add(leftLegPivot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.18, -0.42, 0);
  const rightLeg = new THREE.Mesh(legGeo, suitMat);
  rightLeg.position.y = -0.24;
  const rightBoot = new THREE.Mesh(bootGeo, darkMat);
  rightBoot.position.set(0, -0.54, 0.05);
  rightLegPivot.add(rightLeg, rightBoot);
  group.add(rightLegPivot);

  const thrusterMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const jetGeo = new THREE.ConeGeometry(0.12, 0.32, 10, 1, true);
  const leftJet = new THREE.Mesh(jetGeo, thrusterMat);
  leftJet.rotation.x = Math.PI;
  leftJet.position.set(-0.14, -0.35, -0.32);
  const rightJet = new THREE.Mesh(jetGeo, thrusterMat);
  rightJet.rotation.x = Math.PI;
  rightJet.position.set(0.14, -0.35, -0.32);
  group.add(leftJet, rightJet);

  return {
    group,
    trimMat,
    thrusterMat,
    leftArmPivot,
    rightArmPivot,
    leftLegPivot,
    rightLegPivot,
    leftJet,
    rightJet
  };
}

export function SpaceLandingPage({
  world,
  mode,
  selectedMarsSite,
  muted,
  musicEnabled,
  onSelectWorld,
  onSelectMode,
  onSelectMarsSite,
  onToggleMute,
  onToggleMusic,
  onStart
}: SpaceLandingPageProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglFailed, setWebglFailed] = useState(false);
  const [nebulaImgFailed, setNebulaImgFailed] = useState(false);
  const [meteorCounter, setMeteorCounter] = useState(0);

  const worldRef = useRef<WorldBody>(world);
  worldRef.current = world;

  const boostTriggerRef = useRef<(() => void) | null>(null);
  const funBoostRef = useRef<() => void>(() => {});

  const handleFunBoost = () => {
    soundEngine.unlock();
    soundEngine.playCommsPing();
    haptics.click();
    setMeteorCounter((c) => c + 1);
    boostTriggerRef.current?.();
  };
  funBoostRef.current = handleFunBoost;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance'
      });
    } catch {
      setWebglFailed(true);
      return;
    }

    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.innerHTML = '';
    container.appendChild(canvas);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    const width = Math.max(300, container.clientWidth);
    const height = Math.max(240, container.clientHeight);
    renderer.setSize(width, height, false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 220);
    camera.position.set(0, 0.4, 11.5);

    const disposables: { dispose: () => void }[] = [];

    // 3-Point Space Lighting
    const ambient = new THREE.AmbientLight(0x9d8cf5, 0.72);
    const sunLight = new THREE.DirectionalLight(0xfff1d6, 2.35);
    sunLight.position.set(10, 7, 12);
    const nebulaRim = new THREE.DirectionalLight(0xa855f7, 1.1);
    nebulaRim.position.set(-10, -4, -8);
    scene.add(ambient, sunLight, nebulaRim);

    // 1. Diagonal Milky Way 3D Starfield (inspired by cosmic violet-gold nebula)
    const starCount = isSoftwareGl ? 750 : 1900;
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    const palette = [
      new THREE.Color(0xffffff),
      new THREE.Color(0xe9d5ff),
      new THREE.Color(0xc4b5fd),
      new THREE.Color(0xfbbf24),
      new THREE.Color(0x7dd3fc)
    ];

    for (let i = 0; i < starCount; i++) {
      const inBand = i < starCount * 0.65;
      let sx: number;
      let sy: number;
      let sz: number;
      if (inBand) {
        // Tilted Milky Way river running top-left to bottom-right
        const along = (Math.random() - 0.5) * 46;
        const across = (Math.random() - 0.5) * (Math.random() * 11 + 1.5);
        sx = along * 0.82 - across * 0.57;
        sy = -along * 0.52 - across * 0.8 + (Math.random() - 0.5) * 2.5;
        sz = -8 - Math.random() * 44;
      } else {
        sx = (Math.random() - 0.5) * 58;
        sy = (Math.random() - 0.5) * 38;
        sz = -4 - Math.random() * 54;
      }
      starPos[i * 3] = sx;
      starPos[i * 3 + 1] = sy;
      starPos[i * 3 + 2] = sz;

      const c = palette[Math.floor(Math.random() * palette.length)];
      const brightness = 0.55 + Math.random() * 0.45;
      starCol[i * 3] = c.r * brightness;
      starCol[i * 3 + 1] = c.g * brightness;
      starCol[i * 3 + 2] = c.b * brightness;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    const starTex = makeGlowSpriteTexture();
    const starMat = new THREE.PointsMaterial({
      size: 0.28,
      map: starTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);
    disposables.push(starGeo, starMat, starTex);

    // 2. Soft Volumetric 3D Cosmic Nebula Dust Ribbons
    const cloudCount = isSoftwareGl ? 36 : 78;
    const cloudPos = new Float32Array(cloudCount * 3);
    const cloudCol = new Float32Array(cloudCount * 3);
    const cloudPalette = [
      new THREE.Color(0x6d28d9),
      new THREE.Color(0x4338ca),
      new THREE.Color(0xa855f7),
      new THREE.Color(0xd97706)
    ];
    for (let i = 0; i < cloudCount; i++) {
      const along = (Math.random() - 0.5) * 34;
      const across = (Math.random() - 0.5) * 8;
      cloudPos[i * 3] = along * 0.82 - across * 0.57;
      cloudPos[i * 3 + 1] = -along * 0.48 - across * 0.72;
      cloudPos[i * 3 + 2] = -14 - Math.random() * 24;
      const cc = cloudPalette[i % cloudPalette.length];
      cloudCol[i * 3] = cc.r;
      cloudCol[i * 3 + 1] = cc.g;
      cloudCol[i * 3 + 2] = cc.b;
    }
    const cloudGeo = new THREE.BufferGeometry();
    cloudGeo.setAttribute('position', new THREE.BufferAttribute(cloudPos, 3));
    cloudGeo.setAttribute('color', new THREE.BufferAttribute(cloudCol, 3));
    const cloudMat = new THREE.PointsMaterial({
      size: 6.2,
      map: starTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const nebulaClouds = new THREE.Points(cloudGeo, cloudMat);
    scene.add(nebulaClouds);
    disposables.push(cloudGeo, cloudMat);

    // 3. 3D Moon + Orbiting Micro-Satellite
    const moonMaps = makePlanetMaps('MOON');
    const moonGroup = new THREE.Group();
    const moonSphereGeo = new THREE.SphereGeometry(1.75, 36, 26);
    const moonMat = new THREE.MeshStandardMaterial({
      map: moonMaps.map,
      bumpMap: moonMaps.bumpMap,
      bumpScale: 0.08,
      roughness: 0.88,
      metalness: 0.05
    });
    const moonMesh = new THREE.Mesh(moonSphereGeo, moonMat);
    moonMesh.userData.pickWorld = 'MOON';

    const moonRingGeo = new THREE.TorusGeometry(2.38, 0.02, 8, 52);
    const moonRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.48
    });
    const moonOrbitRing = new THREE.Mesh(moonRingGeo, moonRingMat);
    moonOrbitRing.rotation.x = Math.PI * 0.42;
    moonOrbitRing.rotation.y = 0.28;

    // Orbiting mini outpost relay satellite
    const satPivot = new THREE.Group();
    const satBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.14, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.25 })
    );
    const satWingGeo = new THREE.BoxGeometry(0.56, 0.02, 0.14);
    const satWing = new THREE.Mesh(
      satWingGeo,
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.7, roughness: 0.2 })
    );
    satBody.add(satWing);
    satBody.position.set(2.38, 0, 0);
    satPivot.add(satBody);
    moonOrbitRing.add(satPivot);

    moonGroup.add(moonMesh, moonOrbitRing);
    scene.add(moonGroup);
    disposables.push(
      moonMaps.map,
      moonMaps.bumpMap,
      moonSphereGeo,
      moonMat,
      moonRingGeo,
      moonRingMat,
      satBody.geometry,
      satWingGeo
    );

    // 4. 3D Mars + Phobos Moonlet + Amber Atmospheric Halo
    const marsMaps = makePlanetMaps('MARS');
    const marsGroup = new THREE.Group();
    const marsSphereGeo = new THREE.SphereGeometry(1.75, 36, 26);
    const marsMat = new THREE.MeshStandardMaterial({
      map: marsMaps.map,
      bumpMap: marsMaps.bumpMap,
      bumpScale: 0.09,
      roughness: 0.86,
      metalness: 0.04
    });
    const marsMesh = new THREE.Mesh(marsSphereGeo, marsMat);
    marsMesh.userData.pickWorld = 'MARS';

    const marsHaloGeo = new THREE.SphereGeometry(1.88, 28, 20);
    const marsHaloMat = new THREE.MeshBasicMaterial({
      color: 0xfb923c,
      transparent: true,
      opacity: 0.16,
      side: THREE.BackSide
    });
    const marsHalo = new THREE.Mesh(marsHaloGeo, marsHaloMat);

    const marsRingGeo = new THREE.TorusGeometry(2.42, 0.022, 8, 52);
    const marsRingMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.45
    });
    const marsOrbitRing = new THREE.Mesh(marsRingGeo, marsRingMat);
    marsOrbitRing.rotation.x = Math.PI * 0.44;
    marsOrbitRing.rotation.y = -0.32;

    const phobosPivot = new THREE.Group();
    const phobosGeo = new THREE.DodecahedronGeometry(0.16, 1);
    const phobos = new THREE.Mesh(
      phobosGeo,
      new THREE.MeshStandardMaterial({ color: 0xa8a29e, roughness: 0.92 })
    );
    phobos.position.set(2.42, 0, 0);
    phobosPivot.add(phobos);
    marsOrbitRing.add(phobosPivot);

    marsGroup.add(marsMesh, marsHalo, marsOrbitRing);
    scene.add(marsGroup);
    disposables.push(
      marsMaps.map,
      marsMaps.bumpMap,
      marsSphereGeo,
      marsMat,
      marsHaloGeo,
      marsHaloMat,
      marsRingGeo,
      marsRingMat,
      phobosGeo
    );

    // 5. Floating Zero-G Astronaut Mascot
    const astro = createZeroGAstronaut();
    astro.group.position.set(0.4, -0.3, 4.6);
    astro.group.scale.setScalar(0.92);
    scene.add(astro.group);

    // Invisible click target around astronaut
    const astroProxy = new THREE.Mesh(
      new THREE.SphereGeometry(0.95, 12, 10),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    astroProxy.userData.pickHero = true;
    astro.group.add(astroProxy);
    disposables.push(astroProxy.geometry, astroProxy.material as THREE.Material);

    // 6. Sleek Mini Rocket Shuttle orbiting through the nebula
    const rocketGroup = new THREE.Group();
    const rocketBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.14, 0.72, 12),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.4, roughness: 0.3 })
    );
    rocketBody.rotation.z = -Math.PI / 2;
    const rocketNose = new THREE.Mesh(
      new THREE.ConeGeometry(0.085, 0.28, 12),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35 })
    );
    rocketNose.rotation.z = -Math.PI / 2;
    rocketNose.position.x = 0.48;
    const rocketFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.11, 0.42, 10),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.85 })
    );
    rocketFlame.rotation.z = Math.PI / 2;
    rocketFlame.position.x = -0.52;
    rocketGroup.add(rocketBody, rocketNose, rocketFlame);
    scene.add(rocketGroup);
    disposables.push(rocketBody.geometry, rocketNose.geometry, rocketFlame.geometry);

    // 7. Shooting Stars / Meteors Pool
    interface MeteorItem {
      mesh: THREE.Mesh;
      active: boolean;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
    }
    const meteors: MeteorItem[] = [];
    const meteorGeo = new THREE.CylinderGeometry(0.008, 0.055, 2.2, 6);
    meteorGeo.rotateZ(Math.PI / 2);
    const meteorMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    disposables.push(meteorGeo, meteorMat);
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(meteorGeo, meteorMat);
      m.visible = false;
      m.rotation.z = -0.52;
      scene.add(m);
      meteors.push({ mesh: m, active: false, vx: 0, vy: 0, life: 0, maxLife: 1 });
    }

    const spawnMeteors = (count: number) => {
      let spawned = 0;
      for (const m of meteors) {
        if (!m.active && spawned < count) {
          m.active = true;
          m.life = 0;
          m.maxLife = 0.65 + Math.random() * 0.55;
          m.mesh.position.set(
            -8 + Math.random() * 14,
            4 + Math.random() * 5,
            -6 - Math.random() * 14
          );
          const speed = 15 + Math.random() * 10;
          m.vx = speed * 0.86;
          m.vy = -speed * 0.5;
          m.mesh.visible = true;
          spawned++;
        }
      }
    };

    let flipSpinRemaining = 0;
    let boostTimer = 0;

    boostTriggerRef.current = () => {
      flipSpinRemaining = Math.PI * 2;
      boostTimer = 1.1;
      spawnMeteors(6);
    };

    // Pointer Interaction: Parallax + Drag + Click Planets/Astronaut/Meteors
    let pointerX = 0;
    let pointerY = 0;
    let dragYaw = 0;
    let dragPitch = 0;
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    let movedDist = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      movedDist = 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerX = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      pointerY = -((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      movedDist += Math.hypot(dx, dy);
      dragYaw = THREE.MathUtils.clamp(dragYaw + dx * 0.004, -0.55, 0.55);
      dragPitch = THREE.MathUtils.clamp(dragPitch + dy * 0.003, -0.35, 0.35);
    };

    const onPointerUp = (e: PointerEvent) => {
      const wasClick = isDragging && movedDist < 7;
      isDragging = false;
      if (!wasClick) return;

      const rect = canvas.getBoundingClientRect();
      _pointerNdc.x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      _pointerNdc.y = -((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
      _raycaster.setFromCamera(_pointerNdc, camera);
      const hits = _raycaster.intersectObjects([moonMesh, marsMesh, astroProxy], false);
      if (hits.length > 0) {
        const hitObj = hits[0].object;
        if (hitObj.userData.pickWorld === 'MOON') {
          soundEngine.playButtonClick('tab');
          haptics.click();
          onSelectWorld('MOON');
          spawnMeteors(3);
          return;
        }
        if (hitObj.userData.pickWorld === 'MARS') {
          soundEngine.playButtonClick('tab');
          haptics.click();
          onSelectWorld('MARS');
          spawnMeteors(3);
          return;
        }
        if (hitObj.userData.pickHero) {
          funBoostRef.current();
          return;
        }
      }
      soundEngine.playHoverTick();
      spawnMeteors(4);
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(300, entry.contentRect.width);
        const h = Math.max(240, entry.contentRect.height);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      }
    });
    resizeObserver.observe(container);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglFailed(true);
    };
    canvas.addEventListener('webglcontextlost', onContextLost);

    let frameId = 0;
    let disposed = false;
    let ambientMeteorCooldown = 2.2;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 75);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    // Initial planet placement
    moonGroup.position.set(2.9, 0.25, 1.5);
    marsGroup.position.set(6.8, 3.2, -7.2);

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(0.08, clock.getDelta());
      const elapsed = clock.getElapsedTime();
      const activeWorld = worldRef.current;

      // Gently return drag offset toward pointer parallax when idle
      if (!isDragging) {
        dragYaw = THREE.MathUtils.damp(dragYaw, pointerX * 0.22, 3.5, dt);
        dragPitch = THREE.MathUtils.damp(dragPitch, -pointerY * 0.14, 3.5, dt);
      }

      _camTarget.set(dragYaw * 2.2, 0.4 + dragPitch * 1.4, 11.5);
      camera.position.lerp(_camTarget, Math.min(1, dt * 4));
      camera.lookAt(0.7, 0.15, 0);

      // Slow galactic drift
      starPoints.rotation.y = elapsed * 0.012;
      starPoints.rotation.z = Math.sin(elapsed * 0.05) * 0.02;
      nebulaClouds.rotation.y = elapsed * 0.008;

      // Smoothly position selected world into hero spotlight vs orbital background
      const isMoon = activeWorld === 'MOON';
      _targetMoonPos.set(
        isMoon ? 3.1 : 6.9,
        (isMoon ? 0.25 : 3.25) + Math.sin(elapsed * 0.85) * 0.16,
        isMoon ? 1.8 : -7.6
      );
      _targetMarsPos.set(
        isMoon ? 6.9 : 3.1,
        (isMoon ? 3.25 : 0.25) + Math.cos(elapsed * 0.8) * 0.16,
        isMoon ? -7.6 : 1.8
      );

      moonGroup.position.lerp(_targetMoonPos, Math.min(1, dt * 4.5));
      marsGroup.position.lerp(_targetMarsPos, Math.min(1, dt * 4.5));

      const moonTargetScale = isMoon ? 1.15 : 0.52;
      const marsTargetScale = isMoon ? 0.52 : 1.15;
      moonGroup.scale.setScalar(THREE.MathUtils.damp(moonGroup.scale.x, moonTargetScale, 5, dt));
      marsGroup.scale.setScalar(THREE.MathUtils.damp(marsGroup.scale.x, marsTargetScale, 5, dt));

      moonMesh.rotation.y += dt * 0.18;
      marsMesh.rotation.y += dt * 0.22;
      satPivot.rotation.y += dt * 0.95;
      phobosPivot.rotation.y += dt * 1.15;

      // Playful Zero-G Floating Astronaut
      const heroX = 0.55 + Math.sin(elapsed * 0.7) * 0.24;
      const heroY = -0.32 + Math.sin(elapsed * 1.4) * 0.22;
      astro.group.position.set(heroX, heroY, 4.7);
      astro.trimMat.color.setHex(isMoon ? 0x38bdf8 : 0xf97316);
      astro.thrusterMat.color.setHex(isMoon ? 0x38bdf8 : 0xfb923c);

      if (flipSpinRemaining > 0) {
        const step = Math.min(flipSpinRemaining, dt * 9.5);
        flipSpinRemaining -= step;
        astro.group.rotation.x += step;
      } else {
        astro.group.rotation.x = THREE.MathUtils.damp(astro.group.rotation.x, 0.12, 6, dt);
      }
      astro.group.rotation.y = -0.35 + Math.sin(elapsed * 0.65) * 0.28;
      astro.group.rotation.z = Math.sin(elapsed * 0.9) * 0.16;

      // Cheerful wave & zero-G float limbs
      astro.leftArmPivot.rotation.z = -0.42 + Math.sin(elapsed * 2.2) * 0.18;
      astro.rightArmPivot.rotation.z = 0.55 + Math.sin(elapsed * 3.1) * 0.28;
      astro.leftLegPivot.rotation.x = Math.sin(elapsed * 1.7) * 0.18;
      astro.rightLegPivot.rotation.x = -Math.sin(elapsed * 1.7) * 0.18;

      if (boostTimer > 0) {
        boostTimer = Math.max(0, boostTimer - dt);
        astro.thrusterMat.opacity = 0.95;
        astro.leftJet.scale.set(1.3, 1.85, 1.3);
        astro.rightJet.scale.set(1.3, 1.85, 1.3);
      } else {
        astro.thrusterMat.opacity = 0.55 + Math.sin(elapsed * 10) * 0.18;
        const jScale = 0.92 + Math.sin(elapsed * 12) * 0.15;
        astro.leftJet.scale.set(1, jScale, 1);
        astro.rightJet.scale.set(1, jScale, 1);
      }

      // Orbiting Mini Rocket Shuttle looping around hero planet
      const rAngle = elapsed * 0.65;
      const focusX = isMoon ? moonGroup.position.x : marsGroup.position.x;
      const focusY = isMoon ? moonGroup.position.y : marsGroup.position.y;
      const focusZ = isMoon ? moonGroup.position.z : marsGroup.position.z;
      rocketGroup.position.set(
        focusX + Math.cos(rAngle) * 2.95,
        focusY + Math.sin(rAngle * 1.2) * 0.95,
        focusZ + Math.sin(rAngle) * 2.95
      );
      rocketGroup.rotation.y = -rAngle + Math.PI / 2;
      rocketGroup.rotation.z = Math.cos(rAngle) * 0.24;
      rocketFlame.scale.setScalar(0.85 + Math.sin(elapsed * 26) * 0.25);

      // Ambient & interactive Shooting Stars
      ambientMeteorCooldown -= dt;
      if (ambientMeteorCooldown <= 0) {
        ambientMeteorCooldown = 2.6 + Math.random() * 2.8;
        spawnMeteors(1);
      }
      for (const m of meteors) {
        if (!m.active) continue;
        m.life += dt;
        if (m.life >= m.maxLife) {
          m.active = false;
          m.mesh.visible = false;
        } else {
          m.mesh.position.x += m.vx * dt;
          m.mesh.position.y += m.vy * dt;
        }
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      tick();
    } else {
      frameId = window.requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
    };
  }, [onSelectWorld]);

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[#060616] text-slate-100 select-none">
      {/* Cosmic Nebula Reference Sky Layer */}
      <div aria-hidden="true" className="fixed inset-0 overflow-hidden pointer-events-none">
        {!nebulaImgFailed ? (
          <img
            src="/assets/aistudio/image_298904f8.jpeg"
            alt="Deep cosmic violet and gold Milky Way starfield"
            referrerPolicy="no-referrer"
            onError={() => setNebulaImgFailed(true)}
            className="w-full h-full object-cover object-center scale-105 opacity-95"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#07061a] via-[#2b1854] to-[#0a1026]" />
        )}
        {/* Readability Scrim on left panel side while preserving vivid cosmic nebula on right */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#050614]/88 via-[#080a1f]/56 to-[#050614]/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050614]/75 via-transparent to-[#050614]/45" />
      </div>

      {/* Full-Viewport Interactive 3D Space Scene */}
      {!webglFailed && (
        <div
          ref={mountRef}
          aria-label="Interactive 3D cosmic space portal with Moon, Mars, astronaut, and shooting stars"
          className="fixed inset-0 z-10 cursor-grab active:cursor-grabbing"
        />
      )}

      {/* Semantic Interactive UI Layer */}
      <div className="relative z-20 min-h-full flex flex-col justify-between max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-6 pointer-events-none">
        {/* Clean Minimal Top Bar */}
        <header className="flex items-center justify-between gap-4 pointer-events-auto">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/25 border border-indigo-300/35 flex items-center justify-center text-amber-300 shrink-0">
              <Rocket className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-display font-extrabold text-base sm:text-lg tracking-tight text-white truncate">
                Junior Astronaut
              </div>
              <div className="text-[11px] font-mono-tabular text-indigo-200/80 truncate">
                3D Planetary Outpost Simulation
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleFunBoost}
              className="btn-tactile px-3.5 py-2 min-h-[40px] rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-300/45 text-amber-100 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
              <span>Zero-G Flip &amp; Meteors</span>
              {meteorCounter > 0 && (
                <span className="font-mono-tabular text-amber-200">({meteorCounter})</span>
              )}
            </button>

            <button
              type="button"
              onClick={onToggleMusic}
              aria-label={musicEnabled ? 'Pause ambient space music' : 'Play ambient space music'}
              className={`btn-tactile px-3 py-2 min-h-[40px] rounded-xl border text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                musicEnabled
                  ? 'bg-indigo-500/30 border-indigo-300/45 text-indigo-100 hover:bg-indigo-500/40'
                  : 'bg-slate-900/70 border-white/15 text-slate-300 hover:bg-slate-800/80'
              }`}
            >
              <Music className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{musicEnabled ? 'Music On' : 'Music Off'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? 'Unmute audio' : 'Mute audio'}
              className="btn-tactile w-10 h-10 rounded-xl bg-slate-900/75 hover:bg-slate-800/90 border border-white/15 text-slate-100 flex items-center justify-center shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              {muted ? <VolumeX className="w-4 h-4 text-rose-300" /> : <Volume2 className="w-4 h-4 text-sky-300" />}
            </button>
          </div>
        </header>

        {/* Main Hero & Mission Control Stage */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center my-auto py-4">
          <section className="lg:col-span-6 xl:col-span-5 pointer-events-auto rounded-3xl bg-[#090c1f]/82 border border-indigo-300/25 shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tabular text-amber-200/90">
                <span>Moon 0.16g</span>
                <span aria-hidden="true">·</span>
                <span>Mars 0.38g</span>
                <span aria-hidden="true">·</span>
                <span>7-Sol Survival</span>
              </div>
              <h1 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-white text-balance leading-tight">
                Command Your Own 3D Space Outpost
              </h1>
              <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed">
                Explore rough cratered worlds with hover boots, route solar grid power, and protect
                your crew from real solar storms and system emergencies.
              </p>
            </div>

            {/* 3 Concise Gameplay Highlights */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-white/6 border border-white/10 p-2.5">
                <Footprints className="w-4 h-4 text-sky-300 mb-1" />
                <div className="text-xs font-bold text-white">Walk &amp; Hover</div>
                <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
                  WASD or click hills; Space to jump.
                </p>
              </div>
              <div className="rounded-xl bg-white/6 border border-white/10 p-2.5">
                <Sparkles className="w-4 h-4 text-amber-300 mb-1" />
                <div className="text-xs font-bold text-white">Space Physics</div>
                <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
                  Fix dust, leaks, CO2 &amp; radiators.
                </p>
              </div>
              <div className="rounded-xl bg-white/6 border border-white/10 p-2.5">
                <Compass className="w-4 h-4 text-emerald-300 mb-1" />
                <div className="text-xs font-bold text-white">Story or Lab</div>
                <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
                  7-Sol mission or safe Sandbox.
                </p>
              </div>
            </div>

            {/* Destination Selector */}
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-indigo-200">
                Choose Destination (or click a 3D planet)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onSelectWorld('MOON')}
                  className={`btn-tactile rounded-2xl border p-3 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                    world === 'MOON'
                      ? 'bg-sky-500/22 border-sky-300/75 shadow-sm'
                      : 'bg-white/5 border-white/15 hover:border-sky-300/45'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display font-extrabold text-sm text-white">
                      Moon Base Alpha
                    </span>
                    <span className="text-[11px] font-mono-tabular font-bold text-sky-300">
                      0.16g
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                    High low-gravity leaps &amp; -130°C crater shadows.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectWorld('MARS')}
                  className={`btn-tactile rounded-2xl border p-3 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                    world === 'MARS'
                      ? 'bg-orange-500/22 border-orange-300/75 shadow-sm'
                      : 'bg-white/5 border-white/15 hover:border-orange-300/45'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display font-extrabold text-sm text-white">
                      Mars Red Outpost
                    </span>
                    <span className="text-[11px] font-mono-tabular font-bold text-orange-300">
                      0.38g
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                    Dust storms, perchlorate soil &amp; Earth radio lag.
                  </p>
                </button>
              </div>
            </div>

            {/* Mars Landing Site Picker */}
            {world === 'MARS' && (
              <div className="space-y-1.5 pt-1 border-t border-white/10">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-200">
                  <Mountain className="w-3.5 h-3.5 text-amber-300" />
                  <span>Mars Landing Zone</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  {MARS_TREK_SITES.map((site) => {
                    const active = selectedMarsSite.id === site.id;
                    return (
                      <button
                        key={site.id}
                        type="button"
                        onClick={() => onSelectMarsSite(site)}
                        className={`btn-tactile rounded-xl border p-2 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                          active
                            ? 'bg-amber-400/20 border-amber-300/75 text-white'
                            : 'bg-white/5 border-white/15 text-slate-300 hover:border-amber-300/45'
                        }`}
                      >
                        <div className="font-bold text-xs text-white truncate">{site.name}</div>
                        <div className="text-[10px] font-mono-tabular text-amber-200/90 mt-0.5">
                          {site.elevationLabel} · {site.basePowerBudget} kW
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mode Selector */}
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-indigo-200">Select Mission Mode</div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onSelectMode('CADET')}
                  className={`btn-tactile rounded-xl border p-2 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                    mode === 'CADET'
                      ? 'bg-emerald-500/22 border-emerald-300/75'
                      : 'bg-white/5 border-white/15 hover:border-emerald-300/45'
                  }`}
                >
                  <div className="font-display font-bold text-xs text-white">Cadet</div>
                  <div className="text-[10px] font-mono-tabular text-emerald-200 mt-0.5">
                    Ages 7–9 · Guided
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectMode('COMMANDER')}
                  className={`btn-tactile rounded-xl border p-2 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                    mode === 'COMMANDER'
                      ? 'bg-amber-500/22 border-amber-300/75'
                      : 'bg-white/5 border-white/15 hover:border-amber-300/45'
                  }`}
                >
                  <div className="font-display font-bold text-xs text-white">Commander</div>
                  <div className="text-[10px] font-mono-tabular text-amber-200 mt-0.5">
                    10–12+ · Tough
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectMode('SANDBOX')}
                  className={`btn-tactile rounded-xl border p-2 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                    mode === 'SANDBOX'
                      ? 'bg-indigo-500/28 border-indigo-300/80'
                      : 'bg-white/5 border-white/15 hover:border-indigo-300/45'
                  }`}
                >
                  <div className="flex items-center gap-1 font-display font-bold text-xs text-white">
                    <FlaskConical className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                    <span>Sandbox</span>
                  </div>
                  <div className="text-[10px] font-mono-tabular text-indigo-200 mt-0.5">
                    Safe Lab · Free
                  </div>
                </button>
              </div>
            </div>

            {/* Primary Launch CTA */}
            <div className="flex flex-wrap gap-2.5 pt-1">
              {mode === 'SANDBOX' ? (
                <>
                  <button
                    type="button"
                    onClick={() => onStart(true)}
                    className="btn-tactile flex-1 min-h-[48px] px-5 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-display font-extrabold text-sm sm:text-base shadow-lg flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                  >
                    <FlaskConical className="w-5 h-5 shrink-0" />
                    <span>Enter Sandbox Lab</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onStart(false)}
                    className="btn-tactile min-h-[48px] px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/18 border border-white/20 text-white font-bold text-xs sm:text-sm whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  >
                    Play Story Intro First
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => onStart(false)}
                  className="group btn-tactile w-full min-h-[50px] px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-amber-500 hover:brightness-110 text-white font-display font-extrabold text-base sm:text-lg shadow-lg flex items-center justify-center gap-2.5 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  <Rocket className="w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0" />
                  <span>Start 7-Sol Mission</span>
                </button>
              )}
            </div>
          </section>

          {/* Right Open 3D Stage Spacer (Unobstructed Cosmic Planets, Rocket & Floating Astronaut) */}
          <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col items-end justify-end h-full min-h-[420px]">
            <div className="rounded-xl bg-[#090c1f]/65 border border-white/15 px-3.5 py-2 text-xs text-indigo-100/90">
              Drag space to tilt cosmos · Click Moon, Mars, or the floating astronaut · Click sky for shooting stars
            </div>
          </div>
        </main>

        {/* Quiet Mobile Hint Footer */}
        <footer className="lg:hidden text-center text-[11px] text-indigo-200/80 pt-1">
          Drag background to tilt 3D cosmos · Tap astronaut or stars for meteor burst
        </footer>
      </div>
    </div>
  );
}
