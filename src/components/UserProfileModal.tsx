import React, { useState } from 'react';
import { UserProfile } from '../types';
import { generateAndAssignAIRoutine } from '../apiService';

interface UserProfileModalProps {
  isOpen: boolean;
  user: UserProfile;
  onClose: () => void;
  onSwitchRole: () => void;
  onResetDb: () => void;
  onShowToast: (title: string, desc: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  user,
  onClose,
  onSwitchRole,
  onResetDb,
  onShowToast,
}) => {
  const [aiRoutine, setAiRoutine] = useState<string | null>(null);
  const [isGeneratingRoutine, setIsGeneratingRoutine] = useState(false);

  if (!isOpen) return null;

  const handleGenerateCoachRoutine = async () => {
    setIsGeneratingRoutine(true);
    try {
      const routine = await generateAndAssignAIRoutine(
        user.category || '5ª Categoría',
        'Panorámica Pro'
      );
      setAiRoutine(routine);
      onShowToast('¡Estrategia Lista!', 'Coach IA ha generado tu rutina táctica');
    } catch {
      onShowToast('Error', 'No se pudo generar la rutina');
    } finally {
      setIsGeneratingRoutine(false);
    }
  };

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
              account_circle
            </span>
            <h3 className="text-[18px] font-bold text-[#dfe2ef]">
              Perfil de Jugador
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

        {/* User Card */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-[#1c1f29] border border-[#31353f]">
          {user.avatar_url ? (
            <img
              alt={user.full_name}
              src={user.avatar_url}
              className="w-14 h-14 rounded-full object-cover shadow-md border-2 border-[#4edea3]"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[#10b981] text-[#00422b] font-bold text-xl flex items-center justify-center">
              {user.initials || 'MG'}
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <h4 className="text-[16px] font-bold text-[#dfe2ef] truncate">
              {user.full_name}
            </h4>
            <p className="text-[12px] text-[#bbcabf]">{user.phone}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#4edea3]/20 text-[#4edea3] uppercase">
                {user.category || 'Categoría 5ª'}
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#31353f] text-[#dfe2ef]">
                Rol: {user.role === 'club_admin' ? 'Canchero Admin' : 'Jugador'}
              </span>
            </div>
          </div>
        </div>

        {/* RLS Security Status Card */}
        <div className="p-3.5 rounded-xl bg-[#181b25] border border-[#31353f] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#4edea3] text-[18px]">
                security
              </span>
              <span className="text-[12px] font-bold text-[#dfe2ef]">
                Row Level Security (RLS) Activo
              </span>
            </div>
            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#4edea3] uppercase">
              Protegido
            </span>
          </div>
          <p className="text-[11px] text-[#bbcabf] leading-snug">
            Tus datos de reserva y teléfono están protegidos. Terceros solo ven el slot como ocupado sin acceder a tu identidad.
          </p>
        </div>

        {/* Coach IA Action */}
        <div className="p-3.5 rounded-xl bg-[#1c1f29] border border-[#4edea3]/30 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#4edea3] text-[20px]">
                psychology
              </span>
              <span className="text-[13px] font-bold text-[#dfe2ef]">
                Padel Coach IA
              </span>
            </div>
            <button
              onClick={handleGenerateCoachRoutine}
              disabled={isGeneratingRoutine}
              className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#4edea3] text-[#003824] hover:bg-[#6ffbbe] active:scale-95 transition-all cursor-pointer"
              type="button"
            >
              {isGeneratingRoutine ? 'Analizando...' : 'Generar Táctica'}
            </button>
          </div>
          {aiRoutine ? (
            <div className="p-2.5 rounded-lg bg-[#0a0e17] text-[12px] text-[#bbcabf] whitespace-pre-line leading-relaxed border border-white/5">
              {aiRoutine}
            </div>
          ) : (
            <p className="text-[11px] text-[#bbcabf]">
              Obtén una rutina de calentamiento y 2 tácticas personalizadas según tu categoría y tipo de cancha.
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            onClick={() => {
              onSwitchRole();
              onClose();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-[#31353f] hover:bg-[#353943] text-[#dfe2ef] text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-[#4edea3]">
              swap_horiz
            </span>
            <span>
              Cambiar a {user.role === 'club_admin' ? 'Vista Jugador' : 'Modo Canchero'}
            </span>
          </button>

          <button
            onClick={() => {
              onResetDb();
              onClose();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-[#1c1f29] hover:bg-[#31353f] text-[#ffb4ab] text-[13px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-[#ffb4ab]/20"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            <span>Reiniciar Datos de Prueba</span>
          </button>
        </div>
      </div>
    </div>
  );
};
