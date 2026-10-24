import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchAvailableSlotsForCourt,
  createBookingInDb,
  getStoredProfile,
  getStoredCourts,
  getStoredClubSettings,
  getClubTodayDateStr,
  generateUpcomingCalendarDays,
} from '../apiService';
import { AvailableSlotResult } from '../types';

export interface BookingGridProps {
  courtId?: string;
  onBookingSuccess?: () => void;
  onRequireAuth?: () => void;
  whatsappPhone?: string;
}

export const BookingGrid: React.FC<BookingGridProps> = ({
  courtId = '00000000-0000-0000-0000-000000000001',
  onBookingSuccess,
  onRequireAuth,
  whatsappPhone,
}) => {
  const calendarDays = generateUpcomingCalendarDays(7);
  const todayStr = calendarDays[0]?.dateStr || getClubTodayDateStr();
  const tomorrowStr = calendarDays[1]?.dateStr || todayStr;

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [slots, setSlots] = useState<AvailableSlotResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingInProgress, setBookingInProgress] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const courts = getStoredCourts();
      const activeCourt = courts.find((c) => c.id === courtId) || courts[0];
      const available = await fetchAvailableSlotsForCourt(
        courtId,
        selectedDate,
        90,
        activeCourt
      );
      setSlots(available);
    } catch (err) {
      console.warn('Error fetching slots:', err);
    } finally {
      setLoading(false);
    }
  }, [courtId, selectedDate]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const handleBooking = async (slot: AvailableSlotResult) => {
    const user = getStoredProfile();
    if (!user.is_authenticated && onRequireAuth) {
      onRequireAuth();
      return;
    }

    setBookingInProgress(slot.time_range);
    setErrorMsg(null);

    try {
      const courts = getStoredCourts();
      const activeCourt = courts.find((c) => c.id === courtId) || courts[0];
      const clubPhone = whatsappPhone || getStoredClubSettings().whatsapp_phone;
      const dayMatch = calendarDays.find((d) => d.dateStr === selectedDate);

      const created = await createBookingInDb({
        court: activeCourt,
        dateIso: selectedDate,
        dateLabel: selectedDate === todayStr ? 'HOY' : dayMatch?.label || selectedDate,
        dateFull: dayMatch?.fullLabel || `Fecha: ${selectedDate}`,
        timeSlot: slot.time_range,
        durationMin: 90,
        teamNotes: 'Reserva rápida vía Selector Chips',
        user,
      });

      const cleanPhone = clubPhone.replace(/\D/g, '');
      const text = encodeURIComponent(
        `¡Hola! Acabo de reservar en ${getStoredClubSettings().club_name} la cancha *${activeCourt.name}* para el día *${selectedDate}* en el horario *${slot.time_range}* (Total: $${created.total_price.toFixed(2)}). Adjunto mi comprobante.`
      );
      window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');

      if (onBookingSuccess) {
        onBookingSuccess();
      }

      await fetchSlots();
    } catch (err: any) {
      setErrorMsg(err?.message || 'No se pudo completar la reserva.');
    } finally {
      setBookingInProgress(null);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-zinc-950 text-white rounded-2xl border border-zinc-800 shadow-xl select-none">
      {/* Header with Title and Native Date Picker */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-emerald-400 text-[20px]">
            calendar_clock
          </span>
          <h2 className="text-base font-bold text-emerald-400">
            Selecciona tu turno
          </h2>
        </div>
        <input
          type="date"
          min={todayStr}
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-zinc-800 text-xs p-2 rounded-lg border border-zinc-700 text-white focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
        />
      </div>

      {/* Quick Mobile Touch Date Chips */}
      <div className="flex items-center gap-1.5 mb-3.5">
        <button
          onClick={() => setSelectedDate(todayStr)}
          type="button"
          className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
            selectedDate === todayStr
              ? 'bg-emerald-500 text-zinc-950 shadow-sm'
              : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
          }`}
        >
          Hoy
        </button>
        <button
          onClick={() => setSelectedDate(tomorrowStr)}
          type="button"
          className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
            selectedDate === tomorrowStr
              ? 'bg-emerald-500 text-zinc-950 shadow-sm'
              : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
          }`}
        >
          Mañana
        </button>
        <span className="text-[10px] text-zinc-500 ml-auto font-mono">
          90 min • 07:00 a 23:00
        </span>
      </div>

      {errorMsg && (
        <div className="mb-3 p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-medium">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-zinc-400 text-sm flex flex-col items-center justify-center gap-2">
          <span className="material-symbols-outlined animate-spin text-emerald-400 text-[24px]">
            sync
          </span>
          <span>Verificando canchas en tiempo real...</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {slots.map((s, idx) => {
            const isBookingThis = bookingInProgress === s.time_range;

            return (
              <button
                key={idx}
                disabled={!s.is_available || isBookingThis}
                onClick={() => handleBooking(s)}
                className={`py-3 px-2 rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-95 ${
                  s.is_available
                    ? 'bg-zinc-900 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600 hover:text-white shadow-sm'
                    : 'bg-zinc-900/40 border border-zinc-800 text-zinc-600 cursor-not-allowed line-through'
                }`}
                type="button"
              >
                {isBookingThis ? (
                  <span className="material-symbols-outlined animate-spin text-[16px]">
                    sync
                  </span>
                ) : (
                  <>
                    <span>{s.time_range}</span>
                    <span className="text-[10px] opacity-80 font-mono">
                      ${s.price.toFixed(0)}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Info note */}
      <div className="mt-3.5 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          Turno sincronizado con el club
        </span>
        <span className="text-zinc-500">WhatsApp Directo</span>
      </div>
    </div>
  );
};

export const BookingCalendar = BookingGrid;
