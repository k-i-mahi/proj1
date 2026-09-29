import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export const useDebounced = <T>(value: T, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
};

export const useDocumentTitle = (title: string | undefined) => {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} · Civita`;
    return () => {
      document.title = previous;
    };
  }, [title]);
};

/** Calls `onVisible` when the sentinel scrolls into view (infinite scrolling). */
export const useInView = <T extends Element>(onVisible: () => void, enabled = true) => {
  const ref = useRef<T | null>(null);
  const callback = useRef(onVisible);
  useLayoutEffect(() => {
    callback.current = onVisible;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) callback.current();
      },
      { rootMargin: '400px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled]);

  return ref;
};

type GeoState =
  | { status: 'idle' | 'locating' }
  | { status: 'ready'; lat: number; lng: number }
  | { status: 'error'; message: string };

export const useGeolocation = () => {
  const [state, setState] = useState<GeoState>({ status: 'idle' });

  const locate = () =>
    new Promise<{ lat: number; lng: number } | null>((resolve) => {
      if (!('geolocation' in navigator)) {
        setState({ status: 'error', message: 'Your browser does not support location' });
        return resolve(null);
      }
      setState({ status: 'locating' });
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setState({ status: 'ready', ...coords });
          resolve(coords);
        },
        (err) => {
          setState({
            status: 'error',
            message:
              err.code === err.PERMISSION_DENIED
                ? 'Location permission was denied'
                : 'Could not get your location',
          });
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
      );
    });

  return { ...state, locate };
};

/** Opens the command palette with Ctrl/Cmd + K. */
export const useCommandMenu = () => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return { open, setOpen };
};
