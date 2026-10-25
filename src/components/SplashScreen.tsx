import React, { useEffect } from 'react';
import { Icon } from './Icons';

export const SPLASH_MS = 4000;

export function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, SPLASH_MS);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="splash" role="status" aria-label="Memuat OjolTarget Pro">
      <div className="splash-center">
        <span className="splash-mark">
          <Icon name="route" size={46} strokeWidth={2.2} />
        </span>
        <h1>OjolTarget Pro</h1>
        <p>Catat order. Temukan spot gacor.</p>
      </div>
      <div className="splash-bar" aria-hidden="true">
        <span style={{ animationDuration: `${SPLASH_MS}ms` }} />
      </div>
    </div>
  );
}
