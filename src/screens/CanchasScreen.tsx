import React, { useState } from 'react';
import { Court, CourtFilterType, UserProfile, OpenMatch, ClubSettings } from '../types';
import { MatchmakingBanner } from '../components/MatchmakingBanner';
import { CourtCard } from '../components/CourtCard';
import { QuickMatchDrawer } from '../components/QuickMatchDrawer';

interface CanchasScreenProps {
  user: UserProfile;
  courts: Court[];
  openMatch?: OpenMatch;
  clubSettings?: ClubSettings;
  onSelectCourtForBooking: (courtId: string, preselectedSlot?: string) => void;
  onJoinOpenMatch: () => void;
  onAutoSlot: () => void;
  isMatchJoined?: boolean;
}

export const CanchasScreen: React.FC<CanchasScreenProps> = ({
  user,
  courts,
  openMatch,
  clubSettings,
  onSelectCourtForBooking,
  onJoinOpenMatch,
  onAutoSlot,
  isMatchJoined = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CourtFilterType>('all');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const filterChips: Array<{ id: CourtFilterType; label: string }> = [
    { id: 'all', label: `Todas (${courts.length})` },
    { id: 'panoramica', label: 'Panorámica Pro' },
    { id: 'techada', label: 'Cristal Techada' },
    { id: 'exterior', label: 'Pista Exterior' },
  ];

  const filteredCourts = courts.filter((court) => {
    if (selectedCategory === 'all') return true;
    return court.category === selectedCategory;
  });

  const handleToggleFavorite = (courtId: string) => {
    setFavorites((prev) => ({
      ...prev,
      [courtId]: !prev[courtId],
    }));
  };

  return (
    <div className="flex flex-col w-full gap-5">
      {/* Saludo & Status Header */}
      <section className="flex flex-col gap-1 mt-1">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-[24px] font-bold text-[#dfe2ef] tracking-tight flex items-center gap-2">
              ¡Hola, {user.full_name.split(' ')[0]}!{' '}
              <span className="inline-block hover:rotate-12 transition-transform cursor-default">
                👋
              </span>
            </h1>
            <p className="text-[14px] text-[#bbcabf]">Encuentra tu pista hoy</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#262a34] shadow-md border border-[#31353f]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4edea3] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4edea3]"></span>
            </span>
            <span className="text-[11px] font-bold text-[#4edea3] tracking-wider uppercase truncate max-w-[120px]">
              {clubSettings?.club_name?.split(' ')[0] || 'Sede Norte'}
            </span>
          </div>
        </div>
      </section>

      {/* Dynamic Banner: Matchmaking / 4to Jugador */}
      <MatchmakingBanner
        onJoinMatch={onJoinOpenMatch}
        isJoined={isMatchJoined}
        openMatch={openMatch}
      />

      {/* Horizontal Filter Chips */}
      <section className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#bbcabf]">
            Tipo de Cancha
          </span>
          <span className="font-mono text-[12px] font-semibold text-[#4edea3]">
            {filteredCourts.length} disponibles
          </span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
          {filterChips.map((chip) => {
            const isActive = selectedCategory === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setSelectedCategory(chip.id)}
                className={`shrink-0 px-3.5 py-2 rounded-full text-[11px] font-bold transition-all duration-200 cursor-pointer active:scale-95 ${
                  isActive
                    ? 'bg-[#4edea3] text-[#003824] shadow-sm'
                    : 'bg-[#1c1f29] text-[#bbcabf] hover:text-[#dfe2ef] border border-[#31353f]/40'
                }`}
                type="button"
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Court Cards List */}
      <section className="flex flex-col gap-5">
        {filteredCourts.map((court) => (
          <CourtCard
            key={court.id}
            court={court}
            onSelectCourt={onSelectCourtForBooking}
            onToggleFavorite={handleToggleFavorite}
            isFavorite={!!favorites[court.id]}
          />
        ))}
      </section>

      {/* Quick Match Bottom Drawer Trigger */}
      <QuickMatchDrawer onAutoSlot={onAutoSlot} />
    </div>
  );
};
