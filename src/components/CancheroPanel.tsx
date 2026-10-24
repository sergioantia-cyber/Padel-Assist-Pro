import React, { useState, useRef } from 'react';

interface CancheroPanelProps {
  onConfirmPendingPayment: () => void;
  onBlockSlot: (courtName: string, reason: string) => void;
  onQuickCall: () => void;
  onQuickWhatsApp: () => void;
}

export const CancheroPanel: React.FC<CancheroPanelProps> = ({
  onConfirmPendingPayment,
  onBlockSlot,
  onQuickCall,
  onQuickWhatsApp,
}) => {
  const [isPaid, setIsPaid] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState('Pista 1');
  const [selectedReason, setSelectedReason] = useState('🔧 Mantenimiento / Cepillado de Pelo');

  // Swipe slider state
  const [sliderPosition, setSliderPosition] = useState(0);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isPaid) return;
    isDragging.current = true;
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || isPaid || !trackRef.current) return;
    const maxDist = trackRef.current.clientWidth - 56;
    const delta = Math.max(0, Math.min(e.clientX - startX.current, maxDist));
    setSliderPosition(delta);

    if (delta >= maxDist - 6) {
      isDragging.current = false;
      setIsPaid(true);
      setSliderPosition(maxDist);
      onConfirmPendingPayment();
    }
  };

  const handlePointerUp = () => {
    if (isPaid) return;
    isDragging.current = false;
    setSliderPosition(0);
  };

  const handleDirectClickConfirm = () => {
    if (!isPaid && trackRef.current) {
      const maxDist = trackRef.current.clientWidth - 56;
      setSliderPosition(maxDist);
      setIsPaid(true);
      onConfirmPendingPayment();
    }
  };

  const handleConfirmBlock = () => {
    onBlockSlot(selectedCourt, selectedReason);
    setIsBlockModalOpen(false);
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
      {/* Admin Hero Banner */}
      <div className="relative p-4 rounded-xl bg-gradient-to-br from-[#262a34] to-[#1c1f29] overflow-hidden shadow-xl border border-[#31353f]">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-[#4edea3]/10 blur-2xl pointer-events-none"></div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#4edea3] text-[22px]">
              bolt
            </span>
            <span className="text-[18px] font-bold text-[#dfe2ef]">
              Panel Rápido Canchero
            </span>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#00bd85]/20 text-[#45dfa4] uppercase">
            En Turno
          </span>
        </div>
        <p className="text-[12px] text-[#bbcabf] mt-1">
          Supervisión en tiempo real de pistas, cobros en mostrador y bloqueos inmediatos.
        </p>
      </div>

      {/* Active Turn / Pending Payment Card */}
      <div className="flex flex-col gap-3 p-4 rounded-xl bg-[#1c1f29]/90 backdrop-blur-md shadow-xl border border-[#31353f]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#7bd0ff]"></span>
            <span className="text-[11px] font-bold text-[#7bd0ff] uppercase">
              Turno Entrante
            </span>
          </div>
          <span className="font-mono text-[14px] text-[#bbcabf] font-semibold">
            18:00 - 19:30
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[20px] font-extrabold text-[#dfe2ef] tracking-tight">
                Pista 1
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#31353f] text-[#4edea3]">
                Cristal Pro
              </span>
            </div>
            <p className="text-[14px] text-[#dfe2ef] font-medium mt-0.5">
              Carlos Mendoza
            </p>
            <p className="text-[12px] text-[#bbcabf]">
              4 Jugadores · Seña pendiente: <span className="text-[#4edea3] font-bold">$12.000</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-[#31353f] flex items-center justify-center text-[#dfe2ef] shrink-0 border border-white/5">
            <span className="material-symbols-outlined text-[26px] text-[#7bd0ff]">
              group
            </span>
          </div>
        </div>

        {/* Quick Contact Actions */}
        <div className="grid grid-cols-2 gap-2 mt-1">
          <button
            onClick={onQuickCall}
            className="py-2.5 px-3 rounded-lg bg-[#31353f] flex items-center justify-center gap-1.5 text-[#dfe2ef] hover:bg-[#353943] active:scale-95 transition-all cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-[#4edea3]">
              call
            </span>
            <span className="text-[12px] font-semibold">Llamar</span>
          </button>
          <button
            onClick={onQuickWhatsApp}
            className="py-2.5 px-3 rounded-lg bg-[#31353f] flex items-center justify-center gap-1.5 text-[#dfe2ef] hover:bg-[#353943] active:scale-95 transition-all cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-[#4edea3]">
              chat
            </span>
            <span className="text-[12px] font-semibold">WhatsApp</span>
          </button>
        </div>

        {/* Swipe / Interactive Slider to Confirm Payment */}
        <div className="mt-2 flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#bbcabf]">
            Validación de Turno en Mesa
          </span>
          <div
            ref={trackRef}
            onClick={handleDirectClickConfirm}
            className="relative w-full h-14 rounded-full bg-[#0a0e17] overflow-hidden flex items-center select-none shadow-inner border border-white/5 cursor-pointer"
          >
            <div
              className="absolute inset-y-0 left-0 bg-[#10b981]/30 transition-all duration-75"
              style={{ width: `${sliderPosition + 48}px` }}
            ></div>
            <div
              className={`w-full text-center text-[12px] font-bold uppercase tracking-wider pointer-events-none transition-colors ${
                isPaid ? 'text-[#4edea3]' : 'text-[#bbcabf]'
              }`}
            >
              {isPaid ? '¡Pago Validado con Éxito!' : 'Desliza para Confirmar Pago'}
            </div>

            {/* Slider Thumb */}
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className={`absolute left-1 top-1 bottom-1 w-12 rounded-full flex items-center justify-center shadow-lg transition-transform touch-none cursor-grab active:cursor-grabbing ${
                isPaid ? 'bg-[#4edea3] text-[#003824]' : 'bg-[#10b981] text-[#00422b]'
              }`}
              style={{ transform: `translateX(${sliderPosition}px)` }}
            >
              <span className="material-symbols-outlined text-[24px]">
                {isPaid ? 'check' : 'double_arrow'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Lock Slot Trigger */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => setIsBlockModalOpen(true)}
          className="w-full py-3.5 px-4 rounded-xl bg-[#262a34] hover:bg-[#353943] active:scale-[0.98] transition-all flex items-center justify-between shadow-md border border-[#31353f] cursor-pointer"
          type="button"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#93000a]/30 text-[#ffb4ab] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">
                lock_clock
              </span>
            </div>
            <div className="text-left">
              <h4 className="text-[14px] font-bold text-[#dfe2ef]">
                + Congelar / Bloquear Horario
              </h4>
              <p className="text-[12px] text-[#bbcabf]">
                Mantenimiento, lluvia o turno telefónico
              </p>
            </div>
          </div>
          <span className="material-symbols-outlined text-[#bbcabf] text-[20px]">
            chevron_right
          </span>
        </button>

        {/* Quick Day Stats for Manager */}
        <div className="grid grid-cols-3 gap-2 mt-1">
          <div className="p-2.5 rounded-xl bg-[#1c1f29]/70 text-center flex flex-col border border-[#31353f]/40">
            <span className="font-mono text-[20px] font-bold text-[#4edea3]">
              14/16
            </span>
            <span className="text-[11px] font-bold text-[#bbcabf] uppercase mt-0.5">
              Turnos Hoy
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#1c1f29]/70 text-center flex flex-col border border-[#31353f]/40">
            <span className="font-mono text-[20px] font-bold text-[#68fcbf]">
              $184k
            </span>
            <span className="text-[11px] font-bold text-[#bbcabf] uppercase mt-0.5">
              Caja Día
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#1c1f29]/70 text-center flex flex-col border border-[#31353f]/40">
            <span className="font-mono text-[20px] font-bold text-[#7bd0ff]">
              100%
            </span>
            <span className="text-[11px] font-bold text-[#bbcabf] uppercase mt-0.5">
              Luz Pistas
            </span>
          </div>
        </div>
      </div>

      {/* Modal: Block Slot */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0f131c]/80 backdrop-blur-md flex items-end justify-center p-3 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-[#262a34] p-5 shadow-2xl flex flex-col gap-3.5 border border-[#3c4a42]">
            <div className="w-10 h-1 bg-[#31353f] rounded-full mx-auto mb-1"></div>
            <div className="flex items-center justify-between">
              <h3 className="text-[18px] font-bold text-[#dfe2ef]">
                Bloqueo de Cancha
              </h3>
              <button
                onClick={() => setIsBlockModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#1c1f29] flex items-center justify-center text-[#bbcabf] hover:text-[#dfe2ef] cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#bbcabf]">
                Pista Destino
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['Pista 1', 'Pista 2', 'Pista 3'].map((pista) => (
                  <button
                    key={pista}
                    onClick={() => setSelectedCourt(pista)}
                    className={`py-2 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${
                      selectedCourt === pista
                        ? 'bg-[#10b981] text-[#00422b]'
                        : 'bg-[#1c1f29] text-[#dfe2ef] hover:bg-[#353943]'
                    }`}
                    type="button"
                  >
                    {pista}
                  </button>
                ))}
              </div>

              <label className="text-[11px] font-bold uppercase tracking-wider text-[#bbcabf] mt-2">
                Motivo del Bloqueo
              </label>
              <div className="flex flex-col gap-2">
                {[
                  '🔧 Mantenimiento / Cepillado de Pelo',
                  '🗣️ Turno Reservado por Teléfono / Mostrador',
                  '🌧️ Clima / Lluvia en Exterior',
                ].map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setSelectedReason(reason)}
                    className={`p-2.5 rounded-lg text-left text-[13px] flex items-center justify-between transition-colors cursor-pointer ${
                      selectedReason === reason
                        ? 'bg-[#1c1f29] text-[#dfe2ef] border border-[#4edea3]/50'
                        : 'bg-[#1c1f29] text-[#bbcabf] hover:text-[#dfe2ef]'
                    }`}
                    type="button"
                  >
                    <span>{reason}</span>
                    {selectedReason === reason && (
                      <span className="material-symbols-outlined text-[16px] text-[#4edea3]">
                        check
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleConfirmBlock}
              className="w-full py-3 rounded-xl bg-[#ffb4ab] text-[#690005] text-[15px] font-bold shadow-md active:scale-98 transition-all cursor-pointer mt-1 hover:brightness-105"
              type="button"
            >
              Confirmar Bloqueo Inmediato
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
