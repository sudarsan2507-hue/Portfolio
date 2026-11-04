import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { domainById, type Project } from '../data/projects';

/*
 * Every project as a card on a slowly turning ring. Drag sideways to spin it, click a card to open it.
 * Cards with a screenshot or results chart show it; the rest get a generated face in their domain colour.
 */

const CARD_W = 2.7;
const CARD_H = 1.8;
const TEX_W = 900;
const TEX_H = 600;

export const imageUrl = (file: string) => `${import.meta.env.BASE_URL}work/${file}`;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else line = test;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.join(' ') !== lines.join(' ')) lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '…');
  return lines;
}

function drawCard(p: Project, img: HTMLImageElement | null) {
  const d = domainById[p.domain];
  const c = document.createElement('canvas');
  c.width = TEX_W;
  c.height = TEX_H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0a0d1a';
  ctx.fillRect(0, 0, TEX_W, TEX_H);
  const imgH = 340;
  if (img) {
    // cover-fit the screenshot into the top of the card
    const s = Math.max(TEX_W / img.width, imgH / img.height);
    const w = img.width * s;
    const h = img.height * s;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, TEX_W, imgH);
    ctx.clip();
    ctx.drawImage(img, (TEX_W - w) / 2, 0, w, h);
    ctx.restore();
    const g = ctx.createLinearGradient(0, imgH - 90, 0, imgH);
    g.addColorStop(0, 'rgba(10,13,26,0)');
    g.addColorStop(1, 'rgba(10,13,26,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, imgH - 90, TEX_W, 90);
  } else {
    // generated face: a field of dots in the domain colour, brighter toward one corner
    const g = ctx.createRadialGradient(TEX_W * 0.8, 40, 10, TEX_W * 0.8, 40, 520);
    g.addColorStop(0, d.color + '66');
    g.addColorStop(1, 'rgba(10,13,26,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, TEX_W, imgH);
    ctx.fillStyle = d.color;
    for (let y = 18; y < imgH - 20; y += 22)
      for (let x = 18; x < TEX_W; x += 22) {
        const k = Math.max(0, 1 - Math.hypot(x - TEX_W * 0.8, y - 40) / 620);
        ctx.globalAlpha = 0.08 + k * 0.6;
        ctx.beginPath();
        ctx.arc(x, y, 1.5 + k * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    ctx.globalAlpha = 1;
    if (p.metrics?.[0]) {
      ctx.fillStyle = d.color;
      ctx.font = '700 120px "Bricolage Grotesque", system-ui, sans-serif';
      ctx.fillText(p.metrics[0].value, 40, 230);
    }
  }
  // text block
  ctx.fillStyle = d.color;
  ctx.font = '500 22px "Geist Mono", ui-monospace, monospace';
  ctx.fillText(d.label.toUpperCase() + (p.context ? `  ·  ${p.context.split(' · ')[0]}` : ''), 40, imgH + 44);
  ctx.fillStyle = '#eef1f8';
  ctx.font = '800 54px "Bricolage Grotesque", system-ui, sans-serif';
  ctx.fillText(p.name, 40, imgH + 104);
  ctx.fillStyle = '#9aa3bd';
  ctx.font = '400 26px "Geist", system-ui, sans-serif';
  wrap(ctx, p.tagline, TEX_W - 80, 2).forEach((l, i) => ctx.fillText(l, 40, imgH + 150 + i * 34));
  // frame
  ctx.strokeStyle = d.color + '88';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, TEX_W - 4, TEX_H - 4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function useCardTextures(projects: Project[]) {
  const [textures, setTextures] = useState<Record<string, THREE.Texture>>({});
  useEffect(() => {
    let alive = true;
    const made: THREE.Texture[] = [];
    (document.fonts?.ready ?? Promise.resolve()).then(() => {
      projects.forEach((p) => {
        const finish = (img: HTMLImageElement | null) => {
          if (!alive) return;
          const t = drawCard(p, img);
          made.push(t);
          setTextures((prev) => ({ ...prev, [p.slug]: t }));
        };
        if (p.image) {
          const img = new Image();
          img.onload = () => finish(img);
          img.onerror = () => finish(null);
          img.src = imageUrl(p.image.src);
        } else finish(null);
      });
    });
    return () => {
      alive = false;
      made.forEach((t) => t.dispose());
    };
  }, [projects]);
  return textures;
}

function Ring({ projects, selected, onSelect, reduced, spin }: { projects: Project[]; selected: Project | null; onSelect: (p: Project) => void; reduced: boolean; spin: React.MutableRefObject<number> }) {
  const textures = useCardTextures(projects);
  const group = useRef<THREE.Group>(null);
  const [hover, setHover] = useState<string | null>(null);
  const n = projects.length;
  const radius = Math.max(4.2, (n * (CARD_W + 0.35)) / (Math.PI * 2));
  // start with the first project facing the camera
  const rot = useRef(0);
  const { camera, size } = useThree();

  useEffect(() => {
    const aspect = size.width / size.height;
    const z = radius + (aspect < 1 ? 11 : 7.6);
    camera.position.set(0, 1.3, z);
    camera.lookAt(0, 0.15, radius * 0.7);
  }, [camera, size, radius]);

  useFrame((_, dt) => {
    if (!group.current) return;
    const auto = reduced || hover || selected ? 0 : dt * 0.08;
    spin.current += auto;
    rot.current += (spin.current - rot.current) * 0.08;
    group.current.rotation.y = rot.current;
  });

  return (
    <group ref={group} position={[0, 0.85, 0]}>
      {projects.map((p, i) => {
        const a = (i / n) * Math.PI * 2;
        const active = hover === p.slug || selected?.slug === p.slug;
        return (
          <group key={p.slug} position={[Math.sin(a) * radius, Math.sin(i * 1.7) * 0.25, Math.cos(a) * radius]} rotation={[0, a, 0]}>
            <mesh
              scale={active ? 1.08 : 1}
              onPointerOver={(e: ThreeEvent<PointerEvent>) => {
                e.stopPropagation();
                setHover(p.slug);
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                setHover(null);
                document.body.style.cursor = '';
              }}
              onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                if (Math.abs(e.delta) < 6) onSelect(p);
              }}
            >
              <planeGeometry args={[CARD_W, CARD_H]} />
              <meshBasicMaterial key={textures[p.slug] ? 'tex' : 'blank'} map={textures[p.slug] ?? null} color={textures[p.slug] ? '#ffffff' : '#141a2e'} side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
            {active && (
              <mesh position={[0, 0, -0.01]} scale={1.08}>
                <planeGeometry args={[CARD_W + 0.08, CARD_H + 0.08]} />
                <meshBasicMaterial color={domainById[p.domain].color} side={THREE.DoubleSide} toneMapped={false} />
              </mesh>
            )}
          </group>
        );
      })}
      {/* floor reflection hint */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.6, 0]}>
        <ringGeometry args={[radius - 0.2, radius + 0.2, 128]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export default function ProjectCarousel({
  projects,
  selected,
  onSelect,
  reduced,
  active = true,
}: {
  projects: Project[];
  selected: Project | null;
  onSelect: (p: Project) => void;
  reduced: boolean;
  active?: boolean;
}) {
  const spin = useRef(0);
  const drag = useRef<{ x: number; s: number } | null>(null);
  const list = useMemo(() => projects, [projects]);
  return (
    <div
      className="h-full w-full"
      style={{ touchAction: 'pan-y', cursor: 'grab' }}
      onPointerDown={(e) => (drag.current = { x: e.clientX, s: spin.current })}
      onPointerMove={(e) => {
        if (drag.current) spin.current = drag.current.s + (e.clientX - drag.current.x) * 0.006;
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerLeave={() => (drag.current = null)}
    >
      <Canvas frameloop={active ? 'always' : 'never'} camera={{ position: [0, 1.4, 12], fov: 45 }} dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }}>
        <fog attach="fog" args={['#06070d', 10, 26]} />
        <Ring projects={list} selected={selected} onSelect={onSelect} reduced={reduced} spin={spin} />
      </Canvas>
    </div>
  );
}
