import React from 'react';
import { AvailableSlotResult } from '../types';

interface TimeSlotGridProps {
  slots: AvailableSlotResult[];
  selectedSlotTime: string;
  onSelectSlot: (slot: AvailableSlotResult) => void;
}

export const TimeSlotGrid: React.FC<TimeSlotGridProps> = ({
  slots,
  selectedSlotTime,
  onSelectSlot,
}) => {
  const morningSlots = slots.filter((s) => s.period === 'morning');
  const afternoonSlots = slots.filter((s) => s.period === 'afternoon');
  const nightSlots = slots.filter((s) => s.period === 'night');

  const renderSlotButton = (slot: AvailableSlotResult) => {
    const isSelected = selectedSlotTime === slot.time_range;

    if (slot.status === 'booked' || !slot.is_available) {
      if (slot.status === 'in_game') {
        return (
          <div
            key={slot.time_range}
            className="relative p-3 rounded-xl bg-[#0a0e17] opacity-40 flex flex-col justify-between min-h-[72px] cursor-not-allowed border border-white/5"
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-mono text-[16px] line-through text-[#86948a]">
                {slot.time_range}
              </span>
              <span className="material-symbols-outlined text-[#86948a] text-[16px]">
                lock
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ffb4ab] opacity-75 animate-ping"></span>
              <span className="text-[11px] font-bold text-[#86948a] tracking-wider uppercase">
                En juego
              </span>
            </div>
          </div>
        );
      }

      return (
        <div
          key={slot.time_range}
          className="relative p-3 rounded-xl bg-[#0a0e17] opacity-40 flex flex-col justify-between min-h-[72px] cursor-not-allowed border border-white/5"
        >
          <div className="flex items-center justify-between w-full">
            <span className="font-mono text-[16px] line-through text-[#86948a]">
              {slot.time_range}
            </span>
            <span className="material-symbols-outlined text-[#86948a] text-[16px]">
              lock
            </span>
          </div>
          <span className="text-[11px] font-bold text-[#86948a] tracking-wider uppercase mt-1">
            Reservado
          </span>
        </div>
      );
    }

    if (isSelected) {
      return (
        <button
          key={slot.time_range}
          onClick={() => onSelectSlot(slot)}
          className="relative p-3 rounded-xl bg-[#31353f] shadow-[0_0_18px_rgba(16,185,129,0.3)] text-left flex flex-col justify-between active:scale-95 transition-all min-h-[72px] ring-2 ring-[#4edea3] cursor-pointer"
          type="button"
        >
          <div className="flex items-center justify-between w-full">
            <span className="font-mono text-[16px] text-[#4edea3] font-bold">
              {slot.time_range}
            </span>
            <div className="w-5 h-5 rounded-full bg-[#4edea3] text-[#003824] flex items-center justify-center">
              <span className="material-symbols-outlined text-[14px] font-bold">
                check
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between w-full mt-1">
            <span className="font-mono text-[14px] text-[#4edea3] font-bold">
              ${slot.price.toFixed(2)}
            </span>
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-[#4edea3] text-[#003824] uppercase tracking-wider">
              Tu Turno
            </span>
          </div>
        </button>
      );
    }

    return (
      <button
        key={slot.time_range}
        onClick={() => onSelectSlot(slot)}
        className="relative p-3 rounded-xl bg-[#262a34] text-left flex flex-col justify-between hover:bg-[#353943] active:scale-95 transition-all min-h-[72px] border border-[#31353f] cursor-pointer"
        type="button"
      >
        <div className="flex items-center justify-between w-full">
          <span className="font-mono text-[16px] text-[#dfe2ef]">
            {slot.time_range}
          </span>
          <span className="w-2 h-2 rounded-full bg-[#4edea3] shadow-[0_0_6px_#4edea3]"></span>
        </div>
        <div className="flex items-center justify-between w-full mt-1">
          <span className="text-[12px] font-bold text-[#6ffbbe]">
            ${slot.price.toFixed(2)}
          </span>
          {slot.tag === 'Último' ? (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#00bd85]/20 text-[#45dfa4]">
              Último
            </span>
          ) : (
            <span className="text-[12px] text-[#bbcabf]">{slot.tag}</span>
          )}
        </div>
      </button>
    );
  };

  return (
    <section className="flex flex-col gap-3 pb-2">
      <div className="flex items-center justify-between">
        <span className="text-[18px] font-bold text-[#dfe2ef]">
          Horarios Disponibles
        </span>
        <div className="flex items-center gap-3 text-[11px] font-semibold text-[#bbcabf]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#4edea3]"></span>Libre
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#353943]"></span>Ocupado
          </span>
        </div>
      </div>

      {/* Group 1: MAÑANA */}
      {morningSlots.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1 text-[#bbcabf]">
            <span className="material-symbols-outlined text-[16px] text-[#7bd0ff]">
              wb_sunny
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Mañana (07:00 - 13:00)
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {morningSlots.map(renderSlotButton)}
          </div>
        </div>
      )}

      {/* Group 2: TARDE PRIME */}
      {afternoonSlots.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1 text-[#bbcabf]">
            <span className="material-symbols-outlined text-[16px] text-[#45dfa4]">
              flare
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Tarde Prime (13:00 - 19:00)
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {afternoonSlots.map(renderSlotButton)}
          </div>
        </div>
      )}

      {/* Group 3: NOCHE FOCOS LED */}
      {nightSlots.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1 text-[#bbcabf]">
            <span className="material-symbols-outlined text-[16px] text-[#7bd0ff]">
              bedtime
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Noche Focos LED (19:00 - 23:00)
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {nightSlots.map(renderSlotButton)}
          </div>
        </div>
      )}
    </section>
  );
};
