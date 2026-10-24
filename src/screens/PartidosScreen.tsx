import React, { useState } from 'react';
import { Booking } from '../types';
import { PaymentDrawer } from '../components/PaymentDrawer';
import { CancelModal } from '../components/CancelModal';

interface PartidosScreenProps {
  bookings: Booking[];
  onUploadPaymentProof: (bookingId: string, proofUrl?: string) => void;
  onCancelBooking: (bookingId: string) => void;
  onInvitePlayers: (booking: Booking) => void;
  onCopyBankAlias: (alias: string) => void;
  onViewBookingDetails: (booking: Booking) => void;
}

export const PartidosScreen: React.FC<PartidosScreenProps> = ({
  bookings,
  onUploadPaymentProof,
  onCancelBooking,
  onInvitePlayers,
  onCopyBankAlias,
  onViewBookingDetails,
}) => {
  const [filterTab, setFilterTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const [activePaymentBooking, setActivePaymentBooking] = useState<Booking | null>(null);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);

  // Filter bookings according to active tab
  const upcomingBookings = bookings.filter(
    (b) => b.status === 'pending_payment' || b.status === 'confirmed'
  );
  const completedBookings = bookings.filter((b) => b.status === 'completed');
  const cancelledBookings = bookings.filter((b) => b.status === 'cancelled');

  const displayedBookings =
    filterTab === 'upcoming'
      ? upcomingBookings
      : filterTab === 'completed'
      ? completedBookings
      : cancelledBookings;

  return (
    <div className="flex flex-col w-full relative">
      {/* Control de Pestañas / Segmented Control */}
      <section aria-label="Filtro de partidos" className="w-full mb-4">
        <div className="grid grid-cols-3 p-1 rounded-xl bg-[#181b25] shadow-sm border border-[#31353f]/40">
          <button
            onClick={() => setFilterTab('upcoming')}
            className={`relative py-2.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
              filterTab === 'upcoming'
                ? 'text-[#003824] bg-[#4edea3] shadow-sm'
                : 'text-[#bbcabf] hover:text-[#dfe2ef]'
            }`}
            type="button"
          >
            <span className="truncate">Próximos</span>
            <span
              className={`px-1.5 py-0.5 rounded-full font-mono text-[11px] font-bold ${
                filterTab === 'upcoming'
                  ? 'bg-[#00422b] text-[#6ffbbe]'
                  : 'bg-[#262a34] text-[#bbcabf]'
              }`}
            >
              {upcomingBookings.length}
            </span>
          </button>

          <button
            onClick={() => setFilterTab('completed')}
            className={`py-2.5 px-2 rounded-lg text-[11px] font-bold transition-colors duration-200 flex items-center justify-center cursor-pointer ${
              filterTab === 'completed'
                ? 'text-[#003824] bg-[#4edea3] shadow-sm'
                : 'text-[#bbcabf] hover:text-[#dfe2ef]'
            }`}
            type="button"
          >
            <span className="truncate">Completados</span>
          </button>

          <button
            onClick={() => setFilterTab('cancelled')}
            className={`py-2.5 px-2 rounded-lg text-[11px] font-bold transition-colors duration-200 flex items-center justify-center cursor-pointer ${
              filterTab === 'cancelled'
                ? 'text-[#003824] bg-[#4edea3] shadow-sm'
                : 'text-[#bbcabf] hover:text-[#dfe2ef]'
            }`}
            type="button"
          >
            <span className="truncate">Cancelados</span>
          </button>
        </div>
      </section>

      {/* Main Container of Matches */}
      <div className="flex flex-col gap-5">
        {displayedBookings.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-[#1c1f29] border border-[#31353f] flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-[36px] text-[#86948a]">
              sports_tennis
            </span>
            <p className="text-[14px] text-[#dfe2ef] font-semibold">
              No tienes partidos en esta sección
            </p>
            <p className="text-[12px] text-[#bbcabf]">
              Reserva tu cancha o explora los turnos disponibles en el club.
            </p>
          </div>
        ) : (
          displayedBookings.map((booking, index) => {
            const isPending = booking.status === 'pending_payment';

            if (isPending) {
              return (
                <article
                  key={booking.id}
                  className="relative flex flex-col w-full rounded-xl bg-[#1c1f29] shadow-xl overflow-hidden border border-[#31353f]"
                >
                  {/* Decorative ambient glow */}
                  <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-[#4edea3]/10 blur-3xl pointer-events-none"></div>

                  {/* Countdown Header */}
                  <header className="relative px-3.5 py-2 bg-gradient-to-r from-[#00422b] to-[#262a34] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="material-symbols-outlined text-[#4edea3] text-[18px] shrink-0">
                        timer
                      </span>
                      <span className="text-[13px] text-[#4edea3] font-bold tracking-tight truncate">
                        {booking.countdown_text || 'Tu partido empieza pronto'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full bg-[#31353f]">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4edea3] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4edea3]"></span>
                      </span>
                      <span className="font-mono text-[11px] font-bold text-[#4edea3]">
                        {booking.date_label}
                      </span>
                    </div>
                  </header>

                  {/* Court Visual Banner */}
                  <div className="relative w-full h-36 bg-[#0a0e17] overflow-hidden">
                    <img
                      className="w-full h-full object-cover"
                      alt={booking.court_name}
                      src={booking.court_image}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1c1f29] via-[#1c1f29]/60 to-transparent"></div>
                    <div className="absolute bottom-3 left-3.5 right-3.5 flex items-end justify-between gap-2">
                      <div className="min-w-0">
                        <span className="px-2 py-0.5 rounded-full bg-[#0a0e17]/80 backdrop-blur-md text-[#4edea3] text-[10px] font-bold tracking-wider uppercase inline-block mb-1">
                          {booking.court_type}
                        </span>
                        <h2 className="text-[20px] font-bold text-[#dfe2ef] truncate leading-tight">
                          {booking.court_name}
                        </h2>
                      </div>
                      <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#00bd85]/20 text-[#45dfa4] text-[11px] font-bold shadow-sm border border-[#00bd85]/30">
                        <span className="w-2 h-2 rounded-full bg-[#45dfa4] animate-pulse"></span>
                        Esperando Pago
                      </span>
                    </div>
                  </div>

                  {/* Metadata and Financials */}
                  <div className="p-3.5 flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-[#181b25] border border-white/5">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-bold text-[#bbcabf] flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">
                            schedule
                          </span>{' '}
                          Horario
                        </span>
                        <span className="font-mono text-[15px] text-[#dfe2ef] font-bold truncate mt-0.5">
                          {booking.start_time} - {booking.end_time}
                        </span>
                        <span className="text-[12px] text-[#bbcabf]">
                          Duración: {booking.duration_min} min
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0 text-right">
                        <span className="text-[11px] font-bold text-[#bbcabf] flex items-center justify-end gap-1">
                          <span className="material-symbols-outlined text-[14px]">
                            payments
                          </span>{' '}
                          Saldo Pendiente
                        </span>
                        <span className="font-mono text-[20px] text-[#45dfa4] font-extrabold truncate mt-0.5">
                          ${booking.total_price.toFixed(2)}
                        </span>
                        <span className="text-[12px] text-[#bbcabf]">
                          {booking.payment_method || 'Transferencia directa'}
                        </span>
                      </div>
                    </div>

                    {/* Quick CTAs */}
                    <div className="flex flex-col gap-2 pt-0.5">
                      <button
                        onClick={() => setActivePaymentBooking(booking)}
                        className="w-full py-3 px-3.5 rounded-xl bg-gradient-to-r from-[#10b981] to-[#00bd85] text-[#00422b] text-[15px] font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#10b981]/20 active:scale-[0.98] transition-transform cursor-pointer"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          upload_file
                        </span>
                        <span>Subir Comprobante de Pago</span>
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => onInvitePlayers(booking)}
                          className="py-2.5 px-2 rounded-xl bg-[#262a34] text-[#dfe2ef] hover:bg-[#353943] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 text-[11px] font-bold cursor-pointer border border-[#31353f]"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[18px] text-[#4edea3]">
                            share
                          </span>
                          <span>Invitar Jugadores</span>
                        </button>

                        <button
                          onClick={() => setCancellingBookingId(booking.id)}
                          className="py-2.5 px-2 rounded-xl bg-[#181b25] text-[#ffb4ab] hover:bg-[#93000a]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1 text-[11px] font-bold cursor-pointer border border-[#ffb4ab]/20"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            event_busy
                          </span>
                          <span>Cancelar Turno</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            }

            // Confirmed / Completed Match Card
            return (
              <article
                key={booking.id}
                className="relative flex flex-col w-full rounded-xl bg-[#1c1f29] shadow-lg overflow-hidden border border-[#31353f]"
              >
                <div className="p-3.5 flex flex-col gap-2.5">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="material-symbols-outlined text-[#4edea3] text-[16px]">
                          verified
                        </span>
                        <span className="text-[11px] font-bold text-[#4edea3] uppercase tracking-wider">
                          {booking.status === 'confirmed'
                            ? 'Confirmado & Pagado'
                            : 'Partido Finalizado'}
                        </span>
                      </div>
                      <h2 className="text-[18px] font-bold text-[#dfe2ef] truncate">
                        {booking.court_name}
                      </h2>
                      <div className="flex items-center gap-1.5 text-[#bbcabf] mt-0.5">
                        <span className="material-symbols-outlined text-[16px]">
                          calendar_month
                        </span>
                        <span className="font-mono text-[12px] text-[#dfe2ef]">
                          {booking.date_full}
                        </span>
                      </div>
                    </div>

                    <span className="p-2 rounded-xl bg-[#262a34] text-[#4edea3] flex items-center justify-center shrink-0 border border-white/5">
                      <span className="material-symbols-outlined text-[20px]">
                        sports_tennis
                      </span>
                    </span>
                  </div>

                  {/* Registered Players Slot */}
                  <div className="pt-2 mt-1 bg-[#181b25] rounded-xl p-2.5 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-[#bbcabf] tracking-wider uppercase">
                        Jugadores Confirmados ({booking.players.length}/{booking.max_players})
                      </span>
                      <span className="text-[12px] text-[#4edea3] font-semibold">
                        {booking.max_players - booking.players.length > 0
                          ? `${booking.max_players - booking.players.length} espacio libre`
                          : 'Equipo Completo'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      {/* Avatars */}
                      <div className="flex items-center -space-x-2 overflow-hidden py-1">
                        {booking.players.map((pl, pIdx) => (
                          <div key={pIdx} className="relative group">
                            {pl.avatar ? (
                              <img
                                className="w-10 h-10 rounded-full object-cover shadow-md border-2 border-[#181b25]"
                                alt={pl.name}
                                src={pl.avatar}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-[#10b981] text-[#00422b] font-bold flex items-center justify-center border-2 border-[#181b25] text-xs">
                                {pl.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            {pl.is_captain && (
                              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#4edea3] flex items-center justify-center border border-[#181b25]">
                                <span className="material-symbols-outlined text-[9px] text-[#003824] font-bold">
                                  star
                                </span>
                              </span>
                            )}
                          </div>
                        ))}

                        {/* Empty slot placeholder */}
                        {booking.players.length < booking.max_players && (
                          <div className="w-10 h-10 rounded-full bg-[#262a34] flex items-center justify-center shadow-inner border-2 border-[#181b25]">
                            <span className="material-symbols-outlined text-[#bbcabf] text-[18px]">
                              person_outline
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Invite Button */}
                      <button
                        onClick={() => onInvitePlayers(booking)}
                        className="py-1.5 px-3 rounded-full bg-[#4edea3]/10 hover:bg-[#4edea3]/20 text-[#4edea3] text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer border border-[#4edea3]/20"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          person_add
                        </span>
                        <span>+ Invitar</span>
                      </button>
                    </div>
                  </div>

                  {/* Informational Footer */}
                  <footer className="flex items-center justify-between text-[12px] text-[#bbcabf] pt-1 border-t border-[#31353f]/40">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-[#4edea3]">
                        pin_drop
                      </span>
                      <span className="truncate">{booking.location_label}</span>
                    </div>
                    <button
                      onClick={() => onViewBookingDetails(booking)}
                      className="text-[#4edea3] hover:underline text-[11px] font-bold flex items-center gap-0.5 cursor-pointer"
                      type="button"
                    >
                      <span>Ver Detalles</span>
                      <span className="material-symbols-outlined text-[14px]">
                        arrow_forward
                      </span>
                    </button>
                  </footer>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Payment Drawer Modal */}
      <PaymentDrawer
        isOpen={!!activePaymentBooking}
        booking={activePaymentBooking}
        onClose={() => setActivePaymentBooking(null)}
        onConfirmPayment={(proofUrl) => {
          if (activePaymentBooking) {
            onUploadPaymentProof(activePaymentBooking.id, proofUrl);
            setActivePaymentBooking(null);
          }
        }}
        onCopyAlias={onCopyBankAlias}
      />

      {/* Cancel Modal Dialog */}
      <CancelModal
        isOpen={!!cancellingBookingId}
        onClose={() => setCancellingBookingId(null)}
        onConfirmCancel={() => {
          if (cancellingBookingId) {
            onCancelBooking(cancellingBookingId);
            setCancellingBookingId(null);
          }
        }}
      />
    </div>
  );
};
