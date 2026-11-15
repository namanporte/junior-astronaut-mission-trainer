import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BASE_STATIONS } from '../data/scienceData';
import {
  ActiveActionSequence,
  BaseSystemsState,
  FlareSeverity,
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
  upcomingFlareSeverity?: FlareSeverity;
  activeAction?: ActiveActionSequence | null;
  activeEmergencyStation: StationId | null;
  nearestStation: StationId | null;
  jumpNonce: number;
  dpadRef: React.MutableRefObject<DpadVector>;
  onNearestStationChange: (station: StationId | null, distance: number) => void;
  onSelectStation: (station: StationId) => void;
  onFootstepJump: () => void;
  onActionStageChange?: (stage: 'WALKING' | 'WORKING') => void;
  onActionComplete?: () => void;
}

// Module-scope reusable math helpers (zero per-frame GC churn)
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _vec3Up = new THREE.Vector3(0, 1, 0);
const _quatA = new THREE.Quaternion();
const _quatYaw = new THREE.Quaternion();
const _raycaster = new THREE.Raycaster();
const _pointerNdc = new THREE.Vector2();
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _hitPoint = new THREE.Vector3();
const _dummy = new THREE.Object3D();

interface CraterDef {
  cx: number;
  cz: number;
  r: number;
  depth: number;
}

const TERRAIN_CRATERS: CraterDef[] = [
  { cx: 5.8, cz: -14.2, r: 4.8, depth: 1.7 },
  { cx: -6.4, cz: -14.6, r: 4.5, depth: 1.55 },
  { cx: -18.5, cz: 0.4, r: 5.4, depth: 1.9 },
  { cx: 18.2, cz: 0.3, r: 5.1, depth: 1.75 },
  { cx: 0.4, cz: 15.8, r: 5.6, depth: 1.95 },
  { cx: -5.4, cz: 4.8, r: 3.4, depth: 1.05 },
  { cx: -24.0, cz: -18.5, r: 8.2, depth: 2.5 },
  { cx: 24.5, cz: 17.5, r: 8.6, depth: 2.6 },
  { cx: -26.5, cz: 21.0, r: 7.5, depth: 2.25 },
  { cx: 23.0, cz: -21.5, r: 7.4, depth: 2.15 }
];

/**
 * Unflattened planetary geology: multi-octave hills, sharp ridged outcrops,
 * rough rocky micro-undulations, crater bowls with raised rims, and outer basin cliffs.
 */
function rawTerrainHeight(x: number, z: number, world: WorldBody): number {
  const r = Math.hypot(x, z);
  const amp = world === 'MOON' ? 1.48 : 1.32;

  // Rolling basin hills & valleys across the entire outpost
  const hills =
    Math.sin(x * 0.115 + 0.4) * Math.cos(z * 0.108 - 0.3) * 1.42 +
    Math.cos(x * 0.068 - z * 0.078 + 0.5) * 1.08;

  // Ridged craggy crests
  const r1 = 1 - Math.abs(Math.sin(x * 0.155 + z * 0.115));
  const r2 = 1 - Math.abs(Math.cos(x * 0.23 - z * 0.185 + 0.9));
  const ridges = (r1 * r1 * 1.3 + r2 * r2 * 0.72 - 0.82) * 0.95;

  // Rough rocky bumps & high-low uneven regolith
  const roughBumps =
    Math.sin(x * 0.46 + 1.1) * Math.cos(z * 0.51 - 0.6) * 0.34 +
    Math.sin(x * 0.88 - z * 0.82 + 0.4) * 0.17;

  // Impact crater bowls + raised ejecta rims
  let craterOffset = 0;
  for (let i = 0; i < TERRAIN_CRATERS.length; i++) {
    const c = TERRAIN_CRATERS[i];
    const d = Math.hypot(x - c.cx, z - c.cz) / c.r;
    if (d < 1.55) {
      if (d < 1.0) {
        craterOffset -= c.depth * (1 - d * d);
      }
      const rim = Math.exp(-Math.pow((d - 1.02) / 0.19, 2));
      craterOffset += c.depth * 0.42 * rim;
    }
  }

  // Dramatic surrounding crater rim & canyon walls
  const outerRim =
    THREE.MathUtils.smoothstep(r, 24.5, 42) * 2.2 +
    THREE.MathUtils.smoothstep(r, 42, 80) * 8.4;

  return amp * (hills + ridges * 0.85) + roughBumps + craterOffset + outerRim;
}

/**
 * Deterministic terrain elevation: preserves full rough high-and-low hills,
 * craters, and ridges across the yard while smoothly grading compact pads
 * directly beneath each of the 5 outpost modules.
 */
function sampleTerrainHeight(x: number, z: number, world: WorldBody): number {
  let h = rawTerrainHeight(x, z, world);
  for (let i = 0; i < BASE_STATIONS.length; i++) {
    const st = BASE_STATIONS[i];
    const sx = st.position[0];
    const sz = st.position[2];
    const d = Math.hypot(x - sx, z - sz);
    if (d < 5.4) {
      const padBase = rawTerrainHeight(sx, sz, world);
      const t = 1 - THREE.MathUtils.smoothstep(d, 3.25, 5.4);
      h = THREE.MathUtils.lerp(h, padBase, t);
    }
  }
  return h;
}

const CATWALK_SEGMENTS = 12;

interface CatwalkSpan {
  sx: number;
  sz: number;
  len: number;
  ux: number;
  uz: number;
  nodeY: number[];
}

function buildCatwalkSpans(world: WorldBody): CatwalkSpan[] {
  const startY = sampleTerrainHeight(0, 0, world) + 0.24;
  return BASE_STATIONS.filter((st) => st.id !== 'COMMAND_BRIDGE').map((st) => {
    const sx = st.position[0];
    const sz = st.position[2];
    const len = Math.hypot(sx, sz);
    const ux = sx / len;
    const uz = sz / len;
    const endY = sampleTerrainHeight(sx, sz, world) + 0.24;
    const nodeY: number[] = [];
    for (let i = 0; i <= CATWALK_SEGMENTS; i++) {
      const t = i / CATWALK_SEGMENTS;
      const px = sx * t;
      const pz = sz * t;
      const linearY = THREE.MathUtils.lerp(startY, endY, t);
      const groundClearY = sampleTerrainHeight(px, pz, world) + 0.16;
      nodeY.push(Math.max(linearY, groundClearY));
    }
    return { sx, sz, len, ux, uz, nodeY };
  });
}

const CATWALK_SPANS_BY_WORLD: Record<WorldBody, CatwalkSpan[]> = {
  MOON: buildCatwalkSpans('MOON'),
  MARS: buildCatwalkSpans('MARS')
};

/**
 * Physical surface elevation at (x, z) including terrain hills/craters,
 * station landing pads, and terrain-hugging catwalk ramps.
 */
function getSurfaceHeightAt(x: number, z: number, world: WorldBody): number {
  let h = sampleTerrainHeight(x, z, world);

  for (let i = 0; i < BASE_STATIONS.length; i++) {
    const st = BASE_STATIONS[i];
    const sx = st.position[0];
    const sz = st.position[2];
    if (Math.hypot(x - sx, z - sz) <= 3.92) {
      const padTop = sampleTerrainHeight(sx, sz, world) + 0.24;
      if (padTop > h) h = padTop;
    }
  }

  const spans = CATWALK_SPANS_BY_WORLD[world];
  for (let i = 0; i < spans.length; i++) {
    const sp = spans[i];
    const proj = x * sp.ux + z * sp.uz;
    if (proj >= 0 && proj <= sp.len) {
      const perp = Math.abs(x * sp.uz - z * sp.ux);
      if (perp <= 1.32) {
        const segFloat = (proj / sp.len) * CATWALK_SEGMENTS;
        const idx = Math.min(CATWALK_SEGMENTS - 1, Math.floor(segFloat));
        const frac = segFloat - idx;
        const deckTop = THREE.MathUtils.lerp(sp.nodeY[idx], sp.nodeY[idx + 1], frac) + 0.05;
        if (deckTop > h) h = deckTop;
      }
    }
  }

  return h;
}

function sampleTerrainNormal(
  x: number,
  z: number,
  world: WorldBody,
  out: THREE.Vector3
): THREE.Vector3 {
  const eps = 0.35;
  const hL = sampleTerrainHeight(x - eps, z, world);
  const hR = sampleTerrainHeight(x + eps, z, world);
  const hD = sampleTerrainHeight(x, z - eps, world);
  const hU = sampleTerrainHeight(x, z + eps, world);
  return out.set(hL - hR, 2 * eps, hD - hU).normalize();
}

/**
 * Generates paired photorealistic Regolith Albedo + Bump maps so sunlight
 * rakes across microscopic pebbles, wheel tracks, and micro-craters.
 */
function makeRegolithMaps(world: WorldBody): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 1024;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  cCtx.fillStyle = world === 'MOON' ? '#5E6573' : '#96492D';
  cCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // Organic multi-scale mineral variation
  for (let i = 0; i < 160; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const rad = 28 + Math.random() * 85;
    const g = cCtx.createRadialGradient(x, y, 2, x, y, rad);
    if (world === 'MOON') {
      g.addColorStop(0, i % 2 === 0 ? 'rgba(130,140,158,0.16)' : 'rgba(55,62,74,0.18)');
      g.addColorStop(1, 'rgba(94,101,115,0)');
    } else {
      g.addColorStop(0, i % 2 === 0 ? 'rgba(186,98,58,0.18)' : 'rgba(102,42,22,0.2)');
      g.addColorStop(1, 'rgba(150,73,45,0)');
    }
    cCtx.fillStyle = g;
    cCtx.beginPath();
    cCtx.arc(x, y, rad, 0, Math.PI * 2);
    cCtx.fill();
  }

  // Sharp fine regolith grit & rocks in both albedo and heightmap
  for (let i = 0; i < 14000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 0.6 + Math.random() * 2.4;
    const bright = Math.random() > 0.48;
    if (world === 'MOON') {
      cCtx.fillStyle = bright ? 'rgba(210,218,232,0.22)' : 'rgba(28,32,42,0.26)';
    } else {
      cCtx.fillStyle = bright ? 'rgba(232,144,96,0.22)' : 'rgba(68,22,12,0.24)';
    }
    cCtx.beginPath();
    cCtx.arc(x, y, r, 0, Math.PI * 2);
    cCtx.fill();

    bCtx.fillStyle = bright ? 'rgba(240,240,240,0.45)' : 'rgba(20,20,20,0.45)';
    bCtx.beginPath();
    bCtx.arc(x, y, r * 1.25, 0, Math.PI * 2);
    bCtx.fill();
  }

  // Crisp micrometeorite impact craters with bright ejecta rims
  for (let c = 0; c < 56; c++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const rad = 10 + Math.random() * 38;

    const cg = cCtx.createRadialGradient(cx, cy, rad * 0.12, cx, cy, rad);
    if (world === 'MOON') {
      cg.addColorStop(0, 'rgba(30,34,44,0.52)');
      cg.addColorStop(0.68, 'rgba(62,68,80,0.28)');
      cg.addColorStop(0.88, 'rgba(196,206,224,0.28)');
      cg.addColorStop(1, 'rgba(94,101,115,0)');
    } else {
      cg.addColorStop(0, 'rgba(58,18,10,0.48)');
      cg.addColorStop(0.68, 'rgba(124,52,28,0.26)');
      cg.addColorStop(0.88, 'rgba(226,136,92,0.28)');
      cg.addColorStop(1, 'rgba(150,73,45,0)');
    }
    cCtx.fillStyle = cg;
    cCtx.beginPath();
    cCtx.arc(cx, cy, rad, 0, Math.PI * 2);
    cCtx.fill();

    const bg = bCtx.createRadialGradient(cx, cy, rad * 0.1, cx, cy, rad);
    bg.addColorStop(0, 'rgba(14,14,14,0.82)');
    bg.addColorStop(0.7, 'rgba(105,105,105,0.42)');
    bg.addColorStop(0.88, 'rgba(245,245,245,0.68)');
    bg.addColorStop(1, 'rgba(128,128,128,0)');
    bCtx.fillStyle = bg;
    bCtx.beginPath();
    bCtx.arc(cx, cy, rad, 0, Math.PI * 2);
    bCtx.fill();
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(11, 11);
  map.colorSpace = THREE.SRGBColorSpace;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(11, 11);

  return { map, bumpMap };
}

/**
 * Generates realistic crinkled Gold Kapton Multi-Layer Insulation (MLI) foil textures.
 */
function makeKaptonFoilMaps(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 256;
  const col = document.createElement('canvas');
  col.width = size;
  col.height = size;
  const ctx = col.getContext('2d')!;

  const bmp = document.createElement('canvas');
  bmp.width = size;
  bmp.height = size;
  const btx = bmp.getContext('2d')!;

  ctx.fillStyle = '#D99B16';
  ctx.fillRect(0, 0, size, size);
  btx.fillStyle = '#808080';
  btx.fillRect(0, 0, size, size);

  for (let i = 0; i < 420; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const w = 8 + Math.random() * 24;
    const h = 4 + Math.random() * 14;
    const ang = Math.random() * Math.PI;
    const shade = Math.random();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.fillStyle =
      shade > 0.55
        ? 'rgba(255, 224, 118, 0.36)'
        : shade > 0.25
        ? 'rgba(180, 110, 12, 0.34)'
        : 'rgba(120, 65, 6, 0.28)';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();

    btx.save();
    btx.translate(x, y);
    btx.rotate(ang);
    btx.fillStyle = shade > 0.5 ? 'rgba(240,240,240,0.45)' : 'rgba(30,30,30,0.45)';
    btx.fillRect(-w / 2, -h / 2, w, h);
    btx.restore();
  }

  const map = new THREE.CanvasTexture(col);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;

  const bumpMap = new THREE.CanvasTexture(bmp);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;

  return { map, bumpMap };
}

/**
 * Aerospace hull plating texture with recessed structural ribs, rivets, and seams.
 */
function makeHullPlateMaps(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 512;
  const col = document.createElement('canvas');
  col.width = size;
  col.height = size;
  const ctx = col.getContext('2d')!;

  const bmp = document.createElement('canvas');
  bmp.width = size;
  bmp.height = size;
  const btx = bmp.getContext('2d')!;

  ctx.fillStyle = '#E6ECF4';
  ctx.fillRect(0, 0, size, size);
  btx.fillStyle = '#A0A0A0';
  btx.fillRect(0, 0, size, size);

  // Subtle brushed sheen + panel grids
  for (let gx = 0; gx < 4; gx++) {
    for (let gy = 0; gy < 4; gy++) {
      const px = gx * 128;
      const py = gy * 128;
      ctx.fillStyle = (gx + gy) % 2 === 0 ? 'rgba(255,255,255,0.22)' : 'rgba(203,213,225,0.25)';
      ctx.fillRect(px + 3, py + 3, 122, 122);

      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 3;
      ctx.strokeRect(px + 2, py + 2, 124, 124);

      btx.strokeStyle = '#303030';
      btx.lineWidth = 4;
      btx.strokeRect(px + 2, py + 2, 124, 124);

      // Corner rivets
      ctx.fillStyle = '#64748B';
      btx.fillStyle = '#E8E8E8';
      [
        [px + 10, py + 10],
        [px + 118, py + 10],
        [px + 10, py + 118],
        [px + 118, py + 118]
      ].forEach(([rx, ry]) => {
        ctx.beginPath();
        ctx.arc(rx, ry, 2.2, 0, Math.PI * 2);
        ctx.fill();
        btx.beginPath();
        btx.arc(rx, ry, 2.5, 0, Math.PI * 2);
        btx.fill();
      });
    }
  }

  const map = new THREE.CanvasTexture(col);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;

  const bumpMap = new THREE.CanvasTexture(bmp);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  return { map, bumpMap };
}

/**
 * Monocrystalline silicon photovoltaic array texture with chamfered wafers & silver busbars.
 */
function makeSolarCellTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const bgGrad = ctx.createLinearGradient(0, 0, 512, 512);
  bgGrad.addColorStop(0, '#091A3E');
  bgGrad.addColorStop(0.5, '#0E295E');
  bgGrad.addColorStop(1, '#081533');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 512, 512);

  const cells = 8;
  const step = 512 / cells;
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      const x = c * step + 2;
      const y = r * step + 2;
      const w = step - 4;
      ctx.fillStyle = '#0D2658';
      ctx.fillRect(x, y, w, w);

      // Subtle silver collector fingers
      ctx.strokeStyle = 'rgba(148, 197, 255, 0.32)';
      ctx.lineWidth = 1;
      for (let f = 1; f < 4; f++) {
        ctx.beginPath();
        ctx.moveTo(x + 2, y + (w / 4) * f);
        ctx.lineTo(x + w - 2, y + (w / 4) * f);
        ctx.stroke();
      }
      // Central silver busbar
      ctx.fillStyle = 'rgba(203, 227, 255, 0.65)';
      ctx.fillRect(x + w * 0.48, y + 1, 2, w - 2);
    }
  }

  // Outer aluminum frame border
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 504, 504);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Grated pressurized catwalk deck with yellow-black EVA hazard borders.
 */
function makeDeckTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#263042';
  ctx.fillRect(0, 0, 256, 256);

  // Diamond deck ribs
  ctx.strokeStyle = '#3B4961';
  ctx.lineWidth = 2;
  for (let y = 0; y < 256; y += 16) {
    ctx.beginPath();
    ctx.moveTo(16, y);
    ctx.lineTo(240, y);
    ctx.stroke();
  }
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 4;
  ctx.strokeRect(14, 2, 228, 252);

  // Hazard yellow-black strips on outer edges
  for (let i = 0; i < 256; i += 32) {
    ctx.fillStyle = (i / 32) % 2 === 0 ? '#EAB308' : '#1E293B';
    ctx.fillRect(0, i, 12, 32);
    ctx.fillRect(244, i, 12, 32);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 5);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Detailed Earth texture seen in the lunar sky with oceans, continents & clouds.
 */
function makeEarthSphereTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const ocean = ctx.createLinearGradient(0, 0, 0, 256);
  ocean.addColorStop(0, '#E2E8F0');
  ocean.addColorStop(0.12, '#1D4ED8');
  ocean.addColorStop(0.5, '#0369A1');
  ocean.addColorStop(0.88, '#1D4ED8');
  ocean.addColorStop(1, '#F1F5F9');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, 512, 256);

  // Stylized realistic continent blobs
  ctx.fillStyle = '#3F7D4C';
  [
    [130, 105, 55, 36],
    [170, 155, 32, 42],
    [295, 95, 65, 38],
    [335, 145, 42, 34],
    [415, 165, 36, 26]
  ].forEach(([cx, cy, rx, ry]) => {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0.25, 0, Math.PI * 2);
    ctx.fill();
  });

  // Swirling atmospheric cloud bands
  ctx.fillStyle = 'rgba(255, 255, 255, 0.48)';
  for (let i = 0; i < 48; i++) {
    const cx = Math.random() * 512;
    const cy = 20 + Math.random() * 216;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 18 + Math.random() * 44, 5 + Math.random() * 10, (Math.random() - 0.5) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createAstronautHero(
  world: WorldBody,
  hullMaps: { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture },
  kaptonMaps: { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture }
) {
  const root = new THREE.Group();

  const suitMat = new THREE.MeshStandardMaterial({
    map: hullMaps.map,
    bumpMap: hullMaps.bumpMap,
    bumpScale: 0.015,
    color: 0xf4f7fb,
    roughness: 0.52,
    metalness: 0.12
  });
  const jointMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.68,
    metalness: 0.28
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: world === 'MOON' ? 0x2563eb : 0xea580c,
    roughness: 0.35,
    metalness: 0.3
  });
  const foilMat = new THREE.MeshStandardMaterial({
    map: kaptonMaps.map,
    bumpMap: kaptonMaps.bumpMap,
    bumpScale: 0.02,
    metalness: 0.88,
    roughness: 0.26
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.82,
    metalness: 0.25
  });
  const visorMat = new THREE.MeshPhysicalMaterial({
    color: 0xf59e0b,
    metalness: 0.94,
    roughness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06
  });

  // Legs with articulated knee rings & ribbed tread boots
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.2, 0.84, 0);
  const legGeo = new THREE.CapsuleGeometry(0.135, 0.42, 8, 12);
  const kneeGeo = new THREE.TorusGeometry(0.145, 0.03, 8, 16);
  const bootGeo = new THREE.BoxGeometry(0.28, 0.18, 0.4);

  // Subtle magnetic/ion hover repulsors under EVA boots
  const repulsorRingGeo = new THREE.TorusGeometry(0.13, 0.02, 8, 16);
  const thrusterConeGeo = new THREE.ConeGeometry(0.15, 0.28, 12, 1, true);
  const bootThrusterMat = new THREE.MeshBasicMaterial({
    color: world === 'MOON' ? 0x38bdf8 : 0xfb923c,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const repulsorCollarMat = new THREE.MeshBasicMaterial({
    color: world === 'MOON' ? 0x7dd3fc : 0xfdba74
  });

  const leftLegMesh = new THREE.Mesh(legGeo, suitMat);
  leftLegMesh.position.y = -0.32;
  leftLegMesh.castShadow = true;
  const leftKnee = new THREE.Mesh(kneeGeo, jointMat);
  leftKnee.rotation.x = Math.PI / 2;
  leftKnee.position.y = -0.34;
  const leftBoot = new THREE.Mesh(bootGeo, bootMat);
  leftBoot.position.set(0, -0.75, 0.06);
  leftBoot.castShadow = true;
  const leftRepulsorRing = new THREE.Mesh(repulsorRingGeo, repulsorCollarMat);
  leftRepulsorRing.rotation.x = Math.PI / 2;
  leftRepulsorRing.position.set(0, -0.84, 0.06);
  const leftThrusterCone = new THREE.Mesh(thrusterConeGeo, bootThrusterMat);
  leftThrusterCone.rotation.x = Math.PI;
  leftThrusterCone.position.set(0, -0.98, 0.06);
  leftLegPivot.add(leftLegMesh, leftKnee, leftBoot, leftRepulsorRing, leftThrusterCone);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.2, 0.84, 0);
  const rightLegMesh = new THREE.Mesh(legGeo, suitMat);
  rightLegMesh.position.y = -0.32;
  rightLegMesh.castShadow = true;
  const rightKnee = new THREE.Mesh(kneeGeo, jointMat);
  rightKnee.rotation.x = Math.PI / 2;
  rightKnee.position.y = -0.34;
  const rightBoot = new THREE.Mesh(bootGeo, bootMat);
  rightBoot.position.set(0, -0.75, 0.06);
  rightBoot.castShadow = true;
  const rightRepulsorRing = new THREE.Mesh(repulsorRingGeo, repulsorCollarMat);
  rightRepulsorRing.rotation.x = Math.PI / 2;
  rightRepulsorRing.position.set(0, -0.84, 0.06);
  const rightThrusterCone = new THREE.Mesh(thrusterConeGeo, bootThrusterMat);
  rightThrusterCone.rotation.x = Math.PI;
  rightThrusterCone.position.set(0, -0.98, 0.06);
  rightLegPivot.add(rightLegMesh, rightKnee, rightBoot, rightRepulsorRing, rightThrusterCone);

  // Upper Torso HUT (Hard Upper Torso) + Chest DCM Control Pack + PLSS Backpack
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.31, 0.78, 14), suitMat);
  torso.scale.set(1.05, 1, 0.74);
  torso.position.y = 1.26;
  torso.castShadow = true;

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.34, 0.14, 14), trimMat);
  belt.scale.set(1.06, 1, 0.78);
  belt.position.y = 0.94;

  const chestPack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.14), jointMat);
  chestPack.position.set(0, 1.32, 0.26);
  const chestLed = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.06, 0.03),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
  );
  chestLed.position.set(0, 1.36, 0.335);

  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.68, 0.3), suitMat);
  backpack.position.set(0, 1.32, -0.32);
  backpack.castShadow = true;
  const plssFoil = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.26, 0.32), foilMat);
  plssFoil.position.set(0, 1.12, -0.32);
  const whipAnt = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.55, 6), jointMat);
  whipAnt.position.set(0.2, 1.85, -0.36);

  // Helmet Collar Ring + Dome + Gold Reflective Visor + Headlamp
  const neckRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.045, 8, 20), trimMat);
  neckRing.rotation.x = Math.PI / 2;
  neckRing.position.y = 1.66;

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.33, 22, 16), suitMat);
  helmet.position.set(0, 1.9, 0.02);
  helmet.castShadow = true;

  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.275, 20, 14, 0, Math.PI * 2, 0.22, Math.PI * 0.56),
    visorMat
  );
  visor.rotation.x = Math.PI * 0.48;
  visor.position.set(0, 1.9, 0.11);

  const headlampPod = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.12), jointMat);
  headlampPod.position.set(0, 2.2, 0.14);

  // Articulated Arms
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.44, 1.56, 0);
  const armGeo = new THREE.CapsuleGeometry(0.105, 0.42, 8, 10);
  const leftArm = new THREE.Mesh(armGeo, suitMat);
  leftArm.position.y = -0.26;
  leftArm.castShadow = true;
  const leftGlove = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), trimMat);
  leftGlove.position.y = -0.54;
  leftArmPivot.add(leftArm, leftGlove);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.44, 1.56, 0);
  const rightArm = new THREE.Mesh(armGeo, suitMat);
  rightArm.position.y = -0.26;
  rightArm.castShadow = true;
  const rightGlove = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), trimMat);
  rightGlove.position.y = -0.54;
  rightArmPivot.add(rightArm, rightGlove);

  // Handheld Engineering Tool + Energy Beam attached to Right Glove
  const toolTipMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const toolBeamMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.78
  });
  const toolGroup = new THREE.Group();
  toolGroup.position.set(0, -0.58, 0.08);
  const toolHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.36, 8), jointMat);
  toolHandle.rotation.x = Math.PI / 2;
  const toolTip = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), toolTipMat);
  toolTip.position.z = 0.22;
  const toolBeam = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.45, 10, 1, true), toolBeamMat);
  toolBeam.rotation.x = -Math.PI / 2;
  toolBeam.position.z = 0.94;
  toolGroup.add(toolHandle, toolTip, toolBeam);
  toolGroup.visible = false;
  rightArmPivot.add(toolGroup);

  // Upper Body Group (leans/bobs while astronaut works at fixation site!)
  const upperBodyGroup = new THREE.Group();
  upperBodyGroup.add(
    torso,
    belt,
    chestPack,
    chestLed,
    backpack,
    plssFoil,
    whipAnt,
    neckRing,
    helmet,
    visor,
    headlampPod,
    leftArmPivot,
    rightArmPivot
  );

  // Character-attached Action Aura Ring + Orbiting Work Sparks around Astronaut
  const auraMat = new THREE.MeshBasicMaterial({
    color: 0x34d399,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide
  });
  const heroAuraRing = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.98, 28), auraMat);
  heroAuraRing.rotation.x = -Math.PI / 2;
  heroAuraRing.position.y = 0.08;
  heroAuraRing.visible = false;

  const sparkMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.92 });
  const sparksGroup = new THREE.Group();
  const heroSparks: THREE.Mesh[] = [];
  const sparkGeo = new THREE.OctahedronGeometry(0.11, 0);
  for (let i = 0; i < 6; i++) {
    const sp = new THREE.Mesh(sparkGeo, sparkMat);
    sparksGroup.add(sp);
    heroSparks.push(sp);
  }
  sparksGroup.visible = false;

  // Soft contact shadow disc
  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.58, 22),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.34,
      depthWrite: false
    })
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.03;

  root.add(leftLegPivot, rightLegPivot, upperBodyGroup, heroAuraRing, sparksGroup, shadowDisc);

  return {
    root,
    upperBodyGroup,
    leftLegPivot,
    rightLegPivot,
    leftArmPivot,
    rightArmPivot,
    leftThrusterCone,
    rightThrusterCone,
    bootThrusterMat,
    toolGroup,
    toolBeam,
    toolTipMat,
    toolBeamMat,
    heroAuraRing,
    auraMat,
    sparksGroup,
    heroSparks,
    sparkMat,
    shadowDisc
  };
}

export function Outpost3DViewport({
  world,
  phase,
  systems,
  power,
  upcomingFlareSeverity = 'MODERATE',
  activeAction = null,
  activeEmergencyStation,
  nearestStation,
  jumpNonce,
  dpadRef,
  onNearestStationChange,
  onSelectStation,
  onFootstepJump,
  onActionStageChange,
  onActionComplete
}: Outpost3DViewportProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglFallback, setWebglFallback] = useState(false);

  const systemsRef = useRef(systems);
  const powerRef = useRef(power);
  const flareSeverityRef = useRef<FlareSeverity>(upcomingFlareSeverity);
  const activeActionRef = useRef<ActiveActionSequence | null>(activeAction);
  const emergencyStationRef = useRef(activeEmergencyStation);
  const nearestStationPropRef = useRef(nearestStation);
  const phaseRef = useRef(phase);
  const callbacksRef = useRef({
    onNearestStationChange,
    onSelectStation,
    onFootstepJump,
    onActionStageChange,
    onActionComplete
  });

  systemsRef.current = systems;
  powerRef.current = power;
  flareSeverityRef.current = upcomingFlareSeverity;
  activeActionRef.current = activeAction;
  emergencyStationRef.current = activeEmergencyStation;
  nearestStationPropRef.current = nearestStation;
  phaseRef.current = phase;
  callbacksRef.current = {
    onNearestStationChange,
    onSelectStation,
    onFootstepJump,
    onActionStageChange,
    onActionComplete
  };

  const externalJumpTriggerRef = useRef(0);
  useEffect(() => {
    if (jumpNonce > 0) {
      externalJumpTriggerRef.current = jumpNonce;
    }
  }, [jumpNonce]);

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
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = Math.max(300, container.clientWidth);
    const height = Math.max(240, container.clientHeight);
    renderer.setSize(width, height, false);

    const scene = new THREE.Scene();
    const skyColor = world === 'MOON' ? 0x050811 : 0x7a4429;
    scene.background = new THREE.Color(skyColor);
    scene.fog = new THREE.FogExp2(skyColor, world === 'MOON' ? 0.0085 : 0.0155);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.72;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.2, 260);
    camera.position.set(0, 12, 19);

    // Cinematic 3-Point Space Lighting Rig (Raking Sun + Earthshine/Mars Bounce + Rim)
    const hemiLight = new THREE.HemisphereLight(
      world === 'MOON' ? 0x94a3b8 : 0xfdba74,
      world === 'MOON' ? 0x0f172a : 0x3b1508,
      world === 'MOON' ? 0.55 : 0.92
    );
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(world === 'MOON' ? 0xfffaf0 : 0xffedd5, 2.7);
    keyLight.position.set(28, 26, 20);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 105;
    const d = 30;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.normalBias = 0.025;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(world === 'MOON' ? 0x38bdf8 : 0xf97316, 0.58);
    rimLight.position.set(-22, 12, -24);
    scene.add(rimLight);

    // Warm interior Command Hub beacon glow
    const hubGlowLight = new THREE.PointLight(0x38bdf8, 1.4, 14);
    hubGlowLight.position.set(0, 2.8, 0);
    scene.add(hubGlowLight);

    const disposables: { dispose: () => void }[] = [envTex];
    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    // Shared PBR Textures
    const regolithMaps = makeRegolithMaps(world);
    regolithMaps.map.anisotropy = maxAniso;
    regolithMaps.bumpMap.anisotropy = maxAniso;
    disposables.push(regolithMaps.map, regolithMaps.bumpMap);

    const kaptonMaps = makeKaptonFoilMaps();
    kaptonMaps.map.anisotropy = maxAniso;
    disposables.push(kaptonMaps.map, kaptonMaps.bumpMap);

    const hullMaps = makeHullPlateMaps();
    hullMaps.map.anisotropy = maxAniso;
    disposables.push(hullMaps.map, hullMaps.bumpMap);

    // Displaced Cratered Regolith Terrain + Mountain Horizon Rim
    const terrainSegments = isSoftwareGl ? 84 : 156;
    const groundGeo = new THREE.PlaneGeometry(175, 175, terrainSegments, terrainSegments);
    groundGeo.rotateX(-Math.PI / 2);
    const posAttr = groundGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      posAttr.setY(i, sampleTerrainHeight(vx, vz, world));
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      map: regolithMaps.map,
      bumpMap: regolithMaps.bumpMap,
      bumpScale: 0.46,
      roughness: 0.96,
      metalness: 0.04
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);
    disposables.push(groundGeo, groundMat);

    // Deep-Space Starfield (with multi-size stars) + Detailed Earth (Moon) or Sun Disc (Mars)
    const starCount = isSoftwareGl ? 340 : 900;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.45;
      const r = 98;
      starPositions[i * 3] = r * Math.cos(theta) * Math.cos(phi);
      starPositions[i * 3 + 1] = 14 + r * Math.sin(phi);
      starPositions[i * 3 + 2] = r * Math.sin(theta) * Math.cos(phi);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xf8fafc,
      size: world === 'MOON' ? 0.58 : 0.34,
      transparent: true,
      opacity: world === 'MOON' ? 0.92 : 0.35
    });
    scene.add(new THREE.Points(starGeo, starMat));
    disposables.push(starGeo, starMat);

    if (world === 'MOON') {
      const earthTex = makeEarthSphereTexture();
      const earthGeo = new THREE.SphereGeometry(6.2, 32, 24);
      const earthMat = new THREE.MeshStandardMaterial({
        map: earthTex,
        emissive: 0x0ea5e9,
        emissiveMap: earthTex,
        emissiveIntensity: 0.42,
        roughness: 0.55,
        metalness: 0.05
      });
      const earthMesh = new THREE.Mesh(earthGeo, earthMat);
      earthMesh.position.set(-34, 28, -58);
      earthMesh.rotation.y = 0.8;

      const atmoGeo = new THREE.SphereGeometry(6.55, 28, 20);
      const atmoMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.16,
        side: THREE.BackSide
      });
      const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
      atmoMesh.position.copy(earthMesh.position);
      scene.add(earthMesh, atmoMesh);
      disposables.push(earthTex, earthGeo, earthMat, atmoGeo, atmoMat);
    } else {
      // Distant hazy Martian sun disc + drifting atmospheric dust motes
      const sunHalo = new THREE.Mesh(
        new THREE.SphereGeometry(3.6, 20, 16),
        new THREE.MeshBasicMaterial({ color: 0xfde68a, transparent: true, opacity: 0.75 })
      );
      sunHalo.position.set(42, 30, -56);
      scene.add(sunHalo);
    }

    // Airborne Dust Particles (Subtle atmospheric realism on Mars)
    let dustCloud: THREE.Points | null = null;
    if (world === 'MARS') {
      const dustN = isSoftwareGl ? 90 : 220;
      const dPos = new Float32Array(dustN * 3);
      for (let i = 0; i < dustN; i++) {
        dPos[i * 3] = (Math.random() - 0.5) * 48;
        dPos[i * 3 + 1] = 0.6 + Math.random() * 7.5;
        dPos[i * 3 + 2] = (Math.random() - 0.5) * 48;
      }
      const dGeo = new THREE.BufferGeometry();
      dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
      const dMat = new THREE.PointsMaterial({
        color: 0xfdba74,
        size: 0.16,
        transparent: true,
        opacity: 0.42
      });
      dustCloud = new THREE.Points(dGeo, dMat);
      scene.add(dustCloud);
      disposables.push(dGeo, dMat);
    }

    // Irregular Instanced Boulders with PBR Regolith Maps (interior crags + outer rim)
    const rockGeo = new THREE.DodecahedronGeometry(1.0, 1);
    const rockMat = new THREE.MeshStandardMaterial({
      map: regolithMaps.map,
      bumpMap: regolithMaps.bumpMap,
      bumpScale: 0.22,
      color: world === 'MOON' ? 0x94a3b8 : 0xb45309,
      roughness: 0.94,
      metalness: 0.05
    });
    const rockSpans = CATWALK_SPANS_BY_WORLD[world];
    const rockCandidates: { rx: number; rz: number; s: number }[] = [];

    // Interior rough rocks placed on uneven hills/craters away from pads and catwalks
    let attempts = 0;
    while (rockCandidates.length < 44 && attempts < 400) {
      attempts++;
      const angle = Math.random() * Math.PI * 2;
      const dist = 5.8 + Math.random() * 18.5;
      const rx = Math.cos(angle) * dist;
      const rz = Math.sin(angle) * dist;
      const nearPad = BASE_STATIONS.some((st) => Math.hypot(rx - st.position[0], rz - st.position[2]) < 4.9);
      if (nearPad) continue;
      const nearRover = Math.hypot(rx - 4.9, rz - 3.8) < 2.9;
      if (nearRover) continue;
      const nearCatwalk = rockSpans.some((sp) => {
        const proj = rx * sp.ux + rz * sp.uz;
        const perp = Math.abs(rx * sp.uz - rz * sp.ux);
        return proj >= 0 && proj <= sp.len && perp < 2.25;
      });
      if (nearCatwalk) continue;
      rockCandidates.push({ rx, rz, s: 0.28 + Math.random() * 0.72 });
    }

    // Outer crater rim boulders
    for (let i = 0; i < 86; i++) {
      const angle = (i / 86) * Math.PI * 2 + (Math.random() - 0.5) * 0.22;
      const dist = 24.5 + Math.random() * 32;
      rockCandidates.push({
        rx: Math.cos(angle) * dist,
        rz: Math.sin(angle) * dist,
        s: 0.7 + Math.random() * 2.35
      });
    }

    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCandidates.length);
    const rockColor = new THREE.Color();
    rockCandidates.forEach(({ rx, rz, s }, i) => {
      const baseH = sampleTerrainHeight(rx, rz, world);
      _dummy.position.set(rx, baseH + s * 0.24, rz);
      _dummy.rotation.set(Math.random() * 2, Math.random() * 3, Math.random() * 2);
      _dummy.scale.set(s * 1.24, s * 0.64, s * (0.9 + Math.random() * 0.25));
      _dummy.updateMatrix();
      rocks.setMatrixAt(i, _dummy.matrix);
      rockColor
        .setHex(world === 'MOON' ? 0x94a3b8 : 0xc2410c)
        .offsetHSL(0, 0, (Math.random() - 0.5) * 0.16);
      rocks.setColorAt(i, rockColor);
    });
    rocks.computeBoundingSphere();
    rocks.castShadow = !isSoftwareGl;
    rocks.receiveShadow = true;
    scene.add(rocks);
    disposables.push(rockGeo, rockMat);

    // Terrain-Following Pressurized Metal Catwalk Ramps + Support Pylons + Conduit Pipes
    const deckTex = makeDeckTexture();
    deckTex.anisotropy = maxAniso;
    const deckMat = new THREE.MeshStandardMaterial({
      map: deckTex,
      roughness: 0.48,
      metalness: 0.62
    });
    const pipeMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.3,
      metalness: 0.85
    });
    const pylonMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.45,
      metalness: 0.78
    });
    disposables.push(deckTex, deckMat, pipeMat, pylonMat);

    CATWALK_SPANS_BY_WORLD[world].forEach((span) => {
      const yaw = Math.atan2(span.sx, span.sz);
      const horizStep = span.len / CATWALK_SEGMENTS;
      const pipeRightX = Math.cos(yaw) * 1.36;
      const pipeRightZ = -Math.sin(yaw) * 1.36;

      for (let i = 0; i < CATWALK_SEGMENTS; i++) {
        const t0 = i / CATWALK_SEGMENTS;
        const t1 = (i + 1) / CATWALK_SEGMENTS;
        const tMid = (t0 + t1) * 0.5;
        const y0 = span.nodeY[i];
        const y1 = span.nodeY[i + 1];
        const dy = y1 - y0;
        const segSlopeLen = Math.hypot(horizStep, dy) + 0.06;
        const pitch = Math.atan2(dy, horizStep);

        const segGeo = new THREE.BoxGeometry(2.45, 0.1, segSlopeLen);
        const segMesh = new THREE.Mesh(segGeo, deckMat);
        segMesh.position.set(span.sx * tMid, (y0 + y1) * 0.5, span.sz * tMid);
        segMesh.rotation.order = 'YXZ';
        segMesh.rotation.y = yaw;
        segMesh.rotation.x = -pitch;
        segMesh.receiveShadow = true;
        segMesh.castShadow = !isSoftwareGl;
        scene.add(segMesh);
        disposables.push(segGeo);

        // Elevated bridge support pylons anchored into the terrain underneath
        if (i >= 2 && i <= CATWALK_SEGMENTS - 2 && i % 2 === 0) {
          const px = span.sx * t0;
          const pz = span.sz * t0;
          const groundY = sampleTerrainHeight(px, pz, world);
          const legHeight = Math.max(0.45, y0 - groundY + 0.55);
          const pylonGeo = new THREE.CylinderGeometry(0.11, 0.15, legHeight, 8);
          const pylonL = new THREE.Mesh(pylonGeo, pylonMat);
          pylonL.position.set(px - Math.cos(yaw) * 0.98, y0 - legHeight * 0.5, pz + Math.sin(yaw) * 0.98);
          const pylonR = new THREE.Mesh(pylonGeo, pylonMat);
          pylonR.position.set(px + Math.cos(yaw) * 0.98, y0 - legHeight * 0.5, pz - Math.sin(yaw) * 0.98);
          scene.add(pylonL, pylonR);
          disposables.push(pylonGeo);
        }

        // Segmented terrain-following conduit pipeline beside walkway
        if (i >= 1 && i <= CATWALK_SEGMENTS - 2) {
          const pipeGeo = new THREE.CylinderGeometry(0.08, 0.08, segSlopeLen, 8);
          pipeGeo.rotateX(Math.PI / 2);
          const pipeMesh = new THREE.Mesh(pipeGeo, pipeMat);
          pipeMesh.position.set(
            span.sx * tMid + pipeRightX,
            (y0 + y1) * 0.5 + 0.08,
            span.sz * tMid + pipeRightZ
          );
          pipeMesh.rotation.order = 'YXZ';
          pipeMesh.rotation.y = yaw;
          pipeMesh.rotation.x = -pitch;
          scene.add(pipeMesh);
          disposables.push(pipeGeo);
        }
      }
    });

    // Shared Aerospace Station Materials
    const solarTex = makeSolarCellTexture();
    solarTex.anisotropy = maxAniso;
    disposables.push(solarTex);

    const metalBodyMat = new THREE.MeshStandardMaterial({
      map: hullMaps.map,
      bumpMap: hullMaps.bumpMap,
      bumpScale: 0.03,
      color: 0xf1f5f9,
      roughness: 0.38,
      metalness: 0.42
    });
    const kaptonMat = new THREE.MeshStandardMaterial({
      map: kaptonMaps.map,
      bumpMap: kaptonMaps.bumpMap,
      bumpScale: 0.03,
      metalness: 0.9,
      roughness: 0.25
    });
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.82
    });
    const glassDomeMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      roughness: 0.08,
      metalness: 0.05,
      transmission: 0.45,
      transparent: true,
      opacity: 0.42,
      clearcoat: 1.0,
      depthWrite: false
    });
    const trussFrameMat = new THREE.MeshBasicMaterial({
      color: 0x64748b,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });
    disposables.push(metalBodyMat, kaptonMat, darkMetalMat, glassDomeMat, trussFrameMat);

    // Parked 6-Wheeled Pressurized Exploration Rover grounded & tilted to terrain slope
    const roverGroup = new THREE.Group();
    const roverX = 4.9;
    const roverZ = 3.8;
    const roverY = sampleTerrainHeight(roverX, roverZ, world);
    roverGroup.position.set(roverX, roverY, roverZ);
    sampleTerrainNormal(roverX, roverZ, world, _vec3A);
    _quatA.setFromUnitVectors(_vec3Up, _vec3A);
    _quatYaw.setFromAxisAngle(_vec3Up, -0.65);
    roverGroup.quaternion.multiplyQuaternions(_quatA, _quatYaw);
    const roverBody = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.85, 2.6), metalBodyMat);
    roverBody.position.y = 0.85;
    roverBody.castShadow = true;
    const roverSkirt = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.28, 2.45), kaptonMat);
    roverSkirt.position.y = 0.48;
    const roverCab = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.78, 0.75, 10), glassDomeMat);
    roverCab.rotation.x = Math.PI / 2;
    roverCab.position.set(0, 1.05, 1.12);
    const roverMast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.9, 8), darkMetalMat);
    roverMast.position.set(0.45, 1.65, 0.85);
    const roverCam = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 0.16), metalBodyMat);
    roverCam.position.set(0.45, 2.08, 0.92);
    roverGroup.add(roverBody, roverSkirt, roverCab, roverMast, roverCam);
    [-0.96, 0.96].forEach((wx) => {
      [-0.88, 0, 0.88].forEach((wz) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.24, 12), darkMetalMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wx, 0.32, wz);
        wheel.castShadow = true;
        roverGroup.add(wheel);
      });
    });
    scene.add(roverGroup);

    // Dynamic Visual State Handles
    const stationClickMeshes: THREE.Object3D[] = [];
    const beaconMeshes = new Map<StationId, THREE.Mesh>();
    const padRingMats = new Map<StationId, THREE.MeshBasicMaterial>();

    let solarDustMat: THREE.MeshStandardMaterial | null = null;
    let cryoFrostMat: THREE.MeshStandardMaterial | null = null;
    const o2Bubbles: THREE.Mesh[] = [];
    let growLightMat: THREE.MeshStandardMaterial | null = null;
    let cropFoliageMat: THREE.MeshStandardMaterial | null = null;
    let radiatorFinMat: THREE.MeshStandardMaterial | null = null;
    let radarDishGroup: THREE.Group | null = null;
    let strobeMat: THREE.MeshBasicMaterial | null = null;
    let forcefieldDomeMat: THREE.MeshBasicMaterial | null = null;
    let forcefieldDomeMesh: THREE.Mesh | null = null;

    // 3D Live Hazard Particle Handles
    const hazardDustStreaks: THREE.Mesh[] = [];
    let hazardDustGroup: THREE.Group | null = null;
    const frostShards: THREE.Mesh[] = [];
    let hazardFrostGroup: THREE.Group | null = null;
    const leakPuffs: THREE.Mesh[] = [];
    let hazardLeakGroup: THREE.Group | null = null;
    const co2Puffs: THREE.Mesh[] = [];
    let hazardCo2Group: THREE.Group | null = null;
    const sporeOrbs: THREE.Mesh[] = [];
    let hazardSporeGroup: THREE.Group | null = null;
    const heatEmbers: THREE.Mesh[] = [];
    let hazardHeatGroup: THREE.Group | null = null;
    let valveSteamMesh: THREE.Mesh | null = null;

    // Solar Storm & Sun Burp 3D VFX (Corona Flare + Streaking Plasma Bolts + Shockwaves)
    const stormVfxGroup = new THREE.Group();
    stormVfxGroup.visible = false;
    const coronaOrbMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.9
    });
    const coronaOrb = new THREE.Mesh(new THREE.SphereGeometry(5.5, 20, 16), coronaOrbMat);
    coronaOrb.position.set(16, 42, -32);
    stormVfxGroup.add(coronaOrb);

    const plasmaBolts: { mesh: THREE.Mesh; speed: number; angle: number; radius: number; phase: number }[] = [];
    const boltGeo = new THREE.CylinderGeometry(0.14, 0.35, 3.8, 6);
    const boltMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.92
    });
    for (let i = 0; i < 20; i++) {
      const bolt = new THREE.Mesh(boltGeo, boltMat);
      bolt.rotation.z = 0.28;
      stormVfxGroup.add(bolt);
      plasmaBolts.push({
        mesh: bolt,
        speed: 18 + (i % 5) * 4.5,
        angle: (i / 20) * Math.PI * 2,
        radius: 6 + (i % 4) * 4.2,
        phase: (i * 0.43) % 1
      });
    }

    const shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide
    });
    const shockwaveRing = new THREE.Mesh(new THREE.RingGeometry(18, 20.5, 36), shockwaveMat);
    shockwaveRing.rotation.x = -Math.PI / 2;
    shockwaveRing.position.y = 3.2;
    stormVfxGroup.add(shockwaveRing);
    scene.add(stormVfxGroup);
    disposables.push(coronaOrb.geometry, coronaOrbMat, boltGeo, boltMat, shockwaveRing.geometry, shockwaveMat);

    // Post-Decision & Station Action 3D Repair Burst Group
    const actionVfxGroup = new THREE.Group();
    actionVfxGroup.visible = false;
    const actionRingMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    const actionRingMesh = new THREE.Mesh(new THREE.RingGeometry(1.4, 2.2, 32), actionRingMat);
    actionRingMesh.rotation.x = -Math.PI / 2;
    actionVfxGroup.add(actionRingMesh);

    const actionSparks: { mesh: THREE.Mesh; angle: number; speed: number }[] = [];
    const sparkGeo = new THREE.OctahedronGeometry(0.18, 0);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.92 });
    for (let k = 0; k < 12; k++) {
      const spMesh = new THREE.Mesh(sparkGeo, sparkMat);
      actionVfxGroup.add(spMesh);
      actionSparks.push({ mesh: spMesh, angle: (k / 12) * Math.PI * 2, speed: 1.5 + (k % 3) * 0.6 });
    }
    scene.add(actionVfxGroup);
    disposables.push(actionRingMesh.geometry, actionRingMat, sparkGeo, sparkMat);

    let lastHandledActionNonce = 0;
    let actionAnimRemaining = 0;
    let autoActionStage: 'IDLE' | 'WALKING' | 'WORKING' = 'IDLE';
    let autoActionKind: ActiveActionSequence['animKind'] = 'GADGET_DEPLOY';
    let autoWalkTarget: THREE.Vector3 | null = null;
    let autoLookTarget: THREE.Vector3 | null = null;
    let autoActionBlocking = false;

    // Footstep dust puffs array
    const dustPuffs: { mesh: THREE.Mesh; life: number; maxLife: number }[] = [];
    const puffGeo = new THREE.SphereGeometry(0.22, 8, 6);
    const puffMat = new THREE.MeshBasicMaterial({
      color: world === 'MOON' ? 0xcbd5e1 : 0xfdba74,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    });
    disposables.push(puffGeo, puffMat);

    const spawnDustPuff = (px: number, pz: number, count = 3) => {
      const groundH = getSurfaceHeightAt(px, pz, world);
      for (let i = 0; i < count; i++) {
        const m = new THREE.Mesh(puffGeo, puffMat.clone());
        m.position.set(
          px + (Math.random() - 0.5) * 0.55,
          groundH + 0.16,
          pz + (Math.random() - 0.5) * 0.55
        );
        m.scale.setScalar(0.6 + Math.random() * 0.7);
        scene.add(m);
        dustPuffs.push({ mesh: m, life: 0, maxLife: 0.55 + Math.random() * 0.25 });
      }
    };

    // Build all 5 Highly Detailed Aerospace Stations anchored to local terrain elevation
    BASE_STATIONS.forEach((station) => {
      const group = new THREE.Group();
      const stTerrainY = sampleTerrainHeight(station.position[0], station.position[2], world);
      group.position.set(station.position[0], stTerrainY, station.position[2]);

      const padGeo = new THREE.CylinderGeometry(3.6, 4.25, 0.9, 28);
      const padMesh = new THREE.Mesh(padGeo, darkMetalMat);
      padMesh.position.y = -0.21;
      padMesh.receiveShadow = true;
      group.add(padMesh);
      disposables.push(padGeo);

      const ringGeo = new THREE.RingGeometry(3.38, 3.64, 36);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(station.accentHex),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.72
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.y = 0.255;
      group.add(ringMesh);
      padRingMats.set(station.id, ringMat);
      disposables.push(ringGeo, ringMat);

      if (station.id === 'COMMAND_BRIDGE') {
        // Pressurized Octagonal Command Module + Kapton Skirt + Warm Cabin Windows + Geodesic Cupola
        const baseSkirt = new THREE.Mesh(new THREE.CylinderGeometry(3.15, 3.3, 0.52, 8), kaptonMat);
        baseSkirt.position.y = 0.46;
        baseSkirt.castShadow = true;
        const hull = new THREE.Mesh(new THREE.CylinderGeometry(2.65, 3.05, 1.35, 8), metalBodyMat);
        hull.position.y = 1.38;
        hull.castShadow = true;

        // Warm lit viewport windows around Command Hub
        for (let w = 0; w < 4; w++) {
          const ang = (w / 4) * Math.PI * 2 + Math.PI / 4;
          const win = new THREE.Mesh(
            new THREE.BoxGeometry(0.85, 0.36, 0.14),
            new THREE.MeshBasicMaterial({ color: 0xfef3c7 })
          );
          win.position.set(Math.sin(ang) * 2.74, 1.45, Math.cos(ang) * 2.74);
          win.rotation.y = ang;
          group.add(win);
        }

        const cupola = new THREE.Mesh(
          new THREE.SphereGeometry(2.15, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.5),
          glassDomeMat
        );
        cupola.position.y = 2.02;
        const cupolaTruss = new THREE.Mesh(
          new THREE.IcosahedronGeometry(2.18, 1),
          trussFrameMat
        );
        cupolaTruss.position.y = 2.02;

        const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.24, 3.4, 10), darkMetalMat);
        spire.position.y = 3.55;
        const emitterOrb = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.42, 1),
          new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            emissive: 0x0ea5e9,
            emissiveIntensity: 1.5,
            roughness: 0.15
          })
        );
        emitterOrb.position.y = 5.3;

        strobeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        const strobeLight = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), strobeMat);
        strobeLight.position.set(-1.7, 3.25, 1.2);
        const strobeMast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.2, 6), darkMetalMat);
        strobeMast.position.set(-1.7, 2.65, 1.2);

        radarDishGroup = new THREE.Group();
        radarDishGroup.position.set(1.65, 2.4, -1.25);
        const dishMast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 1.0, 8), darkMetalMat);
        const dishMat = metalBodyMat.clone();
        dishMat.side = THREE.DoubleSide;
        disposables.push(dishMat);
        const dishBowl = new THREE.Mesh(
          new THREE.SphereGeometry(0.82, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.38),
          dishMat
        );
        dishBowl.position.y = 0.65;
        dishBowl.rotation.x = Math.PI * 0.65;
        const feedHorn = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.55, 6), kaptonMat);
        feedHorn.position.set(0, 0.85, 0.4);
        feedHorn.rotation.x = Math.PI * 0.35;
        radarDishGroup.add(dishMast, dishBowl, feedHorn);

        group.add(baseSkirt, hull, cupola, cupolaTruss, spire, emitterOrb, strobeMast, strobeLight, radarDishGroup);

        forcefieldDomeMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.08,
          wireframe: true,
          depthWrite: false
        });
        forcefieldDomeMesh = new THREE.Mesh(
          new THREE.IcosahedronGeometry(23.0, 2),
          forcefieldDomeMat
        );
        group.add(forcefieldDomeMesh);
      } else if (station.id === 'SOLAR_GRID') {
        const panelMat = new THREE.MeshPhysicalMaterial({
          map: solarTex,
          roughness: 0.18,
          metalness: 0.52,
          clearcoat: 0.85,
          clearcoatRoughness: 0.12
        });
        solarDustMat = new THREE.MeshStandardMaterial({
          map: regolithMaps.map,
          color: world === 'MOON' ? 0x94a3b8 : 0xb45309,
          transparent: true,
          opacity: 0.1,
          roughness: 0.96
        });
        cryoFrostMat = new THREE.MeshStandardMaterial({
          map: kaptonMaps.map,
          bumpMap: kaptonMaps.bumpMap,
          bumpScale: 0.02,
          color: 0xfbbf24,
          emissive: 0xd97706,
          emissiveIntensity: 0.35,
          roughness: 0.32,
          metalness: 0.78
        });

        [-1.65, 1.65].forEach((offsetX) => {
          const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.4, 10), darkMetalMat);
          plinth.position.set(offsetX, 0.42, -0.7);
          const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 2.4, 10), darkMetalMat);
          mast.position.set(offsetX, 1.55, -0.7);
          const wing = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.1, 2.25), panelMat);
          wing.position.set(offsetX, 2.75, -0.7);
          wing.rotation.x = 0.44;
          wing.castShadow = true;
          const backFrame = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.08, 0.4), darkMetalMat);
          backFrame.position.set(offsetX, 2.68, -0.72);
          backFrame.rotation.x = 0.44;
          const dustSheet = new THREE.Mesh(new THREE.BoxGeometry(2.66, 0.03, 2.26), solarDustMat!);
          dustSheet.position.set(offsetX, 2.82, -0.7);
          dustSheet.rotation.x = 0.44;
          group.add(plinth, mast, backFrame, wing, dustSheet);
        });

        // Junction Transformer Box + 3 Kapton Cryo-Battery Vessels
        const transformer = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.85, 0.7), metalBodyMat);
        transformer.position.set(0, 0.65, 0.2);
        transformer.castShadow = true;
        group.add(transformer);

        [-1.35, 0, 1.35].forEach((bx) => {
          const cell = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.3, 14), cryoFrostMat!);
          cell.position.set(bx, 0.88, 1.5);
          cell.castShadow = true;
          const cap = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), darkMetalMat);
          cap.position.set(bx, 1.53, 1.5);
          group.add(cell, cap);
        });

        // Dust Storm Streaks around Solar Panels
        hazardDustGroup = new THREE.Group();
        const dustStreakGeo = new THREE.BoxGeometry(1.8, 0.08, 0.08);
        const dustStreakMat = new THREE.MeshBasicMaterial({
          color: world === 'MOON' ? 0xcbd5e1 : 0xf59e0b,
          transparent: true,
          opacity: 0.72
        });
        for (let d = 0; d < 8; d++) {
          const streak = new THREE.Mesh(dustStreakGeo, dustStreakMat);
          streak.position.set(-2.5 + (d % 4) * 1.4, 1.2 + (d % 3) * 0.85, -1.2 + (d % 2) * 1.4);
          hazardDustStreaks.push(streak);
          hazardDustGroup.add(streak);
        }
        hazardDustGroup.visible = false;
        group.add(hazardDustGroup);

        // Orbiting Icy Frost Shards around Cryo-Batteries
        hazardFrostGroup = new THREE.Group();
        const frostGeo = new THREE.OctahedronGeometry(0.22, 0);
        const frostMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.88 });
        for (let f = 0; f < 6; f++) {
          const shard = new THREE.Mesh(frostGeo, frostMat);
          shard.position.set(Math.cos((f / 6) * Math.PI * 2) * 1.8, 1.35, 1.5 + Math.sin((f / 6) * Math.PI * 2) * 0.9);
          frostShards.push(shard);
          hazardFrostGroup.add(shard);
        }
        hazardFrostGroup.visible = false;
        group.add(hazardFrostGroup);
        disposables.push(dustStreakGeo, dustStreakMat, frostGeo, frostMat);
      } else if (station.id === 'LIFE_SUPPORT') {
        // Twin Borosilicate Electrolysis Columns + Steel Manifolds + Pressurized Airlock Module
        [-1.35, -0.45].forEach((tx, idx) => {
          const colFrame = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 2.55, 18), glassDomeMat);
          colFrame.position.set(tx, 1.5, -0.1);
          const waterCore = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.5, 2.1, 16),
            new THREE.MeshStandardMaterial({
              color: 0x0ea5e9,
              emissive: 0x0284c7,
              emissiveIntensity: 0.45,
              transparent: true,
              opacity: 0.65,
              roughness: 0.12
            })
          );
          waterCore.position.set(tx, 1.34, -0.1);
          const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.2, 16), darkMetalMat);
          cap.position.set(tx, 2.82, -0.1);
          group.add(colFrame, waterCore, cap);

          for (let b = 0; b < 4; b++) {
            const bubble = new THREE.Mesh(
              new THREE.SphereGeometry(0.09, 8, 6),
              new THREE.MeshBasicMaterial({ color: 0xe0f2fe })
            );
            bubble.position.set(tx + (b % 2 === 0 ? -0.14 : 0.14), 0.55 + (b + idx) * 0.42, -0.1);
            o2Bubbles.push(bubble);
            group.add(bubble);
          }
        });

        const scrubberBox = new THREE.Mesh(new THREE.BoxGeometry(1.75, 2.0, 1.85), metalBodyMat);
        scrubberBox.position.set(1.2, 1.2, -0.15);
        scrubberBox.castShadow = true;
        const foilBelt = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 1.9), kaptonMat);
        foilBelt.position.set(1.2, 0.6, -0.15);
        const airlockRing = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.13, 10, 22), darkMetalMat);
        airlockRing.position.set(1.2, 1.28, 0.8);
        const hatchDoor = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 0.12, 18), metalBodyMat);
        hatchDoor.rotation.x = Math.PI / 2;
        hatchDoor.position.set(1.2, 1.28, 0.78);

        // Hull Micro-Leak Escaping White Air Jet Plume
        hazardLeakGroup = new THREE.Group();
        hazardLeakGroup.position.set(1.35, 1.35, 0.92);
        const leakGeo = new THREE.SphereGeometry(0.18, 8, 6);
        const leakMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.78 });
        for (let l = 0; l < 6; l++) {
          const lp = new THREE.Mesh(leakGeo, leakMat);
          lp.position.z = l * 0.45;
          leakPuffs.push(lp);
          hazardLeakGroup.add(lp);
        }
        hazardLeakGroup.visible = false;

        // Saturated Scrubber Rising CO2 Gas Puffs
        hazardCo2Group = new THREE.Group();
        hazardCo2Group.position.set(1.2, 2.35, -0.15);
        const co2Geo = new THREE.SphereGeometry(0.24, 8, 6);
        const co2Mat = new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.65 });
        for (let c = 0; c < 5; c++) {
          const cp = new THREE.Mesh(co2Geo, co2Mat);
          cp.position.set(((c % 3) - 1) * 0.35, c * 0.42, ((c % 2) - 0.5) * 0.3);
          co2Puffs.push(cp);
          hazardCo2Group.add(cp);
        }
        hazardCo2Group.visible = false;
        disposables.push(leakGeo, leakMat, co2Geo, co2Mat);

        group.add(scrubberBox, foilBelt, airlockRing, hatchDoor, hazardLeakGroup, hazardCo2Group);
      } else if (station.id === 'HYDROPONICS') {
        const dome = new THREE.Mesh(
          new THREE.SphereGeometry(2.9, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.52),
          glassDomeMat
        );
        dome.position.y = 0.22;
        const domeTruss = new THREE.Mesh(
          new THREE.IcosahedronGeometry(2.93, 1),
          trussFrameMat
        );
        domeTruss.position.y = 0.22;

        growLightMat = new THREE.MeshStandardMaterial({
          color: 0xf472b6,
          emissive: 0xec4899,
          emissiveIntensity: 1.25
        });
        cropFoliageMat = new THREE.MeshStandardMaterial({
          color: 0x10b981,
          roughness: 0.72
        });

        const lightBar = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.14, 0.45), growLightMat);
        lightBar.position.set(0, 2.35, 0);

        [-1.15, 0, 1.15].forEach((cz) => {
          const planter = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.38, 0.66), darkMetalMat);
          planter.position.set(0, 0.44, cz);
          group.add(planter);
          // Clustered leafy crop heads along planter trough
          for (let lx = -1.2; lx <= 1.21; lx += 0.48) {
            const plant = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 1), cropFoliageMat!);
            plant.position.set(lx, 0.78, cz);
            plant.scale.set(1.0, 0.85, 1.0);
            group.add(plant);
          }
        });

        // Floating Bio-Contamination Fungus Spores inside Dome
        hazardSporeGroup = new THREE.Group();
        const sporeGeo = new THREE.SphereGeometry(0.14, 8, 6);
        const sporeMat = new THREE.MeshBasicMaterial({ color: 0xa3e635, transparent: true, opacity: 0.82 });
        for (let s = 0; s < 8; s++) {
          const sp = new THREE.Mesh(sporeGeo, sporeMat);
          sp.position.set(Math.cos(s * 0.9) * 1.4, 1.0 + (s % 3) * 0.45, Math.sin(s * 1.1) * 1.3);
          sporeOrbs.push(sp);
          hazardSporeGroup.add(sp);
        }
        hazardSporeGroup.visible = false;
        disposables.push(sporeGeo, sporeMat);

        group.add(dome, domeTruss, lightBar, hazardSporeGroup);
      } else if (station.id === 'THERMAL_WORKSHOP') {
        radiatorFinMat = new THREE.MeshStandardMaterial({
          color: 0x64748b,
          emissive: 0x000000,
          roughness: 0.28,
          metalness: 0.84
        });
        const hubCore = new THREE.Mesh(new THREE.BoxGeometry(1.95, 1.65, 1.95), metalBodyMat);
        hubCore.position.set(-0.75, 1.05, 0);
        hubCore.castShadow = true;
        const foilWrap = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.55, 2.02), kaptonMat);
        foilWrap.position.set(-0.75, 0.52, 0);

        // 4 Articulated External Vacuum Radiator Wings on Truss Boom
        const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.6, 8), darkMetalMat);
        boom.rotation.z = Math.PI / 2;
        boom.position.set(0.85, 1.95, 0);
        group.add(boom);

        [-0.95, -0.32, 0.32, 0.95].forEach((rz) => {
          const fin = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.9, 0.1), radiatorFinMat!);
          fin.position.set(1.35, 1.85, rz);
          fin.rotation.z = -0.22;
          fin.castShadow = true;
          group.add(fin);
        });

        // 3D Printer CNC Frame + Glowing Cyan Filament Spool
        const printerFrame = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.2, 1.05), darkMetalMat);
        printerFrame.position.set(-0.75, 2.48, 0);
        const spool = new THREE.Mesh(
          new THREE.TorusGeometry(0.28, 0.09, 10, 18),
          new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            emissive: 0x0284c7,
            emissiveIntensity: 0.45,
            roughness: 0.35
          })
        );
        spool.position.set(-0.75, 3.28, 0);

        // Thermal Overheat Embers + Jury-Rig Valve Steam Warning
        hazardHeatGroup = new THREE.Group();
        const emberGeo = new THREE.SphereGeometry(0.13, 6, 6);
        const emberMat = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.85 });
        for (let e = 0; e < 7; e++) {
          const emb = new THREE.Mesh(emberGeo, emberMat);
          emb.position.set(0.6 + (e % 3) * 0.55, 1.4 + e * 0.3, ((e % 2) - 0.5) * 1.1);
          heatEmbers.push(emb);
          hazardHeatGroup.add(emb);
        }
        hazardHeatGroup.visible = false;

        valveSteamMesh = new THREE.Mesh(
          new THREE.TorusGeometry(0.65, 0.08, 8, 18),
          new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.8 })
        );
        valveSteamMesh.position.set(-0.75, 1.35, 1.08);
        valveSteamMesh.visible = false;
        disposables.push(emberGeo, emberMat, valveSteamMesh.geometry, valveSteamMesh.material as THREE.Material);

        group.add(hubCore, foilWrap, printerFrame, spool, hazardHeatGroup, valveSteamMesh);
      }

      const beacon = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.38, 0),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(station.accentHex),
          emissive: new THREE.Color(station.accentHex),
          emissiveIntensity: 0.95,
          roughness: 0.18
        })
      );
      beacon.position.y = 4.65;
      group.add(beacon);
      beaconMeshes.set(station.id, beacon);

      const proxy = new THREE.Mesh(
        new THREE.CylinderGeometry(3.7, 3.7, 4.8, 12),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      proxy.position.y = 2.4;
      proxy.userData.stationId = station.id;
      group.add(proxy);
      stationClickMeshes.push(proxy);

      scene.add(group);
    });

    // Click-to-Walk Waypoint Ring
    const waypointGeo = new THREE.RingGeometry(0.45, 0.68, 28);
    const waypointMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92
    });
    const waypointMesh = new THREE.Mesh(waypointGeo, waypointMat);
    waypointMesh.rotation.x = -Math.PI / 2;
    waypointMesh.position.y = 0.06;
    waypointMesh.visible = false;
    scene.add(waypointMesh);
    disposables.push(waypointGeo, waypointMat);

    // High-Detail EMU Astronaut Player (levitating slightly above terrain)
    const hero = createAstronautHero(world, hullMaps, kaptonMaps);
    const startSurfaceY = getSurfaceHeightAt(0, 4.5, world);
    hero.root.position.set(0, startSurfaceY + (world === 'MOON' ? 0.36 : 0.26), 4.5);
    scene.add(hero.root);

    // Physics & Movement State
    const keys: Record<string, boolean> = {};
    let playerVy = 0;
    let isGrounded = true;
    let walkTime = 0;
    let stepAccum = 0;
    let walkTarget: THREE.Vector3 | null = null;
    let pendingStationOpen: StationId | null = null;
    let lastHandledJumpNonce = 0;
    let lastNearestSent: StationId | null = null;

    let camYaw = 0;
    let camPitch = 0.46;
    let camDistance = 15.2;
    let isDraggingCam = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let pointerMovedDist = 0;
    const camPosCurrent = new THREE.Vector3(0, 11, 20);
    const camLookCurrent = new THREE.Vector3(0, 1.5, 4.5);

    const triggerJump = () => {
      if (!isGrounded) return;
      playerVy = world === 'MOON' ? 6.6 : 8.2;
      isGrounded = false;
      spawnDustPuff(hero.root.position.x, hero.root.position.z, 4);
      callbacksRef.current.onFootstepJump();
      soundEngine.playButtonClick('tab');
      haptics.tick();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
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
            _vec3A.set(st.position[0], 0, st.position[2]);
            _vec3B.subVectors(hero.root.position, _vec3A).setY(0);
            if (_vec3B.lengthSq() < 0.01) _vec3B.set(0, 0, 1);
            _vec3B.normalize().multiplyScalar(3.3);
            walkTarget = _vec3A.clone().add(_vec3B);
            pendingStationOpen = hitId;
            const wpY = getSurfaceHeightAt(walkTarget.x, walkTarget.z, world);
            waypointMesh.position.set(walkTarget.x, wpY + 0.08, walkTarget.z);
            waypointMesh.visible = true;
            haptics.tick();
          }
          return;
        }
      }

      const groundHits = _raycaster.intersectObject(groundMesh, false);
      if (groundHits.length > 0) {
        _hitPoint.copy(groundHits[0].point);
      } else if (!_raycaster.ray.intersectPlane(_groundPlane, _hitPoint)) {
        return;
      }

      const clampedR = Math.min(24.2, Math.hypot(_hitPoint.x, _hitPoint.z));
      const ang = Math.atan2(_hitPoint.z, _hitPoint.x);
      const tx = Math.cos(ang) * clampedR;
      const tz = Math.sin(ang) * clampedR;
      walkTarget = new THREE.Vector3(tx, 0, tz);
      pendingStationOpen = null;
      waypointMesh.position.set(tx, getSurfaceHeightAt(tx, tz, world) + 0.08, tz);
      waypointMesh.visible = true;
      haptics.tick();
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

    const gravityAccel = world === 'MOON' ? 9.5 : 17.2;

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(0.08, clock.getDelta());
      const elapsed = clock.getElapsedTime();
      const sys = systemsRef.current;
      const pwr = powerRef.current;

      if (externalJumpTriggerRef.current !== lastHandledJumpNonce) {
        lastHandledJumpNonce = externalJumpTriggerRef.current;
        if (phaseRef.current === 'ACTIVE_SHIFT') {
          triggerJump();
        }
      }

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
          const sinY = Math.sin(camYaw);
          const cosY = Math.cos(camYaw);
          const worldDx = moveX * cosY + moveZ * sinY;
          const worldDz = moveZ * cosY - moveX * sinY;
          _vec3A.set(worldDx, 0, worldDz).normalize();
          const speed = keys['ShiftLeft'] || keys['ShiftRight'] ? 10.5 : 7.2;
          hero.root.position.x += _vec3A.x * speed * dt;
          hero.root.position.z += _vec3A.z * speed * dt;
          hero.root.rotation.y = Math.atan2(_vec3A.x, _vec3A.z);
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

        const radial = Math.hypot(hero.root.position.x, hero.root.position.z);
        if (radial > 24.5) {
          const scale = 24.5 / radial;
          hero.root.position.x *= scale;
          hero.root.position.z *= scale;
        }
      }

      // Physical Terrain Elevation + Subtle Astronaut Hover-Levitation + Gravity Jump Physics
      const surfaceY = getSurfaceHeightAt(hero.root.position.x, hero.root.position.z, world);
      const hoverBase = world === 'MOON' ? 0.38 : 0.27;
      const hoverBob = Math.sin(elapsed * 3.1) * 0.075;
      const levitateY = surfaceY + hoverBase + hoverBob;

      if (!isGrounded || playerVy > 0) {
        playerVy -= gravityAccel * dt;
        hero.root.position.y += playerVy * dt;
        if (hero.root.position.y <= levitateY) {
          hero.root.position.y = levitateY;
          playerVy = 0;
          isGrounded = true;
          spawnDustPuff(hero.root.position.x, hero.root.position.z, 5);
        }
      } else {
        hero.root.position.y = THREE.MathUtils.damp(hero.root.position.y, levitateY, 13, dt);
      }

      // Animate Boot Repulsor Glow & Thruster Cones
      hero.bootThrusterMat.opacity = isGrounded
        ? 0.56 + Math.sin(elapsed * 10) * 0.14
        : 0.9;
      const thrusterScale = isGrounded ? 0.92 + Math.sin(elapsed * 12) * 0.14 : 1.38;
      hero.leftThrusterCone.scale.set(1, thrusterScale, 1);
      hero.rightThrusterCone.scale.set(1, thrusterScale, 1);

      // Trigger Post-Decision / Station Repair: Astronaut Walks to Fixation Site & Performs Animation
      const currentAct = activeActionRef.current;
      if (currentAct && currentAct.nonce !== lastHandledActionNonce) {
        lastHandledActionNonce = currentAct.nonce;
        autoActionKind = currentAct.animKind;
        autoActionBlocking = currentAct.blocking;

        const targetSt = BASE_STATIONS.find((s) => s.id === currentAct.stationId);
        if (targetSt) {
          _vec3A.set(targetSt.position[0], 0, targetSt.position[2]);
          const radialLen = Math.hypot(_vec3A.x, _vec3A.z);
          if (radialLen > 1) {
            _vec3B.copy(_vec3A).normalize().multiplyScalar(-3.45);
          } else {
            _vec3B.set(0, 0, 3.6);
          }
          autoWalkTarget = _vec3A.clone().add(_vec3B);
          autoLookTarget = _vec3A.clone();
          const vfxY = getSurfaceHeightAt(targetSt.position[0], targetSt.position[2], world);
          actionVfxGroup.position.set(targetSt.position[0], vfxY + 0.25, targetSt.position[2]);
          const wpY = getSurfaceHeightAt(autoWalkTarget.x, autoWalkTarget.z, world);
          waypointMesh.position.set(autoWalkTarget.x, wpY + 0.08, autoWalkTarget.z);
          waypointMesh.visible = true;
        } else {
          autoWalkTarget = hero.root.position.clone();
          autoLookTarget = hero.root.position.clone().add(new THREE.Vector3(0, 0, -2));
          actionVfxGroup.position.set(hero.root.position.x, surfaceY + 0.25, hero.root.position.z);
        }

        const hex =
          currentAct.tone === 'amber'
            ? 0xfbbf24
            : currentAct.tone === 'rose'
            ? 0xf43f5e
            : currentAct.tone === 'sky'
            ? 0x38bdf8
            : 0x34d399;
        actionRingMat.color.setHex(hex);
        sparkMat.color.setHex(hex);
        hero.toolTipMat.color.setHex(hex);
        hero.toolBeamMat.color.setHex(hex);
        hero.auraMat.color.setHex(hex);
        hero.sparkMat.color.setHex(hex);

        const distToSite = Math.hypot(
          hero.root.position.x - autoWalkTarget.x,
          hero.root.position.z - autoWalkTarget.z
        );
        if (distToSite > 0.55) {
          autoActionStage = 'WALKING';
          actionAnimRemaining = 0;
          callbacksRef.current.onActionStageChange?.('WALKING');
        } else {
          autoActionStage = 'WORKING';
          actionAnimRemaining = 1.75;
          waypointMesh.visible = false;
          callbacksRef.current.onActionStageChange?.('WORKING');
        }
      } else if (!currentAct && autoActionStage !== 'IDLE') {
        autoActionStage = 'IDLE';
        actionAnimRemaining = 0;
        autoWalkTarget = null;
      }

      if (autoActionStage === 'WALKING' && autoWalkTarget) {
        _vec3A.subVectors(autoWalkTarget, hero.root.position).setY(0);
        const dist = _vec3A.length();
        if (dist < 0.45) {
          autoActionStage = 'WORKING';
          actionAnimRemaining = 1.75;
          waypointMesh.visible = false;
          callbacksRef.current.onActionStageChange?.('WORKING');
          if (autoLookTarget) {
            hero.root.rotation.y = Math.atan2(
              autoLookTarget.x - hero.root.position.x,
              autoLookTarget.z - hero.root.position.z
            );
          }
        } else {
          _vec3A.normalize();
          const autoSpeed = 10.2;
          hero.root.position.x += _vec3A.x * autoSpeed * dt;
          hero.root.position.z += _vec3A.z * autoSpeed * dt;
          hero.root.rotation.y = Math.atan2(_vec3A.x, _vec3A.z);
          movingSpeed = autoSpeed;
        }
      }

      if (autoActionStage === 'WORKING') {
        if (autoLookTarget) {
          hero.root.rotation.y = Math.atan2(
            autoLookTarget.x - hero.root.position.x,
            autoLookTarget.z - hero.root.position.z
          );
        }
        actionAnimRemaining = Math.max(0, actionAnimRemaining - dt);
        const progress = 1 - actionAnimRemaining / 1.75;

        // Character-Attached Tool, Sparks & Aura
        hero.toolGroup.visible = true;
        hero.toolBeam.scale.setScalar(0.85 + Math.sin(elapsed * 22) * 0.25);
        hero.toolBeamMat.opacity = 0.55 + Math.sin(elapsed * 20) * 0.3;
        hero.heroAuraRing.visible = true;
        hero.heroAuraRing.scale.setScalar(0.9 + Math.sin(elapsed * 8) * 0.16);
        hero.heroAuraRing.rotation.z += dt * 2.8;
        hero.sparksGroup.visible = true;
        hero.heroSparks.forEach((sp, idx) => {
          const ang = elapsed * 4.2 + (idx / 6) * Math.PI * 2;
          sp.position.set(Math.cos(ang) * 0.95, 1.15 + Math.sin(elapsed * 6 + idx) * 0.42, Math.sin(ang) * 0.95);
          sp.rotation.y += dt * 6;
        });

        // Station Ring + Rising Sparks
        actionVfxGroup.visible = true;
        actionRingMesh.position.y = progress * 3.8;
        actionRingMesh.scale.setScalar(0.8 + progress * 1.45);
        actionRingMat.opacity = (1 - progress) * 0.9;
        actionSparks.forEach((sp) => {
          const r = 1.2 + progress * 1.8;
          const a = sp.angle + elapsed * 3.5;
          sp.mesh.position.set(Math.cos(a) * r, 0.5 + progress * 4.2, Math.sin(a) * r);
          sp.mesh.rotation.y += dt * 5;
        });
        sparkMat.opacity = 1 - progress;

        // Character Body & Arm Repair Animation
        hero.upperBodyGroup.rotation.x = 0.18 + Math.sin(elapsed * 10) * 0.06;
        hero.upperBodyGroup.position.y = Math.sin(elapsed * 14) * 0.035;
        hero.leftLegPivot.rotation.x = THREE.MathUtils.damp(hero.leftLegPivot.rotation.x, 0, 12, dt);
        hero.rightLegPivot.rotation.x = THREE.MathUtils.damp(hero.rightLegPivot.rotation.x, 0, 12, dt);

        if (
          autoActionKind === 'HEAT_WARM' ||
          autoActionKind === 'SHIELD_CHARGE' ||
          autoActionKind === 'GADGET_DEPLOY'
        ) {
          hero.leftArmPivot.rotation.x = -1.95 + Math.sin(elapsed * 13) * 0.25;
          hero.rightArmPivot.rotation.x = -1.95 + Math.sin(elapsed * 13) * 0.25;
          hero.rightArmPivot.rotation.z = 0;
        } else if (
          autoActionKind === 'WELD_SEAL' ||
          autoActionKind === 'PRINT_BUILD' ||
          autoActionKind === 'SCRUB_CLEAN' ||
          autoActionKind === 'UV_CLEAN'
        ) {
          hero.rightArmPivot.rotation.x = -1.48 + Math.sin(elapsed * 20) * 0.34;
          hero.rightArmPivot.rotation.z = -0.18 + Math.cos(elapsed * 14) * 0.32;
          hero.leftArmPivot.rotation.x = -0.95 + Math.sin(elapsed * 9) * 0.14;
        } else {
          hero.leftArmPivot.rotation.x = -1.35 + Math.sin(elapsed * 15) * 0.38;
          hero.rightArmPivot.rotation.x = -1.35 - Math.sin(elapsed * 15) * 0.38;
          hero.rightArmPivot.rotation.z = 0;
        }

        if (actionAnimRemaining <= 0) {
          autoActionStage = 'IDLE';
          actionVfxGroup.visible = false;
          hero.toolGroup.visible = false;
          hero.heroAuraRing.visible = false;
          hero.sparksGroup.visible = false;
          callbacksRef.current.onActionComplete?.();
        }
      } else {
        actionVfxGroup.visible = false;
        hero.toolGroup.visible = false;
        hero.heroAuraRing.visible = false;
        hero.sparksGroup.visible = false;
        hero.upperBodyGroup.rotation.x = THREE.MathUtils.damp(hero.upperBodyGroup.rotation.x, 0, 10, dt);
        hero.upperBodyGroup.position.y = THREE.MathUtils.damp(hero.upperBodyGroup.position.y, 0, 10, dt);
        hero.rightArmPivot.rotation.z = THREE.MathUtils.damp(hero.rightArmPivot.rotation.z, 0, 10, dt);

        if (movingSpeed > 0.1 && isGrounded) {
          walkTime += dt * movingSpeed * 1.45;
          stepAccum += dt * movingSpeed;
          if (stepAccum > 2.4) {
            stepAccum = 0;
            spawnDustPuff(hero.root.position.x, hero.root.position.z, 1);
          }
          const swing = Math.sin(walkTime) * 0.55;
          hero.leftLegPivot.rotation.x = swing;
          hero.rightLegPivot.rotation.x = -swing;
          hero.leftArmPivot.rotation.x = -swing * 0.8;
          hero.rightArmPivot.rotation.x = swing * 0.8;
        } else {
          // Relaxed floating hover posture when idle or gliding mid-air
          const floatLeg = Math.sin(elapsed * 2.4) * 0.07;
          const floatArm = Math.cos(elapsed * 2.1) * 0.05;
          hero.leftLegPivot.rotation.x = THREE.MathUtils.damp(hero.leftLegPivot.rotation.x, floatLeg, 8, dt);
          hero.rightLegPivot.rotation.x = THREE.MathUtils.damp(hero.rightLegPivot.rotation.x, -floatLeg, 8, dt);
          hero.leftArmPivot.rotation.x = THREE.MathUtils.damp(hero.leftArmPivot.rotation.x, -floatArm, 8, dt);
          hero.rightArmPivot.rotation.x = THREE.MathUtils.damp(hero.rightArmPivot.rotation.x, floatArm, 8, dt);
        }
      }

      // Update Dust Puffs
      for (let i = dustPuffs.length - 1; i >= 0; i--) {
        const p = dustPuffs[i];
        p.life += dt;
        const t = p.life / p.maxLife;
        if (t >= 1) {
          scene.remove(p.mesh);
          (p.mesh.material as THREE.Material).dispose();
          dustPuffs.splice(i, 1);
        } else {
          p.mesh.position.y += dt * 0.65;
          p.mesh.scale.setScalar(0.6 + t * 1.4);
          (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.42 * (1 - t);
        }
      }

      // Drift Mars atmospheric dust gently
      if (dustCloud) {
        dustCloud.rotation.y += dt * 0.03;
      }

      // Project Ground Shadow cleanly onto actual sloped terrain/pad/catwalk surface beneath hero
      const heightAboveSurface = Math.max(0, hero.root.position.y - surfaceY);
      const shadowScale = THREE.MathUtils.clamp(1 - heightAboveSurface * 0.14, 0.32, 1);
      hero.shadowDisc.scale.setScalar(shadowScale);
      hero.shadowDisc.position.y = surfaceY - hero.root.position.y + 0.045;

      // Proximity Station Detection
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

      // Real-Time Visual Coupling
      if (solarDustMat) {
        solarDustMat.opacity = THREE.MathUtils.clamp(sys.dustCoatPct / 80, 0.02, 0.88);
      }
      if (cryoFrostMat) {
        if (sys.frozenCells > 0) {
          cryoFrostMat.color.setHex(0x60a5fa);
          cryoFrostMat.emissive.setHex(0x3b82f6);
        } else {
          cryoFrostMat.color.setHex(0xfbbf24);
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
          radiatorFinMat.emissiveIntensity = 0.72 + Math.sin(elapsed * 5) * 0.25;
        } else {
          radiatorFinMat.emissive.setHex(0x000000);
          radiatorFinMat.emissiveIntensity = 0;
        }
      }
      if (radarDishGroup) {
        radarDishGroup.rotation.y += dt * (sys.radarScrambled ? 4.2 : 0.7);
      }
      if (strobeMat) {
        strobeMat.color.setHex(Math.sin(elapsed * 4) > 0.65 ? 0xff4444 : 0x7f1d1d);
      }
      if (forcefieldDomeMat && forcefieldDomeMesh) {
        const isStorm = phaseRef.current === 'STORM_SIM';
        const shieldOn = pwr.shieldingKw > 0 || sys.sunBlanketActive || isStorm;
        forcefieldDomeMesh.visible = shieldOn;
        forcefieldDomeMesh.rotation.y += dt * (isStorm ? 0.55 : 0.06);
        forcefieldDomeMat.color.setHex(
          sys.sunBlanketActive ? 0xfbbf24 : isStorm ? 0x38bdf8 : 0x0ea5e9
        );
        forcefieldDomeMat.opacity = isStorm
          ? 0.32 + Math.sin(elapsed * 10) * 0.1
          : THREE.MathUtils.clamp(pwr.shieldingKw / 250, 0.03, 0.14);
      }

      // Live 3D Solar Storm & Sun Burp VFX
      const isStormActive = phaseRef.current === 'STORM_SIM';
      stormVfxGroup.visible = isStormActive;
      if (isStormActive) {
        const sev = flareSeverityRef.current;
        const orbHex = sev === 'EXTREME' ? 0xf43f5e : sev === 'MODERATE' ? 0xf97316 : 0xfde047;
        coronaOrbMat.color.setHex(orbHex);
        boltMat.color.setHex(sev === 'EXTREME' ? 0xfda4af : 0xfef08a);
        const orbScale = (sev === 'EXTREME' ? 1.45 : sev === 'MODERATE' ? 1.15 : 0.85) + Math.sin(elapsed * 9) * 0.14;
        coronaOrb.scale.setScalar(orbScale);

        plasmaBolts.forEach((b) => {
          b.phase = (b.phase + dt * (sev === 'EXTREME' ? 1.6 : 1.15)) % 1;
          const yPos = 42 * (1 - b.phase) + 12 * b.phase;
          const xPos = Math.cos(b.angle + elapsed * 0.3) * b.radius * (0.4 + b.phase * 0.7);
          const zPos = Math.sin(b.angle + elapsed * 0.3) * b.radius * (0.4 + b.phase * 0.7);
          b.mesh.position.set(xPos, yPos, zPos);
        });

        const ringCycle = (elapsed * 1.8) % 1;
        shockwaveRing.scale.setScalar(0.35 + ringCycle * 1.15);
        shockwaveMat.color.setHex(sys.sunBlanketActive ? 0xfbbf24 : 0x38bdf8);
        shockwaveMat.opacity = (1 - ringCycle) * 0.72;
      }

      // Ongoing Station Hazard 3D Particle Animations
      if (hazardDustGroup) {
        hazardDustGroup.visible = sys.dustCoatPct >= 15;
        if (hazardDustGroup.visible) {
          hazardDustStreaks.forEach((s, i) => {
            s.position.x = ((elapsed * 3.5 + i * 0.85) % 5.2) - 2.6;
          });
        }
      }
      if (hazardFrostGroup) {
        hazardFrostGroup.visible = sys.frozenCells > 0;
        if (hazardFrostGroup.visible) {
          hazardFrostGroup.rotation.y += dt * 1.3;
          frostShards.forEach((sh, i) => {
            sh.rotation.x += dt * 2.1;
            sh.position.y = 1.25 + Math.sin(elapsed * 3 + i) * 0.25;
          });
        }
      }
      if (hazardLeakGroup) {
        hazardLeakGroup.visible = sys.hullLeakActive;
        if (hazardLeakGroup.visible) {
          leakPuffs.forEach((lp, i) => {
            const c = ((elapsed * 2.2 + i * 0.22) % 1);
            lp.position.z = c * 2.8;
            lp.scale.setScalar(0.45 + c * 1.25);
          });
        }
      }
      if (hazardCo2Group) {
        hazardCo2Group.visible = sys.scrubberSaturated || sys.co2Ppm >= 1600;
        if (hazardCo2Group.visible) {
          co2Puffs.forEach((cp, i) => {
            const c = ((elapsed * 0.8 + i * 0.25) % 1);
            cp.position.y = c * 2.2;
            cp.scale.setScalar(0.6 + c * 0.9);
          });
        }
      }
      if (hazardSporeGroup) {
        hazardSporeGroup.visible = sys.bioContamActive;
        if (hazardSporeGroup.visible) {
          sporeOrbs.forEach((sp, i) => {
            sp.position.y = 0.9 + ((elapsed * 0.6 + i * 0.3) % 1.4);
          });
        }
      }
      if (hazardHeatGroup) {
        hazardHeatGroup.visible = sys.radiatorHealthPct < 85 || sys.cabinTempC >= 34;
        if (hazardHeatGroup.visible) {
          heatEmbers.forEach((emb, i) => {
            emb.position.y = 1.2 + ((elapsed * 1.5 + i * 0.35) % 2.4);
          });
        }
      }
      if (valveSteamMesh) {
        valveSteamMesh.visible = sys.juryRigValveActive;
        if (valveSteamMesh.visible) {
          valveSteamMesh.scale.setScalar(0.85 + Math.sin(elapsed * 7) * 0.2);
        }
      }

      o2Bubbles.forEach((bub, idx) => {
        bub.position.y += dt * (0.4 + pwr.electrolysisKw * 0.015);
        if (bub.position.y > 2.35) bub.position.y = 0.45 + (idx % 2) * 0.12;
      });

      const emStation = emergencyStationRef.current;
      beaconMeshes.forEach((mesh, id) => {
        const isEmergency = id === emStation;
        const isNear = id === closestId;
        mesh.rotation.y += dt * (isEmergency ? 4.5 : 1.4);
        mesh.position.y = 4.65 + Math.sin(elapsed * (isEmergency ? 6 : 2.5)) * (isEmergency ? 0.35 : 0.14);
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

      if (phaseRef.current === 'ACTIVE_SHIFT' || phaseRef.current === 'ACTION_EXECUTION') {
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
        const orbitAngle = elapsed * (isStormActive ? 0.35 : 0.14);
        const shakeX = isStormActive ? Math.sin(elapsed * 32) * 0.22 : 0;
        const shakeY = isStormActive ? Math.cos(elapsed * 27) * 0.16 : 0;
        const orbitX = Math.sin(orbitAngle) * 23 + shakeX;
        const orbitZ = Math.cos(orbitAngle) * 23;
        camPosCurrent.set(orbitX, 13.5 + shakeY, orbitZ);
        camLookCurrent.set(0, 1.5, 0);
      }

      camera.position.copy(camPosCurrent);
      camera.lookAt(camLookCurrent);

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
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      dustPuffs.forEach((p) => (p.mesh.material as THREE.Material).dispose());
      disposables.forEach((dObj) => dObj.dispose());
      renderer.dispose();
    };
  }, [world, dpadRef]);

  if (webglFallback) {
    return (
      <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-200">
        <div className="text-lg font-extrabold mb-2">3D Viewport Fallback Active</div>
        <p className="text-sm text-slate-400 max-w-md">
          Hardware 3D context paused cleanly—you can still use all station controls and power
          sliders from the bottom dock!
        </p>
      </div>
    );
  }

  return <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />;
}
