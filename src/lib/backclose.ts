import { useEffect, useRef } from 'react';

/** Tombol Kembali Android menutup lapisan (lembar/pop up) alih-alih keluar aplikasi. */
export function useBackClose(open: boolean, close: () => void): void {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    let popped = false;
    try {
      history.pushState({ lapis: 1 }, '');
    } catch {
      return;
    }
    const onPop = () => {
      popped = true;
      closeRef.current();
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (!popped) history.back();
    };
  }, [open]);
}
