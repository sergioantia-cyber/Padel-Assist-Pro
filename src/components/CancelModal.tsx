import React from 'react';

interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmCancel: () => void;
}

export const CancelModal: React.FC<CancelModalProps> = ({
  isOpen,
  onClose,
  onConfirmCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f131c]/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="w-full max-w-sm p-5 rounded-2xl bg-[#262a34] shadow-2xl flex flex-col gap-3.5 border border-[#3c4a42]">
        <div className="w-12 h-12 rounded-full bg-[#93000a]/30 text-[#ffb4ab] flex items-center justify-center self-center">
          <span className="material-symbols-outlined text-[28px]">warning</span>
        </div>

        <div className="text-center flex flex-col gap-1">
          <h2 className="text-[18px] text-[#dfe2ef] font-bold">
            ¿Liberar este turno?
          </h2>
          <p className="text-[13px] text-[#bbcabf] leading-relaxed">
            Estás a tiempo de cancelar sin penalización. La pista quedará disponible para otros jugadores de la comunidad.
          </p>
        </div>

        <div className="flex flex-col gap-2 mt-1">
          <button
            onClick={onConfirmCancel}
            className="w-full py-2.5 rounded-xl bg-[#ffb4ab] text-[#690005] text-[14px] font-bold active:scale-95 transition-transform cursor-pointer"
            type="button"
          >
            Sí, Cancelar Turno
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#1c1f29] text-[#dfe2ef] hover:bg-[#353943] text-[14px] font-medium transition-colors cursor-pointer"
            type="button"
          >
            Mantener Reserva
          </button>
        </div>
      </div>
    </div>
  );
};
