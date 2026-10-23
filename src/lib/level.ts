import { LEVEL_TARGETS, GrabLevel, LevelProgress } from '@/types';

export function getDaysInMonth(date: Date = new Date()): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function getDaysRemainingInMonth(date: Date = new Date()): number {
  const today = date.getDate();
  const total = getDaysInMonth(date);
  return Math.max(0, total - today);
}

export function hitungSisaHari(date: Date = new Date()): number {
  return getDaysRemainingInMonth(date);
}

export function computeLevelProgress(
  level: GrabLevel,
  current: {
    hariOnline: number;
    jamOnline: number;
    penyelesaian: number;
    rating: number;
    orderan: number;
  },
  date: Date = new Date()
): LevelProgress {
  const target = LEVEL_TARGETS[level];

  return {
    hari: Math.min(target.hari, current.hariOnline),
    jam: Math.min(target.jam, current.jamOnline),
    penyelesaian: Math.min(target.penyelesaian, current.penyelesaian),
    rating: Math.min(target.rating, current.rating),
    orderan: Math.min(target.orderan, current.orderan),
  };
}

export function getLevelIndicatorColor(
  level: GrabLevel,
  progress: LevelProgress,
  current: {
    hariOnline: number;
    jamOnline: number;
    penyelesaian: number;
    rating: number;
    orderan: number;
  }
): 'merah' | 'kuning' | 'hijau' | 'pelangi' {
  const target = LEVEL_TARGETS[level];
  const pctHari = current.hariOnline / target.hari;
  const pctJam = current.jamOnline / target.jam;
  const pctPenyelesaian = current.penyelesaian / target.penyelesaian;
  const pctRating = current.rating / target.rating;
  const pctOrderan = current.orderan / target.orderan;
  const avgPct = (pctHari + pctJam + pctPenyelesaian + pctRating + pctOrderan) / 5;

  if (avgPct >= 0.9) return 'hijau';
  if (avgPct >= 0.5) return 'pelangi';
  if (avgPct >= 0.2) return 'kuning';
  return 'merah';
}

export function getLevelColor(level: GrabLevel): string {
  switch (level) {
    case 'Pejuang':
      return '#ef4444';
    case 'Kesatria':
      return '#f59e0b';
    case 'Jawara':
      return '#10b981';
  }
}

export function getProgressColor(pct: number): string {
  if (pct >= 100) return '#10b981';
  if (pct >= 75) return '#059669';
  if (pct >= 40) return '#f59e0b';
  return '#ef4444';
}
