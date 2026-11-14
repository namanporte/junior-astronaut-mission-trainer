import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BASE_STATIONS } from '../data/scienceData';
import {
  BaseSystemsState,
  GamePhase,
  PowerAllocation,
  StationId,
  WorldBody
} from '../types/game';
import { haptics } from '../utils/haptics';
import { soundEngine } from '../utils/soundEngine';

export interface DpadVector {
  x: number;
  z: number;
}

interface Outpost3DViewportProps {
  world: WorldBody;
  phase: GamePhase;
  systems: BaseSystemsState;
  power: PowerAllocation;
  activeEmergencyStation: StationId | null;
  nearestStation: StationId | null;
  jumpNonce: number;
  dpadRef: React.MutableRefObject<DpadVector>;
  onNearestStationChange: (station: StationId | null, distance: number) => void;
  onSelectStation: (station: StationId) => void;
  onFootstepJump: () => void;
}

// Module-scope reusable math helpers (zero per-frame GC churn)
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _pointerNdc = new THREE.Vector2();
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _hitPoint = new THREE.Vector3();
const _dummy = new THREE.Object3D();

function makeProceduralTerrainTexture(world: WorldBody): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = world === 'MOON' ? '#58606E' : '#9E4B2B';
  ctx.fillRect(0, 0, 512, 512);

  // Fine regolith speckle & pebbles
  for (let i = 0; i < 4200; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 0.8 + Math.random() * 2.2;
    const bright = Math.random() > 0.5;
    if (world === 'MOON') {
      ctx.fillStyle = bright ? 'rgba(205,215,230,0.18)' : 'rgba(30,36,48,0.22)';
    } else {
      ctx.fillStyle = bright ? 'rgba(235,145,95,0.2)' : 'rgba(82,28,14,0.22)';
    }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle craters
  for (let c = 0; c < 14; c++) {
    const cx = Math.random() * 512;
    const cy = Math.random() * 512;
    const rad = 12 + Math.random() * 26;
    const grad = ctx.createRadialGradient(cx, cy, rad * 0.2, cx, cy, rad);
    if (world === 'MOON') {
      grad.addColorStop(0, 'rgba(32,38,48,0.35)');
      grad.addColorStop(0.75, 'rgba(48,55,68,0.2)');
      grad.addColorStop(1, 'rgba(180,192,210,0.14)');
    } else {
      grad.addColorStop(0, 'rgba(72,24,10,0.35)');
      grad.addColorStop(0.75, 'rgba(128,55,30,0.18)');
      grad.addColorStop(1, 'rgba(220,120,76,0.14)');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSolarCellTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0F2958';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 256; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeDeckTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 240, 240);
  // Subtle safety strip
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(0, 0, 256, 10);
  ctx.fillRect(0, 246, 256, 10);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 5);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createAstronautHero(world: WorldBody) {
  const root = new THREE.Group();

  const suitMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.45,
    metalness: 0.15
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: world === 'MOON' ? 0x2563eb : 0xea580c,
    roughness: 0.35,
    metalness: 0.25
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.75,
    metalness: 0.3
  });
  const visorMat = new THREE.MeshPhysicalMaterial({
    color: 0xfbbf24,
    metalness: 0.92,
    roughness: 0.12,
    clearcoat: 1.0
  });

  // Left & Right Legs (pivoted at hip y=0.82)
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.2, 0.82, 0);
  const legGeo = new THREE.CapsuleGeometry(0.13, 0.42, 6, 10);
  const bootGeo = new THREE.BoxGeometry(0.28, 0.16, 0.38);

  const leftLegMesh = new THREE.Mesh(legGeo, suitMat);
  leftLegMesh.position.y = -0.3;
  leftLegMesh.castShadow = true;
  const leftBoot = new THREE.Mesh(bootGeo, bootMat);
  leftBoot.position.set(0, -0.74, 0.05);
  leftBoot.castShadow = true;
  leftLegPivot.add(leftLegMesh, leftBoot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.2, 0.82, 0);
  const rightLegMesh = new THREE.Mesh(legGeo, suitMat);
  rightLegMesh.position.y = -0.3;
  rightLegMesh.castShadow = true;
  const rightBoot = new THREE.Mesh(bootGeo, bootMat);
  rightBoot.position.set(0, -0.74, 0.05);
  rightBoot.castShadow = true;
  rightLegPivot.add(rightLegMesh, rightBoot);

  // Torso + Belt + PLSS Backpack
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.78, 0.44), suitMat);
  torso.position.y = 1.24;
  torso.castShadow = true;

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.71, 0.14, 0.47), trimMat);
  belt.position.y = 0.94;

  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.66, 0.28), trimMat);
  backpack.position.set(0, 1.28, -0.32);
  backpack.castShadow = true;

  // Helmet + Gold Visor
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 14), suitMat);
  helmet.position.set(0, 1.88, 0.02);
  helmet.castShadow = true;

  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 16, 12, 0, Math.PI * 2, 0.25, Math.PI * 0.55),
    visorMat
  );
  visor.rotation.x = Math.PI * 0.48;
  visor.position.set(0, 1.88, 0.11);

  // Arms
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.44, 1.54, 0);
  const armGeo = new THREE.CapsuleGeometry(0.11, 0.4, 6, 10);
  const leftArm = new THREE.Mesh(armGeo, suitMat);
  leftArm.position.y = -0.26;
  leftArm.castShadow = true;
  leftArmPivot.add(leftArm);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.44, 1.54, 0);
  const rightArm = new THREE.Mesh(armGeo, suitMat);
  rightArm.position.y = -0.26;
  rightArm.castShadow = true;
  rightArmPivot.add(rightArm);

  // Contact shadow disc
  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.56, 20),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.32,
      depthWrite: false
    })
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.03;

  root.add(
    leftLegPivot,
    rightLegPivot,
    torso,
    belt,
    backpack,
    helmet,
    visor,
    leftArmPivot,
    rightArmPivot,
    shadowDisc
  );

  return {
    root,
    leftLegPivot,
    rightLegPivot,
    leftArmPivot,
    rightArmPivot,
    shadowDisc
  };
}

export function Outpost3DViewport({
  world,
  phase,
  systems,
  power,
  activeEmergencyStation,
  nearestStation,
  jumpNonce,
  dpadRef,
  onNearestStationChange,
  onSelectStation,
  onFootstepJump
}: Outpost3DViewportProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglFallback, setWebglFallback] = useState(false);

  // Refs synced from React props so the WebGL loop never tears down!
  const systemsRef = useRef(systems);
  const powerRef = useRef(power);
  const emergencyStationRef = useRef(activeEmergencyStation);
  const nearestStationPropRef = useRef(nearestStation);
  const phaseRef = useRef(phase);
  const callbacksRef = useRef({
    onNearestStationChange,
    onSelectStation,
    onFootstepJump
  });

  systemsRef.current = systems;
  powerRef.current = power;
  emergencyStationRef.current = activeEmergencyStation;
  nearestStationPropRef.current = nearestStation;
  phaseRef.current = phase;
  callbacksRef.current = {
    onNearestStationChange,
    onSelectStation,
    onFootstepJump
  };

  // Trigger jump from bottom-dock button too
  const externalJumpTriggerRef = useRef(0);
  useEffect(() => {
    if (jumpNonce > 0) {
      externalJumpTriggerRef.current = jumpNonce;
    }
  }, [jumpNonce]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect Software WebGL cleanly per Three.js skill protocol
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
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance'
      });
    } catch {
      setWebglFallback(true);
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
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = Math.max(300, container.clientWidth);
    const height = Math.max(240, container.clientHeight);
    renderer.setSize(width, height, false);

    const scene = new THREE.Scene();
    const skyColor = world === 'MOON' ? 0x070b16 : 0x724024;
    scene.background = new THREE.Color(skyColor);
    scene.fog = new THREE.FogExp2(skyColor, world === 'MOON' ? 0.011 : 0.018);

    // Mandatory studio environment map via RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(52, width / height, 0.2, 220);
    camera.position.set(0, 12, 19);

    // 3-Point Warm/Cool Lighting Rig
    const hemiLight = new THREE.HemisphereLight(
      world === 'MOON' ? 0xcbd5e1 : 0xfdba74,
      world === 'MOON' ? 0x1e293b : 0x431407,
      0.85
    );
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(world === 'MOON' ? 0xfff7ed : 0xffedd5, 2.3);
    keyLight.position.set(22, 32, 18);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 90;
    const d = 28;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.65);
    rimLight.position.set(-20, 14, -22);
    scene.add(rimLight);

    // Track disposable resources
    const disposables: { dispose: () => void }[] = [envTex];
    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    // Ground Terrain
    const groundTex = makeProceduralTerrainTexture(world);
    groundTex.anisotropy = maxAniso;
    disposables.push(groundTex);

    const groundGeo = new THREE.CircleGeometry(70, 48);
    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTex,
      roughness: 0.92,
      metalness: 0.05
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);
    disposables.push(groundGeo, groundMat);

    // Sky Objects: Stars + Earth (Moon) or Faint Sun/Phobos (Mars)
    const starPositions = new Float32Array(260 * 3);
    for (let i = 0; i < 260; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.42;
      const r = 82;
      starPositions[i * 3] = r * Math.cos(theta) * Math.cos(phi);
      starPositions[i * 3 + 1] = 16 + r * Math.sin(phi);
      starPositions[i * 3 + 2] = r * Math.sin(theta) * Math.cos(phi);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xf8fafc,
      size: world === 'MOON' ? 0.65 : 0.35,
      transparent: true,
      opacity: world === 'MOON' ? 0.9 : 0.4
    });
    scene.add(new THREE.Points(starGeo, starMat));
    disposables.push(starGeo, starMat);

    if (world === 'MOON') {
      const earthGeo = new THREE.SphereGeometry(4.8, 24, 20);
      const earthMat = new THREE.MeshStandardMaterial({
        color: 0x2563eb,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.35,
        roughness: 0.65
      });
      const earthMesh = new THREE.Mesh(earthGeo, earthMat);
      earthMesh.position.set(-28, 24, -46);
      scene.add(earthMesh);
      disposables.push(earthGeo, earthMat);
    }

    // Instanced Perimeter Rocks (Natural Outdoor Boundary)
    const rockGeo = new THREE.DodecahedronGeometry(1.0, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: world === 'MOON' ? 0x64748b : 0x9a3412,
      roughness: 0.9,
      metalness: 0.05
    });
    const rockCount = 44;
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
    const rockColor = new THREE.Color();
    for (let i = 0; i < rockCount; i++) {
      const angle = (i / rockCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.15;
      const dist = 22 + Math.random() * 18;
      const s = 0.6 + Math.random() * 1.9;
      _dummy.position.set(Math.cos(angle) * dist, s * 0.32, Math.sin(angle) * dist);
      _dummy.rotation.set(Math.random() * 2, Math.random() * 3, Math.random() * 2);
      _dummy.scale.set(s * 1.15, s * 0.72, s);
      _dummy.updateMatrix();
      rocks.setMatrixAt(i, _dummy.matrix);
      rockColor.setHex(world === 'MOON' ? 0x64748b : 0x9a3412).offsetHSL(0, 0, (Math.random() - 0.5) * 0.12);
      rocks.setColorAt(i, rockColor);
    }
    rocks.computeBoundingSphere();
    rocks.castShadow = !isSoftwareGl;
    rocks.receiveShadow = true;
    scene.add(rocks);
    disposables.push(rockGeo, rockMat);

    // Metallic Walkways connecting Central Hub to 4 Outer Stations
    const deckTex = makeDeckTexture();
    deckTex.anisotropy = maxAniso;
    const deckMat = new THREE.MeshStandardMaterial({
      map: deckTex,
      roughness: 0.55,
      metalness: 0.5
    });
    disposables.push(deckTex, deckMat);

    BASE_STATIONS.forEach((st) => {
      if (st.id === 'COMMAND_BRIDGE') return;
      const [sx, , sz] = st.position;
      const len = Math.hypot(sx, sz);
      const pathGeo = new THREE.BoxGeometry(2.3, 0.08, len);
      const pathMesh = new THREE.Mesh(pathGeo, deckMat);
      pathMesh.position.set(sx / 2, 0.04, sz / 2);
      pathMesh.rotation.y = Math.atan2(sx, sz);
      pathMesh.receiveShadow = true;
      scene.add(pathMesh);
      disposables.push(pathGeo);
    });

    // Dynamic Visual State Handles for the 5 Composite Stations
    const stationClickMeshes: THREE.Object3D[] = [];
    const beaconMeshes = new Map<StationId, THREE.Mesh>();
    const padRingMats = new Map<StationId, THREE.MeshBasicMaterial>();

    let solarDustMat: THREE.MeshStandardMaterial | null = null;
    let cryoFrostMat: THREE.MeshStandardMaterial | null = null;
    let o2Bubbles: THREE.Mesh[] = [];
    let growLightMat: THREE.MeshStandardMaterial | null = null;
    let cropFoliageMat: THREE.MeshStandardMaterial | null = null;
    let radiatorFinMat: THREE.MeshStandardMaterial | null = null;
    let radarDishGroup: THREE.Group | null = null;
    let forcefieldDomeMat: THREE.MeshBasicMaterial | null = null;
    let forcefieldDomeMesh: THREE.Mesh | null = null;

    const solarTex = makeSolarCellTexture();
    solarTex.anisotropy = maxAniso;
    disposables.push(solarTex);

    const metalBodyMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.35,
      metalness: 0.6
    });
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.75
    });
    const glassDomeMat = new THREE.MeshPhysicalMaterial({
      color: 0xbae6fd,
      roughness: 0.12,
      metalness: 0.05,
      transparent: true,
      opacity: 0.38,
      depthWrite: false
    });
    disposables.push(metalBodyMat, darkMetalMat, glassDomeMat);

    // Build all 5 Composite 3-12 part Station Groups
    BASE_STATIONS.forEach((station) => {
      const group = new THREE.Group();
      group.position.set(station.position[0], 0, station.position[2]);

      // Base Landing Pad + Status Ring
      const padGeo = new THREE.CylinderGeometry(3.5, 3.8, 0.22, 24);
      const padMesh = new THREE.Mesh(padGeo, darkMetalMat);
      padMesh.position.y = 0.11;
      padMesh.receiveShadow = true;
      group.add(padMesh);
      disposables.push(padGeo);

      const ringGeo = new THREE.RingGeometry(3.65, 4.05, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(station.accentHex),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.72
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.y = 0.05;
      group.add(ringMesh);
      padRingMats.set(station.id, ringMat);
      disposables.push(ringGeo, ringMat);

      // Station-Specific Multi-Part Architecture
      if (station.id === 'COMMAND_BRIDGE') {
        const hull = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.1, 1.5, 8), metalBodyMat);
        hull.position.y = 0.95;
        hull.castShadow = true;
        const cupola = new THREE.Mesh(new THREE.SphereGeometry(2.1, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), glassDomeMat);
        cupola.position.y = 1.7;
        const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 3.2, 10), darkMetalMat);
        spire.position.y = 3.2;
        const emitterOrb = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.45, 0),
          new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            emissive: 0x0ea5e9,
            emissiveIntensity: 1.4,
            roughness: 0.2
          })
        );
        emitterOrb.position.y = 4.9;

        radarDishGroup = new THREE.Group();
        radarDishGroup.position.set(1.5, 2.2, -1.2);
        const dishMast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.9, 8), darkMetalMat);
        const dishBowl = new THREE.Mesh(
          new THREE.ConeGeometry(0.7, 0.45, 16, 1, true),
          metalBodyMat
        );
        dishBowl.position.y = 0.5;
        dishBowl.rotation.x = Math.PI * 0.65;
        radarDishGroup.add(dishMast, dishBowl);

        group.add(hull, cupola, spire, emitterOrb, radarDishGroup);

        // Base-wide Protective Forcefield Energy Dome
        forcefieldDomeMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.08,
          wireframe: true,
          depthWrite: false
        });
        forcefieldDomeMesh = new THREE.Mesh(
          new THREE.SphereGeometry(22.5, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5),
          forcefieldDomeMat
        );
        group.add(forcefieldDomeMesh);
      } else if (station.id === 'SOLAR_GRID') {
        const panelMat = new THREE.MeshStandardMaterial({
          map: solarTex,
          roughness: 0.28,
          metalness: 0.45
        });
        solarDustMat = new THREE.MeshStandardMaterial({
          color: world === 'MOON' ? 0x64748b : 0xb45309,
          transparent: true,
          opacity: 0.15,
          roughness: 0.95
        });
        cryoFrostMat = new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0xd97706,
          emissiveIntensity: 0.5,
          roughness: 0.3,
          metalness: 0.6
        });

        [-1.6, 1.6].forEach((offsetX) => {
          const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 2.5, 10), darkMetalMat);
          mast.position.set(offsetX, 1.35, -0.6);
          const wing = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 2.1), panelMat);
          wing.position.set(offsetX, 2.6, -0.6);
          wing.rotation.x = 0.42;
          wing.castShadow = true;
          const dustSheet = new THREE.Mesh(new THREE.BoxGeometry(2.52, 0.03, 2.12), solarDustMat!);
          dustSheet.position.set(offsetX, 2.66, -0.6);
          dustSheet.rotation.x = 0.42;
          group.add(mast, wing, dustSheet);
        });

        // 3 Cryo-Battery Storage Tanks
        [-1.3, 0, 1.3].forEach((bx) => {
          const cell = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.25, 12), cryoFrostMat!);
          cell.position.set(bx, 0.84, 1.45);
          cell.castShadow = true;
          group.add(cell);
        });
      } else if (station.id === 'LIFE_SUPPORT') {
        const tankBody = new THREE.Mesh(
          new THREE.CylinderGeometry(1.15, 1.15, 2.6, 18),
          glassDomeMat
        );
        tankBody.position.set(-0.9, 1.55, 0);
        const waterCore = new THREE.Mesh(
          new THREE.CylinderGeometry(0.95, 0.95, 2.1, 16),
          new THREE.MeshStandardMaterial({
            color: 0x0ea5e9,
            emissive: 0x0284c7,
            emissiveIntensity: 0.45,
            transparent: true,
            opacity: 0.65,
            roughness: 0.15
          })
        );
        waterCore.position.set(-0.9, 1.32, 0);

        for (let b = 0; b < 5; b++) {
          const bubble = new THREE.Mesh(
            new THREE.SphereGeometry(0.13, 10, 8),
            new THREE.MeshBasicMaterial({ color: 0xe0f2fe })
          );
          bubble.position.set(-0.9 + (b - 2) * 0.2, 0.5 + b * 0.45, (b % 2) * 0.25);
          o2Bubbles.push(bubble);
          group.add(bubble);
        }

        const scrubberBox = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.9, 1.7), metalBodyMat);
        scrubberBox.position.set(1.2, 1.15, -0.2);
        scrubberBox.castShadow = true;
        const airlockRing = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.14, 10, 20), darkMetalMat);
        airlockRing.position.set(1.2, 1.25, 0.72);

        group.add(tankBody, waterCore, scrubberBox, airlockRing);
      } else if (station.id === 'HYDROPONICS') {
        const dome = new THREE.Mesh(
          new THREE.SphereGeometry(2.75, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.52),
          glassDomeMat
        );
        dome.position.y = 0.22;
        growLightMat = new THREE.MeshStandardMaterial({
          color: 0xf472b6,
          emissive: 0xec4899,
          emissiveIntensity: 1.3
        });
        cropFoliageMat = new THREE.MeshStandardMaterial({
          color: 0x10b981,
          roughness: 0.65
        });

        const lightBar = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.14, 0.45), growLightMat);
        lightBar.position.set(0, 2.25, 0);

        [-1.1, 0, 1.1].forEach((cz) => {
          const planter = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.35, 0.65), darkMetalMat);
          planter.position.set(0, 0.42, cz);
          const crops = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.42, 0.48), cropFoliageMat!);
          crops.position.set(0, 0.76, cz);
          group.add(planter, crops);
        });

        group.add(dome, lightBar);
      } else if (station.id === 'THERMAL_WORKSHOP') {
        radiatorFinMat = new THREE.MeshStandardMaterial({
          color: 0x475569,
          emissive: 0x000000,
          roughness: 0.32,
          metalness: 0.8
        });
        const hubCore = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.7, 1.9), metalBodyMat);
        hubCore.position.set(-0.7, 1.05, 0);
        hubCore.castShadow = true;

        // 3 External Vacuum Radiator Wings
        [-0.7, 0, 0.7].forEach((rz) => {
          const fin = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.8, 0.12), radiatorFinMat!);
          fin.position.set(1.25, 1.7, rz);
          fin.rotation.z = -0.25;
          fin.castShadow = true;
          group.add(fin);
        });

        // 3D Printer Workbench
        const printerFrame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.2, 1.0), darkMetalMat);
        printerFrame.position.set(-0.7, 2.45, 0);
        const spool = new THREE.Mesh(
          new THREE.TorusGeometry(0.28, 0.09, 8, 16),
          new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4 })
        );
        spool.position.set(-0.7, 3.25, 0);
        group.add(hubCore, printerFrame, spool);
      }

      // Floating Overhead Beacon Diamond
      const beacon = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.42, 0),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(station.accentHex),
          emissive: new THREE.Color(station.accentHex),
          emissiveIntensity: 0.85,
          roughness: 0.2
        })
      );
      beacon.position.y = 4.35;
      group.add(beacon);
      beaconMeshes.set(station.id, beacon);

      // Invisible clickable proxy cylinder for fast raycasting
      const proxy = new THREE.Mesh(
        new THREE.CylinderGeometry(3.6, 3.6, 4.5, 12),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      proxy.position.y = 2.25;
      proxy.userData.stationId = station.id;
      group.add(proxy);
      stationClickMeshes.push(proxy);

      scene.add(group);
    });

    // Target Waypoint Ring for Click-to-Walk
    const waypointGeo = new THREE.RingGeometry(0.45, 0.68, 24);
    const waypointMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    const waypointMesh = new THREE.Mesh(waypointGeo, waypointMat);
    waypointMesh.rotation.x = -Math.PI / 2;
    waypointMesh.position.y = 0.06;
    waypointMesh.visible = false;
    scene.add(waypointMesh);
    disposables.push(waypointGeo, waypointMat);

    // Astronaut Player
    const hero = createAstronautHero(world);
    hero.root.position.set(0, 0, 4.5);
    scene.add(hero.root);

    // Physics & Movement State
    const keys: Record<string, boolean> = {};
    let playerVy = 0;
    let isGrounded = true;
    let walkTime = 0;
    let walkTarget: THREE.Vector3 | null = null;
    let pendingStationOpen: StationId | null = null;
    let lastHandledJumpNonce = 0;
    let lastNearestSent: StationId | null = null;

    // Camera Orbit State
    let camYaw = 0;
    let camPitch = 0.48;
    let camDistance = 15.5;
    let isDraggingCam = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let pointerMovedDist = 0;
    let camPosCurrent = new THREE.Vector3(0, 11, 20);
    let camLookCurrent = new THREE.Vector3(0, 1.5, 4.5);

    const triggerJump = () => {
      if (!isGrounded) return;
      playerVy = world === 'MOON' ? 6.6 : 8.2; // Moon floaty vs Mars snappier arc
      isGrounded = false;
      callbacksRef.current.onFootstepJump();
      soundEngine.playButtonClick('tab');
      haptics.tick();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      keys[e.code] = true;

      if (e.code === 'Space' && phaseRef.current === 'ACTIVE_SHIFT') {
        e.preventDefault();
        triggerJump();
      }
      if (e.code === 'KeyE' && phaseRef.current === 'ACTIVE_SHIFT') {
        if (lastNearestSent) {
          callbacksRef.current.onSelectStation(lastNearestSent);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };

    const handlePointerDown = (e: PointerEvent) => {
      isDraggingCam = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      pointerMovedDist = 0;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingCam) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      pointerMovedDist += Math.hypot(dx, dy);
      camYaw -= dx * 0.0065;
      camPitch = THREE.MathUtils.clamp(camPitch + dy * 0.0045, 0.22, 1.15);
    };

    const handlePointerUp = (e: PointerEvent) => {
      const wasClick = isDraggingCam && pointerMovedDist < 7;
      isDraggingCam = false;
      if (!wasClick || phaseRef.current !== 'ACTIVE_SHIFT') return;

      const rect = canvas.getBoundingClientRect();
      _pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      _raycaster.setFromCamera(_pointerNdc, camera);

      const stationHits = _raycaster.intersectObjects(stationClickMeshes, false);
      if (stationHits.length > 0) {
        const hitId = stationHits[0].object.userData.stationId as StationId;
        const st = BASE_STATIONS.find((s) => s.id === hitId);
        if (st) {
          const dist = Math.hypot(
            hero.root.position.x - st.position[0],
            hero.root.position.z - st.position[2]
          );
          if (dist < 4.8) {
            callbacksRef.current.onSelectStation(hitId);
          } else {
            // Walk straight to station edge and open it on arrival
            _vec3A.set(st.position[0], 0, st.position[2]);
            _vec3B.subVectors(hero.root.position, _vec3A).setY(0);
            if (_vec3B.lengthSq() < 0.01) _vec3B.set(0, 0, 1);
            _vec3B.normalize().multiplyScalar(3.3);
            walkTarget = _vec3A.clone().add(_vec3B);
            pendingStationOpen = hitId;
            waypointMesh.position.set(walkTarget.x, 0.06, walkTarget.z);
            waypointMesh.visible = true;
            haptics.tick();
          }
          return;
        }
      }

      if (_raycaster.ray.intersectPlane(_groundPlane, _hitPoint)) {
        const clampedR = Math.min(20, Math.hypot(_hitPoint.x, _hitPoint.z));
        const ang = Math.atan2(_hitPoint.z, _hitPoint.x);
        walkTarget = new THREE.Vector3(Math.cos(ang) * clampedR, 0, Math.sin(ang) * clampedR);
        pendingStationOpen = null;
        waypointMesh.position.set(walkTarget.x, 0.06, walkTarget.z);
        waypointMesh.visible = true;
        haptics.tick();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      camDistance = THREE.MathUtils.clamp(camDistance + e.deltaY * 0.012, 8.5, 25);
    };

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglFallback(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('webglcontextlost', handleContextLost);

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

    // Pre-compile shaders cleanly on GPUs
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let frameId = 0;
    let disposed = false;
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
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const gravityAccel = world === 'MOON' ? 9.5 : 17.2; // Visual game-scaled 0.16g vs 0.38g!

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(0.08, clock.getDelta());
      const elapsed = clock.getElapsedTime();
      const sys = systemsRef.current;
      const pwr = powerRef.current;

      // External jump button trigger
      if (externalJumpTriggerRef.current !== lastHandledJumpNonce) {
        lastHandledJumpNonce = externalJumpTriggerRef.current;
        if (phaseRef.current === 'ACTIVE_SHIFT') {
          triggerJump();
        }
      }

      // 1. Player Movement (WASD / Arrows + Dpad + Click-to-Walk)
      let moveX = dpadRef.current.x;
      let moveZ = dpadRef.current.z;
      if (keys['KeyW'] || keys['ArrowUp']) moveZ -= 1;
      if (keys['KeyS'] || keys['ArrowDown']) moveZ += 1;
      if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
      if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;

      const hasManualInput = Math.abs(moveX) > 0.05 || Math.abs(moveZ) > 0.05;
      if (hasManualInput) {
        walkTarget = null;
        pendingStationOpen = null;
        waypointMesh.visible = false;
      }

      const isWalkingEnabled = phaseRef.current === 'ACTIVE_SHIFT';
      let movingSpeed = 0;

      if (isWalkingEnabled) {
        if (hasManualInput) {
          // Camera-relative movement direction
          const sinY = Math.sin(camYaw);
          const cosY = Math.cos(camYaw);
          const worldDx = moveX * cosY + moveZ * sinY;
          const worldDz = moveZ * cosY - moveX * sinY;
          _vec3A.set(worldDx, 0, worldDz).normalize();
          const speed = keys['ShiftLeft'] || keys['ShiftRight'] ? 10.5 : 7.2;
          hero.root.position.x += _vec3A.x * speed * dt;
          hero.root.position.z += _vec3A.z * speed * dt;
          const targetRot = Math.atan2(_vec3A.x, _vec3A.z);
          hero.root.rotation.y = targetRot;
          movingSpeed = speed;
        } else if (walkTarget) {
          _vec3A.subVectors(walkTarget, hero.root.position).setY(0);
          const dist = _vec3A.length();
          if (dist < 0.35) {
            walkTarget = null;
            waypointMesh.visible = false;
            if (pendingStationOpen) {
              const targetId = pendingStationOpen;
              pendingStationOpen = null;
              callbacksRef.current.onSelectStation(targetId);
            }
          } else {
            _vec3A.normalize();
            const speed = 7.6;
            hero.root.position.x += _vec3A.x * speed * dt;
            hero.root.position.z += _vec3A.z * speed * dt;
            hero.root.rotation.y = Math.atan2(_vec3A.x, _vec3A.z);
            movingSpeed = speed;
          }
        }

        // Clamp astronaut inside outer boulder perimeter
        const radial = Math.hypot(hero.root.position.x, hero.root.position.z);
        if (radial > 20.5) {
          const scale = 20.5 / radial;
          hero.root.position.x *= scale;
          hero.root.position.z *= scale;
        }
      }

      // Gravity Jump Physics (0.16g Moon vs 0.38g Mars)
      if (!isGrounded || playerVy > 0) {
        playerVy -= gravityAccel * dt;
        hero.root.position.y += playerVy * dt;
        if (hero.root.position.y <= 0) {
          hero.root.position.y = 0;
          playerVy = 0;
          isGrounded = true;
        }
      }

      // Astronaut Limb Walk Animation
      if (movingSpeed > 0.1 && isGrounded) {
        walkTime += dt * movingSpeed * 1.45;
        const swing = Math.sin(walkTime) * 0.55;
        hero.leftLegPivot.rotation.x = swing;
        hero.rightLegPivot.rotation.x = -swing;
        hero.leftArmPivot.rotation.x = -swing * 0.8;
        hero.rightArmPivot.rotation.x = swing * 0.8;
      } else {
        hero.leftLegPivot.rotation.x = THREE.MathUtils.damp(hero.leftLegPivot.rotation.x, 0, 10, dt);
        hero.rightLegPivot.rotation.x = THREE.MathUtils.damp(hero.rightLegPivot.rotation.x, 0, 10, dt);
        hero.leftArmPivot.rotation.x = THREE.MathUtils.damp(hero.leftArmPivot.rotation.x, 0, 10, dt);
        hero.rightArmPivot.rotation.x = THREE.MathUtils.damp(hero.rightArmPivot.rotation.x, 0, 10, dt);
      }
      const shadowScale = THREE.MathUtils.clamp(1 - hero.root.position.y * 0.12, 0.35, 1);
      hero.shadowDisc.scale.setScalar(shadowScale);
      hero.shadowDisc.position.y = 0.03 - hero.root.position.y;

      // 2. Proximity Station Detection
      let closestId: StationId | null = null;
      let closestDist = 999;
      for (const st of BASE_STATIONS) {
        const dSt = Math.hypot(
          hero.root.position.x - st.position[0],
          hero.root.position.z - st.position[2]
        );
        if (dSt < 4.8 && dSt < closestDist) {
          closestDist = dSt;
          closestId = st.id;
        }
      }
      if (closestId !== lastNearestSent) {
        lastNearestSent = closestId;
        callbacksRef.current.onNearestStationChange(closestId, closestDist);
      }

      // 3. Real-Time Visual Coupling to Space Physics Telemetry
      if (solarDustMat) {
        solarDustMat.opacity = THREE.MathUtils.clamp(sys.dustCoatPct / 80, 0.02, 0.88);
      }
      if (cryoFrostMat) {
        if (sys.frozenCells > 0) {
          cryoFrostMat.color.setHex(0x60a5fa);
          cryoFrostMat.emissive.setHex(0x3b82f6);
        } else {
          cryoFrostMat.color.setHex(0xf59e0b);
          cryoFrostMat.emissive.setHex(0xd97706);
        }
      }
      if (growLightMat) {
        growLightMat.emissiveIntensity = THREE.MathUtils.clamp(pwr.growHeatKw / 25, 0.25, 1.8);
      }
      if (cropFoliageMat) {
        cropFoliageMat.color.setHex(sys.bioContamActive ? 0xa3e635 : 0x10b981);
      }
      if (radiatorFinMat) {
        if (sys.cabinTempC >= 34 || sys.radiatorHealthPct < 80) {
          radiatorFinMat.emissive.setHex(0xea580c);
          radiatorFinMat.emissiveIntensity = 0.65 + Math.sin(elapsed * 5) * 0.25;
        } else {
          radiatorFinMat.emissive.setHex(0x000000);
          radiatorFinMat.emissiveIntensity = 0;
        }
      }
      if (radarDishGroup) {
        radarDishGroup.rotation.y += dt * (sys.radarScrambled ? 4.2 : 0.7);
      }
      if (forcefieldDomeMat && forcefieldDomeMesh) {
        const isStorm = phaseRef.current === 'STORM_SIM';
        const shieldOn = pwr.shieldingKw > 0 || sys.sunBlanketActive || isStorm;
        forcefieldDomeMesh.visible = shieldOn;
        forcefieldDomeMat.color.setHex(
          sys.sunBlanketActive ? 0xfbbf24 : isStorm ? 0x38bdf8 : 0x0ea5e9
        );
        forcefieldDomeMat.opacity = isStorm
          ? 0.28 + Math.sin(elapsed * 8) * 0.08
          : THREE.MathUtils.clamp(pwr.shieldingKw / 250, 0.03, 0.14);
      }

      // Animate O2 bubbles in Electrolysis column
      o2Bubbles.forEach((bub, idx) => {
        bub.position.y += dt * (0.4 + pwr.electrolysisKw * 0.015);
        if (bub.position.y > 2.35) bub.position.y = 0.45 + (idx % 2) * 0.12;
      });

      // Animate Station Beacons & Pad Highlight Rings
      const emStation = emergencyStationRef.current;
      beaconMeshes.forEach((mesh, id) => {
        const isEmergency = id === emStation;
        const isNear = id === closestId;
        mesh.rotation.y += dt * (isEmergency ? 4.5 : 1.4);
        mesh.position.y = 4.35 + Math.sin(elapsed * (isEmergency ? 6 : 2.5)) * (isEmergency ? 0.35 : 0.14);
        mesh.scale.setScalar(isEmergency ? 1.45 : isNear ? 1.2 : 1.0);
        const bMat = mesh.material as THREE.MeshStandardMaterial;
        const ringM = padRingMats.get(id);
        if (isEmergency) {
          bMat.color.setHex(0xef4444);
          bMat.emissive.setHex(0xdc2626);
          if (ringM) {
            ringM.color.setHex(0xef4444);
            ringM.opacity = 0.95;
          }
        } else {
          const stMeta = BASE_STATIONS.find((s) => s.id === id);
          const hex = stMeta ? new THREE.Color(stMeta.accentHex) : new THREE.Color(0x38bdf8);
          bMat.color.copy(hex);
          bMat.emissive.copy(hex);
          if (ringM) {
            ringM.color.copy(hex);
            ringM.opacity = isNear ? 0.95 : 0.55;
          }
        }
      });

      if (waypointMesh.visible) {
        waypointMesh.rotation.z += dt * 2.5;
      }

      // 4. Smooth Damped Third-Person Camera (or scenic orbit on Onboarding/Debrief)
      if (phaseRef.current === 'ACTIVE_SHIFT') {
        const targetCamX = hero.root.position.x + Math.sin(camYaw) * Math.cos(camPitch) * camDistance;
        const targetCamY = hero.root.position.y + 1.8 + Math.sin(camPitch) * camDistance;
        const targetCamZ = hero.root.position.z + Math.cos(camYaw) * Math.cos(camPitch) * camDistance;

        camPosCurrent.x = THREE.MathUtils.damp(camPosCurrent.x, targetCamX, 7, dt);
        camPosCurrent.y = THREE.MathUtils.damp(camPosCurrent.y, targetCamY, 7, dt);
        camPosCurrent.z = THREE.MathUtils.damp(camPosCurrent.z, targetCamZ, 7, dt);

        camLookCurrent.x = THREE.MathUtils.damp(camLookCurrent.x, hero.root.position.x, 9, dt);
        camLookCurrent.y = THREE.MathUtils.damp(camLookCurrent.y, hero.root.position.y + 1.4, 9, dt);
        camLookCurrent.z = THREE.MathUtils.damp(camLookCurrent.z, hero.root.position.z, 9, dt);
      } else {
        const orbitAngle = elapsed * 0.14;
        const orbitX = Math.sin(orbitAngle) * 23;
        const orbitZ = Math.cos(orbitAngle) * 23;
        camPosCurrent.x = THREE.MathUtils.damp(camPosCurrent.x, orbitX, 3.5, dt);
        camPosCurrent.y = THREE.MathUtils.damp(camPosCurrent.y, 13.5, 3.5, dt);
        camPosCurrent.z = THREE.MathUtils.damp(camPosCurrent.z, orbitZ, 3.5, dt);
        camLookCurrent.x = THREE.MathUtils.damp(camLookCurrent.x, 0, 4, dt);
        camLookCurrent.y = THREE.MathUtils.damp(camLookCurrent.y, 1.5, 4, dt);
        camLookCurrent.z = THREE.MathUtils.damp(camLookCurrent.z, 0, 4, dt);
      }

      camera.position.copy(camPosCurrent);
      camera.lookAt(camLookCurrent);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      disposables.forEach((dObj) => dObj.dispose());
      renderer.dispose();
    };
  }, [world, dpadRef]);

  if (webglFallback) {
    return (
      <div className="w-full h-full bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-8 text-center">
        <h2 className="font-display text-2xl font-bold mb-2">
          {world === 'MOON' ? 'Moon Outpost Alpha (0.16g)' : 'Mars Outpost Base (0.38g)'}
        </h2>
        <p className="text-sm text-slate-400 max-w-md mb-6">
          Interactive 3D view is unavailable on this browser, but all 5 base stations and emergency
          physics controls remain active below.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-3xl">
          {BASE_STATIONS.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => onSelectStation(st.id)}
              className="p-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-sky-400 text-xs font-bold cursor-pointer"
            >
              {st.shortName}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className="w-full h-full select-none cursor-grab active:cursor-grabbing"
      aria-label="Interactive 3D Moon and Mars Base Walking Viewport"
    />
  );
}
