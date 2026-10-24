import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'banner' | 'modal';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA on the home screen, hide the button
  if (isInstalled) {
    return null;
  }

  // Handle click on Chromium / Android
  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // General prompt if browser doesn't dispatch beforeinstallprompt
      setShowIOSGuide(true);
    }
  };

  if (variant === 'header') {
    return (
      <>
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#4edea3] text-[11px] font-bold border border-[#4edea3]/30 active:scale-95 transition-all cursor-pointer shadow-sm"
          type="button"
          title="Instalar Padel Assist en tu dispositivo"
        >
          <span className="material-symbols-outlined text-[15px]">
            install_mobile
          </span>
          <span className="hidden sm:inline">Instalar App</span>
        </button>

        {showIOSGuide && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f131c]/80 backdrop-blur-md animate-in fade-in duration-200"
          >
            <div className="w-full max-w-sm rounded-2xl bg-[#262a34] p-5 shadow-2xl flex flex-col gap-3.5 border border-[#3c4a42]">
              <div className="w-12 h-12 rounded-full bg-[#10b981]/20 text-[#4edea3] flex items-center justify-center self-center">
                <span className="material-symbols-outlined text-[28px]">
                  smartphone
                </span>
              </div>
              <div className="text-center">
                <h3 className="text-[18px] font-bold text-[#dfe2ef]">
                  Instalar Padel Assist
                </h3>
                <p className="text-[12px] text-[#bbcabf] mt-1">
                  Acceso directo a tus canchas con pantalla completa y sin tienda de aplicaciones.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#1c1f29] border border-white/5 flex flex-col gap-2.5 text-[13px] text-[#dfe2ef]">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#31353f] flex items-center justify-center text-[12px] font-bold text-[#4edea3]">
                    1
                  </span>
                  <span>
                    Toca el botón <strong className="text-[#4edea3]">Compartir</strong> <span className="material-symbols-outlined text-[15px] align-middle">ios_share</span> en Safari o menú de navegador.
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#31353f] flex items-center justify-center text-[12px] font-bold text-[#4edea3]">
                    2
                  </span>
                  <span>
                    Selecciona <strong className="text-[#4edea3]">Agregar a pantalla de inicio</strong>.
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-[#4edea3] text-[#003824] text-[14px] font-bold active:scale-95 transition-all cursor-pointer"
                type="button"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Banner variant for Club Screen
  return (
    <>
      <div className="rounded-xl bg-gradient-to-r from-[#1c1f29] to-[#262a34] p-3.5 flex items-center justify-between border border-[#4edea3]/30 shadow-lg">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#10b981]/20 flex items-center justify-center text-[#4edea3] shrink-0 border border-[#4edea3]/30">
            <span className="material-symbols-outlined text-[24px]">
              install_mobile
            </span>
          </div>
          <div className="min-w-0">
            <h4 className="text-[13px] font-bold text-[#dfe2ef] truncate">
              Instala la App en tu Móvil
            </h4>
            <p className="text-[11px] text-[#bbcabf] truncate">
              Sin costo de tienda, acceso instantáneo y pantalla completa
            </p>
          </div>
        </div>
        <button
          onClick={handleInstallClick}
          className="px-3.5 py-1.5 rounded-full bg-[#4edea3] hover:bg-[#6ffbbe] text-[#003824] text-[11px] font-bold active:scale-95 transition-all shadow-md shrink-0 cursor-pointer"
          type="button"
        >
          Instalar
        </button>
      </div>

      {showIOSGuide && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f131c]/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className="w-full max-w-sm rounded-2xl bg-[#262a34] p-5 shadow-2xl flex flex-col gap-3.5 border border-[#3c4a42]">
            <div className="w-12 h-12 rounded-full bg-[#10b981]/20 text-[#4edea3] flex items-center justify-center self-center">
              <span className="material-symbols-outlined text-[28px]">
                smartphone
              </span>
            </div>
            <div className="text-center">
              <h3 className="text-[18px] font-bold text-[#dfe2ef]">
                Instalar Padel Assist
              </h3>
              <p className="text-[12px] text-[#bbcabf] mt-1">
                Acceso directo en Android y iPhone en 2 pasos:
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1c1f29] border border-white/5 flex flex-col gap-2.5 text-[13px] text-[#dfe2ef]">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#31353f] flex items-center justify-center text-[12px] font-bold text-[#4edea3]">
                  1
                </span>
                <span>
                  Toca <strong className="text-[#4edea3]">Compartir</strong> o el menú de tres puntos de tu navegador.
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#31353f] flex items-center justify-center text-[12px] font-bold text-[#4edea3]">
                  2
                </span>
                <span>
                  Toca <strong className="text-[#4edea3]">Agregar a pantalla de inicio</strong>.
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-xl bg-[#4edea3] text-[#003824] text-[14px] font-bold active:scale-95 transition-all cursor-pointer"
              type="button"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
};
