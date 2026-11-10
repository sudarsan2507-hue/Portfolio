import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/*
 * My photo, generated the way a diffusion model would: it starts as pure noise in big blocks and is
 * denoised step by step until the sharp photo is left. A readout counts the steps. Moving the cursor
 * over it adds noise back where you point (with a small RGB split), and the image tilts in 3D with
 * a parallax between face and background. One fragment shader; the real photo is the texture, so the
 * settled state is fully sharp.
 */

const STEPS = 30;
const PHOTO = `${import.meta.env.BASE_URL}work/sudarsan-color.webp`;

const vert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const frag = /* glsl */ `
  precision highp float;
  uniform sampler2D uTex;
  uniform float uP;      // 0 = pure noise, 1 = resolved
  uniform float uTime;
  uniform vec2 uMouse;   // in uv space
  uniform float uHover;
  uniform vec2 uTilt;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  vec3 noise3(vec2 c, float t) { return vec3(hash(c + t), hash(c + t + 17.3), hash(c + t + 41.7)); }
  float sdRound(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }

  void main() {
    vec2 uv = vUv;
    vec2 pc = uv - 0.5;
    float d = sdRound(pc, vec2(0.46), 0.11);

    // the cursor adds noise back locally
    float md = distance(uv, uMouse);
    float local = uHover * smoothstep(0.26, 0.0, md);
    float p = clamp(uP * (1.0 - local * 0.92), 0.0, 1.0);

    // quantised steps, like a sampler
    float q = floor(p * ${STEPS}.0) / ${STEPS}.0;
    float a = pow(q, 1.6);

    // blocks shrink as the image resolves
    float cells = mix(7.0, 560.0, pow(q, 2.2));
    vec2 cuv = p >= 0.999 ? uv : (floor(uv * cells) + 0.5) / cells;

    // parallax: brighter areas (the face) shift more than the background when tilted
    float lum = dot(texture2D(uTex, cuv).rgb, vec3(0.299, 0.587, 0.114));
    vec2 par = uTilt * (lum - 0.35) * 0.035;

    // RGB split grows with noise and near the cursor
    float split = (1.0 - a) * 0.012 + local * 0.02;
    vec2 dir = normalize(uv - uMouse + 1e-4);
    vec3 photo = vec3(
      texture2D(uTex, cuv + par + dir * split).r,
      texture2D(uTex, cuv + par).g,
      texture2D(uTex, cuv + par - dir * split).b
    );

    float t = floor(uTime * 14.0);
    vec3 n = noise3(floor(uv * cells), t);
    // tint the noise with the site palette so the early steps are colourful, not grey
    vec3 tint = mix(vec3(0.13, 0.83, 0.93), vec3(0.96, 0.45, 0.71), uv.y) ;
    n = mix(n, n * tint * 1.6, 0.6);
    vec3 col = mix(n, photo, a);

    // a scan line sweeps while denoising
    float scan = smoothstep(0.02, 0.0, abs(uv.y - fract(uTime * 0.45))) * (1.0 - uP) ;
    col += scan * vec3(0.3, 0.9, 1.0);

    // glowing animated border
    float ang = atan(pc.y, pc.x) / 6.2831853 + 0.5;
    vec3 ring = 0.5 + 0.5 * cos(6.2831853 * (ang + uTime * 0.12 + vec3(0.0, 0.33, 0.67)));
    ring = mix(ring, vec3(0.13, 0.83, 0.93), 0.25);
    float border = smoothstep(0.012, 0.0, abs(d + 0.008));
    float glow = smoothstep(0.07, 0.0, d) * step(0.0, d) * 0.55;
    float inside = smoothstep(0.004, -0.004, d);
    col = mix(col, ring, border * 0.9);
    vec3 outc = col * inside + ring * glow;
    float alpha = max(inside, glow);
    gl_FragColor = vec4(outc, alpha);
    #include <colorspace_fragment>
  }
`;

function Plane({ visible, reduced, readout }: { visible: boolean; reduced: boolean; readout: React.RefObject<HTMLSpanElement | null> }) {
  const mat = useMemo(() => {
    const tex = new THREE.TextureLoader().load(PHOTO);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    return new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      uniforms: {
        uTex: { value: tex },
        uP: { value: reduced ? 1 : 0 },
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uHover: { value: 0 },
        uTilt: { value: new THREE.Vector2() },
      },
    });
  }, [reduced]);
  const mesh = useRef<THREE.Mesh>(null);
  const st = useRef({ p: reduced ? 1 : 0, last: -1, hover: false, shown: -1 });

  useFrame((state) => {
    const u = mat.uniforms;
    const s = st.current;
    const t = state.clock.getElapsedTime();
    const dt = s.last < 0 ? 0 : Math.min(t - s.last, 0.25);
    s.last = t;
    // resolve in ~2.8 s once on screen; reset when it leaves so it replays
    if (reduced) s.p = 1;
    else s.p = visible ? Math.min(1, s.p + dt / 2.8) : 0;
    u.uP.value = s.p;
    u.uTime.value = t;
    const el = state.gl.domElement;
    s.hover = el.matches(':hover') && !reduced;
    u.uHover.value += ((s.hover ? 1 : 0) - u.uHover.value) * 0.12;
    const m = u.uMouse.value as THREE.Vector2;
    // the plane fills ~88% of the view: map pointer (-1..1) to uv
    m.lerp(new THREE.Vector2(state.pointer.x / 0.88 / 2 + 0.5, state.pointer.y / 0.88 / 2 + 0.5), 0.3);
    const tilt = u.uTilt.value as THREE.Vector2;
    const h = u.uHover.value;
    tilt.lerp(new THREE.Vector2(state.pointer.x * h, state.pointer.y * h), 0.1);
    if (mesh.current) {
      mesh.current.rotation.y = tilt.x * 0.32 + (reduced ? 0 : Math.sin(t * 0.6) * 0.04);
      mesh.current.rotation.x = -tilt.y * 0.26;
    }
    const stepNow = Math.round(s.p * STEPS);
    if (readout.current && stepNow !== s.shown) {
      s.shown = stepNow;
      readout.current.textContent =
        stepNow >= STEPS ? 'resolved · hover to add noise' : `denoising · step ${String(stepNow).padStart(2, '0')}/${STEPS}`;
      readout.current.dataset.done = stepNow >= STEPS ? '1' : '0';
    }
  });

  return (
    <mesh ref={mesh} material={mat}>
      <planeGeometry args={[1.92, 1.92]} />
    </mesh>
  );
}

export default function DiffusionPortrait({ reduced = false, className = '' }: { reduced?: boolean; className?: string }) {
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
    <figure ref={box} className={`dportrait ${ready ? 'ready' : ''} ${className}`}>
      {/* plain photo underneath: shown if WebGL is unavailable */}
      <img className="dportrait-fallback" src={PHOTO} alt="Sudarsan Ravichandran" />
      <Canvas
        camera={{ position: [0, 0, 3], fov: 40 }}
        dpr={[1, 2]}
        frameloop={visible ? 'always' : 'demand'}
        gl={{ alpha: true, antialias: true }}
        onCreated={() => setReady(true)}
      >
        <Plane visible={visible} reduced={reduced} readout={readout} />
      </Canvas>
      <i className="dp-corner tl" /><i className="dp-corner tr" /><i className="dp-corner bl" /><i className="dp-corner br" />
      <figcaption><span className="dp-dot" /><span ref={readout}>denoising · step 00/{STEPS}</span></figcaption>
    </figure>
  );
}
