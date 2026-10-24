import React, { useMemo } from 'react';
import { generateUpcomingCalendarDays } from '../apiService';

export interface CalendarDay {
  dayNumber: number;
  dayName: string;
  isToday: boolean;
  statusLabel: string;
  statusType: 'available' | 'low' | 'high_demand' | 'full';
  dateStr: string;
  fullDateText: string;
  monthYearLabel?: string;
  weekLabel?: string;
}

interface CalendarStripProps {
  selectedDate: string;
  onSelectDate: (day: CalendarDay) => void;
}

export const CalendarStrip: React.FC<CalendarStripProps> = ({
  selectedDate,
  onSelectDate,
}) => {
  const days: CalendarDay[] = useMemo(() => {
    const generated = generateUpcomingCalendarDays(14);
    return generated.map((item, idx) => {
      const isWeekend = item.dayName === 'VIE' || item.dayName === 'SÁB';
      return {
        dayNumber: parseInt(item.dayNum, 10),
        dayName: item.dayName,
        isToday: item.isToday,
        statusLabel: item.isToday
          ? item.dayName
          : isWeekend
            ? 'Alta Dem.'
            : idx === 2
              ? 'Pocos'
              : 'Libre',
        statusType: isWeekend ? 'high_demand' : idx === 2 ? 'low' : 'available',
        dateStr: item.dateStr,
        fullDateText: item.fullLabel,
        monthYearLabel: item.monthYearLabel,
        weekLabel: item.weekLabel,
      };
    });
  }, []);

  const activeDay = days.find((d) => d.dateStr === selectedDate) || days[0];

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#4edea3] text-[20px]">
            calendar_month
          </span>
          <span className="text-[18px] font-bold text-[#dfe2ef]">
            {activeDay?.monthYearLabel || 'Calendario Oficial'}
          </span>
        </div>
        <span className="text-[11px] font-bold text-[#4edea3] bg-[#262a34] px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-[#31353f]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse"></span>
          {activeDay?.weekLabel || 'Semana Actual'}
        </span>
      </div>

      {/* Date Strip Slider */}
      <div
        className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none"
        id="date-scroller"
      >
        {days.map((day) => {
          const isSelected = selectedDate === day.dateStr;
          return (
            <button
              key={day.dateStr}
              onClick={() => onSelectDate(day)}
              className={`group flex flex-col items-center justify-center min-w-[64px] py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer ${
                isSelected
                  ? 'bg-[#10b981] text-[#00422b] shadow-[0_0_20px_rgba(16,185,129,0.35)]'
                  : 'bg-[#262a34] text-[#bbcabf] hover:text-[#dfe2ef] hover:bg-[#353943] border border-[#31353f]/40'
              }`}
              type="button"
            >
              <span
                className={`text-[11px] font-bold tracking-wider uppercase ${
                  isSelected ? 'opacity-90' : 'opacity-75'
                }`}
              >
                {day.isToday ? 'Hoy' : day.dayName}
              </span>
              <span
                className={`font-mono text-[22px] font-bold ${
                  isSelected ? 'text-[#00422b]' : 'text-[#dfe2ef]'
                }`}
              >
                {day.dayNumber}
              </span>
              <span
                className={`text-[12px] font-semibold ${
                  isSelected
                    ? 'opacity-90'
                    : day.statusType === 'full'
                      ? 'text-[#ffb4ab]'
                      : day.statusType === 'high_demand'
                        ? 'text-[#4edea3]'
                        : 'text-[#86948a]'
                }`}
              >
                {day.statusLabel}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
