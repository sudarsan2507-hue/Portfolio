import { createContext, useContext, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { nearness } from '../store';

const tmp = new THREE.Object3D();
const col = new THREE.Color();

/** Which station a label belongs to, so labels only show while their station is in view. */
export const StationIndex = createContext(0);

function Label({ children, position, color = '#e6e9f2' }: { children: string; position: [number, number, number]; color?: string }) {
  const i = useContext(StationIndex);
  const el = useRef<HTMLDivElement>(null);
  useFrame(() => {
    if (el.current) el.current.style.opacity = String(Math.max(0, (nearness(i) - 0.55) / 0.45));
  });
  return (
    <Html position={position} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
      <div ref={el} className="world-label" style={{ color, borderColor: `${color}55`, opacity: 0 }}>
        {children}
      </div>
    </Html>
  );
}

/* ------------------------------------------------------------------ */
/* Research: the failure loop. A comet runs a torus knot; points it   */
/* passes flash red (fail), cool to violet (remembered).              */
/* ------------------------------------------------------------------ */
export function FailureLoop({ index }: { index: number }) {
  const N = 1400;
  const curve = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 400; i++) {
      const t = (i / 400) * Math.PI * 2;
      const p = 2, q = 3;
      const r = 2.2 + 0.9 * Math.cos(q * t);
      pts.push(new THREE.Vector3(r * Math.cos(p * t), r * Math.sin(p * t), 0.9 * Math.sin(q * t)));
    }
    return new THREE.CatmullRomCurve3(pts, true);
  }, []);
  const { geom, ts } = useMemo(() => {
    const pos = new Float32Array(N * 3);
    const c = new Float32Array(N * 3);
    const ts = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const t = Math.random();
      ts[i] = t;
      const p = curve.getPointAt(t);
      const j = 0.22;
      pos.set([p.x + (Math.random() - 0.5) * j, p.y + (Math.random() - 0.5) * j, p.z + (Math.random() - 0.5) * j], i * 3);
      c.set([0.45, 0.5, 0.7], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return { geom: g, ts };
  }, [curve]);
  const comet = useRef<THREE.Mesh>(null);
  const group = useRef<THREE.Group>(null);
  const red = new THREE.Color('#fb7185');
  const violet = new THREE.Color('#a78bfa');
  const idle = new THREE.Color('#3a4566');

  useFrame(({ clock }) => {
    if (nearness(index) <= 0) return;
    const time = clock.getElapsedTime();
    const head = (time * 0.07) % 1;
    if (comet.current) comet.current.position.copy(curve.getPointAt(head));
    if (group.current) group.current.rotation.set(Math.sin(time * 0.2) * 0.3, time * 0.12, 0);
    const c = geom.getAttribute('color') as THREE.BufferAttribute;
    for (let i = 0; i < N; i++) {
      let d = head - ts[i];
      if (d < 0) d += 1;
      // just passed: red flash; then settles to a remembered violet that slowly fades.
      if (d < 0.025) col.copy(red);
      else if (d < 0.5) col.copy(violet).lerp(idle, (d - 0.025) / 0.475);
      else col.copy(idle);
      c.setXYZ(i, col.r, col.g, col.b);
    }
    c.needsUpdate = true;
  });

  return (
    <group ref={group} scale={1.15}>
      <points geometry={geom}>
        <pointsMaterial size={0.06} vertexColors sizeAttenuation transparent opacity={0.95} toneMapped={false} />
      </points>
      <mesh ref={comet}>
        <sphereGeometry args={[0.14, 16, 16]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* IEEE paper: the energy-band diagram of a Schottky TFET, in 3D.      */
/* Electrons leave the metal's Fermi sea, tunnel through the thin      */
/* barrier at the junction, then ride the conduction band to the       */
/* drain. Interface trap states flicker inside the band gap.          */
/* ------------------------------------------------------------------ */
const BAND_GAP = 1.5;
/** Conduction-band edge along the device, x from -4.5 (metal source) to 4.5 (drain). */
function Ec(x: number) {
  if (x < -2) return 0.2;
  const bend = 1.35 * Math.exp(-(x + 2) / 0.55); // band bending at the Schottky junction
  const drain = x > 2.6 ? -0.9 * (1 - Math.exp(-(x - 2.6) / 0.35)) : 0;
  return -0.55 + bend + drain;
}
const FERMI = -0.35;

export function BandDiagram({ index }: { index: number }) {
  const BAND_PTS = 2600;
  const E = 900;
  const TRAPS = 90;

  const bands = useMemo(() => {
    const pos = new Float32Array(BAND_PTS * 2 * 3);
    const c = new Float32Array(BAND_PTS * 2 * 3);
    const cyan = new THREE.Color('#22d3ee');
    const violet = new THREE.Color('#a78bfa');
    for (let i = 0; i < BAND_PTS; i++) {
      const x = -2 + Math.random() * 6.5;
      const z = (Math.random() - 0.5) * 2.6;
      const j = (Math.random() - 0.5) * 0.05;
      pos.set([x, Ec(x) + j, z], i * 6);
      pos.set([x, Ec(x) - BAND_GAP + j, z], i * 6 + 3);
      c.set([cyan.r, cyan.g, cyan.b, violet.r, violet.g, violet.b], i * 6);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return g;
  }, []);

  // The metal source: a sea of filled states up to the Fermi level.
  const sea = useMemo(() => {
    const n = 1600;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos.set([-4.5 + Math.random() * 2.45, FERMI - Math.pow(Math.random(), 0.6) * 1.9, (Math.random() - 0.5) * 2.6], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  const elec = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(E * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(E * 3), 3));
    return g;
  }, []);
  const seeds = useMemo(() => Array.from({ length: E }, () => ({ t: Math.random(), z: (Math.random() - 0.5) * 2.4, v: 0.6 + Math.random() * 0.8, y: Math.random() })), []);

  const traps = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAPS * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(TRAPS * 3), 3));
    return g;
  }, []);
  const trapSeeds = useMemo(() => Array.from({ length: TRAPS }, () => ({ x: -1.9 + Math.random() * 1.6, f: Math.random(), z: (Math.random() - 0.5) * 2.6, p: Math.random() * 7 })), []);

  const group = useRef<THREE.Group>(null);
  const white = new THREE.Color('#ffffff');
  const cyan = new THREE.Color('#67e8f9');

  useFrame(({ clock }, dt) => {
    if (nearness(index) <= 0) return;
    const t = clock.getElapsedTime();
    if (group.current) {
      group.current.rotation.y = -0.5 + Math.sin(t * 0.18) * 0.22;
      group.current.rotation.x = 0.18;
    }
    const p = elec.getAttribute('position') as THREE.BufferAttribute;
    const c = elec.getAttribute('color') as THREE.BufferAttribute;
    seeds.forEach((s, i) => {
      s.t += Math.min(dt, 0.05) * 0.07 * s.v;
      if (s.t > 1) s.t -= 1;
      const x = -4.3 + s.t * 8.6;
      let y: number;
      if (x < -2.05) y = FERMI - s.y * 0.12; // drifting at the top of the Fermi sea
      else y = Ec(x) + 0.05 + s.y * 0.1; // tunnelled: now in the conduction band
      p.setXYZ(i, x, y, s.z);
      const tunnelling = Math.abs(x + 2) < 0.18;
      col.copy(tunnelling ? white : cyan);
      c.setXYZ(i, col.r, col.g, col.b);
    });
    p.needsUpdate = true;
    c.needsUpdate = true;

    const tp = traps.getAttribute('position') as THREE.BufferAttribute;
    const tc = traps.getAttribute('color') as THREE.BufferAttribute;
    trapSeeds.forEach((s, i) => {
      const on = Math.max(0, Math.sin(t * 2.2 + s.p));
      tp.setXYZ(i, s.x, Ec(s.x) - BAND_GAP * (0.25 + s.f * 0.5), s.z);
      col.set('#fb7185').multiplyScalar(0.2 + on * 1.2);
      tc.setXYZ(i, col.r, col.g, col.b);
    });
    tp.needsUpdate = true;
    tc.needsUpdate = true;
  });

  return (
    <group ref={group} scale={1.05}>
      <points geometry={bands}>
        <pointsMaterial size={0.045} vertexColors transparent opacity={0.9} sizeAttenuation toneMapped={false} />
      </points>
      <points geometry={sea}>
        <pointsMaterial size={0.035} color="#d4b16a" transparent opacity={0.55} sizeAttenuation />
      </points>
      <points geometry={elec}>
        <pointsMaterial size={0.075} vertexColors transparent opacity={1} sizeAttenuation toneMapped={false} />
      </points>
      <points geometry={traps}>
        <pointsMaterial size={0.11} vertexColors transparent opacity={1} sizeAttenuation toneMapped={false} />
      </points>
      {/* the Schottky junction */}
      <mesh position={[-2.02, -0.6, 0]}>
        <boxGeometry args={[0.02, 2.6, 2.7]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.18} />
      </mesh>
      <Label position={[-3.3, 0.55, 1.4]} color="#d4b16a">Metal source · E_F</Label>
      <Label position={[1.2, Ec(1.2) + 0.45, 1.4]} color="#22d3ee">Conduction band</Label>
      <Label position={[1.2, Ec(1.2) - BAND_GAP - 0.4, 1.4]} color="#a78bfa">Valence band</Label>
      <Label position={[-2, 1.25, 1.4]}>Tunnelling barrier</Label>
      <Label position={[-1.1, -1.25, 1.4]} color="#fb7185">Interface traps</Label>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Agent safety: a vortex of tool calls spirals into a checkpoint.     */
/* Allowed calls leave as a straight beam; injected ones are thrown    */
/* back out as sparks.                                                 */
/* ------------------------------------------------------------------ */
export function InjectionVortex({ index }: { index: number }) {
  const N = 3200;
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    return g;
  }, []);
  const seeds = useMemo(() => Array.from({ length: N }, () => ({ t: Math.random(), a: Math.random() * Math.PI * 2, r: 0.6 + Math.random() * 0.4, bad: Math.random() < 0.22, v: 0.7 + Math.random() * 0.6, k: Math.random() })), []);
  const ring = useRef<THREE.Group>(null);
  const good = new THREE.Color('#22d3ee');
  const bad = new THREE.Color('#fb7185');
  const hot = new THREE.Color('#ffffff');

  useFrame(({ clock }, dt) => {
    if (nearness(index) <= 0) return;
    const time = clock.getElapsedTime();
    if (ring.current) ring.current.rotation.x = time * 0.5;
    const p = geom.getAttribute('position') as THREE.BufferAttribute;
    const c = geom.getAttribute('color') as THREE.BufferAttribute;
    seeds.forEach((s, i) => {
      s.t += Math.min(dt, 0.05) * 0.09 * s.v;
      if (s.t > 1) {
        s.t = 0;
        s.bad = Math.random() < 0.22;
      }
      const x = -7 + s.t * 14;
      let px = x, py: number, pz: number;
      if (x < 0) {
        // inbound spiral, tightening toward the gate
        const radius = (0.25 + (-x / 7) * 3.4) * s.r;
        const ang = s.a + time * 0.6 + x * 0.9;
        py = Math.cos(ang) * radius;
        pz = Math.sin(ang) * radius;
        col.copy(s.bad ? bad : good).multiplyScalar(0.55 + (1 + x / 7) * 0.6);
        if (x > -0.25) col.copy(hot);
      } else if (!s.bad) {
        // allowed: an orderly beam
        py = Math.cos(s.a) * 0.16 * s.r;
        pz = Math.sin(s.a) * 0.16 * s.r;
        col.copy(good).multiplyScalar(1.1 - (x / 7) * 0.6);
      } else {
        // blocked: thrown back out of the gate as fading sparks
        const back = x;
        px = -back * 0.6;
        const out = 0.3 + back * 1.1;
        py = Math.cos(s.a) * out;
        pz = Math.sin(s.a) * out;
        col.copy(bad).multiplyScalar(Math.max(0, 1.2 - back / 4));
      }
      p.setXYZ(i, px, py, pz);
      c.setXYZ(i, col.r, col.g, col.b);
    });
    p.needsUpdate = true;
    c.needsUpdate = true;
  });

  return (
    <group rotation={[0.25, -0.55, 0]} scale={0.95}>
      <points geometry={geom}>
        <pointsMaterial size={0.055} vertexColors transparent opacity={0.95} sizeAttenuation toneMapped={false} />
      </points>
      <group ref={ring} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <torusGeometry args={[0.75, 0.045, 16, 96]} />
          <meshBasicMaterial color="#e0f7ff" toneMapped={false} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 6]}>
          <torusGeometry args={[1.05, 0.012, 6, 6]} />
          <meshBasicMaterial color="#22d3ee" toneMapped={false} />
        </mesh>
      </group>
      <Label position={[-4.6, 3.1, 0]}>Agent tool calls</Label>
      <Label position={[0, 1.55, 0]} color="#22d3ee">check()</Label>
      <Label position={[4.4, 0.7, 0]} color="#22d3ee">Allowed</Label>
      <Label position={[-1.6, -2.6, 0]} color="#fb7185">Blocked injections</Label>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Sensing: a field of Wi-Fi channel samples. Two ESP32 nodes ripple   */
/* it; a person walking through bends the signal, then falls.          */
/* A satellite sweeps the ground (HydroFuse).                          */
/* ------------------------------------------------------------------ */
export function CSIField({ index }: { index: number }) {
  const G = 120;
  const SIZE = 9;
  const geom = useMemo(() => {
    const pos = new Float32Array(G * G * 3);
    for (let i = 0; i < G; i++)
      for (let j = 0; j < G; j++) pos.set([(i / (G - 1) - 0.5) * SIZE, 0, (j / (G - 1) - 0.5) * SIZE], (i * G + j) * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(G * G * 3), 3));
    return g;
  }, []);
  const A = new THREE.Vector2(-2.6, -1.4);
  const B = new THREE.Vector2(2.6, 1.6);
  const sat = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Mesh>(null);
  const pulses = useRef<(THREE.Mesh | null)[]>([]);
  const low = new THREE.Color('#3b2a0a');
  const high = new THREE.Color('#f2b84b');
  const fall = new THREE.Color('#fb7185');

  useFrame(({ clock }) => {
    if (nearness(index) <= 0) return;
    const t = clock.getElapsedTime();
    // a person walks across the room for 6 s, then collapses for 2 s
    const cycle = t % 8;
    const walking = cycle < 6;
    const px = walking ? -3 + cycle : 3;
    const pz = walking ? Math.sin(cycle) * 0.8 : Math.sin(6) * 0.8;
    const pos = geom.getAttribute('position') as THREE.BufferAttribute;
    const c = geom.getAttribute('color') as THREE.BufferAttribute;
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k);
      const z = pos.getZ(k);
      const da = Math.hypot(x - A.x, z - A.y);
      const db = Math.hypot(x - B.x, z - B.y);
      let y = (Math.sin(da * 3.2 - t * 3) / (1 + da * 0.5) + Math.sin(db * 3.2 - t * 3.4) / (1 + db * 0.5)) * 0.32;
      const dp = Math.hypot(x - px, z - pz);
      const body = Math.exp(-dp * dp * 2.2);
      y += walking ? body * 0.55 : -body * 0.9 * Math.min(1, (cycle - 6) * 3);
      pos.setY(k, y);
      const h = Math.min(1, Math.max(0, (y + 0.4) / 1.1));
      col.copy(low).lerp(high, h);
      if (!walking && body > 0.25) col.lerp(fall, body);
      c.setXYZ(k, col.r, col.g, col.b);
    }
    pos.needsUpdate = true;
    c.needsUpdate = true;
    pulses.current.forEach((m, i) => {
      if (!m) return;
      const s = ((t * 0.7 + i * 0.5) % 1) * 3.5;
      m.scale.setScalar(0.2 + s);
      (m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.7 - s / 4);
    });
    if (sat.current) {
      sat.current.position.set(Math.cos(t * 0.3) * 3.6, 3.6, Math.sin(t * 0.3) * 2.4);
      sat.current.rotation.y = -t * 0.3;
    }
    if (beam.current && sat.current) {
      beam.current.position.set(sat.current.position.x, 1.8, sat.current.position.z);
    }
  });

  return (
    <group rotation={[0.55, -0.35, 0]} position={[0, -0.5, 0]}>
      <points geometry={geom}>
        <pointsMaterial size={0.042} vertexColors transparent opacity={0.85} sizeAttenuation />
      </points>
      {[A, B].map((n, i) => (
        <group key={i} position={[n.x, 0.2, n.y]}>
          <mesh>
            <boxGeometry args={[0.45, 0.14, 0.3]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </mesh>
          {[0, 1].map((k) => (
            <mesh key={k} ref={(m) => (pulses.current[i * 2 + k] = m)} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.95, 1, 64]} />
              <meshBasicMaterial color="#fbbf24" transparent opacity={0.5} toneMapped={false} side={THREE.DoubleSide} />
            </mesh>
          ))}
        </group>
      ))}
      <group ref={sat}>
        <mesh>
          <boxGeometry args={[0.32, 0.32, 0.5]} />
          <meshBasicMaterial color="#e6e9f2" toneMapped={false} />
        </mesh>
        <mesh position={[0.65, 0, 0]}>
          <boxGeometry args={[0.8, 0.03, 0.36]} />
          <meshBasicMaterial color="#60a5fa" toneMapped={false} />
        </mesh>
        <mesh position={[-0.65, 0, 0]}>
          <boxGeometry args={[0.8, 0.03, 0.36]} />
          <meshBasicMaterial color="#60a5fa" toneMapped={false} />
        </mesh>
      </group>
      <mesh ref={beam}>
        <coneGeometry args={[1.1, 3.4, 32, 1, true]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.07} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <Label position={[A.x, 0.9, A.y]} color="#fbbf24">ESP32 · TX</Label>
      <Label position={[B.x, 0.9, B.y]} color="#fbbf24">ESP32 · RX</Label>
      <Label position={[0, 4.4, 0]} color="#60a5fa">Sentinel · SMAP</Label>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Dataset: the 25,331 images as a cloud, coloured by their 8 real     */
/* classes. A stream leaves it and splits through three gates into     */
/* train / val / test, 80 / 10 / 10. Photos of one lesion travel as a  */
/* tight group, so no lesion ever reaches two gates.                   */
/* ------------------------------------------------------------------ */
const CLASSES = [
  { name: 'NV', share: 0.508, color: '#a78bfa' },
  { name: 'MEL', share: 0.179, color: '#fb7185' },
  { name: 'BCC', share: 0.131, color: '#22d3ee' },
  { name: 'BKL', share: 0.104, color: '#fbbf24' },
  { name: 'AK', share: 0.034, color: '#34d399' },
  { name: 'SCC', share: 0.025, color: '#f472b6' },
  { name: 'VASC', share: 0.01, color: '#60a5fa' },
  { name: 'DF', share: 0.009, color: '#e6e9f2' },
];
const GATES = [
  { name: 'train · 20,308', share: 0.8, color: '#2dd4bf', y: 1.6, r: 1.25 },
  { name: 'val · 2,448', share: 0.1, color: '#fbbf24', y: -0.6, r: 0.6 },
  { name: 'test · 2,575', share: 0.1, color: '#f472b6', y: -2.1, r: 0.6 },
];
const SRC = new THREE.Vector3(-3.6, 0, 0);
const GATE_X = 2.4;

export function DatasetFlow({ index }: { index: number }) {
  const N = 9000;
  const { geom, seeds } = useMemo(() => {
    const colors = new Float32Array(N * 3);
    const c = new THREE.Color();
    const cum: number[] = [];
    CLASSES.reduce((acc, k) => (cum.push(acc + k.share), acc + k.share), 0);
    const seeds = Array.from({ length: N }, (_, i) => {
      const lesion = Math.floor(i / 3); // ~3 photos per lesion share everything below
      const h = (n: number) => {
        const x = Math.sin(lesion * 12.9898 + n * 78.233) * 43758.5453;
        return x - Math.floor(x);
      };
      const u = h(1);
      const cls = Math.max(0, cum.findIndex((v) => u <= v));
      const g = h(2) < 0.8 ? 0 : h(2) < 0.9 ? 1 : 2;
      c.set(CLASSES[cls].color).multiplyScalar(0.75 + Math.random() * 0.4);
      colors.set([c.r, c.g, c.b], i * 3);
      return {
        dir: new THREE.Vector3(h(3) - 0.5, h(4) - 0.5, h(5) - 0.5).normalize(),
        rad: Math.cbrt(h(6)) * 1.9,
        jitter: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.06),
        gate: g,
        phase: h(7),
        speed: 0.8 + h(8) * 0.4,
        lane: (h(9) - 0.5) * 2,
        lane2: (h(10) - 0.5) * 2,
      };
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return { geom: g, seeds };
  }, []);

  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const group = useRef<THREE.Group>(null);
  const v = new THREE.Vector3();
  const p0 = new THREE.Vector3();
  const p1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();

  useFrame(({ clock }) => {
    if (nearness(index) <= 0) return;
    const t = clock.getElapsedTime();
    if (group.current) group.current.rotation.y = -0.35 + Math.sin(t * 0.2) * 0.18;
    const pos = geom.getAttribute('position') as THREE.BufferAttribute;
    const spin = t * 0.25;
    for (let i = 0; i < N; i++) {
      const s = seeds[i];
      // 55% of the time a particle sits in the cloud; the rest it is in flight
      const life = (s.phase + t * 0.045 * s.speed) % 1;
      // position in the cloud, slowly rotating
      v.copy(s.dir).multiplyScalar(s.rad);
      const cx = v.x * Math.cos(spin) - v.z * Math.sin(spin);
      const cz = v.x * Math.sin(spin) + v.z * Math.cos(spin);
      p0.set(SRC.x + cx, SRC.y + v.y, SRC.z + cz);
      if (life < 0.55) {
        pos.setXYZ(i, p0.x + s.jitter.x, p0.y + s.jitter.y, p0.z + s.jitter.z);
        continue;
      }
      const k = (life - 0.55) / 0.45;
      const e = k * k * (3 - 2 * k);
      const gt = GATES[s.gate];
      // a curved path: out of the cloud, through a narrow waist, fanning to the gate
      p1.set(-0.6, gt.y * 0.25, 0);
      const ang = s.lane * Math.PI;
      p2.set(GATE_X, gt.y + Math.sin(ang) * gt.r * 0.85 * Math.abs(s.lane2), Math.cos(ang) * gt.r * 0.85 * Math.abs(s.lane2));
      const a = (1 - e) * (1 - e), b = 2 * (1 - e) * e, c2 = e * e;
      pos.setXYZ(
        i,
        a * p0.x + b * p1.x + c2 * p2.x + s.jitter.x,
        a * p0.y + b * p1.y + c2 * p2.y + s.jitter.y,
        a * p0.z + b * p1.z + c2 * p2.z + s.jitter.z,
      );
    }
    pos.needsUpdate = true;
    rings.current.forEach((r, i) => {
      if (r) r.rotation.x = Math.PI / 2 + Math.sin(t + i) * 0.05;
    });
  });

  return (
    <group ref={group} scale={0.9} position={[-0.3, 0, 0]}>
      <points geometry={geom}>
        <pointsMaterial size={0.05} vertexColors transparent opacity={0.95} sizeAttenuation toneMapped={false} />
      </points>
      {GATES.map((g, i) => (
        <group key={g.name} position={[GATE_X + 0.1, g.y, 0]} rotation={[0, Math.PI / 2, 0]}>
          <mesh ref={(m) => (rings.current[i] = m)}>
            <torusGeometry args={[g.r, 0.035, 12, 96]} />
            <meshBasicMaterial color={g.color} toneMapped={false} />
          </mesh>
          <mesh>
            <circleGeometry args={[g.r, 64]} />
            <meshBasicMaterial color={g.color} transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        </group>
      ))}
      {GATES.map((g) => (
        <Label key={g.name} position={[GATE_X + 1.1, g.y + g.r + 0.25, 0]} color={g.color}>{g.name}</Label>
      ))}
      <Label position={[SRC.x + 1.6, 2.4, 0]}>25,331 images · 8 classes</Label>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Apps: an atom of the full stack. Four tilted orbits of particles,   */
/* one per layer, around a glowing core.                              */
/* ------------------------------------------------------------------ */
export function StackAtom({ index }: { index: number }) {
  const orbits = [
    { name: 'Interface · React, Flutter', color: '#34d399', r: 2.0, tilt: [0.3, 0, 0.2], speed: 0.5 },
    { name: 'API · FastAPI, Node', color: '#22d3ee', r: 2.5, tilt: [1.2, 0.4, 0], speed: -0.4 },
    { name: 'Model · open-weight LLMs', color: '#a78bfa', r: 3.0, tilt: [-0.5, 1.0, 0.4], speed: 0.32 },
    { name: 'Deploy · Docker, Render', color: '#fbbf24', r: 3.5, tilt: [0.9, -0.8, -0.3], speed: -0.26 },
  ];
  const PER = 700;
  const geoms = useMemo(
    () =>
      orbits.map((o) => {
        const pos = new Float32Array(PER * 3);
        const ph = new Float32Array(PER);
        for (let i = 0; i < PER; i++) ph[i] = Math.random() * Math.PI * 2;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        return { g, ph, o };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const core = useMemo(() => {
    const n = 1500;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(Math.pow(Math.random(), 2) * 0.9);
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (nearness(index) <= 0) return;
    const t = clock.getElapsedTime();
    if (group.current) group.current.rotation.y = t * 0.08;
    geoms.forEach(({ g, ph, o }) => {
      const p = g.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < PER; i++) {
        const a = ph[i] + t * o.speed;
        const wob = 1 + Math.sin(ph[i] * 7 + t) * 0.025;
        p.setXYZ(i, Math.cos(a) * o.r * wob, Math.sin(ph[i] * 13) * 0.04, Math.sin(a) * o.r * wob);
      }
      p.needsUpdate = true;
    });
  });
  return (
    <group>
      <group ref={group}>
        <points geometry={core}>
          <pointsMaterial size={0.06} color="#ffffff" transparent opacity={0.9} sizeAttenuation toneMapped={false} />
        </points>
        {geoms.map(({ g, o }) => (
          <group key={o.name} rotation={o.tilt as [number, number, number]}>
            <points geometry={g}>
              <pointsMaterial size={0.06} color={o.color} transparent opacity={0.95} sizeAttenuation toneMapped={false} />
            </points>
          </group>
        ))}
      </group>
      {orbits.map((o, i) => (
        <Label key={o.name} position={[4.6, 1.8 - i * 0.75, 0]} color={o.color}>{o.name}</Label>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Contact: a spiral galaxy, one arm per area of work.                 */
/* ------------------------------------------------------------------ */
export function Galaxy({ index }: { index: number }) {
  const N = 5000;
  const colors = ['#a78bfa', '#22d3ee', '#fbbf24', '#34d399', '#f472b6'];
  const geom = useMemo(() => {
    const pos = new Float32Array(N * 3);
    const c = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const arm = i % colors.length;
      const r = Math.pow(Math.random(), 0.7) * 6;
      const ang = (arm / colors.length) * Math.PI * 2 + r * 0.9;
      const spread = 0.35 + r * 0.08;
      pos.set([Math.cos(ang) * r + (Math.random() - 0.5) * spread, (Math.random() - 0.5) * 0.4, Math.sin(ang) * r + (Math.random() - 0.5) * spread], i * 3);
      col.set(colors[arm]).lerp(new THREE.Color('#ffffff'), Math.max(0, 0.6 - r * 0.15));
      c.set([col.r, col.g, col.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const ref = useRef<THREE.Points>(null);
  useFrame(({ clock }) => {
    if (nearness(index) <= 0 || !ref.current) return;
    ref.current.rotation.y = clock.getElapsedTime() * 0.06;
  });
  return (
    <group rotation={[0.55, 0, 0.1]}>
      <points ref={ref} geometry={geom}>
        <pointsMaterial size={0.045} vertexColors sizeAttenuation transparent opacity={0.9} toneMapped={false} />
      </points>
    </group>
  );
}
