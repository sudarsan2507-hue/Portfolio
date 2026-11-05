import { ArrowUpRight, Award, BookOpen, Database, Github, GraduationCap, Linkedin, Trophy } from 'lucide-react';
import { CREDENTIALS, DATASET, domainById, HACKATHON, LINKS, PEOPLE, PROJECTS, PUBLICATION } from '../data/projects';

/*
 * The one-page version: the strongest work, achievements, internship, paper and dataset.
 * Everything else lives in the full 3D portfolio at ../
 */

const FULL = '../';
const img = (file: string) => `../work/${file}`;
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
  { icon: BookOpen, value: 'IEEE', label: 'Published author', sub: 'Schottky TFETs · 2026' },
  { icon: GraduationCap, value: 'NIT', label: 'Research intern', sub: 'Trichy · rated Excellent' },
  { icon: Database, value: 'DOI', label: 'Kaggle dataset', sub: '25,331 images' },
];

export default function ShortApp() {
  const sup = PEOPLE[0];
  const mentor = PEOPLE[1];
  return (
    <div className="page">
      {/* -------- profile column -------- */}
      <aside className="profile">
        <div className="profile-inner">
          <p className="eyebrow">CSE (AI &amp; ML) · VIT Chennai</p>
          <h1 className="name">Sudarsan<br /><span>Ravichandran</span></h1>
          <p className="pitch">
            I build AI that learns from <em>its mistakes</em>: failure-aware retrieval, guardrails for AI agents, and
            sensor hardware that measures its own false alarms.
          </p>
          <ul className="social">
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
          <a className="full-link" href={FULL}>
            <span>
              <b>See the full 3D portfolio</b>
              All {PROJECTS.length} projects, with interactive scenes
            </span>
            <ArrowUpRight className="h-5 w-5" />
          </a>
        </div>
      </aside>

      {/* -------- content column -------- */}
      <main className="content">
        <section aria-label="Achievements" className="wins">
          {WINS.map((w) => (
            <div key={w.label} className="win">
              <w.icon className="h-4 w-4" />
              <b>{w.value}</b>
              <span>{w.label}</span>
              <small>{w.sub}</small>
            </div>
          ))}
        </section>

        <Section title="Research internship" kicker="NIT Tiruchirappalli · 18 May to 2 July 2026">
          <article className="block">
            <h3>GradeRAG: Retrieval-Augmented Generation with Persistent Mistake Knowledge Graph for Cross-Question Failure Learning</h3>
            <p>
              A RAG pipeline that labels each wrong answer, stores it in a Mistake Knowledge Graph, and warns the model
              when a similar question comes up. Tested on HotpotQA and TriviaQA with three models. Rated
              <b> Excellent</b> on the completion certificate; the paper is under review.
            </p>
            <div className="nums">
              <div><b>+29.5</b><span>points exact match, GPT-4o-mini on HotpotQA</span></div>
              <div><b>87.5%</b><span>accuracy, up from 58.0%</span></div>
              <div><b>5 / 6</b><span>model and dataset pairs improved</span></div>
            </div>
            <div className="people">
              <p><b>{sup.name}</b> {sup.title}. Supervisor.</p>
              <p><b>{mentor.name}</b> {mentor.title}. Day-to-day mentor.</p>
            </div>
          </article>
        </Section>

        <Section title="Achievements" kicker="Hackathons and certifications">
          <article className="block win-block">
            <div className="mono"><Trophy className="mr-1 inline h-3.5 w-3.5" /> {HACKATHON.result} · {HACKATHON.date}</div>
            <h3>{HACKATHON.name}</h3>
            <p>
              {HACKATHON.host}. Our project spatialAuth logs a phone in only inside a room it recognises. I built its
              authentication backend: a One-Class SVM per room and a FastAPI service.
            </p>
            <p className="mono dim">Sponsors: {HACKATHON.sponsors.join(' · ')}</p>
          </article>
          <ul className="creds">
            {CREDENTIALS.filter((c) => !c.label.startsWith('Winner')).map((c) => (
              <li key={c.label}>
                {c.url ? <a href={c.url} target="_blank" rel="noreferrer">{c.label}</a> : <span>{c.label}</span>}
                <small>{c.detail}</small>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Publication" kicker={`${PUBLICATION.venue} · ${PUBLICATION.publisher}`}>
          <article className="block">
            <h3>{PUBLICATION.title}</h3>
            <p className="authors">
              {PUBLICATION.authors.map((a, i) => (
                <span key={a}>
                  <span className={a === 'Sudarsan Ravichandran' ? 'me' : undefined}>{a}</span>
                  {i < PUBLICATION.authors.length - 1 && ', '}
                </span>
              ))}
            </p>
            <a className="text-link" href={PUBLICATION.url} target="_blank" rel="noreferrer">Read on IEEE Xplore <ArrowUpRight className="h-4 w-4" /></a>
          </article>
        </Section>

        <Section title="Kaggle dataset" kicker="CC BY-NC 4.0 · DOI 10.34740/kaggle/dsv/20910302">
          <article className="block">
            <h3>{DATASET.title}</h3>
            <p>{DATASET.summary}</p>
            <div className="nums">
              {DATASET.metrics.map((m) => <div key={m.label}><b>{m.value}</b><span>{m.label}</span></div>)}
            </div>
            <div className="split" aria-hidden>
              <i className="tr" /><i className="va" /><i className="te" />
            </div>
            <p className="mono dim">train 20,308 · val 2,448 · test 2,575</p>
            <a className="text-link" href={DATASET.url} target="_blank" rel="noreferrer">View on Kaggle <ArrowUpRight className="h-4 w-4" /></a>
          </article>
        </Section>

        <Section title="Selected projects" kicker={`6 of ${PROJECTS.length}`}>
          <div className="projects">
            {top.map((p) => {
              const d = domainById[p.domain];
              const m = p.metrics?.[0];
              return (
                <article key={p.slug} className="proj" style={{ ['--c' as string]: d.color }}>
                  {p.image && (
                    <a href={p.repo} target="_blank" rel="noreferrer" className="proj-img">
                      <img src={img(p.image.src)} alt={p.image.caption} loading="lazy" />
                      {p.image.illustration && <span>Illustration</span>}
                    </a>
                  )}
                  <div className="proj-body">
                    <div className="mono" style={{ color: 'var(--c)' }}>{p.context ?? d.label}</div>
                    <h3><a href={p.repo} target="_blank" rel="noreferrer">{p.name} <ArrowUpRight className="h-4 w-4" /></a></h3>
                    <p>{p.tagline}</p>
                    {m && <p className="metric"><b>{m.value}</b> {m.label}</p>}
                    {p.role && <p className="role"><b>My part.</b> {p.role}</p>}
                    <p className="mono dim">{p.stack.slice(0, 4).join(' · ')}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </Section>

        <a className="full-cta" href={FULL}>
          <span className="mono">The long version</span>
          <b>See all {PROJECTS.length} projects in the full 3D portfolio</b>
          <ArrowUpRight className="h-6 w-6" />
        </a>

        <footer className="foot mono dim">
          <span>© 2026 Sudarsan Ravichandran</span>
          <span><Award className="mr-1 inline h-3.5 w-3.5" />OCI Generative AI and Data Science Professional</span>
        </footer>
      </main>
    </div>
  );
}

function Section({ title, kicker, children }: { title: string; kicker: string; children: React.ReactNode }) {
  return (
    <section className="sec">
      <header>
        <h2>{title}</h2>
        <p className="mono dim">{kicker}</p>
      </header>
      {children}
    </section>
  );
}
