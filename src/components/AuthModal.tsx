import React, { useState } from 'react';
import { UserProfile } from '../types';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  handlePasswordReset,
} from '../apiService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile, message: string) => void;
  initialMode?: 'login' | 'signup' | 'reset';
  promptMessage?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'login',
  promptMessage,
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('5ª Categoría');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const { user, error } = await signInWithEmail(email, password);
        if (error || !user) {
          setErrorMsg(error || 'Credenciales inválidas. Verifica tu correo y contraseña.');
        } else {
          onAuthSuccess(user, `¡Bienvenido de nuevo, ${user.full_name}!`);
          onClose();
        }
      } else if (mode === 'signup') {
        if (!fullName.trim() || !phone.trim()) {
          setErrorMsg('Por favor ingresa tu nombre completo y teléfono de WhatsApp.');
          setLoading(false);
          return;
        }
        const { user, error, needsEmailConfirmation } = await signUpWithEmail({
          email,
          password,
          fullName,
          phone,
          category,
        });

        if (error) {
          setErrorMsg(error);
        } else if (needsEmailConfirmation) {
          setInfoMsg(
            '¡Cuenta creada! Revisa tu bandeja de correo para confirmar tu cuenta e iniciar sesión.'
          );
          setMode('login');
        } else if (user) {
          onAuthSuccess(user, `¡Cuenta creada con éxito, ${user.full_name}!`);
          onClose();
        }
      } else if (mode === 'reset') {
        const res = await handlePasswordReset(email);
        if (!res.success) {
          setErrorMsg(res.message);
        } else {
          setInfoMsg(res.message);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    const { error } = await signInWithGoogle();
    if (error) {
      setErrorMsg(error);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-surface-container rounded-3xl border border-outline-variant/25 shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-outline-variant/15 flex items-center justify-between bg-surface-container-high/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">sports_tennis</span>
            </div>
            <div>
              <h3 className="font-headline font-extrabold text-lg text-on-surface">
                {mode === 'login'
                  ? 'Iniciar Sesión'
                  : mode === 'signup'
                    ? 'Crear Cuenta de Jugador'
                    : 'Recuperar Contraseña'}
              </h3>
              <p className="text-xs text-on-surface-variant">
                Padel Assist Pro • Autenticación Segura
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {promptMessage && (
            <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/25 text-xs text-primary font-medium flex items-start gap-2.5">
              <span className="material-symbols-outlined text-base shrink-0 mt-0.5">
                verified_user
              </span>
              <span>{promptMessage}</span>
            </div>
          )}

          {/* Mode Tabs */}
          {mode !== 'reset' && (
            <div className="grid grid-cols-2 p-1 rounded-xl bg-surface-container-lowest border border-outline-variant/15">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                  setInfoMsg(null);
                }}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  mode === 'login'
                    ? 'bg-primary text-on-primary shadow'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMsg(null);
                  setInfoMsg(null);
                }}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  mode === 'signup'
                    ? 'bg-primary text-on-primary shadow'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Registrarse
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-error/15 border border-error/30 text-error text-xs font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="p-3 rounded-xl bg-primary/15 border border-primary/30 text-primary text-xs font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-base">check_circle</span>
              <span>{infoMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1">
                    Nombre y Apellido
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej. Martín Gómez"
                    className="w-full bg-surface-container-highest border border-outline-variant/25 rounded-xl px-3.5 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1">
                      WhatsApp
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+57 300 123 4567"
                      className="w-full bg-surface-container-highest border border-outline-variant/25 rounded-xl px-3.5 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1">
                      Categoría
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-surface-container-highest border border-outline-variant/25 rounded-xl px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary"
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
              </>
            )}

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jugador@correo.com"
                className="w-full bg-surface-container-highest border border-outline-variant/25 rounded-xl px-3.5 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            {mode !== 'reset' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                    Contraseña
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('reset');
                        setErrorMsg(null);
                        setInfoMsg(null);
                      }}
                      className="text-[11px] text-primary hover:underline font-semibold"
                    >
                      ¿Olvidaste tu clave?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface-container-highest border border-outline-variant/25 rounded-xl px-3.5 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-primary text-on-primary font-headline font-extrabold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {loading
                ? 'Procesando...'
                : mode === 'login'
                  ? 'Ingresar a mi Cuenta'
                  : mode === 'signup'
                    ? 'Crear Cuenta y Continuar'
                    : 'Enviar Enlace de Recuperación'}
            </button>
          </form>

          {mode === 'reset' ? (
            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full py-2 text-xs text-on-surface-variant hover:text-on-surface font-semibold"
            >
              ← Volver a Iniciar Sesión
            </button>
          ) : (
            <>
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-outline-variant/20"></div>
                <span className="shrink mx-3 text-[11px] text-on-surface-variant uppercase tracking-wider">
                  o continúa con
                </span>
                <div className="flex-grow border-t border-outline-variant/20"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full py-2.5 px-4 rounded-xl bg-surface-container-highest hover:bg-surface-bright border border-outline-variant/25 text-on-surface text-xs font-bold flex items-center justify-center gap-2.5 transition-all"
              >
                <span className="material-symbols-outlined text-base text-primary">
                  account_circle
                </span>
                Continuar con Google
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
