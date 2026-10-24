import React, { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { getAvailableSlots, createBookingInDb, getStoredProfile, getStoredCourts, getStoredClubSettings } from '../apiService';

export interface BookingGridProps {
  courtId?: string;
  onBookingSuccess?: () => void;
  whatsappPhone?: string;
}

export const BookingGrid: React.FC<BookingGridProps> = ({
  courtId = 'court-1',
  onBookingSuccess,
  whatsappPhone = getStoredClubSettings().whatsapp_phone,
}) => {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingInProgress, setBookingInProgress] = useState<string | null>(null);

  const fetchSlots = useCallback(async () => {
    setLoading(true);

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.rpc('get_available_slots', {
          p_court_id: courtId,
          p_date: selectedDate,
          p_slot_duration_minutes: 90,
        });

        if (!error && data && data.length > 0) {
          setSlots(data);
          setLoading(false);
          return;
        }
      }

      // Seamless fallback to local get_available_slots implementation
      const localSlots = getAvailableSlots(courtId, selectedDate, 90);
      const mapped = localSlots.map((s) => ({
        slot_start: `${selectedDate}T${s.slot_start}:00Z`,
        slot_end: `${selectedDate}T${s.slot_end}:00Z`,
        start_time: s.slot_start,
        end_time: s.slot_end,
        is_available: s.is_available,
        price: s.price,
      }));
      setSlots(mapped);
    } catch (err) {
      console.warn('Error fetching slots, using local slot generator', err);
      const localSlots = getAvailableSlots(courtId, selectedDate, 90);
      setSlots(
        localSlots.map((s) => ({
          slot_start: `${selectedDate}T${s.slot_start}:00Z`,
          slot_end: `${selectedDate}T${s.slot_end}:00Z`,
          start_time: s.slot_start,
          end_time: s.slot_end,
          is_available: s.is_available,
          price: s.price,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [courtId, selectedDate]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const handleBooking = async (slot: any) => {
    setBookingInProgress(slot.slot_start);

    try {
      const user = getStoredProfile();
      const courts = getStoredCourts();
      const activeCourt = courts.find((c) => c.id === courtId) || courts[0];

      const timeStr = `${new Date(slot.slot_start).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`;

      if (isSupabaseConfigured) {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          await supabase.from('bookings').insert({
            court_id: courtId,
            user_id: authData.user.id,
            start_time: slot.slot_start,
            end_time: slot.slot_end,
            total_price: activeCourt.rate_for_90m || 28.0,
            status: 'pending_payment',
          });
        }
      }

      // Record in local persistent storage
      await createBookingInDb({
        court: activeCourt,
        dateLabel: selectedDate === new Date().toISOString().split('T')[0] ? 'HOY' : selectedDate,
        dateFull: `Fecha: ${selectedDate}`,
        timeSlot: `${new Date(slot.slot_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(slot.slot_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        durationMin: 90,
        totalPrice: activeCourt.rate_for_90m || 28.0,
        courtPrice: activeCourt.rate_for_90m || 28.0,
        lightingPrice: 0,
        teamNotes: 'Reserva vía BookingGrid',
        user,
      });

      // Disparar mensaje con deep link a WhatsApp para reportar comprobante
      const text = encodeURIComponent(
        `Hola! Acabo de reservar en Padel Assist para el horario ${timeStr}. Adjunto comprobante.`
      );
      window.open(`https://wa.me/${whatsappPhone}?text=${text}`, '_blank');

      if (onBookingSuccess) {
        onBookingSuccess();
      }

      await fetchSlots();
    } catch (err) {
      console.error('Error during booking', err);
    } finally {
      setBookingInProgress(null);
    }
  };

  // Quick date presets for mobile touch ergonomics
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

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

      {loading ? (
        <div className="text-center py-10 text-zinc-400 text-sm flex flex-col items-center justify-center gap-2">
          <span className="material-symbols-outlined animate-spin text-emerald-400 text-[24px]">
            sync
          </span>
          <span>Verificando canchas...</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {slots.map((s, idx) => {
            const startDate = new Date(s.slot_start);
            const endDate = new Date(s.slot_end);
            const timeStr = `${startDate.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })} - ${endDate.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}`;

            const isBookingThis = bookingInProgress === s.slot_start;

            return (
              <button
                key={idx}
                disabled={!s.is_available || isBookingThis}
                onClick={() => handleBooking(s)}
                className={`py-3 px-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
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
                  <span>{timeStr}</span>
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
          Turno bloqueado en WhatsApp
        </span>
        <span className="text-zinc-500">Auto-comprobante</span>
      </div>
    </div>
  );
};

export const BookingCalendar = BookingGrid;
