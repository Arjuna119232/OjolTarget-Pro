import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Fix, LapisPeta, LatLng } from '../types';
import { Cell } from '../lib/spots';

export interface MapHandle {
  zoomBy: (delta: number) => void;
  flyTo: (p: LatLng, zoom?: number) => void;
  fit: (points: LatLng[]) => void;
}

interface Props {
  layer: LapisPeta;
  cells: Cell[];
  selectedKey: string | null;
  user: Fix | null;
  initial: { lat: number; lng: number; zoom: number };
  onSelect: (cell: Cell | null) => void;
}

interface View {
  lat: number;
  lng: number;
  zoom: number;
}

const MIN_Z = 3;
const MAX_Z = 19;
const TILE = 256;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function project(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const w = TILE * Math.pow(2, zoom);
  const sin = Math.sin((clamp(lat, -85.05, 85.05) * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * w,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * w,
  };
}

function unproject(x: number, y: number, zoom: number): LatLng {
  const w = TILE * Math.pow(2, zoom);
  const lng = (x / w) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / w;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat: clamp(lat, -85, 85), lng };
}

function tileUrl(layer: LapisPeta, z: number, x: number, y: number): string {
  if (layer === 'standar') return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  const sub = 'abcd'[(x + y) % 4];
  const retina = typeof window !== 'undefined' && window.devicePixelRatio >= 1.5 ? '@2x' : '';
  return `https://${sub}.basemaps.cartocdn.com/dark_all/${z}/${x}/${y}${retina}.png`;
}

function warna(ratio: number): string {
  if (ratio >= 0.75) return '#ef4444';
  if (ratio >= 0.45) return '#f97316';
  if (ratio >= 0.2) return '#f59e0b';
  return '#facc15';
}

export const SlippyMap = forwardRef<MapHandle, Props>(function SlippyMap(
  { layer, cells, selectedKey, user, initial, onSelect },
  ref
) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 320, h: 320 });
  const [view, setView] = useState<View>(initial);
  const viewRef = useRef(view);
  viewRef.current = view;
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const cellsRef = useRef(cells);
  cellsRef.current = cells;

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const read = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setSize({ w: r.width, h: r.height });
    };
    read();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(read);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', read);
    return () => window.removeEventListener('resize', read);
  }, []);

  const toScreen = useCallback(
    (lat: number, lng: number, v: View = viewRef.current) => {
      const c = project(v.lat, v.lng, v.zoom);
      const p = project(lat, lng, v.zoom);
      return { x: p.x - c.x + sizeRef.current.w / 2, y: p.y - c.y + sizeRef.current.h / 2 };
    },
    []
  );

  useImperativeHandle(
    ref,
    () => ({
      zoomBy: (d) => setView((v) => ({ ...v, zoom: clamp(v.zoom + d, MIN_Z, MAX_Z) })),
      flyTo: (p, zoom) =>
        setView((v) => ({ lat: p.lat, lng: p.lng, zoom: clamp(zoom ?? v.zoom, MIN_Z, MAX_Z) })),
      fit: (pts) => {
        if (!pts.length) return;
        let minLat = 90,
          maxLat = -90,
          minLng = 180,
          maxLng = -180;
        for (const p of pts) {
          minLat = Math.min(minLat, p.lat);
          maxLat = Math.max(maxLat, p.lat);
          minLng = Math.min(minLng, p.lng);
          maxLng = Math.max(maxLng, p.lng);
        }
        const { w, h } = sizeRef.current;
        let z = MAX_Z - 3;
        for (; z > MIN_Z; z--) {
          const a = project(maxLat, minLng, z);
          const b = project(minLat, maxLng, z);
          if (Math.abs(b.x - a.x) < w - 90 && Math.abs(b.y - a.y) < h - 90) break;
        }
        setView({ lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2, zoom: z });
      },
    }),
    []
  );

  // ---------- Gestur: geser, cubit, ketuk ----------
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{
    startZoom: number;
    startDist: number;
    anchorX: number; // titik dunia (px pada startZoom) di bawah jari saat gestur mulai
    anchorY: number;
    moved: number;
    t0: number;
    downX: number;
    downY: number;
  } | null>(null);

  const beginGesture = () => {
    const pts = [...pointers.current.values()];
    if (!pts.length) {
      gesture.current = null;
      return;
    }
    const box = boxRef.current!.getBoundingClientRect();
    const mx = pts.reduce((s, p) => s + p.x, 0) / pts.length - box.left;
    const my = pts.reduce((s, p) => s + p.y, 0) / pts.length - box.top;
    const v = viewRef.current;
    const c = project(v.lat, v.lng, v.zoom);
    const prev = gesture.current;
    gesture.current = {
      startZoom: v.zoom,
      startDist: pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0,
      anchorX: c.x + (mx - sizeRef.current.w / 2),
      anchorY: c.y + (my - sizeRef.current.h / 2),
      moved: prev ? prev.moved : 0,
      t0: prev ? prev.t0 : Date.now(),
      downX: prev ? prev.downX : mx,
      downY: prev ? prev.downY : my,
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* abaikan */
    }
    const first = pointers.current.size === 0;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (first) gesture.current = null;
    beginGesture();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    const pts = [...pointers.current.values()];
    const box = boxRef.current!.getBoundingClientRect();
    const mx = pts.reduce((s, p) => s + p.x, 0) / pts.length - box.left;
    const my = pts.reduce((s, p) => s + p.y, 0) / pts.length - box.top;
    g.moved = Math.max(g.moved, Math.hypot(mx - g.downX, my - g.downY));

    let zoom = g.startZoom;
    if (pts.length > 1 && g.startDist > 0) {
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      zoom = clamp(g.startZoom + Math.log2(d / g.startDist), MIN_Z, MAX_Z);
    }
    const k = Math.pow(2, zoom - g.startZoom);
    const cx = g.anchorX * k - (mx - sizeRef.current.w / 2);
    const cy = g.anchorY * k - (my - sizeRef.current.h / 2);
    const ll = unproject(cx, cy, zoom);
    setView({ lat: ll.lat, lng: ll.lng, zoom });
  };

  const hitTest = (sx: number, sy: number): Cell | null => {
    const maxCount = Math.max(1, ...cellsRef.current.map((c) => c.count));
    let best: Cell | null = null;
    let bestD = Infinity;
    for (const c of cellsRef.current) {
      const p = toScreen(c.lat, c.lng);
      const r = radius(c.count, maxCount) + 12;
      const d = Math.hypot(p.x - sx, p.y - sy);
      if (d <= r && d < bestD) {
        best = c;
        bestD = d;
      }
    }
    return best;
  };

  const endPointer = (e: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    if (!pointers.current.has(e.pointerId)) return;
    const wasSingle = pointers.current.size === 1;
    const g = gesture.current;
    pointers.current.delete(e.pointerId);
    if (wasSingle && g && !cancelled && g.moved < 8 && Date.now() - g.t0 < 600) {
      onSelect(hitTest(g.downX, g.downY));
    }
    if (pointers.current.size === 0) gesture.current = null;
    else beginGesture();
  };

  // Roda mouse (untuk pengujian di desktop)
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const box = el.getBoundingClientRect();
      const mx = e.clientX - box.left;
      const my = e.clientY - box.top;
      setView((v) => {
        const zoom = clamp(v.zoom - Math.sign(e.deltaY) * 0.5, MIN_Z, MAX_Z);
        const c = project(v.lat, v.lng, v.zoom);
        const ax = c.x + (mx - sizeRef.current.w / 2);
        const ay = c.y + (my - sizeRef.current.h / 2);
        const k = Math.pow(2, zoom - v.zoom);
        const ll = unproject(ax * k - (mx - sizeRef.current.w / 2), ay * k - (my - sizeRef.current.h / 2), zoom);
        return { lat: ll.lat, lng: ll.lng, zoom };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // ---------- Render ----------
  const tiles = useMemo(() => {
    const z = clamp(Math.floor(view.zoom + 0.0001), MIN_Z, MAX_Z);
    const s = Math.pow(2, view.zoom - z);
    const size_ = TILE * s;
    const c = project(view.lat, view.lng, z);
    const n = Math.pow(2, z);
    const x0 = Math.floor((c.x - size.w / 2 / s) / TILE);
    const x1 = Math.floor((c.x + size.w / 2 / s) / TILE);
    const y0 = Math.max(0, Math.floor((c.y - size.h / 2 / s) / TILE));
    const y1 = Math.min(n - 1, Math.floor((c.y + size.h / 2 / s) / TILE));
    const out: Array<{ key: string; url: string; left: number; top: number; size: number }> = [];
    for (let tx = x0; tx <= x1; tx++) {
      for (let ty = y0; ty <= y1; ty++) {
        const wx = ((tx % n) + n) % n;
        out.push({
          key: `${layer}/${z}/${tx}/${ty}`,
          url: tileUrl(layer, z, wx, ty),
          left: (tx * TILE - c.x) * s + size.w / 2,
          top: (ty * TILE - c.y) * s + size.h / 2,
          size: size_,
        });
      }
    }
    return out;
  }, [view, size, layer]);

  const maxCount = Math.max(1, ...cells.map((c) => c.count));
  const userPos = user ? toScreen(user.lat, user.lng, view) : null;
  const metersPerPx =
    (156543.03392 * Math.cos(((user?.lat ?? view.lat) * Math.PI) / 180)) / Math.pow(2, view.zoom);

  return (
    <div
      ref={boxRef}
      className="slippy"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => endPointer(e, false)}
      onPointerCancel={(e) => endPointer(e, true)}
      onDoubleClick={(e) => {
        const box = e.currentTarget.getBoundingClientRect();
        const mx = e.clientX - box.left;
        const my = e.clientY - box.top;
        setView((v) => {
          const c = project(v.lat, v.lng, v.zoom);
          const zoom = clamp(v.zoom + 1, MIN_Z, MAX_Z);
          const ax = c.x + (mx - size.w / 2);
          const ay = c.y + (my - size.h / 2);
          const k = Math.pow(2, zoom - v.zoom);
          const ll = unproject(ax * k - (mx - size.w / 2), ay * k - (my - size.h / 2), zoom);
          return { lat: ll.lat, lng: ll.lng, zoom };
        });
      }}
    >
      <div className="slippy-tiles">
        {tiles.map((t) => (
          <img
            key={t.key}
            src={t.url}
            alt=""
            draggable={false}
            style={{ left: t.left, top: t.top, width: t.size + 0.6, height: t.size + 0.6 }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
            }}
          />
        ))}
      </div>

      <svg className="slippy-overlay" width={size.w} height={size.h}>
        {userPos && (
          <g>
            <circle
              cx={userPos.x}
              cy={userPos.y}
              r={Math.max(8, Math.min(120, user!.acc / metersPerPx))}
              fill="rgba(56,189,248,.16)"
              stroke="rgba(56,189,248,.45)"
              strokeWidth={1}
            />
            <circle cx={userPos.x} cy={userPos.y} r={7} fill="#38bdf8" stroke="#fff" strokeWidth={2.5} />
          </g>
        )}
        {[...cells].reverse().map((c) => {
          const p = toScreen(c.lat, c.lng, view);
          if (p.x < -60 || p.y < -60 || p.x > size.w + 60 || p.y > size.h + 60) return null;
          const r = radius(c.count, maxCount);
          const sel = c.key === selectedKey;
          return (
            <g key={c.key}>
              <circle
                cx={p.x}
                cy={p.y}
                r={r}
                fill={warna(c.count / maxCount)}
                fillOpacity={0.88}
                stroke={sel ? '#ffffff' : 'rgba(0,0,0,.55)'}
                strokeWidth={sel ? 3.5 : 1.5}
              />
              <text
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={r > 16 ? 14 : 12}
                fontWeight={800}
                fill="#111827"
              >
                {c.count}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="slippy-attr">
        © OpenStreetMap{layer === 'gelap' ? ' © CARTO' : ''}
      </div>
    </div>
  );
});

function radius(count: number, max: number): number {
  return 14 + 16 * Math.sqrt(count / max);
}
