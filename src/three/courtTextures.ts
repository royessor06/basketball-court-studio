import * as THREE from 'three';
import { SurfaceMaterialType } from '../types/court';

function adjustHex(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean, 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `rgb(${r}, ${g}, ${b})`;
}

export function createSurfaceTexture(
  surfaceType: SurfaceMaterialType,
  baseColor: string,
  maxAnisotropy: number
): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
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

        // Subtle longitudinal wood grain streaks
        ctx.strokeStyle = adjustHex(baseColor, shade - 9);
        ctx.lineWidth = 1;
        for (let g = 1; g <= 3; g++) {
          const gy = r * rowH + (rowH * g) / 4;
          ctx.beginPath();
          ctx.moveTo(x + 2, gy);
          ctx.lineTo(x + plankW - 2, gy);
          ctx.stroke();
        }

        // Plank seam
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
  } else {
    // Acrylic / Asphalt fine mineral aggregate speckle
    for (let i = 0; i < 6000; i++) {
      const px = (i * 197) % 512;
      const py = (i * 313 + Math.floor(i / 512) * 71) % 512;
      const alpha = surfaceType === 'asphalt_textured' ? 0.14 : 0.06;
      ctx.fillStyle = i % 2 === 0 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
      ctx.fillRect(px, py, 2, 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 3.5);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}
