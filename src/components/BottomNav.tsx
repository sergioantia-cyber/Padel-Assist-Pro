import React from 'react';
import { NavView } from '../types';

interface BottomNavProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  hasPendingPayment?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  onNavigate,
  hasPendingPayment = true,
}) => {
  const navItems: Array<{
    id: NavView;
    label: string;
    icon: string;
    hasPing?: boolean;
  }> = [
    { id: 'canchas', label: 'Canchas', icon: 'sports_tennis' },
    { id: 'reservar', label: 'Reservar', icon: 'edit_calendar' },
    { id: 'mis-partidos', label: 'Partidos', icon: 'confirmation_number', hasPing: hasPendingPayment },
    { id: 'club-info', label: 'Club', icon: 'domain' },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 pb-safe bg-[#0a0e17]/90 backdrop-blur-2xl shadow-[0_-8px_24px_rgba(0,0,0,0.6)] border-t border-[#1c1f29]">
      <div className="grid grid-cols-4 items-center h-20 max-w-lg mx-auto px-1">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`group relative flex flex-col items-center justify-center gap-1 h-full min-h-[44px] transition-all duration-300 active:scale-95 cursor-pointer ${
                isActive ? 'text-[#4edea3] font-semibold' : 'text-[#bbcabf] hover:text-[#dfe2ef]'
              }`}
              type="button"
            >
              <div className="relative flex items-center justify-center">
                <span
                  className={`material-symbols-outlined transition-transform duration-300 text-[24px] ${
                    isActive ? '-translate-y-0.5' : ''
                  }`}
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
                {item.hasPing && !isActive && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4edea3] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#4edea3]"></span>
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold tracking-wider uppercase truncate">
                {item.label}
              </span>
              <span
                className={`absolute bottom-1.5 w-1.5 h-1.5 rounded-full bg-[#4edea3] transition-all duration-300 shadow-[0_0_8px_#4edea3] ${
                  isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                }`}
              ></span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
