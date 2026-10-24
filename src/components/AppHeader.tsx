import React from 'react';
import { UserProfile } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface AppHeaderProps {
  user: UserProfile;
  onOpenProfile: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ user, onOpenProfile }) => {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-[#0f131c]/85 backdrop-blur-xl shadow-[0_1px_12px_rgba(0,0,0,0.5)] pt-safe">
      <div className="h-16 px-4 flex items-center justify-between gap-2 max-w-lg mx-auto">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <img
            alt="Padel Assist Logo"
            className="h-8 w-auto object-contain shrink-0"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBTcLzVWuV9Pmp8jS1KFA6igMgateNGc2EVpKfH_x6_XYlpldSMwLVboS0R7F6uudnpJWwy3MecOZ19TEt5olh_alcMGcfFeykSTn0t3B7bYrWB-jioiw4Dc3u_SjW6PlVhGZ0OWB8cMZaqcpv7TEy5QyRXK42tmziASoql8aJUHUu92XqpgzouYa29UnNCICgXKu64b09kJkFVskykEQqycm5LHlTHWfHuf1TF1mX07fY6fjSN5c4R"
          />
          <div className="flex flex-col min-w-0 justify-center">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[18px] text-[#dfe2ef] tracking-tight truncate">
                Padel Assist
              </span>
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-[#262a34] text-[#4edea3] tracking-wider uppercase shrink-0">
                Pro
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4edea3] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4edea3]"></span>
              </span>
              <span className="text-[11px] text-[#bbcabf] truncate">
                Abierto hoy hasta 11:00 PM
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallButton variant="header" />

          <button
            onClick={onOpenProfile}
            title={`Perfil de ${user.full_name}`}
            aria-label="Abrir perfil de usuario"
            className="relative p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-[#4edea3] min-h-[44px] min-w-[44px] flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
            type="button"
          >
            {user.avatar_url ? (
              <img
                alt={user.full_name}
                className="w-8 h-8 rounded-full object-cover shadow-[0_0_12px_rgba(78,222,163,0.35)]"
                src={user.avatar_url}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#10b981] text-[#00422b] font-bold flex items-center justify-center text-xs">
                {user.initials || 'MG'}
              </div>
            )}
            <span className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-[#4edea3] rounded-full border border-[#0f131c]"></span>
          </button>
        </div>
      </div>
    </header>
  );
};
