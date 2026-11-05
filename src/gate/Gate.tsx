import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { motion } from 'motion/react';
import { ArrowRight, BookOpen, Database, GraduationCap, Trophy } from 'lucide-react';
import * as THREE from 'three';

/*
 * The entrance. 18,000 particles form a living core. Hovering "Crisp" folds them into an ordered
 * lattice; hovering "Detailed" spreads them into a galaxy. Choosing one warps every particle past
 * the camera, and the chosen view fades in behind.
 * All motion runs in the vertex shader, so it stays smooth on ordinary laptops.
 */

export type ViewMode = 'crisp' | 'detailed';

const N = 18000;

const vert = /* glsl */ `
  attribute vec3 aIdle;
  attribute vec3 aCrisp;
  attribute vec3 aDetail;
  attribute vec3 aColor;
  attribute float aRand;
  uniform float uTime;
  uniform float uMorph;
  uniform float uWarp;
  uniform float uSize;
  uniform float uPixel;
  varying vec3 vColor;
  varying float vFade;
  mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
  void main() {
    vec3 p = aIdle;
    // the core breathes
    p += 0.14 * vec3(sin(uTime * 0.7 + aRand * 40.0), cos(uTime * 0.9 + aRand * 31.0), sin(uTime * 0.6 + aRand * 17.0));
    float c = smoothstep(0.0, 1.0, max(-uMorph, 0.0));
    float d = smoothstep(0.0, 1.0, max(uMorph, 0.0));
    // each particle leaves on its own schedule, so the morph ripples instead of snapping
    float lag = aRand * 0.35;
    c = clamp((c - lag) / (1.0 - lag), 0.0, 1.0);
    d = clamp((d - lag) / (1.0 - lag), 0.0, 1.0);
    p = mix(p, aCrisp, c);
    p = mix(p, aDetail, d);
    p.xz = rot(uTime * 0.09 + d * 0.6) * p.xz;
    p.yz = rot(0.35 - c * 0.15) * p.yz;
    // warp: everything streams toward and past the camera
    float w = uWarp * uWarp;
    p.xy *= 1.0 + w * (1.2 + aRand * 2.0);
    p.z += w * (6.0 + aRand * 70.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixel * (0.55 + aRand * 0.9) * (1.0 + w * 4.0) / max(0.1, -mv.z);
    vColor = aColor;
    vFade = 1.0 - smoothstep(0.75, 1.0, uWarp);
  }
`;

const frag = /* glsl */ `
  varying vec3 vColor;
  varying float vFade;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    if (r > 0.5) discard;
    float a = smoothstep(0.5, 0.0, r);
    gl_FragColor = vec4(vColor * (0.6 + a), a * vFade);
  }
`;

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function buildShapes() {
  const R = rng(11);
  const idle = new Float32Array(N * 3);
  const crisp = new Float32Array(N * 3);
  const detail = new Float32Array(N * 3);
  const color = new Float32Array(N * 3);
  const rand = new Float32Array(N);
  const c = new THREE.Color();
  const palette = ['#22d3ee', '#a78bfa', '#f472b6', '#fbbf24', '#34d399'];
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < N; i++) {
    rand[i] = R();
    const u = R();
    // ---- idle: a folded shell, three orbit rings and a bright core
    let x: number, y: number, z: number;
    if (u < 0.55) {
      const k = i / (N * 0.55);
      const yy = 1 - k * 2;
      const rr = Math.sqrt(Math.max(0, 1 - yy * yy));
      const th = golden * i;
      const fold = 2.25 + 0.35 * Math.sin(th * 3 + yy * 6) * Math.cos(yy * 5);
      x = Math.cos(th) * rr * fold;
      y = yy * fold;
      z = Math.sin(th) * rr * fold;
      c.set('#22d3ee').lerp(new THREE.Color('#a78bfa'), (yy + 1) / 2);
    } else if (u < 0.85) {
      const ring = Math.floor(R() * 3);
      const a = R() * Math.PI * 2;
      const rad = 3.3 + ring * 0.45 + (R() - 0.5) * 0.12;
      const tilt = [0.4, -0.9, 1.4][ring];
      const px = Math.cos(a) * rad;
      const pz = Math.sin(a) * rad;
      x = px;
      y = pz * Math.sin(tilt);
      z = pz * Math.cos(tilt);
      c.set(['#f472b6', '#fbbf24', '#34d399'][ring]);
    } else {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(Math.pow(R(), 2.2) * 1.1);
      x = v.x; y = v.y; z = v.z;
      c.set('#ffffff').lerp(new THREE.Color('#a5f3fc'), R());
    }
    idle.set([x, y, z], i * 3);
    c.multiplyScalar(0.75 + R() * 0.45);
    color.set([c.r, c.g, c.b], i * 3);

    // ---- crisp: an ordered lattice cube, points on its edges and a grid on its faces
    const s = 2.1;
    const face = Math.floor(R() * 6);
    const onEdge = R() < 0.45;
    let a1 = Math.round((R() * 2 - 1) * 8) / 8;
    let a2 = Math.round((R() * 2 - 1) * 8) / 8;
    if (onEdge) {
      a2 = R() < 0.5 ? -1 : 1;
      a1 = R() * 2 - 1;
    }
    const f = [
      [1, a1, a2], [-1, a1, a2], [a1, 1, a2], [a1, -1, a2], [a1, a2, 1], [a1, a2, -1],
    ][face];
    crisp.set([f[0] * s, f[1] * s, f[2] * s], i * 3);

    // ---- detailed: a five-arm spiral galaxy
    const arm = i % 5;
    const r = Math.pow(R(), 0.65) * 7;
    const ang = (arm / 5) * Math.PI * 2 + r * 0.75;
    const spread = 0.3 + r * 0.09;
    detail.set([Math.cos(ang) * r + (R() - 0.5) * spread, (R() - 0.5) * (0.5 - r * 0.04), Math.sin(ang) * r + (R() - 0.5) * spread], i * 3);
    if (u > 0.85) {
      // keep the core particles white in every shape
    } else if (R() < 0.4) {
      c.set(palette[arm]).multiplyScalar(0.8 + R() * 0.4);
      color.set([c.r, c.g, c.b], i * 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(idle.slice(), 3));
  g.setAttribute('aIdle', new THREE.BufferAttribute(idle, 3));
  g.setAttribute('aCrisp', new THREE.BufferAttribute(crisp, 3));
  g.setAttribute('aDetail', new THREE.BufferAttribute(detail, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
  g.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 100);
  return g;
}

function Particles({ hover, warpTo, onWarpDone }: { hover: ViewMode | null; warpTo: ViewMode | null; onWarpDone: () => void }) {
  const geom = useMemo(buildShapes, []);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uMorph: { value: 0 },
          uWarp: { value: 0 },
          uSize: { value: 26 },
          uPixel: { value: Math.min(window.devicePixelRatio, 1.75) },
        },
      }),
    [],
  );
  const done = useRef(false);
  const warpStart = useRef<number | null>(null);
  const group = useRef<THREE.Group>(null);

  useFrame((state, dt) => {
    const u = mat.uniforms;
    const t = state.clock.getElapsedTime();
    u.uTime.value = t;
    const target = warpTo ?? hover;
    const goal = target === 'crisp' ? -1 : target === 'detailed' ? 1 : 0;
    u.uMorph.value += (goal - u.uMorph.value) * (1 - Math.exp(-Math.min(dt, 0.05) * (warpTo ? 5 : 2.6)));
    if (warpTo) {
      if (warpStart.current === null) warpStart.current = t;
      // let the shape settle for a moment, then warp
      const k = Math.min(1, Math.max(0, (t - warpStart.current - 0.35) / 1.0));
      u.uWarp.value = k;
      if (k >= 1 && !done.current) {
        done.current = true;
        onWarpDone();
      }
    }
    if (group.current) {
      group.current.rotation.y += (state.pointer.x * 0.35 - group.current.rotation.y) * 0.04;
      group.current.rotation.x += (-state.pointer.y * 0.2 - group.current.rotation.x) * 0.04;
    }
  });

  return (
    <group ref={group}>
      <points geometry={geom} material={mat} frustumCulled={false} />
    </group>
  );
}

function Stars() {
  const geom = useMemo(() => {
    const n = 2500;
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) a.set([(Math.random() - 0.5) * 80, (Math.random() - 0.5) * 50, -10 - Math.random() * 40], i * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(a, 3));
    return g;
  }, []);
  return (
    <points geometry={geom}>
      <pointsMaterial size={0.06} color="#8ea2d6" transparent opacity={0.55} sizeAttenuation />
    </points>
  );
}

const HIGHLIGHTS = [
  { icon: Trophy, label: 'Winner, Hack-N-Droid 2.0' },
  { icon: BookOpen, label: 'IEEE author' },
  { icon: GraduationCap, label: 'NIT Trichy research intern' },
  { icon: Database, label: 'Kaggle dataset with DOI' },
];

/**
 * interactive: show the chooser. When false the gate is only used as the 3D transition
 * between views. warpTo starts the warp; onWarpDone fires once particles have streamed past.
 */
export default function Gate({
  interactive,
  warpTo,
  fading,
  onChoose,
  onWarpDone,
}: {
  interactive: boolean;
  warpTo: ViewMode | null;
  fading: boolean;
  onChoose: (m: ViewMode) => void;
  onWarpDone: () => void;
}) {
  const [hover, setHover] = useState<ViewMode | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const choices: { id: ViewMode; kicker: string; title: string; body: string }[] = [
    { id: 'crisp', kicker: '2-minute read', title: 'Crisp', body: 'My top six projects, achievements, internship, paper and dataset on one page.' },
    { id: 'detailed', kicker: 'The full 3D journey', title: 'Detailed', body: 'Fly through all 34 projects, chapter by chapter, with a 3D scene for each.' },
  ];

  return (
    <div className={`gate ${shown && !fading ? 'in' : ''} ${warpTo ? 'warping' : ''}`} aria-hidden={!interactive}>
      <Canvas camera={{ position: [0, 0.4, 9.5], fov: 50 }} dpr={[1, 1.75]} gl={{ antialias: false, powerPreference: 'high-performance' }}>
        <color attach="background" args={['#05060c']} />
        <Stars />
        <Particles hover={hover} warpTo={warpTo} onWarpDone={onWarpDone} />
        <EffectComposer>
          <Bloom intensity={1.25} luminanceThreshold={0.12} luminanceSmoothing={0.35} mipmapBlur />
        </EffectComposer>
      </Canvas>

      {interactive && (
        <div className="gate-ui">
          <motion.header initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }} className="gate-head">
            <p className="gate-eyebrow">CSE (AI &amp; ML) · VIT Chennai</p>
            <h1 className="gate-name">Sudarsan <span>Ravichandran</span></h1>
            <p className="gate-tag">I build AI that learns from <em>its mistakes.</em></p>
            <ul className="gate-hl">
              {HIGHLIGHTS.map((h) => (
                <li key={h.label}><h.icon className="h-3.5 w-3.5" />{h.label}</li>
              ))}
            </ul>
          </motion.header>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.8 }} className="gate-choices" role="group" aria-label="Choose a view">
            {choices.map((c) => (
              <button
                key={c.id}
                className={`gate-choice ${c.id} ${hover === c.id ? 'on' : ''}`}
                onPointerEnter={() => setHover(c.id)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(c.id)}
                onBlur={() => setHover(null)}
                onClick={() => onChoose(c.id)}
                disabled={!!warpTo}
              >
                <span className="gc-kicker">{c.kicker}</span>
                <span className="gc-title">{c.title} <ArrowRight className="h-5 w-5" /></span>
                <span className="gc-body">{c.body}</span>
              </button>
            ))}
          </motion.div>
          <p className="gate-hint">Hover or tap a view to preview it. You can switch at any time.</p>
        </div>
      )}
    </div>
  );
}
