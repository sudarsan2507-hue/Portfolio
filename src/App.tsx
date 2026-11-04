import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Lenis from 'lenis';
import { ArrowUpRight, Award, BookOpen, Database, Github, GraduationCap, Linkedin, MousePointer2, Trophy, X } from 'lucide-react';
import type { SearchStats } from './three/stations/SearchGraph';
import { initScrollTracking, scroll, STATION_LABEL, STATIONS, stationSide, type StationId } from './three/store';
import { Chip, ProjectLinks, Reveal, useInView, useReducedMotion, useVisible } from './components/ui';
import { CREDENTIALS, DATASET, DOMAINS, domainById, FORKS, HACKATHON, LINKS, PEOPLE, PROJECTS, PUBLICATION, type Domain, type Project } from './data/projects';
import { cn } from './lib/utils';

const World = lazy(() => import('./three/World'));
const ProjectUniverse = lazy(() => import('./components/ProjectUniverse'));

const pad = (n: number) => String(n).padStart(2, '0');
const bySlug = (s: string) => PROJECTS.find((p) => p.slug === s)!;

const SOCIAL = [
  { label: 'GitHub', href: LINKS.github, icon: Github },
  { label: 'LinkedIn', href: LINKS.linkedin, icon: Linkedin },
  { label: 'Kaggle', href: LINKS.kaggle, icon: Database },
  { label: 'IEEE Xplore', href: LINKS.ieee, icon: BookOpen },
];

export default function App() {
  const reduced = useReducedMotion();
  const [stats, setStats] = useState<SearchStats>({ run: 1, deadEnds: 0, remembered: 0 });
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const stop = initScrollTracking();
    const on = (i: number) => setCurrent(i);
    scroll.listeners.add(on);
    let lenis: Lenis | null = null;
    let raf = 0;
    if (!reduced) {
      lenis = new Lenis({ lerp: 0.085, anchors: true });
      const loop = (t: number) => {
        lenis!.raf(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    return () => {
      stop();
      scroll.listeners.delete(on);
      cancelAnimationFrame(raf);
      lenis?.destroy();
    };
  }, [reduced]);

  return (
    <div className="relative">
      <Suspense fallback={null}>
        <World onStats={setStats} reduced={reduced} />
      </Suspense>

      <Nav />
      <Rail current={current} />

      <main className="relative z-10">
        <Hero stats={stats} />

        <Chapter id="research" n={1} kicker="Research" title={<>What I study: <em>how systems learn from failure.</em></>}>
          <p className="lede">
            In each of these projects I measure whether telling a system why it failed makes it fail less. I report
            the results that didn’t improve as well.
          </p>
          <SpecList slugs={['graderag', 'demosearch', 'glass-armor', 'iaudit']} />
        </Chapter>

        <Chapter id="paper" n={2} kicker="IEEE publication" title={<>My IEEE paper, <em>on Schottky tunnel FETs.</em></>}>
          <div className="paper">
            <div className="mono-label">{PUBLICATION.venue} · {PUBLICATION.publisher}</div>
            <h3 className="paper-title">{PUBLICATION.title}</h3>
            <p className="authors">
              {PUBLICATION.authors.map((a, i) => (
                <span key={a}>
                  <span className={a === 'Sudarsan Ravichandran' ? 'me' : undefined}>{a}</span>
                  {i < PUBLICATION.authors.length - 1 && <span className="sep">, </span>}
                </span>
              ))}
            </p>
            <p className="body">{PUBLICATION.summary}</p>
            <div className="chips">{PUBLICATION.topics.map((t) => <Chip key={t}>{t}</Chip>)}</div>
            <div className="actions">
              <a className="btn btn-solid" href={PUBLICATION.url} target="_blank" rel="noreferrer">Read on IEEE Xplore <ArrowUpRight className="h-4 w-4" /></a>
              <a className="btn" href={LINKS.ieee} target="_blank" rel="noreferrer">Author profile</a>
            </div>
          </div>
        </Chapter>

        <Chapter id="safety" n={3} kicker="Agent safety" title={<>Keeping AI agents <em>in check.</em></>}>
          <p className="lede">I assume some prompt injections will get through, so I build the layer that stops them from doing damage.</p>
          <SpecList slugs={['choketap', 'aegis', 'sentinelmind', 'engram', 'webmcp-forge']} />
        </Chapter>

        <Chapter id="sensing" n={4} kicker="Sensing & hardware" title={<>Hardware that <em>senses the real world.</em></>}>
          <p className="lede">ESP32 boards, Wi-Fi signals, microphones and satellite data. For each one I measure how often it raises a false alarm.</p>
          <SpecList slugs={['wisp', 'hydrofuse', 'syrinx', 'safesignal']} />
        </Chapter>

        <Chapter id="data" n={5} kicker="Kaggle dataset" title={<>My Kaggle dataset, <em>for skin cancer.</em></>}>
          <div className="paper">
            <div className="mono-label">Published on Kaggle · CC BY-NC 4.0 · DOI</div>
            <h3 className="paper-title">{DATASET.title}</h3>
            <p className="body">{DATASET.summary}</p>
            <div className="ds-metrics">
              {DATASET.metrics.map((m) => (
                <div key={m.label}><b>{m.value}</b><span>{m.label}</span></div>
              ))}
            </div>
            <div className="ds-split" aria-hidden>
              {DATASET.split.map((s) => <div key={s.name} className={`ds-${s.name}`} />)}
            </div>
            <div className="ds-legend">
              {DATASET.split.map((s) => (
                <span key={s.name}><i className={`ds-${s.name}`} />{s.name} <b>{s.count}</b></span>
              ))}
            </div>
            <ol className="ds-pipe">
              {DATASET.pipeline.map((step) => <li key={step}>{step}</li>)}
            </ol>
            <div className="actions">
              <a className="btn btn-solid" href={DATASET.url} target="_blank" rel="noreferrer">View the dataset <ArrowUpRight className="h-4 w-4" /></a>
              <a className="btn" href={DATASET.doi} target="_blank" rel="noreferrer">DOI</a>
              <a className="btn" href={LINKS.kaggle} target="_blank" rel="noreferrer">Kaggle profile</a>
            </div>
          </div>
        </Chapter>

        <Chapter id="products" n={6} kicker="Apps & team builds" title={<>Apps I built, <em>alone and with teams.</em></>}>
          <p className="lede">Each app runs end to end, from the model to the interface. In the team projects I say exactly which part was mine.</p>
          <h3 className="sub-head">Apps</h3>
          <SpecList compact slugs={['datepilot', 'codeg', 'phantomvoice', 'studentfrndly', 'medsmart', 'clas', 'smart-file-organizer', 'yt-knowledge', 'rag-browser', 'club-management']} />
          <h3 className="sub-head">Team builds</h3>
          <SpecList compact slugs={['spatialauth', 'synapse-xr', 'landroid', 'showonce', 'codebase', 'webmcp-codex', 'weatherguard', 'hawkeye']} />
        </Chapter>

        <Universe />

        <Contact />
      </main>
    </div>
  );
}

/* ---------------------------------------------------------------- */

function Nav() {
  return (
    <header className="nav">
      <a href="#top" className="brand">Sudarsan<span>R.</span></a>
      <nav className="nav-links">
        {SOCIAL.map((s) => (
          <a key={s.label} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label} title={s.label}>
            <s.icon className="h-4 w-4" />
            <span className="hidden lg:inline">{s.label}</span>
          </a>
        ))}
      </nav>
    </header>
  );
}

function Rail({ current }: { current: number }) {
  return (
    <nav className="rail" aria-label="Chapters">
      {STATIONS.map((id, i) => (
        <a key={id} href={`#${id}`} className={cn('rail-item', i === current && 'on')}>
          <span className="rail-label">{STATION_LABEL[id]}</span>
          <span className="rail-dot" />
        </a>
      ))}
    </nav>
  );
}

const HIGHLIGHTS = [
  { icon: Trophy, label: 'Winner', detail: 'Hack-N-Droid 2.0', href: LINKS.github + '/spatialAuth' },
  { icon: BookOpen, label: 'IEEE author', detail: 'Schottky TFETs, 2026', href: PUBLICATION.url },
  { icon: GraduationCap, label: 'Research intern', detail: 'NIT Trichy, NLP', href: LINKS.github + '/GradeRAG' },
  { icon: Award, label: 'Kaggle dataset', detail: 'ISIC 2019, with DOI', href: DATASET.url },
];

function Hero({ stats }: { stats: SearchStats }) {
  // Dead ends hit in each finished run, newest last. Falling bars = the search learning.
  const [history, setHistory] = useState<number[]>([]);
  const last = useRef(stats);
  useEffect(() => {
    if (stats.run !== last.current.run && stats.run > 1) {
      const done = last.current.deadEnds;
      setHistory((h) => [...h, done].slice(-10));
    }
    last.current = stats;
  }, [stats]);
  const bars = [...history, stats.deadEnds];
  const max = Math.max(4, ...bars);

  return (
    <section id="top" className="hero">
      <div className="hero-inner">
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mono-label">
          Sudarsan Ravichandran · CSE (AI & ML) · VIT Chennai
        </motion.p>
        <h1 className="hero-title">
          {[
            <>I build AI</>,
            <>that learns from</>,
            <><em>its mistakes.</em></>,
          ].map((line, i) => (
            <span key={i} className="block overflow-hidden pb-[0.08em]">
              <motion.span className="block" initial={{ y: '105%' }} animate={{ y: 0 }} transition={{ delay: 0.3 + i * 0.13, duration: 0.95, ease: [0.22, 1, 0.36, 1] }}>
                {line}
              </motion.span>
            </span>
          ))}
        </h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="hero-sub">
          I’m Sudarsan Ravichandran, a CSE (AI & ML) student at VIT Chennai. I won Hack-N-Droid 2.0, I’ve published
          with IEEE, and I interned in NLP research at NIT Trichy. I build retrieval systems, guardrails for AI agents
          and sensor hardware.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }} className="actions">
          <a href="#research" className="btn btn-solid">See my work ↓</a>
          <a href="#universe" className="btn">All projects</a>
        </motion.div>
        <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} className="highlights">
          {HIGHLIGHTS.map((h) => (
            <li key={h.label}>
              <a href={h.href} target="_blank" rel="noreferrer">
                <h.icon className="h-4 w-4" />
                <span><b>{h.label}</b>{h.detail}</span>
              </a>
            </li>
          ))}
        </motion.ul>
      </div>

      <motion.figure initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }} className="readout" aria-label="Live search statistics">
        <figcaption>
          <span className="live-dot" /> Live search · run {pad(stats.run)}
        </figcaption>
        <div className="readout-bars" aria-hidden>
          {bars.map((v, i) => (
            <span key={i} className={i === bars.length - 1 ? 'now' : undefined} style={{ height: `${Math.max(6, (v / max) * 100)}%` }} />
          ))}
        </div>
        <p>
          Dead ends per run: <b style={{ color: 'var(--bad)' }}>{stats.deadEnds}</b> this run, <b style={{ color: 'var(--violet)' }}>{stats.remembered}</b> remembered.
          The search never retries a dead end, so the bars shrink.
        </p>
      </motion.figure>
    </section>
  );
}

function Chapter({ id, n, kicker, title, children }: { id: StationId; n: number; kicker: string; title: ReactNode; children: ReactNode }) {
  const side = stationSide(STATIONS.indexOf(id));
  return (
    <section id={id} className={cn('chapter', side < 0 ? 'right' : 'left')}>
      <div className="chapter-body">
        <Reveal>
          <div className="mono-label"><span className="ch">CH.{pad(n)}</span> {kicker}</div>
          <h2 className="chapter-title">{title}</h2>
        </Reveal>
        <Reveal delay={0.1}>{children}</Reveal>
      </div>
    </section>
  );
}

function SpecList({ slugs, compact }: { slugs: string[]; compact?: boolean }) {
  return (
    <ul className={cn('specs', compact && 'compact')}>
      {slugs.map((s) => {
        const p = bySlug(s);
        const d = domainById[p.domain];
        const m = p.metrics?.[0];
        return (
          <li key={s} style={{ ['--c' as string]: d.color }}>
            <div className="spec-head">
              <a href={p.repo} target="_blank" rel="noreferrer" className="spec-name">
                {p.name} <ArrowUpRight className="h-4 w-4" />
              </a>
              {m && !compact && (
                <span className="spec-metric" title={m.label}>
                  {m.value}<small>{m.label}</small>
                </span>
              )}
              {p.status && <span className="spec-status">{p.status}</span>}
            </div>
            {p.context && <div className="spec-context">{p.context}</div>}
            <p className="spec-tag">{p.tagline}</p>
            <p className="spec-desc">{p.description}</p>
            {p.role && <p className="spec-role"><b>My part.</b> {p.role}</p>}
            <div className="spec-foot">
              <span className="spec-stack">{p.stack.slice(0, compact ? 4 : 5).join(' · ')}</span>
              {p.live && (
                <a href={p.live.url} target="_blank" rel="noreferrer" className="spec-live">{p.live.label} ↗</a>
              )}
              {p.branch && (
                <a href={p.branch.url} target="_blank" rel="noreferrer" className="spec-live">{p.branch.label} ↗</a>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Universe() {
  const reduced = useReducedMotion();
  const [filter, setFilter] = useState<Domain | 'all'>('all');
  const [selected, setSelected] = useState<Project | null>(null);
  const [ref, seen] = useInView<HTMLDivElement>('400px');
  const [box, visible] = useVisible<HTMLDivElement>('100px');
  const list = useMemo(() => (filter === 'all' ? PROJECTS : PROJECTS.filter((p) => p.domain === filter)), [filter]);

  return (
    <section id="universe" className="universe">
      <div className="wrap">
        <Reveal>
          <div className="mono-label"><span className="ch">CH.07</span> Project universe</div>
          <h2 className="chapter-title">All my projects, <em>in one view.</em></h2>
          <p className="mono-label mt-4 flex items-center gap-2"><MousePointer2 className="h-4 w-4" /> drag to orbit · hover to read · click to open</p>
        </Reveal>
        <div className="mt-6 flex flex-wrap gap-2">
          <Filter active={filter === 'all'} onClick={() => setFilter('all')} color="#eef1f8">All · {PROJECTS.length}</Filter>
          {DOMAINS.map((d) => (
            <Filter key={d.id} active={filter === d.id} onClick={() => setFilter(d.id)} color={d.color}>
              {d.label} · {PROJECTS.filter((p) => p.domain === d.id).length}
            </Filter>
          ))}
        </div>
      </div>

      <div ref={ref} className="universe-stage">
        <div ref={box} className="pointer-events-none absolute inset-0" />
        {seen && (
          <Suspense fallback={null}>
            <div className="absolute inset-0">
              <ProjectUniverse filter={filter} selected={selected} onSelect={setSelected} reduced={reduced} active={visible} />
            </div>
          </Suspense>
        )}
        <AnimatePresence>
          {selected && (
            <motion.aside key={selected.slug} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} className="u-panel">
              <button onClick={() => setSelected(null)} className="u-close" aria-label="Close"><X className="h-4 w-4" /></button>
              <div className="mono-label" style={{ color: domainById[selected.domain].color }}>{domainById[selected.domain].label}</div>
              <h3 className="mt-2 font-display text-2xl font-bold">{selected.name}</h3>
              {selected.context && <div className="mono-label mt-1">{selected.context}</div>}
              <p className="mt-3 text-sm font-medium">{selected.tagline}</p>
              <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)]">{selected.description}</p>
              {selected.role && <p className="spec-role mt-3"><b>My part.</b> {selected.role}</p>}
              <div className="mt-4 flex flex-wrap gap-1.5">{selected.stack.map((s) => <Chip key={s}>{s}</Chip>)}</div>
              <div className="mt-5"><ProjectLinks project={selected} /></div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <div className="wrap">
        <ul className="index">
          {list.map((p) => {
            const d = domainById[p.domain];
            return (
              <li key={p.slug} style={{ ['--c' as string]: d.color }}>
                <a href={p.repo} target="_blank" rel="noreferrer">
                  <span className="idx-domain">{d.short}</span>
                  <span className="idx-name">{p.name}</span>
                  <span className="idx-tag">{p.context ? `${p.context}. ` : ''}{p.tagline}</span>
                  <ArrowUpRight className="idx-arrow h-4 w-4" />
                </a>
              </li>
            );
          })}
        </ul>

        <div className="forks">
          <h3 className="sub-head">Forked from teammates</h3>
          <p className="lede">I forked these from friends’ and teammates’ accounts but didn’t write code in them. They’re listed here so all 47 repos are accounted for, with credit to the people who built them.</p>
          <ul>
            {FORKS.map((f) => (
              <li key={f.name}>
                <a href={f.repo} target="_blank" rel="noreferrer">{f.name}</a>
                <span>{f.what}</span>
                <small>by {f.by}</small>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Filter({ active, onClick, color, children }: { active: boolean; onClick: () => void; color: string; children: ReactNode }) {
  return (
    <button onClick={onClick} className={cn('filter', active && 'on')} style={{ ['--c' as string]: color }}>
      {children}
    </button>
  );
}

function Contact() {
  return (
    <section id="contact" className="contact">
      <div className="wrap">
        <Reveal>
          <div className="mono-label"><span className="ch">CH.08</span> Contact</div>
          <h2 className="contact-title">Want to work together? <em>Get in touch.</em></h2>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="social-grid">
            {SOCIAL.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noreferrer" className="social">
                <s.icon className="h-5 w-5" />
                <span>{s.label}</span>
                <ArrowUpRight className="ml-auto h-4 w-4 opacity-50" />
              </a>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.12}>
          <div className="people">
            <div className="person win">
              <div className="mono-label"><Trophy className="mr-1 inline h-3.5 w-3.5" /> {HACKATHON.result} · {HACKATHON.date}</div>
              <h3>{HACKATHON.name}</h3>
              <p>{HACKATHON.host}. Our project, {HACKATHON.project}, took first place.</p>
              <p className="sponsors">Sponsors: {HACKATHON.sponsors.join(' · ')}</p>
            </div>
            {PEOPLE.map((p) => (
              <div key={p.name} className="person">
                <div className="mono-label">{p.title}</div>
                <h3>{p.name}</h3>
                <p>{p.note}</p>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <ul className="creds">
            {CREDENTIALS.map((c) => (
              <li key={c.label}>
                {c.url ? <a href={c.url} target="_blank" rel="noreferrer">{c.label}</a> : <span>{c.label}</span>}
                <small>{c.detail}</small>
              </li>
            ))}
          </ul>
        </Reveal>
        <div className="foot mono-label">
          <span>© 2026 Sudarsan Ravichandran</span>
          <span>Rendered live in WebGL · React Three Fiber</span>
        </div>
      </div>
    </section>
  );
}
