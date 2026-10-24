import React from 'react';

interface DurationSwitcherProps {
  duration: number;
  onChangeDuration: (dur: number) => void;
}

export const DurationSwitcher: React.FC<DurationSwitcherProps> = ({
  duration,
  onChangeDuration,
}) => {
  return (
    <section className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-[#bbcabf]">
        Duración de la sesión
      </span>
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => onChangeDuration(60)}
          className={`py-2 px-3 rounded-lg text-center font-mono text-[16px] font-semibold active:scale-95 transition-all cursor-pointer ${
            duration === 60
              ? 'bg-[#31353f] text-[#4edea3] ring-1 ring-[#4edea3]'
              : 'bg-[#262a34] text-[#bbcabf] hover:text-[#dfe2ef]'
          }`}
          type="button"
        >
          60 min
        </button>

        <button
          onClick={() => onChangeDuration(90)}
          className={`relative py-2 px-3 rounded-lg text-center font-mono text-[16px] active:scale-95 transition-all flex flex-col items-center justify-center cursor-pointer ${
            duration === 90
              ? 'bg-[#31353f] text-[#dfe2ef] shadow-[inset_0_0_0_1px_rgba(78,222,163,0.4)]'
              : 'bg-[#262a34] text-[#bbcabf] hover:text-[#dfe2ef]'
          }`}
          type="button"
        >
          <span className="text-[#4edea3] font-bold">90 min</span>
          <span className="text-[9px] font-sans font-bold tracking-tight text-[#6ffbbe] uppercase leading-none mt-0.5">
            Recomendado
          </span>
        </button>

        <button
          onClick={() => onChangeDuration(120)}
          className={`py-2 px-3 rounded-lg text-center font-mono text-[16px] font-semibold active:scale-95 transition-all cursor-pointer ${
            duration === 120
              ? 'bg-[#31353f] text-[#4edea3] ring-1 ring-[#4edea3]'
              : 'bg-[#262a34] text-[#bbcabf] hover:text-[#dfe2ef]'
          }`}
          type="button"
        >
          120 min
        </button>
      </div>
    </section>
  );
};
