import React, { useState, useMemo, useEffect } from 'react';
import { Court, UserProfile, AvailableSlotResult } from '../types';
import { CalendarStrip, CalendarDay } from '../components/CalendarStrip';
import { DurationSwitcher } from '../components/DurationSwitcher';
import { TimeSlotGrid } from '../components/TimeSlotGrid';
import { BookingSummarySheet } from '../components/BookingSummarySheet';
import { BookingGrid } from '../components/BookingCalendar';
import { getAvailableSlots } from '../apiService';

interface ReservarScreenProps {
  user: UserProfile;
  courts: Court[];
  selectedCourtId: string;
  onCourtChange: (courtId: string) => void;
  onBookingConfirmed: (data: {
    court: Court;
    dateLabel: string;
    dateFull: string;
    timeSlot: string;
    durationMin: number;
    totalPrice: number;
    courtPrice: number;
    lightingPrice: number;
    teamNotes: string;
  }) => void;
  onQuickBookingSuccess?: () => void;
}

export const ReservarScreen: React.FC<ReservarScreenProps> = ({
  courts,
  selectedCourtId,
  onCourtChange,
  onBookingConfirmed,
  onQuickBookingSuccess,
}) => {
  const [viewMode, setViewMode] = useState<'agenda' | 'chips'>('agenda');
  const [selectedDate, setSelectedDate] = useState('2024-10-14');
  const [selectedDateLabel, setSelectedDateLabel] = useState('Hoy');
  const [selectedDateFull, setSelectedDateFull] = useState('Lunes 14 de Octubre');
  const [duration, setDuration] = useState(90);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('18:00 - 19:30');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeCourt = courts.find((c) => c.id === selectedCourtId) || courts[0];

  // Dynamic slot generation driven by stored procedure get_available_slots logic
  const availableSlots = useMemo(() => {
    return getAvailableSlots(activeCourt.id, selectedDate, duration);
  }, [activeCourt.id, selectedDate, duration]);

  // Ensure selected slot stays valid when court, date, or duration changes
  useEffect(() => {
    const isCurrentSlotValid = availableSlots.some(
      (s) => s.time_range === selectedTimeSlot && s.is_available
    );
    if (!isCurrentSlotValid) {
      const firstFree = availableSlots.find((s) => s.is_available);
      if (firstFree) {
        setSelectedTimeSlot(firstFree.time_range);
      }
    }
  }, [availableSlots, selectedTimeSlot]);

  // Pricing calculations
  const baseCourtPrice =
    duration === 60 ? 18.0 : duration === 90 ? 24.0 : 32.0;
  const isNightSlot =
    selectedTimeSlot.includes('18:00') ||
    selectedTimeSlot.includes('19:30') ||
    selectedTimeSlot.includes('21:00') ||
    selectedTimeSlot.includes('22:30');
  const lightingPrice = isNightSlot ? 4.0 : 0.0;
  const totalPrice = baseCourtPrice + lightingPrice;

  const handleSelectDate = (day: CalendarDay) => {
    setSelectedDate(day.dateStr);
    setSelectedDateLabel(day.isToday ? 'Hoy' : `${day.dayName} ${day.dayNumber}`);
    setSelectedDateFull(day.fullDateText);
  };

  const handleSelectSlot = (slot: AvailableSlotResult) => {
    if (slot.is_available) {
      setSelectedTimeSlot(slot.time_range);
    }
  };

  const handleConfirmReservation = (teamNote: string) => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onBookingConfirmed({
        court: activeCourt,
        dateLabel: selectedDateLabel,
        dateFull: selectedDateFull,
        timeSlot: selectedTimeSlot,
        durationMin: duration,
        totalPrice,
        courtPrice: baseCourtPrice,
        lightingPrice,
        teamNotes: teamNote,
      });
    }, 900);
  };

  return (
    <div className="flex flex-col w-full gap-5 select-none">
      {/* View Switcher: Agenda vs Fast Chips */}
      <div className="flex items-center justify-between bg-[#161b26] p-1 rounded-xl border border-white/5">
        <button
          type="button"
          onClick={() => setViewMode('agenda')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            viewMode === 'agenda'
              ? 'bg-[#1f2637] text-white shadow-sm'
              : 'text-[#85958b] hover:text-[#dfe2ef]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">calendar_month</span>
          <span>Agenda Interactiva</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode('chips')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            viewMode === 'chips'
              ? 'bg-[#10b981] text-[#052e16] shadow-sm font-bold'
              : 'text-[#85958b] hover:text-[#dfe2ef]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">bolt</span>
          <span>Selector Rápido Chips</span>
          <span className="bg-emerald-950 text-emerald-300 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
            WhatsApp
          </span>
        </button>
      </div>

      {viewMode === 'chips' ? (
        <div className="flex flex-col gap-4">
          {/* Court Selector Segmented Pill */}
          <section className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#bbcabf]">
                Pista deportiva
              </span>
              <span className="text-[12px] text-[#45dfa4] flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">sports_tennis</span>
                {activeCourt.name}
              </span>
            </div>

            <div className="relative bg-[#0a0e17] p-1 rounded-xl flex items-center shadow-inner border border-white/5">
              {courts.map((court) => {
                const isSelected = court.id === activeCourt.id;
                return (
                  <button
                    key={court.id}
                    onClick={() => onCourtChange(court.id)}
                    className={`flex-1 py-2 text-center rounded-lg text-[13px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-[#1c1f29] text-[#dfe2ef] font-bold shadow-md'
                        : 'text-[#bbcabf] hover:text-[#dfe2ef] font-medium'
                    }`}
                    type="button"
                  >
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-[#4edea3] shadow-[0_0_8px_#4edea3]"></span>
                    )}
                    <span>
                      {court.court_number_label} {court.name.replace('Pista ', '')}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* BookingGrid Touch-optimized Chips Component */}
          <BookingGrid
            courtId={activeCourt.id}
            onBookingSuccess={onQuickBookingSuccess}
          />
        </div>
      ) : (
        <>
          {/* Weekly Calendar Horizon Carousel */}
          <CalendarStrip
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
          />

          {/* Court Selector Segmented Pill */}
          <section className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#bbcabf]">
                Pista deportiva
              </span>
              <span className="text-[12px] text-[#45dfa4] flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">
                  sports_tennis
                </span>
                Cristal WPT 12mm
              </span>
            </div>

            <div className="relative bg-[#0a0e17] p-1 rounded-xl flex items-center shadow-inner border border-white/5">
              {courts.map((court) => {
                const isSelected = court.id === activeCourt.id;
                return (
                  <button
                    key={court.id}
                    onClick={() => onCourtChange(court.id)}
                    className={`flex-1 py-2 text-center rounded-lg text-[13px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-[#1c1f29] text-[#dfe2ef] font-bold shadow-md'
                        : 'text-[#bbcabf] hover:text-[#dfe2ef] font-medium'
                    }`}
                    type="button"
                  >
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-[#4edea3] shadow-[0_0_8px_#4edea3]"></span>
                    )}
                    <span>
                      {court.court_number_label} {court.name.replace('Pista ', '')}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Duration Switcher */}
          <DurationSwitcher
            duration={duration}
            onChangeDuration={setDuration}
          />

          {/* Time Slots Grid (Dynamically populated from get_available_slots) */}
          <TimeSlotGrid
            slots={availableSlots}
            selectedSlotTime={selectedTimeSlot}
            onSelectSlot={handleSelectSlot}
          />

          {/* Pinned Bottom Sheet Drawer */}
          <BookingSummarySheet
            court={activeCourt}
            selectedDateText={selectedDateLabel}
            selectedDateFull={selectedDateFull}
            selectedTimeSlot={selectedTimeSlot}
            durationMin={duration}
            courtPrice={baseCourtPrice}
            lightingPrice={lightingPrice}
            totalPrice={totalPrice}
            onConfirmBooking={handleConfirmReservation}
            isSubmitting={isSubmitting}
          />
        </>
      )}
    </div>
  );
};
