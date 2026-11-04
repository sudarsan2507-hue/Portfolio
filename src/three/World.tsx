import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { scroll, STATIONS, stationPos, stationSide, UNIVERSE_INDEX } from './store';
import SearchGraph, { type SearchStats } from './stations/SearchGraph';
import { BandDiagram, CSIField, FailureLoop, Galaxy, InjectionVortex, DatasetFlow, StackAtom, StationIndex } from './stations/Stations';

const idx = (id: (typeof STATIONS)[number]) => STATIONS.indexOf(id);

function cameraPose(i: number, wide: boolean) {
  const p = stationPos(i);
  const side = stationSide(i);
  const off = wide ? 4.4 : 0;
  const dist = wide ? 11 : 15;
  if (STATIONS[i] === 'contact') {
    return { pos: p.clone().add(new THREE.Vector3(0, 3.5, 11)), look: p.clone().add(new THREE.Vector3(0, -0.5, 0)) };
  }
  return {
    pos: p.clone().add(new THREE.Vector3(-side * off, 0.6, dist)),
    look: p.clone().add(new THREE.Vector3(-side * off, 0, 0)),
  };
}

function CameraRig({ reduced }: { reduced: boolean }) {
  const { camera, size } = useThree();
  const look = useRef(new THREE.Vector3());
  const smoothP = useRef(scroll.progress);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const la = new THREE.Vector3();
  const lb = new THREE.Vector3();
  useFrame((state, dt) => {
    const wide = size.width >= 900;
    // Ease toward the scroll position so fast scrolls still glide.
    const k = reduced ? 1 : 1 - Math.exp(-Math.min(dt, 0.05) * 4);
    smoothP.current += (scroll.progress - smoothP.current) * k;
    const p = smoothP.current;
    const i = Math.min(STATIONS.length - 2, Math.floor(p));
    const t = Math.min(1, Math.max(0, p - i));
    const e = t * t * (3 - 2 * t);
    const A = cameraPose(i, wide);
    const B = cameraPose(i + 1, wide);
    a.copy(A.pos).lerp(B.pos, e);
    // Swoop: rise and pull back mid-flight for a sense of travel.
    const swoop = Math.sin(e * Math.PI);
    a.y += swoop * 2.2;
    a.z += swoop * 4;
    la.copy(A.look);
    lb.copy(B.look);
    la.lerp(lb, e);
    // Subtle parallax from the pointer.
    if (!reduced) {
      a.x += state.pointer.x * 0.5;
      a.y += state.pointer.y * 0.3;
    }
    camera.position.copy(a);
    look.current.lerp(la, 0.25);
    if (look.current.lengthSq() === 0) look.current.copy(la);
    camera.lookAt(look.current);
  });
  return null;
}

/** Star dust along the whole flight path, so travel between stations reads as motion. */
function Corridor() {
  const geom = useMemo(() => {
    const n = 6000;
    const arr = new Float32Array(n * 3);
    const c = new Float32Array(n * 3);
    const end = -STATIONS.length * 24;
    const tint = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const z = 20 + Math.random() * (end - 40);
      arr.set([(Math.random() - 0.5) * 60, (Math.random() - 0.5) * 36, z], i * 3);
      tint.set(['#8ea2d6', '#a78bfa', '#22d3ee', '#ffffff'][i % 4]).multiplyScalar(0.4 + Math.random() * 0.5);
      c.set([tint.r, tint.g, tint.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return g;
  }, []);
  return (
    <points geometry={geom}>
      <pointsMaterial size={0.06} vertexColors sizeAttenuation transparent opacity={0.8} />
    </points>
  );
}

function Station({ i, children, scale = 1 }: { i: number; children: React.ReactNode; scale?: number }) {
  const { size } = useThree();
  const s = size.width < 600 ? scale * 0.78 : scale;
  return (
    <StationIndex.Provider value={i}>
      <group position={stationPos(i)} scale={s}>
        {children}
      </group>
    </StationIndex.Provider>
  );
}

/** Hides the world while the separate, interactive universe canvas is on screen. */
function Visibility({ wrap }: { wrap: React.RefObject<HTMLDivElement | null> }) {
  useFrame(() => {
    if (!wrap.current) return;
    const d = Math.abs(scroll.progress - UNIVERSE_INDEX);
    wrap.current.style.opacity = String(Math.min(1, Math.max(0, (d - 0.15) / 0.5)));
  });
  return null;
}

export default function World({ onStats, reduced }: { onStats: (s: SearchStats) => void; reduced: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  return (
    <div ref={wrap} className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      <Canvas camera={{ position: [0, 0, 10], fov: 50, near: 0.1, far: 400 }} dpr={[1, 1.6]} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}>
        <color attach="background" args={['#06070d']} />
        <fog attach="fog" args={['#06070d', 15, 33]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[6, 10, 8]} intensity={1.4} />
        <pointLight position={[-6, 4, -40]} intensity={60} color="#a78bfa" />
        <CameraRig reduced={reduced} />
        <Visibility wrap={wrap} />
        <Corridor />
        <Station i={idx('top')} scale={0.86}><SearchGraph onStats={onStats} reduced={reduced} index={idx('top')} /></Station>
        <Station i={idx('research')} scale={1.15}><FailureLoop index={idx('research')} /></Station>
        <Station i={idx('paper')} scale={0.85}><BandDiagram index={idx('paper')} /></Station>
        <Station i={idx('safety')} scale={0.85}><InjectionVortex index={idx('safety')} /></Station>
        <Station i={idx('sensing')} scale={0.72}><CSIField index={idx('sensing')} /></Station>
        <Station i={idx('data')} scale={1}><DatasetFlow index={idx('data')} /></Station>
        <Station i={idx('products')} scale={0.85}><StackAtom index={idx('products')} /></Station>
        <Station i={idx('contact')}><Galaxy index={idx('contact')} /></Station>
        <EffectComposer>
          <Bloom intensity={1.1} luminanceThreshold={0.18} luminanceSmoothing={0.3} mipmapBlur />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
