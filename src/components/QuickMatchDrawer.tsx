import React from 'react';

interface QuickMatchDrawerProps {
  onAutoSlot: () => void;
}

export const QuickMatchDrawer: React.FC<QuickMatchDrawerProps> = ({ onAutoSlot }) => {
  return (
    <div className="rounded-xl bg-[#181b25] p-3.5 flex items-center justify-between shadow-sm border border-[#31353f]/50">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-[#4edea3]/10 flex items-center justify-center text-[#4edea3] shrink-0">
          <span className="material-symbols-outlined text-[18px]">bolt</span>
        </div>
        <div className="min-w-0">
          <p className="text-[12px] text-[#dfe2ef] font-semibold truncate">
            Reserva Relámpago
          </p>
          <p className="text-[11px] text-[#bbcabf] truncate">
            Asignar mejor pista y turno disponible
          </p>
        </div>
      </div>
      <button
        onClick={onAutoSlot}
        className="px-3 py-1.5 rounded-full bg-[#262a34] hover:bg-[#31353f] text-[#4edea3] text-[11px] font-bold transition-transform active:scale-95 shadow-sm shrink-0 cursor-pointer border border-[#4edea3]/20"
        type="button"
      >
        Auto-Slot
      </button>
    </div>
  );
};
