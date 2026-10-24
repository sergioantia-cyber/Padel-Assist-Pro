import React from 'react';
import { ToastMessage } from '../types';

interface ToastNotificationProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toast, onClose }) => {
  if (!toast) return null;

  return (
    <aside
      aria-live="polite"
      className="fixed top-20 left-4 right-4 z-50 max-w-md mx-auto transform transition-all duration-300 ease-out flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#262a34] shadow-2xl border border-[#3c4a42]/60 animate-in fade-in slide-in-from-top-4"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-[#4edea3] flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[#003824] text-[18px]">
            check_circle
          </span>
        </div>
        <div className="flex flex-col min-w-0 text-left">
          <span className="text-[14px] text-[#dfe2ef] font-semibold truncate">
            {toast.title}
          </span>
          <span className="text-[12px] text-[#bbcabf] truncate">
            {toast.description}
          </span>
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-1 rounded-full text-[#bbcabf] hover:text-[#dfe2ef] transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center cursor-pointer"
        type="button"
        aria-label="Cerrar notificación"
      >
        <span className="material-symbols-outlined text-[18px]">close</span>
      </button>
    </aside>
  );
};
