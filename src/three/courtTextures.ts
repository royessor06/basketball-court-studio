import * as THREE from 'three';
import { SurfaceMaterialType } from '../types/court';

function adjustHex(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean;
  const num = parseInt(full || '808080', 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `rgb(${r}, ${g}, ${b})`;
}

function createSolidFallbackTexture(baseColor: string): THREE.DataTexture {
  const color = new THREE.Color(baseColor);
  const data = new Uint8Array([
    Math.round(color.r * 255),
    Math.round(color.g * 255),
    Math.round(color.b * 255),
    255,
  ]);
  const fallback = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
  fallback.colorSpace = THREE.SRGBColorSpace;
  fallback.needsUpdate = true;
  return fallback;
}

export function createSurfaceTexture(
  surfaceType: SurfaceMaterialType,
  baseColor: string,
  maxAnisotropy: number
): THREE.Texture {
  if (typeof document === 'undefined') {
    return createSolidFallbackTexture(baseColor);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return createSolidFallbackTexture(baseColor);
  }

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  if (surfaceType === 'hardwood_maple' || surfaceType === 'hardwood_dark') {
    const rows = 16;
    const rowH = 512 / rows;
    for (let r = 0; r < rows; r++) {
      let x = -((r * 73) % 120);
      while (x < 512) {
        const plankW = 90 + (((r * 37 + Math.floor(x)) * 19) % 110);
        const shade = (((r * 13 + Math.floor(x * 0.5)) % 9) - 4) * 3;
        ctx.fillStyle = adjustHex(baseColor, shade);
        ctx.fillRect(x, r * rowH, plankW, rowH);

        ctx.strokeStyle = adjustHex(baseColor, shade - 9);
        ctx.lineWidth = 1;
        for (let g = 1; g <= 3; g++) {
          const gy = r * rowH + (rowH * g) / 4;
          ctx.beginPath();
          ctx.moveTo(x + 2, gy);
          ctx.lineTo(x + plankW - 2, gy);
          ctx.stroke();
        }

        ctx.strokeStyle = 'rgba(20, 14, 10, 0.18)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, r * rowH, plankW, rowH);
        x += plankW;
      }
    }
  } else if (surfaceType === 'modular_tile') {
    const grid = 16;
    const cell = 512 / grid;
    for (let gx = 0; gx < grid; gx++) {
      for (let gy = 0; gy < grid; gy++) {
        const shade = (gx + gy) % 2 === 0 ? 3 : -3;
        ctx.fillStyle = adjustHex(baseColor, shade);
        ctx.fillRect(gx * cell, gy * cell, cell, cell);
        ctx.strokeStyle = 'rgba(10, 14, 20, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(gx * cell, gy * cell, cell, cell);
      }
    }
  } else if (surfaceType === 'synthetic_turf' || surfaceType === 'natural_grass') {
    // Mowed pitch alternating bands
    const bands = 4;
    const bandW = 512 / bands;
    for (let b = 0; b < bands; b++) {
      const shade = b % 2 === 0 ? 7 : -7;
      ctx.fillStyle = adjustHex(baseColor, shade);
      ctx.fillRect(b * bandW, 0, bandW, 512);
    }
    // Fine turf blade fiber / crumb grain
    const count = surfaceType === 'natural_grass' ? 11000 : 8500;
    for (let i = 0; i < count; i++) {
      const px = (i * 197 + Math.floor(i / 64) * 31) % 512;
      const py = (i * 313 + Math.floor(i / 512) * 71) % 512;
      const isLight = i % 3 === 0;
      ctx.fillStyle = isLight ? 'rgba(255,255,255,0.06)' : 'rgba(10,20,12,0.11)';
      ctx.fillRect(px, py, 1.5, 3);
    }
  } else if (surfaceType === 'clay_red') {
    // Crushed brick clay subtle sweeping texture + mineral grain
    for (let y = 0; y < 512; y += 6) {
      ctx.fillStyle = y % 12 === 0 ? 'rgba(255,220,190,0.035)' : 'rgba(40,12,4,0.04)';
      ctx.fillRect(0, y, 512, 3);
    }
    for (let i = 0; i < 9000; i++) {
      const px = (i * 223) % 512;
      const py = (i * 349 + Math.floor(i / 256) * 53) % 512;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,215,195,0.08)' : 'rgba(50,15,5,0.12)';
      ctx.fillRect(px, py, 2, 2);
    }
  } else if (surfaceType === 'beach_sand') {
    // Soft raked sand ripples + warm silica speckle
    for (let y = 0; y < 512; y += 8) {
      ctx.fillStyle = y % 16 === 0 ? 'rgba(255,248,228,0.08)' : 'rgba(120,90,50,0.06)';
      ctx.fillRect(0, y, 512, 4);
    }
    for (let i = 0; i < 8000; i++) {
      const px = (i * 199) % 512;
      const py = (i * 293 + Math.floor(i / 312) * 41) % 512;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,252,240,0.09)' : 'rgba(110,85,48,0.09)';
      ctx.fillRect(px, py, 2, 2);
    }
  } else {
    // Acrylic / PU Multisport / Asphalt fine mineral aggregate speckle
    const isAsphalt = surfaceType === 'asphalt_textured';
    const isPu = surfaceType === 'pu_multisport';
    const alpha = isAsphalt ? 0.14 : isPu ? 0.035 : 0.06;
    const count = isPu ? 4500 : 6000;
    for (let i = 0; i < count; i++) {
      const px = (i * 197) % 512;
      const py = (i * 313 + Math.floor(i / 512) * 71) % 512;
      ctx.fillStyle = i % 2 === 0 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
      ctx.fillRect(px, py, 2, 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  if (surfaceType === 'synthetic_turf' || surfaceType === 'natural_grass') {
    texture.repeat.set(4, 1);
  } else {
    texture.repeat.set(6, 3.5);
  }
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}
