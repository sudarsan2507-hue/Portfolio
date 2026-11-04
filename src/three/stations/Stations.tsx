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
/* IEEE paper: a Schottky TFET cross-section. Electrons leave the     */
/* metal source, tunnel through the thin barrier into the channel;    */
/* interface trap charges blink at the oxide/channel boundary.        */
/* ------------------------------------------------------------------ */
export function SchottkyTFET({ index }: { index: number }) {
  const E = 220;
  const electrons = useRef<THREE.InstancedMesh>(null);
  const traps = useRef<THREE.InstancedMesh>(null);
  const group = useRef<THREE.Group>(null);
  const seeds = useMemo(() => Array.from({ length: E }, () => ({ t: Math.random(), y: Math.random(), z: Math.random(), v: 0.6 + Math.random() * 0.8 })), []);
  const trapSeeds = useMemo(() => Array.from({ length: 26 }, (_, i) => ({ x: -1.6 + (i / 25) * 3.2 + (Math.random() - 0.5) * 0.1, z: (Math.random() - 0.5) * 1.6, p: Math.random() * 6 })), []);

  useFrame(({ clock }, dt) => {
    if (nearness(index) <= 0) return;
    const time = clock.getElapsedTime();
    if (group.current) {
      group.current.rotation.y = -0.55 + Math.sin(time * 0.25) * 0.25;
      group.current.rotation.x = 0.32;
    }
    if (electrons.current) {
      seeds.forEach((s, i) => {
        s.t += Math.min(dt, 0.05) * 0.16 * s.v;
        if (s.t > 1) s.t -= 1;
        // x: source (-3.4) -> drain (3.4); a tunnelling jump across the barrier at x≈-2.
        const x = -3.4 + s.t * 6.8;
        const y = -0.75 + s.y * 0.6 + (x > -2 ? 0.25 * Math.exp(-((x + 1.8) ** 2) * 2) : 0);
        tmp.position.set(x, y, (s.z - 0.5) * 1.6);
        const atBarrier = Math.abs(x + 2) < 0.12;
        tmp.scale.setScalar(atBarrier ? 0.075 : 0.045);
        tmp.updateMatrix();
        electrons.current!.setMatrixAt(i, tmp.matrix);
        electrons.current!.setColorAt(i, col.set(atBarrier ? '#ffffff' : '#22d3ee'));
      });
      electrons.current.instanceMatrix.needsUpdate = true;
      if (electrons.current.instanceColor) electrons.current.instanceColor.needsUpdate = true;
    }
    if (traps.current) {
      trapSeeds.forEach((s, i) => {
        const on = 0.5 + 0.5 * Math.sin(time * 2.4 + s.p);
        tmp.position.set(s.x, -0.02, s.z);
        tmp.scale.setScalar(0.05 + on * 0.05);
        tmp.updateMatrix();
        traps.current!.setMatrixAt(i, tmp.matrix);
        traps.current!.setColorAt(i, col.set('#fb7185').multiplyScalar(0.4 + on * 0.9));
      });
      traps.current.instanceMatrix.needsUpdate = true;
      if (traps.current.instanceColor) traps.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group ref={group} scale={0.95}>
      {/* substrate */}
      <mesh position={[0, -1.55, 0]}>
        <boxGeometry args={[7.4, 0.7, 2]} />
        <meshStandardMaterial color="#141a2e" roughness={0.6} />
      </mesh>
      {/* metal source (Schottky contact) */}
      <mesh position={[-2.75, -0.5, 0]}>
        <boxGeometry args={[1.5, 1.4, 2]} />
        <meshStandardMaterial color="#9aa6c4" metalness={0.9} roughness={0.25} />
      </mesh>
      {/* silicon channel */}
      <mesh position={[0.35, -0.6, 0]}>
        <boxGeometry args={[4.7, 1.2, 2]} />
        <meshStandardMaterial color="#1d3b5c" transparent opacity={0.55} roughness={0.4} />
      </mesh>
      {/* drain contact */}
      <mesh position={[2.95, -0.5, 0]}>
        <boxGeometry args={[1.1, 1.4, 2]} />
        <meshStandardMaterial color="#9aa6c4" metalness={0.9} roughness={0.25} />
      </mesh>
      {/* gate oxide */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[3.4, 0.14, 2]} />
        <meshStandardMaterial color="#a78bfa" transparent opacity={0.45} emissive="#a78bfa" emissiveIntensity={0.4} />
      </mesh>
      {/* gate metal */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[3.2, 0.7, 2]} />
        <meshStandardMaterial color="#d4b16a" metalness={0.85} roughness={0.3} />
      </mesh>
      {/* Schottky barrier glow */}
      <mesh position={[-2, -0.55, 0]}>
        <boxGeometry args={[0.06, 1.3, 2.02]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.6} toneMapped={false} />
      </mesh>
      <instancedMesh ref={electrons} args={[undefined, undefined, E]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={traps} args={[undefined, undefined, 26]}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <Label position={[-2.75, 0.75, 1]}>Metal source</Label>
      <Label position={[0, 1.25, 1]} color="#d4b16a">Gate</Label>
      <Label position={[1.2, -0.05, 1.3]} color="#fb7185">Interface traps</Label>
      <Label position={[-2, -1.55, 1.1]} color="#22d3ee">Tunnelling barrier</Label>
      <Label position={[2.95, 0.75, 1]}>Drain</Label>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Agent safety: a stream of tool calls hits a chokepoint ring.       */
/* Allowed calls (cyan) pass; injected ones (red) are stopped.        */
/* ------------------------------------------------------------------ */
export function Chokepoint({ index }: { index: number }) {
  const N = 260;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const seeds = useMemo(
    () => Array.from({ length: N }, () => ({ t: Math.random(), a: Math.random() * Math.PI * 2, r: Math.random(), bad: Math.random() < 0.28, v: 0.7 + Math.random() * 0.6 })),
    [],
  );
  useFrame(({ clock }, dt) => {
    if (nearness(index) <= 0) return;
    const time = clock.getElapsedTime();
    if (ring.current) {
      ring.current.rotation.x = Math.PI / 2;
      ring.current.rotation.z = time * 0.4;
    }
    if (!mesh.current) return;
    seeds.forEach((s, i) => {
      s.t += Math.min(dt, 0.05) * 0.12 * s.v;
      if (s.t > 1) {
        s.t = 0;
        s.bad = Math.random() < 0.28;
      }
      // x from -6 to +6; funnel radius narrows toward the ring at x = 0.
      const x = -6 + s.t * 12;
      const funnel = x < 0 ? 0.25 + (Math.abs(x) / 6) * 2.4 : 0.35 + (x / 6) * 1.4;
      let px = x;
      let scale = 0.06;
      let c = s.bad ? '#fb7185' : '#22d3ee';
      if (s.bad && x > -0.15) {
        // blocked: pinned at the ring face, fading out
        px = -0.15 - (x + 0.15) * 0.05;
        scale = Math.max(0, 0.09 - (x + 0.15) * 0.03);
      }
      if (!s.bad && Math.abs(x) < 0.2) c = '#ffffff';
      tmp.position.set(px, Math.cos(s.a + time * 0.3) * funnel * s.r, Math.sin(s.a + time * 0.3) * funnel * s.r);
      tmp.scale.setScalar(scale);
      tmp.updateMatrix();
      mesh.current!.setMatrixAt(i, tmp.matrix);
      mesh.current!.setColorAt(i, col.set(c));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  });
  return (
    <group rotation={[0.15, -0.5, 0]}>
      <mesh ref={ring}>
        <torusGeometry args={[0.95, 0.07, 16, 80]} />
        <meshBasicMaterial color="#22d3ee" toneMapped={false} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <circleGeometry args={[0.9, 48]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.08} side={THREE.DoubleSide} />
      </mesh>
      <instancedMesh ref={mesh} args={[undefined, undefined, N]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <Label position={[-4.2, 2.4, 0]}>Agent tool calls</Label>
      <Label position={[0, 1.55, 0]} color="#22d3ee">check()</Label>
      <Label position={[3.8, 1.7, 0]} color="#22d3ee">allowed</Label>
      <Label position={[-0.9, -1.6, 0]} color="#fb7185">blocked</Label>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Sensing: Wi-Fi interference from two ESP32 nodes ripples a field;  */
/* a satellite orbits overhead (HydroFuse).                            */
/* ------------------------------------------------------------------ */
export function WaveField({ index }: { index: number }) {
  const geom = useMemo(() => new THREE.PlaneGeometry(8, 7, 56, 50), []);
  const base = useMemo(() => (geom.getAttribute('position') as THREE.BufferAttribute).array.slice(), [geom]);
  const sat = useRef<THREE.Group>(null);
  const A = new THREE.Vector2(-1.8, 0.8);
  const B = new THREE.Vector2(2.0, -1.0);
  useFrame(({ clock }) => {
    if (nearness(index) <= 0) return;
    const t = clock.getElapsedTime();
    const pos = geom.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const y = base[i * 3 + 1];
      const da = Math.hypot(x - A.x, y - A.y);
      const db = Math.hypot(x - B.x, y - B.y);
      const z = (Math.sin(da * 3 - t * 3) / (1 + da * 0.6) + Math.sin(db * 3 - t * 3.3) / (1 + db * 0.6)) * 0.35;
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
    if (sat.current) {
      sat.current.position.set(Math.cos(t * 0.35) * 3.4, 3.2 + Math.sin(t * 0.7) * 0.2, Math.sin(t * 0.35) * 2.5);
      sat.current.rotation.y = t * 0.5;
    }
  });
  return (
    <group rotation={[-1.0, 0, 0.2]} position={[0, -0.6, 0]}>
      <mesh geometry={geom}>
        <meshBasicMaterial color="#b4862a" wireframe transparent opacity={0.32} />
      </mesh>
      {[A, B].map((p, i) => (
        <mesh key={i} position={[p.x, p.y, 0.25]}>
          <boxGeometry args={[0.5, 0.32, 0.12]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
      ))}
      <group rotation={[1.0, 0, 0]}>
        <group ref={sat}>
          <mesh>
            <boxGeometry args={[0.35, 0.35, 0.5]} />
            <meshBasicMaterial color="#e6e9f2" toneMapped={false} />
          </mesh>
          <mesh position={[0.7, 0, 0]}>
            <boxGeometry args={[0.9, 0.04, 0.4]} />
            <meshBasicMaterial color="#60a5fa" toneMapped={false} />
          </mesh>
          <mesh position={[-0.7, 0, 0]}>
            <boxGeometry args={[0.9, 0.04, 0.4]} />
            <meshBasicMaterial color="#60a5fa" toneMapped={false} />
          </mesh>
        </group>
      </group>
      <Label position={[A.x, A.y, 0.9]} color="#fbbf24">ESP32 · TX</Label>
      <Label position={[B.x, B.y, 0.9]} color="#fbbf24">ESP32 · RX</Label>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Dataset: ISIC 2019 images as tiles, assembling into train / val /  */
/* test blocks with a hard gap between them (no leakage).             */
/* ------------------------------------------------------------------ */
export function DataSplit({ index }: { index: number }) {
  const blocks = [
    // Columns follow the real split: 20,308 / 2,448 / 2,575 images (about 80 / 10 / 10).
    { name: 'train · 20,308', color: '#2dd4bf', cols: 8, x: -1.5 },
    { name: 'val · 2,448', color: '#fbbf24', cols: 1, x: 1.8 },
    { name: 'test · 2,575', color: '#f472b6', cols: 1, x: 3.1 },
  ];
  const ROWS = 9;
  const DEPTH = 3;
  const tiles = useMemo(() => {
    const out: { target: THREE.Vector3; start: THREE.Vector3; color: string; d: number }[] = [];
    blocks.forEach((b) => {
      for (let c = 0; c < b.cols; c++)
        for (let r = 0; r < ROWS; r++)
          for (let k = 0; k < DEPTH; k++) {
            const target = new THREE.Vector3(b.x + (c - (b.cols - 1) / 2) * 0.42, (r - (ROWS - 1) / 2) * 0.42, (k - 1) * 0.42);
            const start = new THREE.Vector3((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 8);
            out.push({ target, start, color: b.color, d: Math.random() });
          }
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const group = useRef<THREE.Group>(null);
  const p = new THREE.Vector3();
  useFrame(({ clock }) => {
    const n = nearness(index);
    if (n <= 0 || !mesh.current) return;
    const t = clock.getElapsedTime();
    if (group.current) group.current.rotation.y = -0.45 + Math.sin(t * 0.3) * 0.25;
    // Tiles fly in as the camera arrives.
    const assemble = Math.min(1, Math.max(0, (n - 0.35) / 0.55));
    tiles.forEach((tile, i) => {
      const a = Math.min(1, Math.max(0, assemble * 1.4 - tile.d * 0.4));
      const e = 1 - Math.pow(1 - a, 3);
      p.lerpVectors(tile.start, tile.target, e);
      tmp.position.copy(p);
      tmp.rotation.set((1 - e) * tile.d * 6, (1 - e) * tile.d * 4, 0);
      tmp.scale.setScalar(0.34);
      tmp.updateMatrix();
      mesh.current!.setMatrixAt(i, tmp.matrix);
      mesh.current!.setColorAt(i, col.set(tile.color).multiplyScalar(0.55 + 0.45 * Math.sin(t * 1.5 + tile.d * 9) ** 2));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  });
  return (
    <group ref={group}>
      <instancedMesh ref={mesh} args={[undefined, undefined, tiles.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      {/* the leakage walls */}
      {[1.15, 2.45].map((x) => (
        <mesh key={x} position={[x, 0, 0]}>
          <boxGeometry args={[0.03, 4.4, 1.6]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.35} toneMapped={false} />
        </mesh>
      ))}
      {blocks.map((b) => (
        <Label key={b.name} position={[b.x, b.name.startsWith('val') ? -2.45 : 2.45, 0]} color={b.color}>{b.name}</Label>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Shipped products: the full stack, layer by layer.                   */
/* ------------------------------------------------------------------ */
export function StackLayers({ index }: { index: number }) {
  const layers = [
    { name: 'Interface · React / Flutter', color: '#34d399' },
    { name: 'API · FastAPI / Node', color: '#22d3ee' },
    { name: 'Model · open-weight LLMs', color: '#a78bfa' },
    { name: 'Deploy · Docker / Render', color: '#fbbf24' },
  ];
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const n = nearness(index);
    if (n <= 0) return;
    const t = clock.getElapsedTime();
    if (group.current) group.current.rotation.y = t * 0.25;
    const spread = 0.45 + n * 0.75;
    refs.current.forEach((m, i) => {
      if (!m) return;
      m.position.y = (1.5 - i) * spread + Math.sin(t * 1.2 + i) * 0.06;
    });
  });
  return (
    <group rotation={[0.45, 0, 0]}>
      <group ref={group}>
        {layers.map((l, i) => (
          <mesh key={l.name} ref={(m) => (refs.current[i] = m)}>
            <boxGeometry args={[3.4, 0.12, 2.4]} />
            <meshStandardMaterial color={l.color} emissive={l.color} emissiveIntensity={0.55} transparent opacity={0.75} />
          </mesh>
        ))}
      </group>
      {layers.map((l, i) => (
        <Label key={l.name} position={[-2.9, (1.5 - i) * 1.2, 0]} color={l.color}>{l.name}</Label>
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
