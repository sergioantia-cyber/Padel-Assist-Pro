import React from 'react';

interface MatchmakingBannerProps {
  onJoinMatch: () => void;
  isJoined?: boolean;
}

export const MatchmakingBanner: React.FC<MatchmakingBannerProps> = ({
  onJoinMatch,
  isJoined = false,
}) => {
  return (
    <aside className="relative overflow-hidden rounded-xl bg-[#262a34] shadow-xl p-3.5 border border-[#31353f]">
      <div className="absolute -right-10 -bottom-10 w-32 h-32 rounded-full bg-[#4edea3]/10 blur-2xl pointer-events-none"></div>
      <div className="flex items-start gap-3 relative z-10">
        <div className="w-10 h-10 rounded-lg bg-[#31353f] flex items-center justify-center shrink-0 shadow-sm text-[#4edea3]">
          <span
            className="material-symbols-outlined text-[22px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            group_add
          </span>
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#45dfa4]/15 text-[#45dfa4] uppercase tracking-wide">
              Match Abierto
            </span>
            <span className="text-[12px] font-semibold text-[#bbcabf] font-mono">
              • 20:00 hs
            </span>
          </div>
          <p className="text-[14px] text-[#dfe2ef] font-semibold leading-snug">
            ¿Buscas rival o 4to jugador?
          </p>
          <p className="text-[12px] text-[#bbcabf] mt-0.5">
            Falta 1 jugador de Categoría 5ª en Cancha Central. ¡Únete en un tap!
          </p>
          <div className="flex items-center justify-between mt-3 pt-2">
            <div className="flex items-center -space-x-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#10b981] text-[#00422b] text-[11px] font-bold border border-[#262a34]">
                FR
              </span>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#31353f] text-[#dfe2ef] text-[11px] font-bold border border-[#262a34]">
                AL
              </span>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#31353f] text-[#bbcabf] text-[11px] font-bold border border-[#262a34]">
                MC
              </span>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#353943] text-[#4edea3] text-[11px] font-bold border border-[#262a34]">
                {isJoined ? 'TÚ' : '+1'}
              </span>
            </div>

            <button
              onClick={onJoinMatch}
              disabled={isJoined}
              className={`px-3.5 py-1.5 rounded-full font-bold text-[11px] active:scale-95 transition-all shadow-md flex items-center gap-1 cursor-pointer ${
                isJoined
                  ? 'bg-[#10b981] text-[#00422b] opacity-90'
                  : 'bg-[#4edea3] text-[#003824] hover:bg-[#6ffbbe]'
              }`}
              type="button"
            >
              <span>{isJoined ? '¡Inscrito!' : 'Sumarme'}</span>
              <span className="material-symbols-outlined text-[16px]">
                {isJoined ? 'check' : 'arrow_forward'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
