/*
 * Samples my photo into particles: a position (depth from brightness) and a colour for each point.
 * Brighter pixels are sampled more often, and a soft oval mask fades the edges into the dark,
 * so the face reads clearly out of the particles.
 */

export interface PortraitPoints {
  positions: Float32Array;
  colors: Float32Array;
  count: number;
}

const cache = new Map<number, Promise<PortraitPoints>>();

export function loadPortrait(count: number, width = 3.4): Promise<PortraitPoints> {
  if (cache.has(count)) return cache.get(count)!;
  const p = new Promise<PortraitPoints>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const S = 180;
      const c = document.createElement('canvas');
      c.width = S;
      c.height = S;
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, S, S);
      const data = ctx.getImageData(0, 0, S, S).data;
      // weight each pixel by brightness inside an oval centred a little above the middle (the face)
      const weights = new Float32Array(S * S);
      let total = 0;
      for (let y = 0; y < S; y++)
        for (let x = 0; x < S; x++) {
          const i = (y * S + x) * 4;
          const l = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
          const dx = (x / S - 0.5) / 0.5;
          const dy = (y / S - 0.46) / 0.56;
          const mask = Math.max(0, 1 - Math.pow(Math.hypot(dx, dy), 3));
          const w = (0.55 + l * 0.45) * mask;
          weights[y * S + x] = w;
          total += w;
        }
      const cum = new Float32Array(weights.length);
      let acc = 0;
      for (let k = 0; k < weights.length; k++) cum[k] = acc += weights[k];
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      let seed = 7;
      const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
      for (let k = 0; k < count; k++) {
        // weighted pick
        const r = rand() * total;
        let lo = 0;
        let hi = cum.length - 1;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (cum[mid] < r) lo = mid + 1;
          else hi = mid;
        }
        const idx = lo;
        const x = idx % S;
        const y = Math.floor(idx / S);
        const i = idx * 4;
        const l = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
        const jx = (rand() - 0.5) / S;
        const jy = (rand() - 0.5) / S;
        positions[k * 3] = (x / S - 0.5 + jx) * width;
        positions[k * 3 + 1] = -(y / S - 0.5 + jy) * width;
        positions[k * 3 + 2] = (l - 0.45) * 0.7;
        // lift the colours a little so they glow against the dark page
        // dark pixels (hair, shirt) become dim blue-violet points instead of vanishing into the page
        // boost saturation, and tint the dark areas with the site's cyan-violet so it reads as colourful
        const r0 = data[i] / 255, g0 = data[i + 1] / 255, b0 = data[i + 2] / 255;
        const sat = 1.7;
        let r1 = l + (r0 - l) * sat, g1 = l + (g0 - l) * sat, b1 = l + (b0 - l) * sat;
        const dark = Math.max(0, 0.38 - l) * 2.2;
        const hue = (y / S) * 0.8 + (x / S) * 0.2; // cyan at the top, violet/pink lower down
        r1 += dark * (0.15 + hue * 0.75); g1 += dark * (0.75 - hue * 0.55); b1 += dark * 1.0;
        colors[k * 3] = Math.min(1, r1 * 1.2 + 0.03);
        colors[k * 3 + 1] = Math.min(1, g1 * 1.2 + 0.03);
        colors[k * 3 + 2] = Math.min(1, b1 * 1.2 + 0.05);
      }
      resolve({ positions, colors, count });
    };
    img.onerror = reject;
    img.src = `${import.meta.env.BASE_URL}work/sudarsan.webp`;
  });
  cache.set(count, p);
  return p;
}
