import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/*
 * My photo as a hologram, for the crisp view. About 22,000 points fly in from a swirl and settle into
 * the photo, each one raised by how bright that part of the picture is, so the face has real depth.
 * Once it has settled the sharp photo fades in over the points. Hovering lifts it back into points:
 * the relief turns with the cursor and the points under it push out toward you.
 * (The detailed view uses a different effect: DiffusionPortrait.)
 */

const G = 150;
const SIDE = 1.92;
const PHOTO = `${import.meta.env.BASE_URL}work/sudarsan-color.webp`;

const pointsVert = /* glsl */ `
  attribute vec2 aUv;
  attribute vec3 aFrom;
  attribute float aRand;
  uniform sampler2D uTex;
  uniform float uP;       // 0 = scattered, 1 = assembled
  uniform float uLift;    // how much relief the points have
  uniform float uTime;
  uniform float uScale;
  uniform vec2 uMouse;    // in plane space
  uniform float uHover;
  varying vec3 vColor;
  varying float vAlpha;

  float sdRound(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }

  void main() {
    vec3 tex = texture2D(uTex, aUv).rgb;
    float lum = dot(tex, vec3(0.299, 0.587, 0.114));
    vec2 pc = aUv - 0.5;
    float inside = step(sdRound(pc, vec2(0.46), 0.11), 0.0);

    vec3 home = vec3(pc * ${SIDE.toFixed(2)}, (lum - 0.4) * 0.42 * uLift);
    // the cursor pushes nearby points toward the viewer
    float md = distance(home.xy, uMouse);
    float push = uHover * smoothstep(0.42, 0.0, md);
    home.z += push * (0.28 + 0.12 * sin(uTime * 5.0 + aRand * 20.0));
    home.xy += normalize(home.xy - uMouse + 1e-4) * push * 0.05;

    // each point arrives at its own moment, spiralling in
    float lag = aRand * 0.55;
    float m = clamp((uP - lag) / (1.0 - lag), 0.0, 1.0);
    m = 1.0 - pow(1.0 - m, 3.0);
    float ang = (1.0 - m) * 3.2;
    vec3 from = aFrom;
    from.xz = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * from.xz;
    vec3 p = mix(from, home, m);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = inside * uScale * mix(1.5, 1.0, m) / max(0.1, -mv.z);

    // hologram look while in flight or lifted: cyan tint and moving scan lines
    float holo = max(1.0 - m, uLift * 0.55);
    float lines = 0.75 + 0.25 * sin(home.y * 150.0 - uTime * 6.0);
    vec3 tint = mix(vec3(0.13, 0.83, 0.93), vec3(0.65, 0.55, 0.98), aUv.y);
    vColor = mix(tex, (tex * 0.6 + tint * (0.25 + lum * 0.9)) * lines, holo * 0.75);
    vAlpha = inside * mix(0.5, 1.0, m);
  }
`;

const pointsFrag = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  uniform float uFade;
  void main() {
    if (vAlpha * uFade < 0.01) discard;
    gl_FragColor = vec4(vColor, vAlpha * uFade);
    #include <colorspace_fragment>
  }
`;

const photoVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const photoFrag = /* glsl */ `
  precision highp float;
  uniform sampler2D uTex;
  uniform float uShow;
  uniform float uTime;
  varying vec2 vUv;
  float sdRound(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
  void main() {
    vec2 pc = vUv - 0.5;
    float d = sdRound(pc, vec2(0.46), 0.11);
    vec3 col = texture2D(uTex, vUv).rgb;
    // a light sweep crosses the photo as it locks in
    float sweep = smoothstep(0.08, 0.0, abs(vUv.x + vUv.y * 0.3 - (uShow * 1.6 - 0.2))) * (1.0 - uShow);
    col += sweep * vec3(0.4, 0.9, 1.0);
    float ang = atan(pc.y, pc.x) / 6.2831853 + 0.5;
    // two arcs chase each other around the frame
    float arc = smoothstep(0.75, 1.0, sin(6.2831853 * (ang * 2.0 - uTime * 0.25)));
    vec3 ring = mix(vec3(0.13, 0.83, 0.93), vec3(0.96, 0.45, 0.71), ang) * (0.35 + arc * 1.2);
    float border = smoothstep(0.012, 0.0, abs(d + 0.008));
    float glow = smoothstep(0.06, 0.0, d) * step(0.0, d) * 0.5 * (0.4 + arc);
    float inside = smoothstep(0.004, -0.004, d);
    vec3 outc = col * inside * uShow + ring * border + ring * glow;
    float alpha = max(inside * uShow, max(border, glow));
    gl_FragColor = vec4(outc, alpha);
    #include <colorspace_fragment>
  }
`;

function Scene({ visible, reduced, readout }: { visible: boolean; reduced: boolean; readout: React.RefObject<HTMLSpanElement | null> }) {
  const { geom, pmat, fmat } = useMemo(() => {
    const tex = new THREE.TextureLoader().load(PHOTO);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    const n = G * G;
    const uv = new Float32Array(n * 2);
    const from = new Float32Array(n * 3);
    const rand = new Float32Array(n);
    let seed = 7;
    const R = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < n; i++) {
      uv[i * 2] = ((i % G) + 0.5) / G;
      uv[i * 2 + 1] = (Math.floor(i / G) + 0.5) / G;
      const th = R() * Math.PI * 2;
      const r = 1.2 + R() * 2.2;
      from.set([Math.cos(th) * r, (R() - 0.5) * 3.4, Math.sin(th) * r - 0.5], i * 3);
      rand[i] = R();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aUv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('aFrom', new THREE.BufferAttribute(from, 3));
    g.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10);
    const pm = new THREE.ShaderMaterial({
      vertexShader: pointsVert,
      fragmentShader: pointsFrag,
      transparent: true,
      uniforms: {
        uTex: { value: tex }, uP: { value: 0 }, uLift: { value: 1 }, uTime: { value: 0 }, uScale: { value: 10 },
        uMouse: { value: new THREE.Vector2(9, 9) }, uHover: { value: 0 }, uFade: { value: 1 },
      },
    });
    const fm = new THREE.ShaderMaterial({
      vertexShader: photoVert,
      fragmentShader: photoFrag,
      transparent: true,
      depthTest: false,
      uniforms: { uTex: { value: tex }, uShow: { value: 0 }, uTime: { value: 0 } },
    });
    return { geom: g, pmat: pm, fmat: fm };
  }, []);

  const group = useRef<THREE.Group>(null);
  const st = useRef({ p: reduced ? 1 : 0, last: -1, label: '' });

  useFrame((state) => {
    const s = st.current;
    const t = state.clock.getElapsedTime();
    const dt = s.last < 0 ? 0 : Math.min(t - s.last, 0.25);
    s.last = t;
    if (reduced) s.p = 1;
    else s.p = visible ? Math.min(1, s.p + dt / 3.2) : 0;
    const done = s.p >= 1;
    const hover = !reduced && done && state.gl.domElement.matches(':hover');

    const u = pmat.uniforms;
    u.uP.value = s.p;
    u.uTime.value = t;
    fmat.uniforms.uTime.value = t;
    u.uHover.value += ((hover ? 1 : 0) - u.uHover.value) * 0.1;
    // the photo takes over once assembled, and steps back while hovered
    const show = done && !hover ? 1 : 0;
    fmat.uniforms.uShow.value += (show - fmat.uniforms.uShow.value) * (show ? 0.06 : 0.14);
    const shown = fmat.uniforms.uShow.value;
    u.uLift.value += ((done && !hover ? 0 : 1) - u.uLift.value) * 0.08;
    u.uFade.value = 1 - shown * 0.999;
    // a point should just cover its cell of the grid
    const px = state.size.height * state.viewport.dpr;
    u.uScale.value = (px / (2 * Math.tan((40 * Math.PI) / 360))) * (SIDE / G) * 1.45;
    (u.uMouse.value as THREE.Vector2).lerp(new THREE.Vector2(state.pointer.x * 1.09, state.pointer.y * 1.09), 0.25);

    if (group.current) {
      const h = u.uHover.value;
      const idle = (1 - shown) * (1 - h);
      const ry = state.pointer.x * 0.55 * h + Math.sin(t * 0.9) * 0.35 * idle;
      const rx = -state.pointer.y * 0.4 * h + Math.sin(t * 0.7) * 0.08 * idle;
      group.current.rotation.y += (ry - group.current.rotation.y) * 0.12;
      group.current.rotation.x += (rx - group.current.rotation.x) * 0.12;
    }

    const label = !done ? `assembling · ${Math.round(s.p * G * G).toLocaleString('en-US')} points` : hover ? 'depth view · move to turn' : 'locked · hover to lift into 3D';
    if (readout.current && label !== s.label) {
      s.label = label;
      readout.current.textContent = label;
      readout.current.dataset.done = done ? '1' : '0';
    }
  });

  return (
    <group ref={group}>
      <points geometry={geom} material={pmat} frustumCulled={false} />
      <mesh material={fmat} renderOrder={2}>
        <planeGeometry args={[SIDE, SIDE]} />
      </mesh>
    </group>
  );
}

export default function HoloPortrait({ reduced = false, className = '' }: { reduced?: boolean; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!box.current) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.2 });
    io.observe(box.current);
    return () => io.disconnect();
  }, []);
  return (
    <figure ref={box} className={`dportrait hportrait ${ready ? 'ready' : ''} ${className}`}>
      {/* plain photo underneath: shown if WebGL is unavailable */}
      <img className="dportrait-fallback" src={PHOTO} alt="Sudarsan Ravichandran" />
      <Canvas
        camera={{ position: [0, 0, 3], fov: 40 }}
        dpr={[1, 2]}
        frameloop={visible ? 'always' : 'demand'}
        gl={{ alpha: true, antialias: true }}
        onCreated={() => setReady(true)}
      >
        <Scene visible={visible} reduced={reduced} readout={readout} />
      </Canvas>
      <figcaption><span className="dp-dot" /><span ref={readout}>assembling · 0 points</span></figcaption>
    </figure>
  );
}
