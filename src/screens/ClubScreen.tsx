import React from 'react';
import { Booking, Court, Amenity, ClubSettings, UserProfile } from '../types';
import { ClubRulesAccordion } from '../components/ClubRulesAccordion';
import { CancheroPanel } from '../components/CancheroPanel';
import { PWAInstallButton } from '../components/PWAInstallButton';

interface ClubScreenProps {
  user: UserProfile;
  bookings: Booking[];
  courts: Court[];
  amenities: Amenity[];
  clubSettings: ClubSettings;
  isAdminMode: boolean;
  onToggleAdminMode: (admin: boolean) => void;
  onConfirmCancheroPayment: (bookingId: string) => void;
  onBlockCourtSlot: (params: {
    courtId: string;
    courtName: string;
    dateStr: string;
    timeSlot: string;
    reason: string;
  }) => void;
}

export const ClubScreen: React.FC<ClubScreenProps> = ({
  user,
  bookings,
  courts,
  amenities,
  clubSettings,
  isAdminMode,
  onToggleAdminMode,
  onConfirmCancheroPayment,
  onBlockCourtSlot,
}) => {
  const isClubAdmin = user.role === 'club_admin' || user.role === 'superadmin';

  const handleOpenMaps = () => {
    window.open(
      `https://maps.google.com/?q=${encodeURIComponent(clubSettings.address)}`,
      '_blank'
    );
  };

  const handleOpenWhatsApp = () => {
    const cleanPhone = clubSettings.whatsapp_phone.replace(/\D/g, '');
    window.open(
      `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `¡Hola ${clubSettings.club_name}! Tengo una consulta sobre las reservas de pádel.`
      )}`,
      '_blank'
    );
  };

  return (
    <div className="flex flex-col w-full gap-5 select-none">
      {/* Dynamic Role Switcher Bar (Visible to verified admins, or redirects to /admin login) */}
      <div className="w-full bg-[#262a34]/90 backdrop-blur-xl p-1.5 rounded-full shadow-lg flex items-center justify-between border border-[#31353f]">
        <div className="relative flex w-full p-0.5 rounded-full bg-[#0a0e17]/80">
          <div
            className={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] bg-[#10b981] rounded-full transition-transform duration-300 ease-out shadow-md ${
              isAdminMode ? 'translate-x-full' : 'translate-x-0'
            }`}
          ></div>

          <button
            onClick={() => onToggleAdminMode(false)}
            className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-[11px] font-bold transition-colors duration-200 cursor-pointer ${
              !isAdminMode ? 'text-[#00422b]' : 'text-[#bbcabf]'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[17px]">
              sports_tennis
            </span>
            <span>Vista Jugador</span>
          </button>

          <button
            onClick={() => onToggleAdminMode(true)}
            className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-[11px] font-bold transition-colors duration-200 cursor-pointer ${
              isAdminMode ? 'text-[#00422b]' : 'text-[#bbcabf]'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[17px]">
              {isClubAdmin ? 'vpn_key' : 'lock'}
            </span>
            <span>Modo Canchero</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: PLAYER MODE CONTENT */}
      {!isAdminMode ? (
        <div className="flex flex-col gap-5 animate-in fade-in duration-300">
          {/* Club Location Card with Map Hook */}
          <div className="flex flex-col rounded-xl bg-[#1c1f29]/70 backdrop-blur-md overflow-hidden shadow-xl border border-[#31353f]">
            <div className="relative w-full h-36 bg-[#0a0e17]">
              <img
                className="w-full h-full object-cover brightness-90"
                alt={clubSettings.club_name}
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBl6wkhx3wYfsO3VPDrcRk4eJ3C107IXc-GxMnthnsJxQnODVWA9ebsl36f96ewCRST0IDfCwxF9lLb-lBTFVkPPUqBZhslwYe2-ZTpRcQB3FB_QJZrfa_QlqVWhmrr5_b2RkUYGs_LHUSpWkwoheqKme9vUs10PA3Z6w_pCEAZBIrIJYqHMUpUgyOKnXwgHxc0sEp_bd4UUphEEtVqtQL4Kk-XZadFRUqiWhN6wf85BmN1NOwNP6-t"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1c1f29] via-[#1c1f29]/20 to-transparent"></div>
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0f131c]/80 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4edea3] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4edea3]"></span>
                </span>
                <span className="text-[11px] font-bold text-[#4edea3] uppercase">
                  {courts.length} Canchas Oficiales
                </span>
              </div>
            </div>

            {/* Address Info & Map Action */}
            <div className="p-3.5 flex flex-col gap-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-[18px] font-bold text-[#dfe2ef] tracking-tight truncate">
                    {clubSettings.club_name}
                  </h2>
                  <p className="text-[13px] text-[#bbcabf] flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-[16px] text-[#4edea3] shrink-0">
                      pin_drop
                    </span>
                    <span className="truncate">{clubSettings.address}</span>
                  </p>
                </div>
                <span className="font-mono text-[14px] font-bold text-[#68fcbf] bg-[#262a34] px-2 py-1 rounded-lg shrink-0 border border-white/5">
                  4.9 ★
                </span>
              </div>

              <button
                onClick={handleOpenMaps}
                className="w-full mt-1 flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl bg-[#31353f] text-[#dfe2ef] hover:bg-[#353943] active:scale-[0.98] transition-all text-[13px] shadow-sm font-semibold cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[#7bd0ff] text-[18px]">
                  navigation
                </span>
                <span>Abrir en Google Maps / Waze</span>
              </button>
            </div>
          </div>

          {/* Operating Hours Banner */}
          <div className="p-3.5 rounded-xl bg-[#1c1f29]/70 backdrop-blur-md flex items-center justify-between gap-3 shadow-md border border-[#31353f]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#262a34] flex items-center justify-center text-[#4edea3] shrink-0 border border-white/5">
                <span className="material-symbols-outlined text-[20px]">
                  schedule
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-[#bbcabf] uppercase">
                  Horarios de Apertura ({clubSettings.timezone || 'America/Bogota'})
                </span>
                <p className="text-[14px] text-[#dfe2ef] font-semibold">
                  Lun a Dom: {(clubSettings.open_time || '07:00').slice(0, 5)} -{' '}
                  {(clubSettings.close_time || '23:00').slice(0, 5)} hs
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#4edea3]/20 text-[#4edea3] uppercase shrink-0">
              Abierto Hoy
            </span>
          </div>

          {/* Dynamic Amenities Catalog from Supabase */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#bbcabf]">
                Servicios & Pro-Shop del Club
              </span>
              <span className="text-[11px] font-mono text-[#4edea3]">
                En Recepción
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {amenities.map((amenity) => (
                <div
                  key={amenity.id}
                  className="rounded-xl bg-[#1c1f29]/80 p-3 flex flex-col justify-between gap-2 border border-[#31353f]"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg bg-[#262a34] flex items-center justify-center text-[#4edea3]">
                      <span className="material-symbols-outlined text-[18px]">
                        {amenity.icon || 'sports_tennis'}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#4edea3] bg-[#4edea3]/10 px-2 py-0.5 rounded-full">
                      {amenity.price > 0 ? `$${amenity.price.toFixed(2)}` : 'Gratis'}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-[#dfe2ef] leading-tight">
                      {amenity.title}
                    </h4>
                    <p className="text-[11px] text-[#bbcabf] mt-0.5 line-clamp-1">
                      {amenity.subtitle || 'Disponible en el club'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Club Rules & Guidelines (Accordions) */}
          <ClubRulesAccordion />

          {/* PWA Mobile App Installation Banner */}
          <PWAInstallButton variant="banner" />

          {/* Floating Persistent WhatsApp Trigger with Glow Pulse */}
          <div className="pt-1 pb-2">
            <button
              onClick={handleOpenWhatsApp}
              className="relative group w-full py-3.5 px-4 rounded-xl bg-[#262a34] hover:bg-[#353943] active:scale-[0.98] transition-all flex items-center justify-between shadow-xl border border-[#31353f] cursor-pointer"
              type="button"
            >
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-[#10b981] text-[#00422b] shadow-md">
                  <span className="material-symbols-outlined text-[22px]">
                    chat
                  </span>
                  <span className="animate-ping absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-[#4edea3] opacity-60"></span>
                  <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-[#4edea3]"></span>
                </div>
                <div className="text-left">
                  <h4 className="text-[14px] font-bold text-[#dfe2ef]">
                    Hablar con Recepción
                  </h4>
                  <p className="text-[11px] text-[#bbcabf]">
                    Atención directa del Canchero por WhatsApp
                  </p>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#4edea3] text-[20px] transition-transform group-hover:translate-x-1">
                arrow_forward_ios
              </span>
            </button>
          </div>
        </div>
      ) : (
        /* VIEW 2: MODO CANCHERO (Requires Club Admin role) */
        <div className="flex flex-col gap-4">
          <a
            href="/admin"
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-zinc-900 border border-emerald-500/40 hover:border-emerald-400 transition-all flex items-center justify-between shadow-xl group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <span className="material-symbols-outlined text-[24px]">
                  admin_panel_settings
                </span>
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">
                    Consola Administrativa Completa
                  </h4>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500 text-zinc-950 uppercase">
                    /admin
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Gestionar tarifas, crear pistas, aprobar comprobantes y configurar el club
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-emerald-400 text-xl transition-transform group-hover:translate-x-1">
              open_in_new
            </span>
          </a>

          <CancheroPanel
            bookings={bookings}
            courts={courts}
            onConfirmPendingPayment={onConfirmCancheroPayment}
            onBlockSlot={onBlockCourtSlot}
          />
        </div>
      )}
    </div>
  );
};
