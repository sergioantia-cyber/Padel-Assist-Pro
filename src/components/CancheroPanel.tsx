import React, { useState, useRef, useEffect } from 'react';
import { Booking, Court } from '../types';
import { getClubTodayDateStr, getStoredClubSettings } from '../apiService';

interface CancheroPanelProps {
  bookings: Booking[];
  courts: Court[];
  onConfirmPendingPayment: (bookingId: string) => void;
  onBlockSlot: (params: {
    courtId: string;
    courtName: string;
    dateStr: string;
    timeSlot: string;
    reason: string;
  }) => void;
}

export const CancheroPanel: React.FC<CancheroPanelProps> = ({
  bookings,
  courts,
  onConfirmPendingPayment,
  onBlockSlot,
}) => {
  const todayStr = getClubTodayDateStr();
  const pendingBookings = bookings.filter((b) => b.status === 'pending_payment' && !b.is_block);
  const upcomingBookings = bookings.filter(
    (b) => (b.status === 'pending_payment' || b.status === 'confirmed') && !b.is_block
  );

  const [selectedBookingId, setSelectedBookingId] = useState<string>(
    pendingBookings[0]?.id || upcomingBookings[0]?.id || ''
  );
  const [isPaid, setIsPaid] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);

  const [selectedCourtId, setSelectedCourtId] = useState(courts[0]?.id || '');
  const [selectedBlockDate, setSelectedBlockDate] = useState(todayStr);
  const [selectedBlockSlot, setSelectedBlockSlot] = useState('16:30 - 18:00');
  const [selectedReason, setSelectedReason] = useState('🔧 Mantenimiento / Cepillado de Césped');

  const activeBooking =
    bookings.find((b) => b.id === selectedBookingId) ||
    pendingBookings[0] ||
    upcomingBookings[0] ||
    null;

  useEffect(() => {
    setIsPaid(activeBooking?.status === 'confirmed');
    setSliderPosition(0);
  }, [activeBooking?.id, activeBooking?.status]);

  // Real statistics calculated from bookings & courts
  const todayActiveBookings = bookings.filter(
    (b) =>
      (b.date_iso === todayStr || b.date_label === 'HOY') &&
      (b.status === 'confirmed' || b.status === 'pending_payment') &&
      !b.is_block
  );
  const todayRevenue = bookings
    .filter(
      (b) =>
        (b.date_iso === todayStr || b.date_label === 'HOY') &&
        b.status === 'confirmed' &&
        !b.is_block
    )
    .reduce((acc, b) => acc + Number(b.total_price || 0), 0);
  const activeCourtsCount = courts.filter((c) => c.is_active).length;

  // Swipe slider state
  const [sliderPosition, setSliderPosition] = useState(0);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isPaid || !activeBooking) return;
    isDragging.current = true;
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || isPaid || !trackRef.current || !activeBooking) return;
    const maxDist = trackRef.current.clientWidth - 56;
    const delta = Math.max(0, Math.min(e.clientX - startX.current, maxDist));
    setSliderPosition(delta);

    if (delta >= maxDist - 6) {
      isDragging.current = false;
      setIsPaid(true);
      setSliderPosition(maxDist);
      onConfirmPendingPayment(activeBooking.id);
    }
  };

  const handlePointerUp = () => {
    if (isPaid) return;
    isDragging.current = false;
    setSliderPosition(0);
  };

  const handleDirectClickConfirm = () => {
    if (!isPaid && trackRef.current && activeBooking) {
      const maxDist = trackRef.current.clientWidth - 56;
      setSliderPosition(maxDist);
      setIsPaid(true);
      onConfirmPendingPayment(activeBooking.id);
    }
  };

  const handleQuickCall = () => {
    const phone =
      activeBooking?.player_phone ||
      activeBooking?.guest_phone ||
      getStoredClubSettings().whatsapp_phone;
    const clean = phone.replace(/[^\d+]/g, '');
    if (clean) {
      window.location.href = `tel:${clean}`;
    }
  };

  const handleQuickWhatsApp = () => {
    const rawPhone =
      activeBooking?.player_phone ||
      activeBooking?.guest_phone ||
      getStoredClubSettings().whatsapp_phone;
    const clean = rawPhone.replace(/\D/g, '');
    const msg = activeBooking
      ? `¡Hola ${activeBooking.user_name}! Te escribimos desde ${getStoredClubSettings().club_name} por tu turno en ${activeBooking.court_name} (${activeBooking.start_time} - ${activeBooking.end_time}).`
      : `Hola, te escribimos desde ${getStoredClubSettings().club_name}.`;
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleConfirmBlock = () => {
    const targetCourt = courts.find((c) => c.id === selectedCourtId) || courts[0];
    if (!targetCourt) return;

    onBlockSlot({
      courtId: targetCourt.id,
      courtName: targetCourt.name,
      dateStr: selectedBlockDate,
      timeSlot: selectedBlockSlot,
      reason: selectedReason,
    });
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
            En Turno ({pendingBookings.length} pend.)
          </span>
        </div>
        <p className="text-[12px] text-[#bbcabf] mt-1">
          Supervisión en tiempo real de pistas, cobros en mostrador y bloqueos inmediatos.
        </p>
      </div>

      {/* Selector if multiple upcoming bookings exist */}
      {upcomingBookings.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {upcomingBookings.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setSelectedBookingId(b.id)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                activeBooking?.id === b.id
                  ? 'bg-[#10b981] text-[#00422b] border-[#10b981]'
                  : 'bg-[#1c1f29] text-[#bbcabf] border-[#31353f]'
              }`}
            >
              {b.start_time} • {b.user_name} ({b.status === 'pending_payment' ? 'Pendiente' : 'Pagado'})
            </button>
          ))}
        </div>
      )}

      {/* Active Turn / Pending Payment Card */}
      {activeBooking ? (
        <div className="flex flex-col gap-3 p-4 rounded-xl bg-[#1c1f29]/90 backdrop-blur-md shadow-xl border border-[#31353f]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  activeBooking.status === 'pending_payment' ? 'bg-amber-400' : 'bg-[#4edea3]'
                }`}
              ></span>
              <span className="text-[11px] font-bold text-[#7bd0ff] uppercase">
                {activeBooking.status === 'pending_payment'
                  ? 'Pago Pendiente de Validar'
                  : 'Turno Confirmado'}
              </span>
            </div>
            <span className="font-mono text-[14px] text-[#bbcabf] font-semibold">
              {activeBooking.date_label} • {activeBooking.start_time} - {activeBooking.end_time}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[20px] font-extrabold text-[#dfe2ef] tracking-tight">
                  {activeBooking.court_name}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#31353f] text-[#4edea3]">
                  {activeBooking.court_type}
                </span>
              </div>
              <p className="text-[14px] text-[#dfe2ef] font-medium mt-0.5">
                {activeBooking.user_name}
              </p>
              <p className="text-[12px] text-[#bbcabf]">
                Importe del turno:{' '}
                <span className="text-[#4edea3] font-bold">
                  ${activeBooking.total_price.toFixed(2)}
                </span>
                {activeBooking.payment_proof_url ? ' • Comprobante adjunto' : ''}
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
              onClick={handleQuickCall}
              className="py-2.5 px-3 rounded-lg bg-[#31353f] flex items-center justify-center gap-1.5 text-[#dfe2ef] hover:bg-[#353943] active:scale-95 transition-all cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-[#4edea3]">
                call
              </span>
              <span className="text-[12px] font-semibold">Llamar Jugador</span>
            </button>
            <button
              onClick={handleQuickWhatsApp}
              className="py-2.5 px-3 rounded-lg bg-[#31353f] flex items-center justify-center gap-1.5 text-[#dfe2ef] hover:bg-[#353943] active:scale-95 transition-all cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-[#4edea3]">
                chat
              </span>
              <span className="text-[12px] font-semibold">WhatsApp Jugador</span>
            </button>
          </div>

          {/* Swipe / Interactive Slider to Confirm Payment */}
          {activeBooking.status === 'pending_payment' && (
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
                  {isPaid ? '¡Pago Validado con Éxito!' : 'Desliza o Toca para Confirmar Pago'}
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
          )}
        </div>
      ) : (
        <div className="p-5 rounded-xl bg-[#1c1f29]/90 border border-[#31353f] text-center">
          <p className="text-sm font-bold text-[#dfe2ef]">
            No hay cobros pendientes en este momento
          </p>
          <p className="text-xs text-[#bbcabf] mt-1">
            Las nuevas reservas de los jugadores aparecerán aquí en tiempo real.
          </p>
        </div>
      )}

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

        {/* Real Day Stats for Manager */}
        <div className="grid grid-cols-3 gap-2 mt-1">
          <div className="p-2.5 rounded-xl bg-[#1c1f29]/70 text-center flex flex-col border border-[#31353f]/40">
            <span className="font-mono text-[20px] font-bold text-[#4edea3]">
              {todayActiveBookings.length}
            </span>
            <span className="text-[11px] font-bold text-[#bbcabf] uppercase mt-0.5">
              Turnos Hoy
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#1c1f29]/70 text-center flex flex-col border border-[#31353f]/40">
            <span className="font-mono text-[20px] font-bold text-[#68fcbf]">
              ${todayRevenue.toFixed(0)}
            </span>
            <span className="text-[11px] font-bold text-[#bbcabf] uppercase mt-0.5">
              Caja Día
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#1c1f29]/70 text-center flex flex-col border border-[#31353f]/40">
            <span className="font-mono text-[20px] font-bold text-[#7bd0ff]">
              {activeCourtsCount}/{courts.length}
            </span>
            <span className="text-[11px] font-bold text-[#bbcabf] uppercase mt-0.5">
              Pistas Activas
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
                Bloqueo Oficial de Cancha
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
                {courts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCourtId(c.id)}
                    className={`py-2 px-2 rounded-lg text-[12px] font-semibold transition-colors cursor-pointer truncate ${
                      selectedCourtId === c.id
                        ? 'bg-[#10b981] text-[#00422b] font-bold'
                        : 'bg-[#1c1f29] text-[#dfe2ef] hover:bg-[#353943]'
                    }`}
                    type="button"
                  >
                    {c.court_number_label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#bbcabf] block mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    min={todayStr}
                    value={selectedBlockDate}
                    onChange={(e) => setSelectedBlockDate(e.target.value)}
                    className="w-full bg-[#1c1f29] border border-[#31353f] rounded-lg px-2.5 py-2 text-xs text-[#dfe2ef]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#bbcabf] block mb-1">
                    Franja Horaria
                  </label>
                  <select
                    value={selectedBlockSlot}
                    onChange={(e) => setSelectedBlockSlot(e.target.value)}
                    className="w-full bg-[#1c1f29] border border-[#31353f] rounded-lg px-2.5 py-2 text-xs text-[#dfe2ef]"
                  >
                    <option value="07:00 - 08:30">07:00 - 08:30</option>
                    <option value="08:30 - 10:00">08:30 - 10:00</option>
                    <option value="10:00 - 11:30">10:00 - 11:30</option>
                    <option value="15:00 - 16:30">15:00 - 16:30</option>
                    <option value="16:30 - 18:00">16:30 - 18:00</option>
                    <option value="18:00 - 19:30">18:00 - 19:30</option>
                    <option value="19:30 - 21:00">19:30 - 21:00</option>
                    <option value="21:00 - 22:30">21:00 - 22:30</option>
                  </select>
                </div>
              </div>

              <label className="text-[11px] font-bold uppercase tracking-wider text-[#bbcabf] mt-1">
                Motivo del Bloqueo
              </label>
              <div className="flex flex-col gap-2">
                {[
                  '🔧 Mantenimiento / Cepillado de Césped',
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
