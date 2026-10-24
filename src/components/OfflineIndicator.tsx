import React, { useState, useEffect } from 'react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <aside className="fixed bottom-22 left-4 right-4 z-40 max-w-sm mx-auto flex items-center justify-between gap-2 rounded-xl bg-[#262a34] px-3.5 py-2.5 text-[12px] font-semibold text-[#dfe2ef] shadow-xl border border-[#ffb4ab]/40 animate-in fade-in duration-200">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-[#ffb4ab] animate-ping" />
        <span>Modo sin conexión — Padel Assist disponible offline.</span>
      </div>
    </aside>
  );
};
