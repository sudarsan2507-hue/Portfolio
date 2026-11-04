import * as THREE from 'three';

/*
 * The page is one camera flight through a 3D world. Each DOM chapter has a matching
 * station in the world; scrolling through a chapter holds the camera on its station,
 * and the gap between chapters flies the camera to the next one.
 */

export const STATIONS = ['top', 'research', 'paper', 'safety', 'sensing', 'data', 'products', 'universe', 'contact'] as const;
export type StationId = (typeof STATIONS)[number];

export const STATION_LABEL: Record<StationId, string> = {
  top: 'Search',
  research: 'Research',
  paper: 'IEEE paper',
  safety: 'Agent safety',
  sensing: 'Sensing',
  data: 'Dataset',
  products: 'Apps',
  universe: 'Universe',
  contact: 'Contact',
};

export const UNIVERSE_INDEX = STATIONS.indexOf('universe');

/** Where each station's object sits in the world. */
export function stationPos(i: number) {
  return new THREE.Vector3(Math.sin(i * 1.25) * 8, Math.cos(i * 0.85) * 2.5, -i * 24);
}

/** +1: object on the right, text on the left. -1: the reverse. 0: centred. */
export function stationSide(i: number) {
  if (STATIONS[i] === 'contact') return 0;
  return i % 2 === 0 ? 1 : -1;
}

export const scroll = {
  /** Fractional station index, e.g. 2.4 = 40% of the way from station 2 to 3. */
  progress: 0,
  /** Index of the station the camera is closest to. */
  current: 0,
  listeners: new Set<(i: number) => void>(),
};

let tops: number[] = [];

function measure() {
  tops = STATIONS.map((id) => {
    const el = document.getElementById(id);
    return el ? el.getBoundingClientRect().top + window.scrollY : 0;
  });
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function updateScroll() {
  if (!tops.length) measure();
  const y = window.scrollY + window.innerHeight * 0.5;
  let i = 0;
  while (i < tops.length - 1 && y >= tops[i + 1]) i++;
  let p = i;
  if (i < tops.length - 1) {
    const span = tops[i + 1] - tops[i];
    const local = span > 0 ? (y - tops[i]) / span : 0;
    // Hold on the station for most of the chapter, then fly in the last stretch.
    p = i + smooth(0.55, 1, local);
  }
  scroll.progress = p;
  const cur = Math.round(p);
  if (cur !== scroll.current) {
    scroll.current = cur;
    scroll.listeners.forEach((f) => f(cur));
  }
}

export function initScrollTracking() {
  const onResize = () => {
    measure();
    updateScroll();
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('scroll', updateScroll, { passive: true });
  const ro = new ResizeObserver(onResize);
  ro.observe(document.body);
  onResize();
  return () => {
    window.removeEventListener('resize', onResize);
    window.removeEventListener('scroll', updateScroll);
    ro.disconnect();
  };
}

/** How close the camera is to station i: 1 when parked on it, 0 when a full station away. */
export function nearness(i: number) {
  return Math.max(0, 1 - Math.abs(scroll.progress - i));
}
