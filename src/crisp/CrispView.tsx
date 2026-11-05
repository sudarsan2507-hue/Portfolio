import { lazy, Suspense } from 'react';
import { ArrowLeft, ArrowUpRight, Award, BookOpen, Database, Github, Globe, GraduationCap, Linkedin, Trophy } from 'lucide-react';
import { Avatar } from '../components/ui';
import { CREDENTIALS, DATASET, domainById, HACKATHON, MORE_WINS, LINKS, PEOPLE, PROJECTS, PUBLICATION } from '../data/projects';

/*
 * The crisp view: the strongest work, achievements, internship, paper and dataset on one page,
 * over a particle cloud that changes shape section by section. The detailed view has everything else.
 */

const CrispWorld = lazy(() => import('./CrispWorld'));
const img = (file: string) => `${import.meta.env.BASE_URL}work/${file}`;
const TOP = ['glass-armor', 'graderag', 'aegis', 'spatialauth', 'choketap', 'hydrofuse'];
const top = TOP.map((s) => PROJECTS.find((p) => p.slug === s)!).filter(Boolean);

const SOCIAL = [
  { label: 'GitHub', href: LINKS.github, icon: Github, handle: 'sudarsan2507-hue' },
  { label: 'LinkedIn', href: LINKS.linkedin, icon: Linkedin, handle: 'sudarsan-ravichandran' },
  { label: 'Kaggle', href: LINKS.kaggle, icon: Database, handle: 'sudarsan007r' },
  { label: 'IEEE Xplore', href: LINKS.ieee, icon: BookOpen, handle: 'author profile' },
];

const WINS = [
  { icon: Trophy, value: '1st', label: 'Hack-N-Droid 2.0', sub: 'VIT Chennai · Mar 2026' },
  { icon: Award, value: 'Final', label: 'ET AI Hackathon', sub: 'Aegis AI · 2026' },
  { icon: Globe, value: 'EU', label: 'Selected for Junction', sub: 'Hand-picked, global pool' },
  { icon: BookOpen, value: 'IEEE', label: 'Published author', sub: 'Schottky TFETs · 2026' },
  { icon: GraduationCap, value: 'NIT', label: 'Research intern', sub: 'Trichy · rated Excellent' },
  { icon: Database, value: 'DOI', label: 'Kaggle dataset', sub: '25,331 images' },
];

export default function CrispView({ onSwitch }: { onSwitch: (m: 'detailed' | 'gate') => void }) {
  const sup = PEOPLE[0];
  const mentor = PEOPLE[1];
  return (
    <div className="crisp">
      <Suspense fallback={null}>
        <CrispWorld />
      </Suspense>
      <div className="cx-page">
      {/* -------- profile column -------- */}
      <aside className="cx-profile">
        <div className="cx-profile-inner">
          <Avatar size={112} className="cx-avatar" />
          <p className="cx-eyebrow">CSE (AI &amp; ML) · VIT Chennai</p>
          <h1 className="cx-name">Sudarsan<br /><span>Ravichandran</span></h1>
          <p className="cx-pitch">
            I build AI that learns from <em>its mistakes</em>: failure-aware retrieval, guardrails for AI agents, and
            sensor hardware that measures its own false alarms.
          </p>
          <ul className="cx-social">
            {SOCIAL.map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noreferrer">
                  <s.icon className="h-4 w-4" />
                  <span>{s.label}</span>
                  <small>{s.handle}</small>
                </a>
              </li>
            ))}
          </ul>
          <div className="cloud-slot" aria-hidden />
          <button className="cx-full-link" onClick={() => onSwitch('detailed')}>
            <span>
              <b>See the full 3D portfolio</b>
              All {PROJECTS.length} projects, with interactive scenes
            </span>
            <ArrowUpRight className="h-5 w-5" />
          </button>
          <button className="cx-back-link" onClick={() => onSwitch('gate')}><ArrowLeft className="h-3.5 w-3.5" /> Back to the start</button>
        </div>
      </aside>

      {/* -------- content column -------- */}
      <main className="cx-content">
        <section aria-label="Highlights" className="cx-wins" data-shape="0">
          {WINS.map((w) => (
            <div key={w.label} className="cx-win">
              <w.icon className="h-4 w-4" />
              <b>{w.value}</b>
              <span>{w.label}</span>
              <small>{w.sub}</small>
            </div>
          ))}
        </section>

        <Section shape={1} title="Research internship" kicker="NIT Tiruchirappalli · 18 May to 2 July 2026">
          <article className="cx-block">
            <h3>GradeRAG: Retrieval-Augmented Generation with Persistent Mistake Knowledge Graph for Cross-Question Failure Learning</h3>
            <p>
              A RAG pipeline that labels each wrong answer, stores it in a Mistake Knowledge Graph, and warns the model
              when a similar question comes up. Tested on HotpotQA and TriviaQA with three models. Rated
              <b> Excellent</b> on the completion certificate; the paper is under review.
            </p>
            <div className="cx-nums">
              <div><b>+29.5</b><span>points exact match, GPT-4o-mini on HotpotQA</span></div>
              <div><b>87.5%</b><span>accuracy, up from 58.0%</span></div>
              <div><b>5 / 6</b><span>model and dataset pairs improved</span></div>
            </div>
            <div className="cx-people">
              <p><b>{sup.name}</b> {sup.title}. Supervisor.</p>
              <p><b>{mentor.name}</b> {mentor.title}. Day-to-day mentor.</p>
            </div>
          </article>
        </Section>

        <Section shape={2} title="Achievements" kicker="Hackathons and certifications">
          <article className="cx-block cx-win-block">
            <div className="cx-mono"><Trophy className="mr-1 inline h-3.5 w-3.5" /> {HACKATHON.result} · {HACKATHON.date}</div>
            <h3>{HACKATHON.name}</h3>
            <p>
              {HACKATHON.host}. Our project spatialAuth logs a phone in only inside a room it recognises. I built its
              authentication backend: a One-Class SVM per room and a FastAPI service.
            </p>
            <p className="cx-mono cx-dim">Sponsors: {HACKATHON.sponsors.join(' · ')}</p>
          </article>
          <div className="cx-more-wins">
            {MORE_WINS.map((w) => (
              <article key={w.name} className="cx-block cx-win-block">
                <div className="cx-mono"><Award className="mr-1 inline h-3.5 w-3.5" /> {w.result}</div>
                <h3>{w.name}</h3>
                <p>{w.body}</p>
              </article>
            ))}
          </div>
          <ul className="cx-creds">
            {CREDENTIALS.filter((c) => !/^(Winner|Finalist|Selected)/.test(c.label)).map((c) => (
              <li key={c.label}>
                {c.url ? <a href={c.url} target="_blank" rel="noreferrer">{c.label}</a> : <span>{c.label}</span>}
                <small>{c.detail}</small>
              </li>
            ))}
          </ul>
        </Section>

        <Section shape={3} title="Publication" kicker={`${PUBLICATION.venue} · ${PUBLICATION.publisher}`}>
          <article className="cx-block">
            <h3>{PUBLICATION.title}</h3>
            <p className="cx-authors">
              {PUBLICATION.authors.map((a, i) => (
                <span key={a}>
                  <span className={a === 'Sudarsan Ravichandran' ? 'cx-me' : undefined}>{a}</span>
                  {i < PUBLICATION.authors.length - 1 && ', '}
                </span>
              ))}
            </p>
            <a className="cx-text-link" href={PUBLICATION.url} target="_blank" rel="noreferrer">Read on IEEE Xplore <ArrowUpRight className="h-4 w-4" /></a>
          </article>
        </Section>

        <Section shape={4} title="Kaggle dataset" kicker="CC BY-NC 4.0 · DOI 10.34740/kaggle/dsv/20910302">
          <article className="cx-block">
            <h3>{DATASET.title}</h3>
            <p>{DATASET.summary}</p>
            <div className="cx-nums">
              {DATASET.metrics.map((m) => <div key={m.label}><b>{m.value}</b><span>{m.label}</span></div>)}
            </div>
            <div className="cx-split" aria-hidden>
              <i className="cx-tr" /><i className="cx-va" /><i className="cx-te" />
            </div>
            <p className="cx-mono cx-dim">train 20,308 · val 2,448 · test 2,575</p>
            <a className="cx-text-link" href={DATASET.url} target="_blank" rel="noreferrer">View on Kaggle <ArrowUpRight className="h-4 w-4" /></a>
          </article>
        </Section>

        <Section shape={5} title="Selected projects" kicker={`6 of ${PROJECTS.length}`}>
          <div className="cx-projects">
            {top.map((p) => {
              const d = domainById[p.domain];
              const m = p.metrics?.[0];
              return (
                <article key={p.slug} className="cx-proj" style={{ ['--c' as string]: d.color }}>
                  {p.image && (
                    <a href={p.repo} target="_blank" rel="noreferrer" className="cx-proj-img">
                      <img src={img(p.image.src)} alt={p.image.caption} loading="lazy" />
                      {p.image.illustration && <span>Illustration</span>}
                    </a>
                  )}
                  <div className="cx-proj-body">
                    <div className="cx-mono" style={{ color: 'var(--c)' }}>{p.context ?? d.label}</div>
                    <h3><a href={p.repo} target="_blank" rel="noreferrer">{p.name} <ArrowUpRight className="h-4 w-4" /></a></h3>
                    <p>{p.tagline}</p>
                    {m && <p className="cx-metric"><b>{m.value}</b> {m.label}</p>}
                    {p.role && <p className="cx-role"><b>My part.</b> {p.role}</p>}
                    <p className="cx-mono cx-dim">{p.stack.slice(0, 4).join(' · ')}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </Section>

        <button className="cx-full-cta" onClick={() => onSwitch('detailed')}>
          <span className="cx-mono">The long version</span>
          <b>See all {PROJECTS.length} projects in the full 3D portfolio</b>
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

function Section({ title, kicker, shape, children }: { title: string; kicker: string; shape: number; children: React.ReactNode }) {
  return (
    <section className="cx-sec" data-shape={shape}>
      <header>
        <h2>{title}</h2>
        <p className="cx-mono cx-dim">{kicker}</p>
      </header>
      {children}
    </section>
  );
}
