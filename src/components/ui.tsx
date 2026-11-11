import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, Github } from 'lucide-react';
import { domainById, type Project } from '../data/projects';
import { cn } from '../lib/utils';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

export function useInView<T extends HTMLElement>(margin = '200px') {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current || seen) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { rootMargin: margin });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [margin, seen]);
  return [ref, seen] as const;
}

/** True while the element is on (or near) the screen. Used to pause 3D scenes off-screen. */
export function useVisible<T extends HTMLElement>(margin = '0px') {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: margin });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [margin]);
  return [ref, visible] as const;
}

/** A picture that is scanned in from the top the first time it is seen (detailed view). */
export function ScanImg({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  const [ref, seen] = useInView<HTMLImageElement>('-60px');
  return <img ref={ref} className={cn('scan-img', seen && 'in', className)} src={src} alt={alt} loading="lazy" />;
}

export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function Chip({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span
      className="rounded-md border px-2 py-1 font-mono text-[11px] text-white/75"
      style={{ borderColor: color ? `${color}40` : 'rgba(255,255,255,0.12)', background: color ? `${color}10` : 'rgba(255,255,255,0.03)' }}
    >
      {children}
    </span>
  );
}

export function ProjectLinks({ project, size = 'sm' }: { project: Project; size?: 'sm' | 'md' }) {
  const color = domainById[project.domain].color;
  const cls = size === 'md' ? 'px-4 py-2 text-sm' : 'px-3 py-1.5 text-xs';
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={project.repo}
        target="_blank"
        rel="noreferrer"
        className={cn('inline-flex items-center gap-1.5 rounded-full border border-white/15 font-mono text-white/80 transition-colors hover:border-white/40 hover:text-white', cls)}
      >
        <Github className="h-3.5 w-3.5" /> Code
      </a>
      {project.branch && (
        <a
          href={project.branch.url}
          target="_blank"
          rel="noreferrer"
          className={cn('inline-flex items-center gap-1.5 rounded-full border border-white/15 font-mono text-white/80 transition-colors hover:border-white/40 hover:text-white', cls)}
        >
          {project.branch.label} <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      )}
      {project.live && (
        <a
          href={project.live.url}
          target="_blank"
          rel="noreferrer"
          className={cn('inline-flex items-center gap-1.5 rounded-full font-mono font-semibold text-[#05060a] transition-transform hover:-translate-y-0.5', cls)}
          style={{ background: color }}
        >
          {project.live.label} <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}
