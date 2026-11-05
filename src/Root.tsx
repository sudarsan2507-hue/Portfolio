import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './components/ui';
import type { ViewMode } from './gate/Gate';
import { STATIONS } from './three/store';

const Gate = lazy(() => import('./gate/Gate'));
const DetailedView = lazy(() => import('./App'));
const CrispView = lazy(() => import('./crisp/CrispView'));

type Mode = 'gate' | ViewMode;

/** #crisp opens the crisp view, #detailed or any chapter link opens the detailed view, anything else the entrance. */
function modeFromHash(): Mode {
  const h = window.location.hash.replace('#', '');
  if (h === 'crisp') return 'crisp';
  if (h === 'detailed' || (STATIONS as readonly string[]).includes(h)) return 'detailed';
  return 'gate';
}

function setHash(m: Mode) {
  const url = m === 'gate' ? window.location.pathname + window.location.search : `#${m}`;
  window.history.replaceState(null, '', url);
}

export default function Root() {
  const reduced = useReducedMotion();
  const [mode, setMode] = useState<Mode>(modeFromHash);
  // the 3D transition: warp toward a view, then fade the gate away over it
  const [warp, setWarp] = useState<{ to: ViewMode; fading: boolean } | null>(null);
  const warpRef = useRef(warp);
  warpRef.current = warp;

  const go = useCallback(
    (to: Mode) => {
      if (to === 'gate') {
        setMode('gate');
        setHash('gate');
        window.scrollTo(0, 0);
        return;
      }
      if (reduced) {
        setMode(to);
        setHash(to);
        window.scrollTo(0, 0);
        return;
      }
      setWarp({ to, fading: false });
    },
    [reduced],
  );

  const onWarpDone = useCallback(() => {
    const w = warpRef.current;
    if (!w) return;
    setMode(w.to);
    setHash(w.to);
    window.scrollTo(0, 0);
    setWarp({ ...w, fading: true });
    window.setTimeout(() => setWarp(null), 900);
  }, []);

  useEffect(() => {
    const onHash = () => setMode(modeFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.view = mode;
  }, [mode]);

  const showGate = mode === 'gate' || warp !== null;

  return (
    <>
      <Suspense fallback={<div className="boot" />}>
        {mode === 'detailed' && <DetailedView onSwitch={(m) => go(m)} />}
        {mode === 'crisp' && <CrispView onSwitch={(m) => go(m)} />}
      </Suspense>
      {showGate && (
        <Suspense fallback={<div className="boot" />}>
          <Gate
            interactive={mode === 'gate' && !warp}
            warpTo={warp?.to ?? null}
            fading={warp?.fading ?? false}
            onChoose={(m) => go(m)}
            onWarpDone={onWarpDone}
          />
        </Suspense>
      )}
    </>
  );
}
