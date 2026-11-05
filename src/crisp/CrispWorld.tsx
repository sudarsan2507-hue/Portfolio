import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

/*
 * The crisp view's 3D: one cloud of particles that changes shape as you scroll.
 * Each section of the page has a shape, in order:
 *   globe (who I am) → failure loop (GradeRAG internship) → double helix (achievements)
 *   → energy bands (IEEE paper) → 80/10/10 split (Kaggle dataset) → galaxy (projects).
 * It sits behind the profile column on wide screens, and dims behind the text on phones.
 */

const N = 11000;

const vert = /* glsl */ `
  attribute vec3 aFrom;
  attribute vec3 aTo;
  attribute vec3 aColor;
  attribute float aRand;
  uniform float uMix;
  uniform float uTime;
  uniform float uSize;
  uniform float uPixel;
  uniform float uFade;
  varying vec3 vColor;
  varying float vFade;
  void main() {
    vFade = uFade;
    float lag = aRand * 0.4;
    float m = clamp((uMix - lag) / (1.0 - lag), 0.0, 1.0);
    m = m * m * (3.0 - 2.0 * m);
    vec3 p = mix(aFrom, aTo, m);
    // particles in flight swirl outward a little
    float flight = sin(m * 3.14159);
    p += flight * 0.6 * vec3(sin(aRand * 50.0 + uTime), cos(aRand * 37.0 + uTime), sin(aRand * 23.0));
    p += 0.035 * vec3(sin(uTime * 1.3 + aRand * 60.0), cos(uTime * 1.1 + aRand * 40.0), 0.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixel * (0.6 + aRand * 0.8) / max(0.1, -mv.z);
    vColor = aColor;
  }
`;

const frag = /* glsl */ `
  varying vec3 vColor;
  varying float vFade;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    if (r > 0.5) discard;
    float a = smoothstep(0.5, 0.0, r);
    gl_FragColor = vec4(vColor * (0.55 + a) * vFade, a * vFade);
  }
`;

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function shapes() {
  const R = rng(5);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const make = (f: (i: number) => [number, number, number]) => {
    const a = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) a.set(f(i), i * 3);
    return a;
  };
  const globe = make((i) => {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = golden * i;
    const rad = 2.2 + (R() - 0.5) * 0.06;
    return [Math.cos(th) * r * rad, y * rad, Math.sin(th) * r * rad];
  });
  const knot = make(() => {
    const t = R() * Math.PI * 2;
    const r = 1.5 + 0.65 * Math.cos(3 * t);
    const j = 0.16;
    return [r * Math.cos(2 * t) + (R() - 0.5) * j, r * Math.sin(2 * t) + (R() - 0.5) * j, 0.65 * Math.sin(3 * t) + (R() - 0.5) * j];
  });
  const helix = make((i) => {
    const t = R();
    const y = (t - 0.5) * 5.4;
    const ang = t * Math.PI * 7;
    if (i % 5 === 0) {
      // rungs between the strands
      const k = R() * 2 - 1;
      return [Math.cos(ang) * 1.1 * k, y, Math.sin(ang) * 1.1 * k];
    }
    const strand = i % 2 ? 0 : Math.PI;
    return [Math.cos(ang + strand) * 1.1 + (R() - 0.5) * 0.08, y + (R() - 0.5) * 0.08, Math.sin(ang + strand) * 1.1];
  });
  const bands = make((i) => {
    const x = (R() - 0.5) * 5;
    const z = (R() - 0.5) * 1.8;
    const ec = x < -1 ? 0.5 : -0.4 + 1.6 * Math.exp(-(x + 1) / 0.5);
    if (x < -1.1 && i % 3 === 0) return [x, -0.4 - R() * 1.6, z]; // metal source sea
    return [x, (i % 2 ? ec : ec - 1.4) + (R() - 0.5) * 0.06, z];
  });
  const split = make((i) => {
    const u = (i % 10) / 10;
    const g = u < 0.8 ? 0 : u < 0.9 ? 1 : 2;
    const box = [
      { x: -0.9, w: 2.2, h: 2.6 },
      { x: 1.05, w: 0.55, h: 1.2 },
      { x: 1.85, w: 0.55, h: 1.2 },
    ][g];
    return [box.x + (R() - 0.5) * box.w, (R() - 0.5) * box.h - (g ? 0.7 : 0), (R() - 0.5) * 1.2];
  });
  const galaxy = make((i) => {
    const arm = i % 5;
    const r = Math.pow(R(), 0.7) * 3.2;
    const ang = (arm / 5) * Math.PI * 2 + r * 1.1;
    const s = 0.15 + r * 0.08;
    return [Math.cos(ang) * r + (R() - 0.5) * s, (R() - 0.5) * 0.25, Math.sin(ang) * r + (R() - 0.5) * s];
  });
  return [globe, knot, helix, bands, split, galaxy];
}

/** Reads how far the page has scrolled through the sections marked with data-shape. */
function readProgress(count: number) {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-shape]'));
  if (!els.length) return 0;
  const mid = window.innerHeight * 0.5;
  let idx = 0;
  for (let i = 0; i < els.length; i++) if (els[i].getBoundingClientRect().top <= mid) idx = i;
  const r = els[idx].getBoundingClientRect();
  const local = Math.min(1, Math.max(0, (mid - r.top) / Math.max(1, r.height)));
  const t = Math.min(1, Math.max(0, (local - 0.55) / 0.45));
  return Math.min(count - 1, idx + (idx < count - 1 ? t : 0));
}

function Cloud() {
  const all = useMemo(shapes, []);
  const { geom, mat } = useMemo(() => {
    const R = rng(9);
    const color = new Float32Array(N * 3);
    const rand = new Float32Array(N);
    const c = new THREE.Color();
    const palette = ['#22d3ee', '#a78bfa', '#f472b6', '#fbbf24', '#34d399', '#e6e9f2'];
    for (let i = 0; i < N; i++) {
      rand[i] = R();
      c.set(palette[Math.floor(R() * (R() < 0.6 ? 2 : palette.length))]).multiplyScalar(0.7 + R() * 0.5);
      color.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(all[0].slice(), 3));
    g.setAttribute('aFrom', new THREE.BufferAttribute(all[0].slice(), 3));
    g.setAttribute('aTo', new THREE.BufferAttribute(all[1].slice(), 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
    g.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);
    const m = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uFade: { value: 0 }, uMix: { value: 0 }, uTime: { value: 0 }, uSize: { value: 22 }, uPixel: { value: Math.min(window.devicePixelRatio, 1.75) } },
    });
    return { geom: g, mat: m };
  }, [all]);

  const seg = useRef(-1);
  const smooth = useRef(0);
  const group = useRef<THREE.Group>(null);
  const { viewport, size } = useThree();

  useFrame((state, dt) => {
    const target = readProgress(all.length);
    smooth.current += (target - smooth.current) * (1 - Math.exp(-Math.min(dt, 0.05) * 4));
    const p = smooth.current;
    const i = Math.min(all.length - 2, Math.floor(p));
    if (i !== seg.current) {
      seg.current = i;
      (geom.getAttribute('aFrom') as THREE.BufferAttribute).array.set(all[i]);
      (geom.getAttribute('aTo') as THREE.BufferAttribute).array.set(all[i + 1]);
      geom.getAttribute('aFrom').needsUpdate = true;
      geom.getAttribute('aTo').needsUpdate = true;
    }
    mat.uniforms.uMix.value = p - i;
    // on wide screens my portrait owns the slot at the top of the page; the cloud fades in after
    const fadeTarget = size.width >= 960 ? Math.min(1, Math.max(0, (window.scrollY - 120) / 260)) : 1;
    mat.uniforms.uFade.value += (fadeTarget - mat.uniforms.uFade.value) * 0.12;
    mat.uniforms.uTime.value = state.clock.getElapsedTime();
    if (group.current) {
      const t = state.clock.getElapsedTime();
      group.current.rotation.y = t * 0.12 + state.pointer.x * 0.3;
      group.current.rotation.x = 0.25 + state.pointer.y * -0.15;
      // fill the empty slot in the profile column on wide screens; centre behind the text on phones
      const wide = size.width >= 960;
      const slot = document.querySelector<HTMLElement>('.cloud-slot');
      const r = slot?.getBoundingClientRect();
      if (wide && r && r.height > 40) {
        const cx = ((r.left + r.width / 2) / size.width - 0.5) * viewport.width;
        const cy = -((r.top + r.height / 2) / size.height - 0.5) * viewport.height;
        const fit = Math.min(r.width / size.width * viewport.width, r.height / size.height * viewport.height) / 5.2;
        group.current.position.x += (cx - group.current.position.x) * 0.15;
        group.current.position.y += (cy - group.current.position.y) * 0.15;
        const sc = group.current.scale.x + (Math.max(0.35, Math.min(1, fit)) - group.current.scale.x) * 0.15;
        group.current.scale.setScalar(sc);
      } else {
        group.current.position.set(0, 0, 0);
        group.current.scale.setScalar(0.95);
      }
    }
  });

  return (
    <group ref={group}>
      <points geometry={geom} material={mat} frustumCulled={false} />
    </group>
  );
}

export default function CrispWorld() {
  // re-render once fonts and layout settle so the first frame reads the right section
  useEffect(() => {
    window.dispatchEvent(new Event('scroll'));
  }, []);
  return (
    <div className="crisp-world" aria-hidden>
      <Canvas camera={{ position: [0, 0, 9], fov: 50 }} dpr={[1, 1.75]} gl={{ antialias: false, alpha: true }}>
        <Cloud />
        <EffectComposer>
          <Bloom intensity={1.0} luminanceThreshold={0.15} mipmapBlur />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
