import React from 'react';
import { Court } from '../types';

interface CourtCardProps {
  court: Court;
  onSelectCourt: (courtId: string, preselectedSlot?: string) => void;
  onToggleFavorite?: (courtId: string) => void;
  isFavorite?: boolean;
}

export const CourtCard: React.FC<CourtCardProps> = ({
  court,
  onSelectCourt,
  onToggleFavorite,
  isFavorite = false,
}) => {
  return (
    <article className="court-card group flex flex-col rounded-xl bg-[#1c1f29] overflow-hidden shadow-xl transition-all duration-300 border border-[#31353f]/60 hover:border-[#4edea3]/40">
      {/* Cover Image with Overlays */}
      <div className="relative w-full h-44 overflow-hidden bg-[#0a0e17]">
        <img
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          alt={court.name}
          src={court.photos[0]}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1c1f29] via-[#1c1f29]/30 to-transparent"></div>

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span
            className={`px-2.5 py-1 rounded-full bg-[#31353f]/90 backdrop-blur-md font-bold text-[11px] shadow-md flex items-center gap-1 ${court.banner_color}`}
          >
            <span className="material-symbols-outlined text-[14px]">star</span>
            {court.banner_badge}
          </span>
          <span className="px-2 py-1 rounded-full bg-[#0a0e17]/80 backdrop-blur-md text-[#dfe2ef] font-mono text-[12px] font-semibold">
            {court.court_number_label}
          </span>
        </div>

        {/* Price Pill */}
        <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-[#0a0e17]/90 backdrop-blur-md text-[#dfe2ef] font-mono text-[16px] shadow-lg flex items-center gap-1 border border-white/5">
          <span className={`font-bold ${court.banner_color}`}>${court.rate_for_90m}</span>
          <span className="text-[#bbcabf] font-sans text-[11px] font-normal">/ 90m</span>
        </div>

        {/* Immediate Availability Badge */}
        <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#4edea3]/20 backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-[#4edea3] animate-pulse"></span>
          <span className="text-[12px] font-mono text-[#4edea3] font-bold">
            {court.instant_badge}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-3.5 flex flex-col gap-2.5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[20px] font-bold text-[#dfe2ef] tracking-tight">
              {court.name}
            </h2>
            <p className="text-[12px] text-[#bbcabf] mt-0.5 line-clamp-1">
              {court.description}
            </p>
          </div>
          <button
            onClick={() => onToggleFavorite && onToggleFavorite(court.id)}
            aria-label="Guardar pista en favoritos"
            className={`w-9 h-9 rounded-full bg-[#262a34] flex items-center justify-center active:scale-90 transition-colors cursor-pointer shrink-0 ${
              isFavorite ? 'text-[#ffb4ab]' : 'text-[#bbcabf] hover:text-[#ffb4ab]'
            }`}
            type="button"
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0" }}
            >
              favorite
            </span>
          </button>
        </div>

        {/* Specs Badges */}
        <div className="flex flex-wrap gap-1.5 my-0.5">
          {court.specs.map((spec, idx) => (
            <span
              key={idx}
              className="px-2 py-1 rounded-md bg-[#262a34] text-[#bbcabf] text-[11px] font-semibold flex items-center gap-1"
            >
              <span className={`material-symbols-outlined text-[14px] ${spec.colorClass || 'text-[#4edea3]'}`}>
                {spec.icon}
              </span>
              {spec.label}
            </span>
          ))}
        </div>

        {/* Quick Slots */}
        <div className="grid grid-cols-3 gap-2 mt-1">
          {court.quick_slots.map((slot, idx) => (
            <button
              key={idx}
              onClick={() => slot.available && onSelectCourt(court.id, slot.time)}
              disabled={!slot.available}
              className={`p-2 rounded-lg text-center transition-all ${
                slot.available
                  ? 'bg-[#262a34] hover:bg-[#353943] cursor-pointer'
                  : 'bg-[#262a34] opacity-40 cursor-not-allowed'
              }`}
              type="button"
            >
              <span
                className={`block font-mono text-[12px] font-bold ${
                  slot.available ? 'text-[#4edea3]' : 'text-[#bbcabf] line-through'
                }`}
              >
                {slot.time}
              </span>
              <span className="block text-[10px] text-[#bbcabf]">
                {slot.available ? 'Disponible' : 'Ocupado'}
              </span>
            </button>
          ))}
        </div>

        {/* Primary CTA */}
        <button
          onClick={() => onSelectCourt(court.id)}
          className="relative overflow-hidden w-full mt-2 py-3 rounded-lg bg-gradient-to-r from-[#4edea3] to-[#45dfa4] hover:from-[#6ffbbe] hover:to-[#68fcbf] text-[#003824] text-[15px] font-bold tracking-wide active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2 group/btn cursor-pointer"
          type="button"
        >
          <span>Ver Disponibilidad</span>
          <span className="material-symbols-outlined group-hover/btn:translate-x-1 transition-transform">
            calendar_month
          </span>
        </button>
      </div>
    </article>
  );
};
