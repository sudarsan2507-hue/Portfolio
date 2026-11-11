import { lazy, Suspense, useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowUpRight, Award, BookOpen, Database, Github, Globe, Linkedin, Trophy } from 'lucide-react';
import { DATASET, DATASET2, domainById, HACKATHON, LINKS, PEOPLE, PROJECTS, PUBLICATION } from '../data/projects';

/*
 * The crisp view: everything a reader needs in two minutes, as a bento of cards beside a
 * particle cloud that changes shape section by section. A portal to the detailed view follows you down.
 */

const CrispWorld = lazy(() => import('./CrispWorld'));
const HoloPortrait = lazy(() => import('../components/HoloPortrait'));
const img = (file: string) => `${import.meta.env.BASE_URL}work/${file}`;
const TOP = ['glass-armor', 'graderag', 'aegis', 'spatialauth', 'choketap', 'hydrofuse'];
const top = TOP.map((s) => PROJECTS.find((p) => p.slug === s)!).filter(Boolean);

const SOCIAL = [
  { label: 'GitHub', href: LINKS.github, icon: Github },
  { label: 'LinkedIn', href: LINKS.linkedin, icon: Linkedin },
  { label: 'Kaggle', href: LINKS.kaggle, icon: Database },
  { label: 'IEEE', href: LINKS.ieee, icon: BookOpen },
];

const WINS = [
  { value: '1st', label: 'Hack-N-Droid 2.0', sub: 'VIT Chennai · Mar 2026', gold: true },
  { value: 'Final', label: 'ET AI Hackathon', sub: 'Aegis AI · 2026' },
  { value: 'EU', label: 'Selected for Junction', sub: 'Hand-picked, global pool' },
  { value: 'IEEE', label: 'Published author', sub: 'Schottky TFETs · 2026' },
  { value: 'NIT', label: 'Research intern', sub: 'Trichy · rated Excellent' },
  { value: '2', label: 'Kaggle datasets', sub: 'ISIC 2019 (DOI) · IXI brain MRI' },
];

/** A card that fades in once when it scrolls into view. */
function Tilt({ children, className = '', color, shape, as: Tag = 'div', delay = 0 }: { children: ReactNode; className?: string; color?: string; shape?: number; as?: 'div' | 'article'; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { rootMargin: '-40px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <Tag
      ref={ref as never}
      className={`cx-tilt ${seen ? 'in' : ''} ${className}`}
      style={{ ['--c' as string]: color ?? 'var(--cyan)', ['--d' as string]: `${delay}ms` }}
      data-shape={shape}
    >
      {children}
    </Tag>
  );
}

/** A picture cut into vertical strips that swing into place in 3D, one after another. */
const SLICES = 6;
function SliceImage({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="cx-slices" role="img" aria-label={alt}>
      {Array.from({ length: SLICES }, (_, i) => (
        <i key={i} style={{ ['--i' as string]: i }}><img src={src} alt="" loading="lazy" /></i>
      ))}
      <u aria-hidden />
    </span>
  );
}
/** Moves the highlight on a project picture to where the cursor is. */
function lens(e: PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--lx', `${((e.clientX - r.left) / r.width) * 100}%`);
  e.currentTarget.style.setProperty('--ly', `${((e.clientY - r.top) / r.height) * 100}%`);
}

/** A section heading whose rule draws itself the first time it is seen. */
function Heading({ id, shape, children }: { id: string; shape?: number; children: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { rootMargin: '-60px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return <h2 ref={ref} id={id} className={`cx-h ${seen ? 'in' : ''}`} data-shape={shape}>{children}</h2>;
}

const SECTIONS = [
  { id: 'cx-highlights', label: 'Highlights' },
  { id: 'cx-research', label: 'Research' },
  { id: 'cx-datasets', label: 'Datasets' },
  { id: 'cx-projects', label: 'Projects' },
];

/** Counts up to a number the first time it scrolls into view. */
function Count({ to, decimals = 0, prefix = '', suffix = '' }: { to: number; decimals?: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const k = Math.min(1, (t - t0) / 1400);
        setV(to * (1 - Math.pow(1 - k, 3)));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(ref.current);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);
  return <span ref={ref}>{prefix}{v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
}

/** Three rings turning in 3D: the way into the detailed view. */
function Portal({ small }: { small?: boolean }) {
  return (
    <span className={`cx-portal-rings ${small ? 'small' : ''}`} aria-hidden>
      <i /><i /><i /><b />
    </span>
  );
}

export default function CrispView({ onSwitch }: { onSwitch: (m: 'detailed' | 'gate') => void }) {
  const [sup, mentor] = PEOPLE;
  const bar = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const on = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.current?.style.setProperty('--p', String(max > 0 ? window.scrollY / max : 0));
      setScrolled(window.scrollY > 420);
      let now = 0;
      SECTIONS.forEach((sec, i) => {
        const el = document.getElementById(sec.id);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.45) now = i;
      });
      setActive(now);
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <div className="crisp">
      <div ref={bar} className="cx-progress" aria-hidden />
      <Suspense fallback={null}>
        <CrispWorld />
      </Suspense>

      <button className={`cx-portal ${scrolled ? 'show' : ''}`} onClick={() => onSwitch('detailed')} aria-label="Open the full 3D view">
        <Portal small />
        <span><b>Full 3D view</b>all {PROJECTS.length} projects</span>
      </button>

      <div className="cx-page">
        {/* -------- profile column -------- */}
        <aside className="cx-profile">
          <div className="cx-profile-inner">
            <Suspense fallback={<div className="cx-portrait" />}>
              <HoloPortrait className="cx-portrait" />
            </Suspense>
            <p className="cx-eyebrow">CSE (AI &amp; ML) · VIT Chennai</p>
            <h1 className="cx-name">Sudarsan<br /><span>Ravichandran</span></h1>
            <p className="cx-pitch">I build AI that learns from <em>its mistakes.</em></p>
            <ul className="cx-social">
              {SOCIAL.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noreferrer" title={s.label}><s.icon className="h-4 w-4" /><span>{s.label}</span></a>
                </li>
              ))}
            </ul>
            <nav className="cx-nav" aria-label="Sections">
              {SECTIONS.map((sec, i) => (
                <a key={sec.id} href={`#${sec.id}`} className={i === active ? 'on' : ''} onClick={(e) => { e.preventDefault(); document.getElementById(sec.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
                  <i /><span>{sec.label}</span>
                </a>
              ))}
            </nav>
            <div className="cloud-slot" aria-hidden />
            <button className="cx-back-link" onClick={() => onSwitch('gate')}><ArrowLeft className="h-3.5 w-3.5" /> Back to the start</button>
          </div>
        </aside>

        {/* -------- content column -------- */}
        <main className="cx-content">
          <section id="cx-highlights" aria-label="Highlights" className="cx-wins" data-shape="0">
            {WINS.map((w, i) => (
              <Tilt key={w.label} className={`cx-win ${w.gold ? 'gold' : ''}`} color={w.gold ? '#fbbf24' : undefined} delay={i * 70}>
                <b>{w.value}</b>
                <span>{w.label}</span>
                <small>{w.sub}</small>
              </Tilt>
            ))}
          </section>

          <Heading id="cx-research">Research <em>&amp; recognition</em></Heading>
          <div className="cx-bento">
            <Tilt as="article" className="cx-card wide" shape={1}>
              <div className="cx-mono cx-k">Research internship · NIT Trichy · May to July 2026</div>
              <h3>GradeRAG <small>RAG that remembers its wrong answers</small></h3>
              <p>Every wrong answer goes into a Mistake Knowledge Graph and comes back as a warning on similar questions. Rated <b>Excellent</b>; paper under review.</p>
              <div className="cx-compare" aria-label="Exact match on HotpotQA: 58 percent with standard RAG, 87.5 percent with GradeRAG">
                <div><span>Standard RAG</span><i style={{ ['--w' as string]: '58%' }} /><b>58.0%</b></div>
                <div className="mine"><span>GradeRAG</span><i style={{ ['--w' as string]: '87.5%' }} /><b><Count to={87.5} decimals={1} suffix="%" /></b></div>
              </div>
              <div className="cx-nums">
                <div><b><Count to={29.5} decimals={1} prefix="+" /></b><span>points exact match</span></div>
                <div><b>5 / 6</b><span>model–dataset pairs improved</span></div>
                <div><b>3</b><span>LLMs, 2 datasets</span></div>
              </div>
              <p className="cx-people-line">Supervised by <b>{sup.name}</b> · mentored by <b>{mentor.name}</b></p>
            </Tilt>

            <Tilt as="article" className="cx-card" color="#fbbf24" shape={2}>
              <div className="cx-mono cx-k">Hackathons</div>
              <ol className="cx-steps">
                <li className="gold"><Trophy className="h-4 w-4" /><div><b>Winner · {HACKATHON.name}</b><span>spatialAuth: I built the ML login backend</span></div></li>
                <li><Award className="h-4 w-4" /><div><b>Finalist · ET AI Hackathon 2026</b><span>Aegis AI: I owned Fraud Shield</span></div></li>
                <li><Globe className="h-4 w-4" /><div><b>Selected · Junction, Europe</b><span>Hand-picked from a global pool</span></div></li>
              </ol>
            </Tilt>

            <Tilt as="article" className="cx-card" shape={3}>
              <div className="cx-mono cx-k">IEEE publication · 2026</div>
              <h3 className="sm">{PUBLICATION.title}</h3>
              <svg className="cx-band" viewBox="0 0 300 70" aria-hidden>
                <path d="M0 22 H70 C95 22 95 6 110 6 C140 6 150 40 300 40" /><path d="M0 22 H70 C95 22 95 36 110 36 C140 36 150 66 300 66" className="v" />
                <circle r="3.5"><animateMotion dur="2.6s" repeatCount="indefinite" path="M0 26 H70 L112 12 C140 12 150 44 300 44" /></circle>
                <circle r="3.5"><animateMotion dur="2.6s" begin="1.3s" repeatCount="indefinite" path="M0 26 H70 L112 12 C140 12 150 44 300 44" /></circle>
              </svg>
              <a className="cx-text-link" href={PUBLICATION.url} target="_blank" rel="noreferrer">Read on IEEE Xplore <ArrowUpRight className="h-4 w-4" /></a>
            </Tilt>
          </div>

          <Heading id="cx-datasets">Open datasets <em>on Kaggle</em></Heading>
          <div className="cx-bento">
            <Tilt as="article" className="cx-card" shape={4}>
              <div className="cx-mono cx-k">DOI 10.34740/kaggle/dsv/20910302</div>
              <h3>ISIC 2019 <small>skin-cancer images, split with no leakage</small></h3>
              <p>Many ISIC photos show the same lesion twice, so a random split leaks. This version splits by lesion, cleans every image and resizes it to 224 × 224.</p>
              <div className="cx-nums two">
                <div><b><Count to={25331} /></b><span>images, 8 classes</span></div>
                <div><b>0</b><span>lesions shared across splits</span></div>
              </div>
              <div className="cx-split" aria-hidden><i className="cx-tr" /><i className="cx-va" /><i className="cx-te" /></div>
              <p className="cx-mono cx-dim">train 20,308 · val 2,448 · test 2,575 · 0.3 GB, down from 9.1 GB</p>
              <div className="cx-links">
                <a className="cx-text-link" href={DATASET.url} target="_blank" rel="noreferrer">View on Kaggle <ArrowUpRight className="h-4 w-4" /></a>
              </div>
            </Tilt>

            <Tilt as="article" className="cx-card" delay={90}>
              <div className="cx-mono cx-k">DOI {DATASET2.doiLabel}</div>
              <h3>{DATASET2.short} <small>preprocessed and ready for brain-age models</small></h3>
              <p>T1 scans from the public IXI collection, skull-stripped and registered to one template, with age, sex, site and scanner in a single labels file. The same scans went through the BrainAgeNeXt part of my iAudit fairness audit.</p>
              <div className="cx-nums two">
                <div><b><Count to={492} /></b><span>scans, one per person</span></div>
                <div><b>1 mm</b><span>182 × 218 × 182, MNI152 space</span></div>
              </div>
              <div className="cx-split" aria-hidden><i className="cx-tr" /><i className="cx-va" /><i className="cx-te" /></div>
              <p className="cx-mono cx-dim">train 393 · val 49 · test 50 · by subject, stratified by age decade</p>
              <ol className="cx-pipe">
                {['Truncate intensity', 'Strip skull', 'Register to MNI152', 'N4 bias correction', 'Denoise', 'Mask', 'Scale 0 to 1'].map((step) => <li key={step}>{step}</li>)}
              </ol>
              <p className="cx-mono cx-dim">NIfTI float32 · 3.4 GB download, 14 GB unpacked · {DATASET2.licence}</p>
              <p className="cx-fine">Sites: Guys 312 and HH 180. Preprocessing is automatic and was not checked scan by scan.</p>
              <div className="cx-links">
                <a className="cx-text-link" href={DATASET2.url} target="_blank" rel="noreferrer">View on Kaggle <ArrowUpRight className="h-4 w-4" /></a>
                <a className="cx-text-link" href={DATASET2.notebook} target="_blank" rel="noreferrer">Starter notebook <ArrowUpRight className="h-4 w-4" /></a>
                <a className="cx-text-link" href={DATASET2.code} target="_blank" rel="noreferrer">iAudit code <ArrowUpRight className="h-4 w-4" /></a>
              </div>
            </Tilt>
          </div>

          <Heading id="cx-projects" shape={5}>Six projects <em>worth your time</em></Heading>
          <div className="cx-projects">
            {top.map((p, i) => {
              const d = domainById[p.domain];
              const m = p.metrics?.[0];
              return (
                <Tilt as="article" key={p.slug} className="cx-proj" delay={(i % 2) * 90}>
                  {p.image && (
                    <a href={p.repo} target="_blank" rel="noreferrer" className="cx-proj-img" onPointerMove={lens}>
                      <SliceImage src={img(p.image.src)} alt={p.image.caption} />
                      {p.image.illustration && <span>Illustration</span>}
                      {m && <b className="cx-badge">{m.value}<small>{m.label}</small></b>}
                    </a>
                  )}
                  <div className="cx-proj-body">
                    <div className="cx-mono cx-accent">{(p.context ?? d.label).split(' · ').slice(0, 2).join(' · ')}</div>
                    <h3><a href={p.repo} target="_blank" rel="noreferrer">{p.name} <ArrowUpRight className="h-4 w-4" /></a></h3>
                    <p>{p.tagline}</p>
                    <p className="cx-mono cx-dim">{p.stack.slice(0, 4).join(' · ')}</p>
                  </div>
                </Tilt>
              );
            })}
          </div>

          <button className="cx-full-cta" onClick={() => onSwitch('detailed')}>
            <Portal />
            <span className="cx-cta-copy">
              <span className="cx-mono">That was the 2-minute version</span>
              <b>Step through the portal for the full 3D tour</b>
              <small>All {PROJECTS.length} projects, a 3D scene for every chapter</small>
            </span>
            <ArrowUpRight className="h-6 w-6" />
          </button>

          <footer className="cx-foot cx-mono cx-dim">
            <span>© 2026 Sudarsan Ravichandran</span>
            <span><Award className="mr-1 inline h-3.5 w-3.5" />OCI Generative AI and Data Science Professional</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
