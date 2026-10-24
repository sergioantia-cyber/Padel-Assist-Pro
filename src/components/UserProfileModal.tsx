import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { generateAndAssignAIRoutine } from '../apiService';

interface UserProfileModalProps {
  isOpen: boolean;
  user: UserProfile;
  onClose: () => void;
  onUpdateProfile: (updated: Partial<UserProfile>) => Promise<void>;
  onOpenAuthModal: () => void;
  onSignOut: () => void;
  onShowToast: (title: string, desc: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  user,
  onClose,
  onUpdateProfile,
  onOpenAuthModal,
  onSignOut,
  onShowToast,
}) => {
  const [aiRoutine, setAiRoutine] = useState<string | null>(null);
  const [isGeneratingRoutine, setIsGeneratingRoutine] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user.full_name);
  const [phone, setPhone] = useState(user.phone);
  const [category, setCategory] = useState(user.category || '5ª Categoría');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(user.full_name);
    setPhone(user.phone);
    setCategory(user.category || '5ª Categoría');
  }, [user]);

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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdateProfile({
        full_name: fullName.trim() || user.full_name,
        phone: phone.trim(),
        category,
      });
      setIsEditing(false);
      onShowToast('Perfil Actualizado', 'Tus datos se han guardado correctamente');
    } finally {
      setSaving(false);
    }
  };

  const isClubAdmin = user.role === 'club_admin' || user.role === 'superadmin';

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
              {user.initials || 'JG'}
            </div>
          )}
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-[16px] font-bold text-[#dfe2ef] truncate">
                {user.full_name}
              </h4>
              <button
                type="button"
                onClick={() => setIsEditing((prev) => !prev)}
                className="text-xs font-bold text-[#4edea3] hover:underline flex items-center gap-0.5 shrink-0"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                {isEditing ? 'Cancelar' : 'Editar'}
              </button>
            </div>
            <p className="text-[12px] text-[#bbcabf]">
              {user.phone || user.email || 'Sin teléfono registrado'}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#4edea3]/20 text-[#4edea3] uppercase">
                {user.category || '5ª Categoría'}
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#31353f] text-[#dfe2ef]">
                {user.is_authenticated
                  ? isClubAdmin
                    ? 'Admin Verificado'
                    : 'Cuenta Verificada'
                  : 'Modo Invitado'}
              </span>
            </div>
          </div>
        </div>

        {/* Edit Profile Form */}
        {isEditing && (
          <form
            onSubmit={handleSaveProfile}
            className="p-3.5 rounded-xl bg-[#181b25] border border-[#4edea3]/30 flex flex-col gap-3"
          >
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#bbcabf] block mb-1">
                Nombre Completo
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-[#0f131c] border border-[#31353f] rounded-lg px-3 py-2 text-xs text-[#dfe2ef] focus:outline-none focus:border-[#4edea3]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#bbcabf] block mb-1">
                  Teléfono WhatsApp
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+57 300 123 4567"
                  className="w-full bg-[#0f131c] border border-[#31353f] rounded-lg px-3 py-2 text-xs text-[#dfe2ef] focus:outline-none focus:border-[#4edea3]"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#bbcabf] block mb-1">
                  Categoría
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#0f131c] border border-[#31353f] rounded-lg px-2.5 py-2 text-xs text-[#dfe2ef] focus:outline-none focus:border-[#4edea3]"
                >
                  <option value="7ª Categoría">7ª Categoría</option>
                  <option value="6ª Categoría">6ª Categoría</option>
                  <option value="5ª Categoría">5ª Categoría</option>
                  <option value="4ª Categoría">4ª Categoría</option>
                  <option value="3ª Categoría">3ª Categoría</option>
                  <option value="2ª / 1ª Pro">2ª / 1ª Pro</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 rounded-lg bg-[#4edea3] text-[#003824] font-bold text-xs hover:bg-[#6ffbbe] transition-all"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </form>
        )}

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
            Tus datos de reserva y teléfono están protegidos. Terceros solo ven el horario ocupado sin acceder a tu identidad.
          </p>
        </div>

        {/* Coach IA Action (Server-Side /api/coach) */}
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

        {/* Auth & Admin Actions */}
        <div className="flex flex-col gap-2 pt-1">
          {!user.is_authenticated ? (
            <button
              onClick={() => {
                onClose();
                onOpenAuthModal();
              }}
              className="w-full py-3 px-3 rounded-xl bg-[#4edea3] hover:bg-[#6ffbbe] text-[#003824] text-[13px] font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-[#4edea3]/15"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">login</span>
              <span>Iniciar Sesión / Crear Cuenta</span>
            </button>
          ) : (
            <>
              {isClubAdmin && (
                <a
                  href="/admin"
                  className="w-full py-2.5 px-3 rounded-xl bg-[#31353f] hover:bg-[#353943] text-[#4edea3] text-[13px] font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    admin_panel_settings
                  </span>
                  <span>Ir a Consola Admin (/admin)</span>
                </a>
              )}
              <button
                onClick={() => {
                  onSignOut();
                  onClose();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-[#1c1f29] hover:bg-[#31353f] text-[#ffb4ab] text-[13px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-[#ffb4ab]/20"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                <span>Cerrar Sesión</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
