import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { nearness } from '../store';

/*
 * A live, failure-aware graph search.
 * Each episode a pulse searches from a start node to a goal. It sometimes walks into a
 * dead end (red), backs out, and remembers that node. Later episodes avoid remembered
 * nodes, so the number of dead ends hit per run falls over time.
 */

export interface SearchStats {
  run: number;
  deadEnds: number;
  remembered: number;
}

const NODE_COUNT = 140;
const K = 3;
const STEP_TIME = 0.32;

const C_IDLE = new THREE.Color('#3b4a6b');
const C_PATH = new THREE.Color('#22d3ee');
const C_DEAD = new THREE.Color('#fb7185');
const C_MEM = new THREE.Color('#7f1d3a');
const C_GOAL = new THREE.Color('#a78bfa');

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildGraph() {
  const rand = mulberry32(7);
  const pts: THREE.Vector3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < NODE_COUNT; i++) {
    const y = 1 - (i / (NODE_COUNT - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = golden * i;
    const radius = 3.1 + (rand() - 0.5) * 1.1;
    pts.push(new THREE.Vector3(Math.cos(th) * r * radius, y * radius, Math.sin(th) * r * radius));
  }
  const adj: number[][] = pts.map(() => []);
  const edges: [number, number][] = [];
  const key = new Set<string>();
  pts.forEach((p, i) => {
    const near = pts
      .map((q, j) => ({ j, d: p.distanceToSquared(q) }))
      .filter((o) => o.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, K);
    for (const { j } of near) {
      const k = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (key.has(k)) continue;
      key.add(k);
      edges.push([i, j]);
      adj[i].push(j);
      adj[j].push(i);
    }
  });
  return { pts, adj, edges };
}

function bfs(adj: number[][], s: number, g: number, blocked: Set<number>) {
  const prev = new Array(adj.length).fill(-1);
  const seen = new Set([s]);
  const q = [s];
  while (q.length) {
    const u = q.shift()!;
    if (u === g) break;
    for (const v of adj[u]) {
      if (seen.has(v) || (blocked.has(v) && v !== g)) continue;
      seen.add(v);
      prev[v] = u;
      q.push(v);
    }
  }
  if (!seen.has(g)) return null;
  const path = [g];
  while (path[0] !== s) path.unshift(prev[path[0]]);
  return path;
}

type Move = { from: number; to: number; kind: 'path' | 'dead' | 'back' };

function planEpisode(adj: number[][], memory: Set<number>, rand: () => number) {
  for (let tries = 0; tries < 40; tries++) {
    const s = Math.floor(rand() * adj.length);
    const g = Math.floor(rand() * adj.length);
    if (s === g || memory.has(s) || memory.has(g)) continue;
    const path = bfs(adj, s, g, memory);
    if (!path || path.length < 7) continue;
    const moves: Move[] = [];
    const newDead: number[] = [];
    const onPath = new Set(path);
    for (let i = 0; i < path.length - 1; i++) {
      const u = path[i];
      // Temptation: a neighbour off the true path. Remembered nodes are never retried.
      const tempting = adj[u].filter((v) => !onPath.has(v) && !memory.has(v) && !newDead.includes(v));
      const chance = Math.max(0.12, 0.55 - memory.size * 0.02);
      if (tempting.length && rand() < chance) {
        const v = tempting[Math.floor(rand() * tempting.length)];
        moves.push({ from: u, to: v, kind: 'dead' });
        moves.push({ from: v, to: u, kind: 'back' });
        newDead.push(v);
      }
      moves.push({ from: u, to: path[i + 1], kind: 'path' });
    }
    return { start: s, goal: g, moves, newDead };
  }
  return null;
}

export default function SearchGraph({ onStats, reduced, index }: { onStats: (s: SearchStats) => void; reduced: boolean; index: number }) {
  const { pts, adj, edges } = useMemo(buildGraph, []);
  const group = useRef<THREE.Group>(null);
  const nodes = useRef<THREE.InstancedMesh>(null);
  const pulse = useRef<THREE.Mesh>(null);
  const trail = useRef<THREE.LineSegments>(null);

  const state = useRef({
    rand: mulberry32(42),
    memory: new Set<number>(),
    run: 0,
    episode: null as ReturnType<typeof planEpisode>,
    step: 0,
    t: 0,
    hold: 0,
    deadThisRun: 0,
    visited: [] as Move[],
    colors: pts.map(() => C_IDLE.clone()),
    target: pts.map(() => C_IDLE.clone()),
  });

  const baseEdges = useMemo(() => {
    const arr = new Float32Array(edges.length * 6);
    edges.forEach(([a, b], i) => {
      arr.set([pts[a].x, pts[a].y, pts[a].z, pts[b].x, pts[b].y, pts[b].z], i * 6);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return g;
  }, [edges, pts]);

  const trailGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(400 * 6), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(400 * 6), 3));
    g.setDrawRange(0, 0);
    return g;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  const writeTrail = () => {
    const s = state.current;
    const pos = trailGeom.getAttribute('position') as THREE.BufferAttribute;
    const col = trailGeom.getAttribute('color') as THREE.BufferAttribute;
    const n = Math.min(s.visited.length, 400);
    for (let i = 0; i < n; i++) {
      const m = s.visited[i];
      const a = pts[m.from];
      const b = pts[m.to];
      pos.setXYZ(i * 2, a.x, a.y, a.z);
      pos.setXYZ(i * 2 + 1, b.x, b.y, b.z);
      const c = m.kind === 'path' ? C_PATH : C_DEAD;
      col.setXYZ(i * 2, c.r, c.g, c.b);
      col.setXYZ(i * 2 + 1, c.r, c.g, c.b);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
    trailGeom.setDrawRange(0, n * 2);
  };

  const startEpisode = () => {
    const s = state.current;
    s.episode = planEpisode(adj, s.memory, s.rand);
    s.step = 0;
    s.t = 0;
    s.hold = 0;
    s.deadThisRun = 0;
    s.visited = [];
    s.run += 1;
    s.target.forEach((c, i) => c.copy(s.memory.has(i) ? C_MEM : C_IDLE));
    if (s.episode) {
      s.target[s.episode.start].copy(C_PATH);
      s.target[s.episode.goal].copy(C_GOAL);
    }
    writeTrail();
    onStats({ run: s.run, deadEnds: 0, remembered: s.memory.size });
  };

  useEffect(() => {
    startEpisode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((three, dt) => {
    if (nearness(index) <= 0) return;
    const s = state.current;
    const delta = Math.min(dt, 0.05);
    const time = three.clock.getElapsedTime();

    if (group.current) {
      const targetY = reduced ? 0.1 : time * 0.06 + three.pointer.x * 0.35;
      const targetX = reduced ? 0.15 : three.pointer.y * -0.2 + 0.15;
      group.current.rotation.y += (targetY - group.current.rotation.y) * 0.05;
      group.current.rotation.x += (targetX - group.current.rotation.x) * 0.05;
    }

    const ep = s.episode;
    if (ep && !reduced) {
      if (s.step < ep.moves.length) {
        s.t += delta / STEP_TIME;
        const m = ep.moves[s.step];
        if (pulse.current) {
          pulse.current.position.lerpVectors(pts[m.from], pts[m.to], Math.min(s.t, 1));
          const c = m.kind === 'path' ? C_PATH : C_DEAD;
          (pulse.current.material as THREE.MeshBasicMaterial).color.copy(c);
        }
        if (s.t >= 1) {
          s.t = 0;
          s.step += 1;
          if (m.kind !== 'back') s.visited.push(m);
          if (m.kind === 'dead') {
            s.target[m.to].copy(C_DEAD);
            s.memory.add(m.to);
            s.deadThisRun += 1;
          } else if (m.kind === 'path') {
            s.target[m.to].copy(m.to === ep.goal ? C_GOAL : C_PATH);
          }
          writeTrail();
          onStats({ run: s.run, deadEnds: s.deadThisRun, remembered: s.memory.size });
        }
      } else {
        s.hold += delta;
        if (s.hold > 1.6) {
          if (s.memory.size > 46) s.memory.clear();
          startEpisode();
        }
      }
    }

    if (nodes.current) {
      for (let i = 0; i < pts.length; i++) {
        s.colors[i].lerp(s.target[i], 0.08);
        const isEnd = ep && (i === ep.start || i === ep.goal);
        const scale = isEnd ? 0.11 + Math.sin(time * 4) * 0.02 : s.memory.has(i) ? 0.075 : 0.055;
        dummy.position.copy(pts[i]);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        nodes.current.setMatrixAt(i, dummy.matrix);
        nodes.current.setColorAt(i, s.colors[i]);
      }
      nodes.current.instanceMatrix.needsUpdate = true;
      if (nodes.current.instanceColor) nodes.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group ref={group}>
      <lineSegments geometry={baseEdges}>
        <lineBasicMaterial color="#5b6b8f" transparent opacity={0.18} />
      </lineSegments>
      <lineSegments ref={trail} geometry={trailGeom}>
        <lineBasicMaterial vertexColors transparent opacity={0.95} toneMapped={false} />
      </lineSegments>
      <instancedMesh ref={nodes} args={[undefined, undefined, NODE_COUNT]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <mesh ref={pulse}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshBasicMaterial color={C_PATH} toneMapped={false} />
      </mesh>
    </group>
  );
}

