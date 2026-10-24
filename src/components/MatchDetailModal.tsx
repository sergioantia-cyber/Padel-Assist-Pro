import React from 'react';
import { Booking } from '../types';

interface MatchDetailModalProps {
  booking: Booking | null;
  onClose: () => void;
  onInvite: (booking: Booking) => void;
}

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({
  booking,
  onClose,
  onInvite,
}) => {
  if (!booking) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f131c]/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md p-5 rounded-2xl bg-[#262a34] shadow-2xl flex flex-col gap-4 border border-[#3c4a42] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#4edea3] text-[22px]">
              receipt_long
            </span>
            <h3 className="text-[18px] font-bold text-[#dfe2ef]">
              Detalle del Partido
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#bbcabf] hover:text-[#dfe2ef] cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Court image and name */}
        <div className="relative w-full h-28 rounded-xl overflow-hidden bg-[#0a0e17]">
          <img
            alt={booking.court_name}
            src={booking.court_image}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1c1f29] via-transparent to-transparent"></div>
          <span className="absolute bottom-2 left-2.5 px-2 py-0.5 rounded-full bg-[#0a0e17]/80 text-[#4edea3] font-mono text-[11px] font-bold">
            {booking.court_name}
          </span>
        </div>

        {/* Information Table */}
        <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-[#1c1f29] border border-white/5 text-[13px]">
          <div className="flex justify-between items-center">
            <span className="text-[#bbcabf]">Fecha:</span>
            <span className="text-[#dfe2ef] font-semibold">{booking.date_full}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#bbcabf]">Horario:</span>
            <span className="text-[#dfe2ef] font-mono font-semibold">
              {booking.start_time} - {booking.end_time} ({booking.duration_min} min)
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#bbcabf]">Estado:</span>
            <span className="text-[#4edea3] font-bold uppercase text-[11px] px-2 py-0.5 rounded-full bg-[#4edea3]/20">
              {booking.status === 'confirmed'
                ? 'Confirmado y Pagado'
                : booking.status === 'pending_payment'
                ? 'Esperando Pago'
                : booking.status === 'completed'
                ? 'Completado'
                : 'Cancelado'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#bbcabf]">Total de la pista:</span>
            <span className="text-[#4edea3] font-mono font-bold text-[16px]">
              ${booking.total_price.toFixed(2)}
            </span>
          </div>
          {booking.notes && (
            <div className="flex flex-col pt-2 border-t border-[#31353f]">
              <span className="text-[#bbcabf]">Nota / Equipo:</span>
              <span className="text-[#dfe2ef] font-medium">{booking.notes}</span>
            </div>
          )}
        </div>

        {/* Players List */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-[#bbcabf] uppercase tracking-wider">
              Alineación de Jugadores ({booking.players.length}/{booking.max_players})
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {booking.players.map((pl, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2 rounded-lg bg-[#1c1f29] border border-white/5"
              >
                {pl.avatar ? (
                  <img
                    alt={pl.name}
                    src={pl.avatar}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#10b981] text-[#00422b] font-bold text-xs flex items-center justify-center">
                    {pl.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-[#dfe2ef] truncate">
                    {pl.name}
                  </p>
                  <p className="text-[10px] text-[#4edea3]">
                    {pl.is_captain ? 'Capitán' : 'Confirmado'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={() => {
            onInvite(booking);
            onClose();
          }}
          className="w-full py-2.5 rounded-xl bg-[#4edea3] text-[#003824] text-[13px] font-bold active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#6ffbbe]"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">share</span>
          <span>Compartir Enlace de Invitación</span>
        </button>
      </div>
    </div>
  );
};
