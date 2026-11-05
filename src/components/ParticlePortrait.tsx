import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { loadPortrait, type PortraitPoints } from './portrait';

/*
 * My photo as ~22,000 glowing particles. When it comes into view the points fly in from a scattered
 * cloud and assemble into the portrait. The cursor pushes them aside like a ripple, and they drift back.
 * All motion runs in the vertex shader.
 */



const vert = /* glsl */ `
  attribute vec3 aScatter;
  attribute vec3 aColor;
  attribute float aRand;
  uniform float uTime;
  uniform float uAssemble;
  uniform vec2 uMouse;
  uniform float uHover;
  uniform float uSize;
  uniform float uPixel;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float lag = aRand * 0.45;
    float a = clamp((uAssemble - lag) / (1.0 - lag), 0.0, 1.0);
    a = 1.0 - pow(1.0 - a, 3.0);
    vec3 p = mix(aScatter, position, a);
    // breathing depth
    p.z += sin(uTime * 1.2 + position.y * 3.0 + aRand * 6.0) * 0.03;
    // cursor ripple: push points away from the pointer, strongest close to it
    vec2 d = p.xy - uMouse;
    float dist = length(d);
    float force = uHover * smoothstep(0.75, 0.0, dist);
    p.xy += normalize(d + 1e-4) * force * 0.45;
    p.z += force * 0.6;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixel * (0.6 + aRand * 0.7) * (1.0 + force) / max(0.1, -mv.z);
    vColor = mix(vec3(0.35, 0.75, 1.0), aColor, a) + force * vec3(0.15, 0.55, 0.7);
    vAlpha = 0.25 + 0.75 * a;
  }
`;

const frag = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    if (r > 0.5) discard;
    float s = smoothstep(0.5, 0.05, r);
    gl_FragColor = vec4(vColor * (0.85 + 0.35 * s), s * vAlpha);
  }
`;

function Points({ data, visible, reduced, size, host }: { data: PortraitPoints; visible: boolean; reduced: boolean; size: number; host: React.RefObject<HTMLDivElement | null> }) {
  const N = data.count;
  const { geom, mat } = useMemo(() => {
    const scatter = new Float32Array(N * 3);
    const rand = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(2.5 + Math.random() * 4);
      scatter.set([v.x, v.y, v.z], i * 3);
      rand[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    g.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(data.colors, 3));
    g.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 20);
    const m = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uAssemble: { value: reduced ? 1 : 0 },
        uMouse: { value: new THREE.Vector2(9, 9) },
        uHover: { value: 0 },
        uSize: { value: size },
        uPixel: { value: Math.min(window.devicePixelRatio, 1.75) },
      },
    });
    return { geom: g, mat: m };
  }, [data, reduced, size, N]);

  const group = useRef<THREE.Group>(null);
  const hovering = useRef(false);
  // time-based assembly: ~2.2 s to form, ~1.4 s to scatter, at any frame rate
  const phase = useRef({ v: reduced ? 1 : 0, last: -1 });
  const { viewport, gl } = useThree();

  useEffect(() => {
    const el = gl.domElement;
    const on = () => (hovering.current = true);
    const off = () => (hovering.current = false);
    el.addEventListener('pointerenter', on);
    el.addEventListener('pointerleave', off);
    return () => {
      el.removeEventListener('pointerenter', on);
      el.removeEventListener('pointerleave', off);
    };
  }, [gl]);

  useFrame((state, dt) => {
    const u = mat.uniforms;
    const t = state.clock.getElapsedTime();
    const ph = phase.current;
    const step = ph.last < 0 ? 0 : Math.min(t - ph.last, 0.5);
    ph.last = t;
    if (reduced) ph.v = visible ? 1 : 0;
    else ph.v = visible ? Math.min(1, ph.v + step / 2.2) : Math.max(0, ph.v - step / 1.4);
    u.uTime.value = t;
    u.uAssemble.value = ph.v;
    void dt;
    u.uHover.value += ((hovering.current && !reduced ? 1 : 0) - u.uHover.value) * 0.12;
    // once the particles have formed the face, the real photo fades in on top so it is sharp;
    // hovering fades it back out to reveal the particles reacting to the cursor
    const photo = Math.min(1, Math.max(0, (ph.v - 0.75) / 0.25)) * (1 - u.uHover.value * 0.85);
    host.current?.style.setProperty('--photo', photo.toFixed(3));
    // pointer in the portrait's own coordinates
    const target = new THREE.Vector2((state.pointer.x * viewport.width) / 2, (state.pointer.y * viewport.height) / 2);
    (u.uMouse.value as THREE.Vector2).lerp(target, 0.25);
    if (group.current && !reduced) {
      // tilt only while hovering, so the particles line up with the photo at rest
      const h = u.uHover.value;
      group.current.rotation.y += (state.pointer.x * 0.25 * h - group.current.rotation.y) * 0.05;
      group.current.rotation.x += (-state.pointer.y * 0.15 * h - group.current.rotation.x) * 0.05;
    }
  });

  return (
    <group ref={group}>
      <points geometry={geom} material={mat} frustumCulled={false} />
    </group>
  );
}

export default function ParticlePortrait({ reduced = false, count = 26000, pointSize = 13, hint = true, className = '', active = true }: { reduced?: boolean; count?: number; pointSize?: number; hint?: boolean; className?: string; active?: boolean }) {
  const [data, setData] = useState<PortraitPoints | null>(null);
  const [visible, setVisible] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    loadPortrait(count).then(setData).catch(() => {});
  }, [count]);
  // safety net: whatever the frame rate, show the sharp photo a few seconds after it comes into view
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!visible) return;
    const id = window.setTimeout(() => setSettled(true), 3500);
    return () => window.clearTimeout(id);
  }, [visible]);
  useEffect(() => {
    if (!box.current) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.25 });
    io.observe(box.current);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={box} className={`portrait ${settled ? 'settled' : ''} ${className}`} role="img" aria-label="Portrait of Sudarsan Ravichandran">
      {data && (
        <Canvas camera={{ position: [0, 0, 4.4], fov: 45 }} dpr={[1, 1.75]} frameloop={visible ? 'always' : 'demand'} gl={{ alpha: true, antialias: false }}>
          <Points data={data} visible={visible && active} reduced={reduced} size={pointSize} host={box} />
        </Canvas>
      )}
      <img className="portrait-photo" src={`${import.meta.env.BASE_URL}work/sudarsan.webp`} alt="" aria-hidden />
      {hint && <span className="portrait-hint">move your cursor over me</span>}
    </div>
  );
}
