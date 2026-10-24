import React, { useState } from 'react';
import { Court } from '../types';

interface BookingSummarySheetProps {
  court: Court;
  selectedDateText: string;
  selectedDateFull: string;
  selectedTimeSlot: string;
  durationMin: number;
  courtPrice: number;
  lightingPrice: number;
  totalPrice: number;
  onConfirmBooking: (teamNote: string) => void;
  isSubmitting?: boolean;
}

export const BookingSummarySheet: React.FC<BookingSummarySheetProps> = ({
  court,
  selectedDateText,
  selectedDateFull,
  selectedTimeSlot,
  durationMin,
  courtPrice,
  lightingPrice,
  totalPrice,
  onConfirmBooking,
  isSubmitting = false,
}) => {
  const [teamNote, setTeamNote] = useState('');

  return (
    <section className="mt-2 bg-[#262a34] rounded-2xl p-4 shadow-2xl flex flex-col gap-3.5 relative overflow-hidden backdrop-blur-xl border border-[#31353f]">
      {/* Ambient subtle top glow */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#4edea3] to-transparent opacity-80"></div>

      {/* Drag Handle */}
      <div className="w-full flex items-center justify-center pt-0.5">
        <div className="w-10 h-1 rounded-full bg-[#3c4a42]"></div>
      </div>

      {/* Sheet Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#4edea3] text-[22px]">
            verified
          </span>
          <h3 className="text-[18px] font-bold text-[#dfe2ef]">
            Confirmar Reserva
          </h3>
        </div>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#10b981] text-[#00422b] uppercase">
          Paso 1 de 2
        </span>
      </div>

      {/* Row 1: Court with Miniature Photo */}
      <div className="flex items-center justify-between bg-[#1c1f29] p-2.5 rounded-xl border border-[#31353f]/60">
        <div className="flex items-center gap-3 min-w-0">
          <img
            className="w-12 h-12 rounded-lg object-cover shadow-sm shrink-0"
            alt={court.name}
            src={court.photos[0]}
          />
          <div className="flex flex-col min-w-0">
            <span className="text-[15px] font-bold text-[#dfe2ef] truncate">
              {court.court_number_label} {court.name}
            </span>
            <span className="text-[12px] text-[#bbcabf] flex items-center gap-1 truncate">
              <span className="material-symbols-outlined text-[13px] text-[#4edea3]">
                check_circle
              </span>
              Césped Mondo Supercourt XN
            </span>
          </div>
        </div>
        <span className="material-symbols-outlined text-[#86948a] shrink-0">
          tune
        </span>
      </div>

      {/* Row 2: Date & Time Metadata Badge */}
      <div className="flex items-center justify-between bg-[#0a0e17] px-3.5 py-2.5 rounded-xl border border-white/5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="material-symbols-outlined text-[#45dfa4] text-[20px] shrink-0">
            schedule
          </span>
          <div className="flex flex-col min-w-0">
            <span className="font-mono text-[15px] font-bold text-[#dfe2ef] truncate">
              {selectedDateText}, {selectedTimeSlot}
            </span>
            <span className="text-[12px] text-[#86948a] truncate">
              {selectedDateFull}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-[#31353f] text-[#4edea3]">
            {durationMin} Minutos
          </span>
        </div>
      </div>

      {/* Row 3: Live Cost Breakdown */}
      <div className="flex flex-col gap-1.5 px-1 py-1">
        <div className="flex items-center justify-between text-[13px] text-[#bbcabf]">
          <span>Alquiler Pista ({durationMin} min)</span>
          <span className="font-mono text-[13px] text-[#dfe2ef] font-semibold">
            ${courtPrice.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between text-[13px] text-[#bbcabf]">
          <span className="flex items-center gap-1">
            Luz LED Pro Torneo
            <span className="material-symbols-outlined text-[14px] text-[#7bd0ff]">
              bolt
            </span>
          </span>
          <span className="font-mono text-[13px] text-[#dfe2ef] font-semibold">
            ${lightingPrice.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2 mt-1 bg-[#31353f]/40 px-2.5 py-2 rounded-lg border border-white/5">
          <div className="flex flex-col">
            <span className="text-[15px] font-bold text-[#dfe2ef]">
              Total a Pagar
            </span>
            <span className="text-[12px] text-[#4edea3]">
              Dividir pago disponible al instante
            </span>
          </div>
          <span className="font-mono text-[24px] text-[#4edea3] font-bold tracking-tight">
            ${totalPrice.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Team Note Input */}
      <div className="flex flex-col gap-1">
        <label
          className="text-[11px] font-bold uppercase tracking-wider text-[#bbcabf] flex items-center justify-between"
          htmlFor="team-note"
        >
          <span>Nombre de equipo o nota al club</span>
          <span className="text-[#86948a] lowercase font-normal">(opcional)</span>
        </label>
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-[#86948a] text-[18px]">
            group
          </span>
          <input
            id="team-note"
            type="text"
            value={teamNote}
            onChange={(e) => setTeamNote(e.target.value)}
            placeholder="Ej. Pareja García / Los Galácticos"
            className="w-full bg-[#0a0e17] text-[#dfe2ef] text-[14px] rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#4edea3] placeholder:text-[#86948a] border border-[#3c4a42]/50"
          />
        </div>
      </div>

      {/* Checkout Button */}
      <button
        onClick={() => onConfirmBooking(teamNote)}
        disabled={isSubmitting}
        className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#10b981] via-[#4edea3] to-[#45dfa4] text-[#003824] text-[16px] font-extrabold flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(16,185,129,0.35)] active:scale-95 transition-all cursor-pointer hover:brightness-105"
        type="button"
      >
        {isSubmitting ? (
          <>
            <span className="material-symbols-outlined animate-spin text-[20px]">
              sync
            </span>
            <span>Bloqueando Turno...</span>
          </>
        ) : (
          <>
            <span>Continuar a Confirmación</span>
            <span className="material-symbols-outlined text-[20px]">
              arrow_forward
            </span>
          </>
        )}
      </button>
    </section>
  );
};
