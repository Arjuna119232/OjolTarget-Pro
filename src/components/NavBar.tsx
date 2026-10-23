import React from 'react';
import {
  Gauge,
  Navigation,
  DollarSign,
  Wrench,
  Trophy,
  Compass,
  Settings,
} from 'lucide-react';
import { Page } from '@/types';

interface NavBarProps {
  page: Page;
  onPageChange: (p: Page) => void;
  urgentServiceCount: number;
  hasActiveOrder: boolean;
}

export function NavBar({
  page,
  onPageChange,
  urgentServiceCount,
  hasActiveOrder,
}: NavBarProps) {
  const items: Array<{
    id: Page;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | boolean;
    badgeColor?: string;
  }> = [
    { id: 'cockpit', label: 'Cockpit', icon: Gauge },
    { id: 'trip', label: 'Trip Lapangan', icon: Navigation, badge: hasActiveOrder, badgeColor: 'bg-emerald-500' },
    { id: 'catat-order', label: 'Order', icon: DollarSign },
    { id: 'riwayat-servis', label: 'Servis', icon: Wrench, badge: urgentServiceCount > 0 ? urgentServiceCount : undefined, badgeColor: 'bg-rose-500' },
    { id: 'level-grab', label: 'Level', icon: Trophy },
    { id: 'strategi', label: 'Strategi', icon: Compass },
    { id: 'pengaturan', label: 'Profil', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 amoled:bg-black/95 backdrop-blur-md border-t border-slate-800/90 px-1 py-1 flex items-center justify-around safe-bottom">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = page === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onPageChange(item.id)}
            className={`relative flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all duration-200 select-none min-w-[44px] ${
              isActive
                ? 'text-emerald-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.4px]' : 'stroke-[1.8px]'}`} />

              {/* Badge indicator */}
              {item.badge !== undefined && (
                <span
                  className={`absolute -top-1 -right-1.5 min-w-[14px] h-[14px] px-1 rounded-full text-[9px] font-mono font-bold text-white flex items-center justify-center ${
                    item.badgeColor || 'bg-emerald-500'
                  } ring-2 ring-slate-900`}
                >
                  {typeof item.badge === 'number' ? item.badge : ''}
                </span>
              )}
            </div>

            <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[56px]">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
