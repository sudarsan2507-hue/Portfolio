import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { DOMAINS, domainById, PROJECTS, type Domain, type Project } from '../data/projects';

/*
 * Every project as a star, clustered by domain. Drag to orbit, hover to read, click to open.
 */

const CENTERS: Record<Domain, THREE.Vector3> = {
  research: new THREE.Vector3(0, 2.3, -0.4),
  agents: new THREE.Vector3(4.0, 0.5, 0),
  sensing: new THREE.Vector3(-4.0, 0.5, 0),
  products: new THREE.Vector3(2.2, -2.6, 0.4),
  team: new THREE.Vector3(-2.2, -2.6, 0.4),
};

interface Star {
  project: Project;
  pos: THREE.Vector3;
  size: number;
}

function layout(): Star[] {
  const byDomain: Record<string, Project[]> = {};
  PROJECTS.forEach((p) => (byDomain[p.domain] ||= []).push(p));
  const stars: Star[] = [];
  Object.entries(byDomain).forEach(([d, list]) => {
    const c = CENTERS[d as Domain];
    list.forEach((p, i) => {
      const golden = Math.PI * (3 - Math.sqrt(5));
      const y = list.length === 1 ? 0 : 1 - (i / (list.length - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = golden * i + d.length;
      const rad = p.featured ? 1.0 : 1.35;
      stars.push({
        project: p,
        pos: new THREE.Vector3(c.x + Math.cos(th) * r * rad, c.y + y * rad * 0.8, c.z + Math.sin(th) * r * rad),
        size: p.featured ? 0.16 : 0.1,
      });
    });
  });
  return stars;
}

function StarNode({
  star,
  active,
  onHover,
  onSelect,
}: {
  star: Star;
  active: boolean;
  onHover: (s: string | null) => void;
  onSelect: (p: Project) => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const color = domainById[star.project.domain].color;
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const s = star.size * (active ? 1.7 : 1) * (1 + Math.sin(t * 2 + phase) * 0.08);
    ref.current.scale.lerp(new THREE.Vector3(s, s, s), 0.2);
  });
  return (
    <group position={star.pos}>
      <mesh
        ref={ref}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(star.project.slug);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = '';
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(star.project);
        }}
      >
        <icosahedronGeometry args={[1, 2]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {(active || star.project.featured) && (
        <Html center distanceFactor={9} style={{ pointerEvents: 'none' }} position={[0, star.size + 0.22, 0]}>
          <div
            className="whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-[11px] tracking-wide transition-all"
            style={{
              background: active ? color : 'rgba(5,6,10,0.65)',
              color: active ? '#05060a' : 'rgba(255,255,255,0.8)',
              border: `1px solid ${color}55`,
            }}
          >
            {star.project.name}
          </div>
        </Html>
      )}
    </group>
  );
}

function Links({ stars }: { stars: Star[] }) {
  const geom = useMemo(() => {
    const pos: number[] = [];
    const col: number[] = [];
    const tmp = new THREE.Color();
    // Within a domain, connect each star to its two nearest siblings.
    stars.forEach((a, i) => {
      const sib = stars
        .map((b, j) => ({ j, d: a.pos.distanceTo(b.pos), b }))
        .filter((o) => o.j !== i && o.b.project.domain === a.project.domain)
        .sort((x, y) => x.d - y.d)
        .slice(0, 2);
      sib.forEach(({ b }) => {
        pos.push(a.pos.x, a.pos.y, a.pos.z, b.pos.x, b.pos.y, b.pos.z);
        tmp.set(domainById[a.project.domain].color);
        col.push(tmp.r, tmp.g, tmp.b, tmp.r, tmp.g, tmp.b);
      });
    });
    // Thematic bridges between domains (shared ideas across projects).
    const bridges: [string, string][] = [
      ['graderag', 'sentinelmind'],
      ['demosearch', 'graderag'],
      ['glass-armor', 'choketap'],
      ['choketap', 'webmcp-forge'],
      ['engram', 'wisp'],
      ['sentinelmind', 'showonce'],
      ['hydrofuse', 'landroid'],
      ['safesignal', 'hawkeye'],
      ['aegis', 'hawkeye'],
      ['yt-knowledge', 'rag-browser'],
      ['rag-browser', 'graderag'],
      ['syrinx', 'phantomvoice'],
    ];
    const find = (s: string) => stars.find((x) => x.project.slug === s);
    bridges.forEach(([x, y]) => {
      const a = find(x);
      const b = find(y);
      if (!a || !b) return;
      pos.push(a.pos.x, a.pos.y, a.pos.z, b.pos.x, b.pos.y, b.pos.z);
      col.push(0.55, 0.6, 0.8, 0.55, 0.6, 0.8);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  }, [stars]);
  return (
    <lineSegments geometry={geom}>
      <lineBasicMaterial vertexColors transparent opacity={0.28} />
    </lineSegments>
  );
}

/** Pull the camera back on narrow (portrait) screens so every cluster fits. */
function FitCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    // Keep the widest clusters (about ±6 units) inside a 50° vertical field of view.
    const aspect = size.width / size.height;
    const z = Math.max(10.5, 6.2 / (Math.tan((25 * Math.PI) / 180) * aspect));
    camera.position.setLength(z);
  }, [camera, size]);
  return null;
}

function Dust() {
  const geom = useMemo(() => {
    const n = 900;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 30;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 20 - 4;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);
  const ref = useRef<THREE.Points>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.01;
  });
  return (
    <points ref={ref} geometry={geom}>
      <pointsMaterial size={0.03} color="#8ea2d6" transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

export default function ProjectUniverse({
  filter,
  selected,
  onSelect,
  reduced,
  active = true,
}: {
  filter: Domain | 'all';
  selected: Project | null;
  onSelect: (p: Project) => void;
  reduced: boolean;
  active?: boolean;
}) {
  const stars = useMemo(layout, []);
  const [hover, setHover] = useState<string | null>(null);
  const visible = filter === 'all' ? stars : stars.filter((s) => s.project.domain === filter);

  return (
    <Canvas frameloop={active ? 'always' : 'never'} camera={{ position: [0, 0, 10.5], fov: 50 }} dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }}>
      <FitCamera />
      <Dust />
      <Links stars={visible} />
      {visible.map((s) => (
        <StarNode
          key={s.project.slug}
          star={s}
          active={hover === s.project.slug || selected?.slug === s.project.slug}
          onHover={setHover}
          onSelect={onSelect}
        />
      ))}
      {DOMAINS.filter((d) => filter === 'all' || d.id === filter).map((d) => (
        <Html key={d.id} center position={[CENTERS[d.id].x, CENTERS[d.id].y + 1.75, CENTERS[d.id].z]} distanceFactor={10} style={{ pointerEvents: 'none' }}>
          <div className="whitespace-nowrap font-display text-[15px] font-semibold uppercase tracking-[0.3em]" style={{ color: d.color }}>
            {d.label}
          </div>
        </Html>
      ))}
      <OrbitControls enableZoom={false} enablePan={false} autoRotate={!reduced} autoRotateSpeed={0.45} rotateSpeed={0.6} />
      <EffectComposer>
        <Bloom intensity={1.0} luminanceThreshold={0.2} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}
