import React, { useState, useEffect } from 'react';
import { Court, ClubSettings, Booking } from '../types';
import {
  getStoredCourts,
  saveStoredCourts,
  updateCourtPricingInDb,
  toggleCourtActiveInDb,
  getStoredClubSettings,
  updateClubSettingsInDb,
  getStoredBookings,
  confirmPaymentByCancheroInDb,
  cancelBookingInDb,
  fetchCourtsFromSupabase,
  fetchClubSettingsFromSupabase,
  fetchBookingsFromSupabase,
  subscribeToRealtimeBookings,
} from '../apiService';
import { isSupabaseConfigured, supabase } from '../supabaseClient';

export const AdminApp: React.FC = () => {
  // Authentication PIN
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('padel_admin_auth') === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'courts' | 'settings' | 'bookings' | 'database'>('courts');

  // State
  const [courts, setCourts] = useState<Court[]>(getStoredCourts);
  const [clubSettings, setClubSettings] = useState<ClubSettings>(getStoredClubSettings);
  const [bookings, setBookings] = useState<Booking[]>(getStoredBookings);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [isNewCourtModalOpen, setIsNewCourtModalOpen] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);

  // Form state for editing/new court
  const [courtForm, setCourtForm] = useState({
    name: '',
    type: '',
    category: 'panoramica' as 'panoramica' | 'techada' | 'exterior',
    court_number_label: 'Pista',
    hourly_rate: 20,
    rate_for_90m: 28,
    is_active: true,
    banner_badge: 'Pro',
    photo_url: '',
    description: '',
  });

  // Settings form
  const [settingsForm, setSettingsForm] = useState<ClubSettings>(clubSettings);

  useEffect(() => {
    setSettingsForm(clubSettings);
  }, [clubSettings]);

  // Synchronize courts, settings, and bookings from Supabase live database + Realtime
  useEffect(() => {
    fetchCourtsFromSupabase().then((loaded) => {
      if (loaded && loaded.length > 0) setCourts(loaded);
    });
    fetchClubSettingsFromSupabase().then((loadedSettings) => {
      if (loadedSettings) setClubSettings(loadedSettings);
    });
    fetchBookingsFromSupabase().then((loadedBookings) => {
      if (loadedBookings && loadedBookings.length > 0) setBookings(loadedBookings);
    });

    const unsubscribe = subscribeToRealtimeBookings((updated) => {
      setBookings(updated);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '1234' || pinInput === 'admin') {
      setIsAuthenticated(true);
      sessionStorage.setItem('padel_admin_auth', 'true');
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('padel_admin_auth');
  };

  const showNotification = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleEditCourtClick = (court: Court) => {
    setEditingCourt(court);
    setCourtForm({
      name: court.name,
      type: court.type,
      category: court.category,
      court_number_label: court.court_number_label,
      hourly_rate: court.hourly_rate,
      rate_for_90m: court.rate_for_90m,
      is_active: court.is_active,
      banner_badge: court.banner_badge,
      photo_url: court.photos[0] || '',
      description: court.description,
    });
  };

  const handleSaveCourtForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourt) return;

    try {
      const updatedCourts = courts.map((c) => {
        if (c.id === editingCourt.id) {
          return {
            ...c,
            name: courtForm.name,
            type: courtForm.type,
            category: courtForm.category,
            court_number_label: courtForm.court_number_label,
            hourly_rate: Number(courtForm.hourly_rate),
            rate_for_90m: Number(courtForm.rate_for_90m),
            is_active: courtForm.is_active,
            banner_badge: courtForm.banner_badge,
            photos: courtForm.photo_url ? [courtForm.photo_url] : c.photos,
            description: courtForm.description,
          };
        }
        return c;
      });

      setCourts(updatedCourts);
      saveStoredCourts(updatedCourts);
      await updateCourtPricingInDb(
        editingCourt.id,
        Number(courtForm.hourly_rate),
        Number(courtForm.rate_for_90m)
      );

      setEditingCourt(null);
      showNotification('¡Cancha y tarifas actualizadas con éxito!');
    } catch (err) {
      console.error(err);
      showNotification('Error al guardar cambios');
    }
  };

  const handleToggleCourtActive = async (courtId: string, currentStatus: boolean) => {
    const updated = await toggleCourtActiveInDb(courtId, !currentStatus);
    setCourts(updated);
    showNotification(`Pista ${!currentStatus ? 'Activada' : 'Pausada'}`);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await updateClubSettingsInDb(settingsForm);
    setClubSettings(updated);
    showNotification('¡Configuración del club guardada exitosamente!');
  };

  const handleConfirmPayment = async (bookingId: string) => {
    const updated = await confirmPaymentByCancheroInDb(bookingId);
    setBookings(updated);
    showNotification('¡Pago confirmado en mostrador!');
  };

  const handleCancelBooking = async (bookingId: string) => {
    const updated = await cancelBookingInDb(bookingId);
    setBookings(updated);
    showNotification('Reserva cancelada');
  };

  // 1. PIN Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#121620] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-emerald-400 text-3xl">
              lock
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mb-1">
            Admin Privado Padel Assist
          </h1>
          <p className="text-xs text-zinc-400 mb-6">
            Acceso exclusivo para cancheros y administradores del club
          </p>

          <form onSubmit={handlePinSubmit} className="w-full flex flex-col gap-3">
            <input
              type="password"
              placeholder="Ingresa PIN (demo: 1234)"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className={`w-full text-center tracking-widest text-lg font-mono py-3 px-4 rounded-xl bg-[#1a1f2c] border text-white focus:outline-none transition-all ${
                pinError
                  ? 'border-red-500 ring-2 ring-red-500/30'
                  : 'border-zinc-700 focus:border-emerald-500'
              }`}
              autoFocus
            />

            {pinError && (
              <span className="text-xs text-red-400">
                PIN incorrecto. Intenta con 1234.
              </span>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              Desbloquear Panel
            </button>
          </form>

          <a
            href="/"
            className="mt-6 text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Volver a la App de Jugadores
          </a>
        </div>
      </div>
    );
  }

  // 2. Main Admin Dashboard
  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100 flex flex-col selection:bg-emerald-500 selection:text-zinc-950">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-[#10141e]/95 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-emerald-400 text-xl">
              shield_person
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">
                Padel Assist Pro
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ADMIN PRIVADO
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              {clubSettings.club_name} • Gestión Integral
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px]">
            <span
              className={`w-2 h-2 rounded-full ${
                isSupabaseConfigured ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            ></span>
            <span className="text-zinc-300">
              {isSupabaseConfigured ? 'Supabase Conectado' : 'Modo Local'}
            </span>
          </div>

          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">open_in_new</span>
            <span>Ver Jugador</span>
          </a>

          <button
            onClick={handleLogout}
            title="Cerrar Sesión"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
          </button>
        </div>
      </header>

      {/* Toast Banner */}
      {saveSuccessMsg && (
        <div className="fixed top-16 right-4 z-50 bg-emerald-500 text-zinc-950 font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs animate-bounce">
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-white/5">
          <button
            onClick={() => setActiveTab('courts')}
            className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'courts'
                ? 'bg-emerald-500 text-zinc-950 shadow-md'
                : 'bg-[#121620] text-zinc-400 hover:text-white border border-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-sm">sports_tennis</span>
            <span>Canchas y Tarifas</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px]">
              {courts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-emerald-500 text-zinc-950 shadow-md'
                : 'bg-[#121620] text-zinc-400 hover:text-white border border-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-sm">tune</span>
            <span>Configuración del Club</span>
          </button>

          <button
            onClick={() => setActiveTab('bookings')}
            className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'bookings'
                ? 'bg-emerald-500 text-zinc-950 shadow-md'
                : 'bg-[#121620] text-zinc-400 hover:text-white border border-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-sm">payments</span>
            <span>Comprobantes y Turnos</span>
            {bookings.filter((b) => b.status === 'pending_payment').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-black text-[10px] font-black">
                {bookings.filter((b) => b.status === 'pending_payment').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'database'
                ? 'bg-emerald-500 text-zinc-950 shadow-md'
                : 'bg-[#121620] text-zinc-400 hover:text-white border border-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-sm">database</span>
            <span>Instalación Supabase</span>
          </button>
        </div>

        {/* TAB 1: COURTS & PRICING */}
        {activeTab === 'courts' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">
                  Infraestructura y Tarifas de Canchas
                </h2>
                <p className="text-xs text-zinc-400">
                  Modifica precios por hora y 90 minutos en tiempo real. Se reflejan al instante en la app de reservas.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courts.map((court) => (
                <div
                  key={court.id}
                  className="bg-[#121620] border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-lg"
                >
                  <div className="relative h-36 w-full bg-zinc-900 overflow-hidden">
                    <img
                      src={court.photos[0]}
                      alt={court.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/70 backdrop-blur-md text-emerald-300 border border-emerald-500/30">
                        {court.court_number_label}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/60 text-zinc-300">
                        {court.type}
                      </span>
                    </div>

                    <div className="absolute top-2.5 right-2.5">
                      <button
                        onClick={() => handleToggleCourtActive(court.id, court.is_active)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                          court.is_active
                            ? 'bg-emerald-500 text-zinc-950'
                            : 'bg-red-500/80 text-white'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        <span>{court.is_active ? 'Activa' : 'Pausada'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-sm text-white">{court.name}</h3>
                      <p className="text-xs text-zinc-400 line-clamp-2 mt-0.5">
                        {court.description}
                      </p>
                    </div>

                    {/* Pricing Grid */}
                    <div className="bg-[#181d2a] p-2.5 rounded-xl border border-white/5 grid grid-cols-2 gap-2 text-center">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                          Turno 60 Min
                        </span>
                        <span className="text-sm font-bold text-emerald-400">
                          ${court.hourly_rate}.00
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                          Turno 90 Min
                        </span>
                        <span className="text-sm font-bold text-emerald-400">
                          ${court.rate_for_90m}.00
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <button
                      onClick={() => handleEditCourtClick(court)}
                      className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      <span>Modificar Precios y Datos</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: CLUB SETTINGS */}
        {activeTab === 'settings' && (
          <div className="max-w-xl mx-auto w-full bg-[#121620] border border-white/10 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
            <div>
              <h2 className="text-base font-bold text-white">
                Configuración Oficial del Club
              </h2>
              <p className="text-xs text-zinc-400">
                Al actualizar estos datos, todos los enlaces de WhatsApp, transferencias y reservas se actualizan automáticamente.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">
                  Nombre del Club
                </label>
                <input
                  type="text"
                  value={settingsForm.club_name}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, club_name: e.target.value })
                  }
                  className="w-full bg-[#181d2a] border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-emerald-400 block mb-1">
                  Teléfono de WhatsApp Oficial (con código de país)
                </label>
                <input
                  type="text"
                  value={settingsForm.whatsapp_phone}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, whatsapp_phone: e.target.value })
                  }
                  placeholder="ej: 5491144445555"
                  className="w-full bg-[#181d2a] border border-emerald-500/50 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-400"
                  required
                />
                <span className="text-[11px] text-zinc-500 mt-1 block">
                  Sin signos '+' ni guiones. Usado para recibir comprobantes de pago de los jugadores.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1">
                    Alias Bancario / CBU
                  </label>
                  <input
                    type="text"
                    value={settingsForm.cbu_alias}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, cbu_alias: e.target.value })
                    }
                    className="w-full bg-[#181d2a] border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1">
                    Número de Cuenta / CBU
                  </label>
                  <input
                    type="text"
                    value={settingsForm.cbu_number}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, cbu_number: e.target.value })
                    }
                    className="w-full bg-[#181d2a] border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">
                  Dirección y Ubicación Google Maps
                </label>
                <input
                  type="text"
                  value={settingsForm.address}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, address: e.target.value })
                  }
                  className="w-full bg-[#181d2a] border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-sm transition-all shadow-md cursor-pointer mt-2"
              >
                Guardar Configuración Oficial
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: BOOKINGS & PAYMENT PROOFS */}
        {activeTab === 'bookings' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-bold text-white">
              Monitor de Reservas y Comprobantes
            </h2>

            <div className="flex flex-col gap-3">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-[#121620] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={booking.court_image}
                      alt={booking.court_name}
                      className="w-14 h-14 rounded-xl object-cover border border-white/10"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">
                          {booking.court_name}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            booking.status === 'confirmed'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : booking.status === 'pending_payment'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {booking.status === 'confirmed'
                            ? 'PAGADO'
                            : booking.status === 'pending_payment'
                            ? 'PENDIENTE VALIDACIÓN'
                            : booking.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {booking.date_full} • {booking.start_time} - {booking.end_time} ({booking.duration_min} min)
                      </p>
                      <p className="text-xs text-emerald-400 font-semibold">
                        Jugador: {booking.user_name} • Monto: ${booking.total_price}.00
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {booking.payment_proof_url && (
                      <button
                        onClick={() => setViewingProofUrl(booking.payment_proof_url!)}
                        className="px-2.5 py-1.5 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-blue-500/30"
                      >
                        <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                        <span>Ver Ticket</span>
                      </button>
                    )}

                    {booking.status === 'pending_payment' && (
                      <button
                        onClick={() => handleConfirmPayment(booking.id)}
                        className="flex-1 sm:flex-none px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
                      >
                        Aprobar Pago
                      </button>
                    )}

                    <button
                      onClick={() => {
                        const text = encodeURIComponent(
                          `¡Hola ${booking.user_name}! El club ${clubSettings.club_name} ha APROBADO y confirmado tu reserva de pádel en ${booking.court_name} (${booking.date_label} a las ${booking.start_time} hs). ¡Nos vemos en la pista! 🎾`
                        );
                        window.open(`https://wa.me/${clubSettings.whatsapp_phone}?text=${text}`, '_blank');
                      }}
                      className="px-2.5 py-1.5 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500 hover:text-zinc-950 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-emerald-500/20"
                      title="Enviar notificación por WhatsApp al jugador"
                    >
                      <span className="material-symbols-outlined text-[15px]">send</span>
                      <span>Avisar WhatsApp</span>
                    </button>

                    {booking.status !== 'cancelled' && (
                      <button
                        onClick={() => handleCancelBooking(booking.id)}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-red-500/20 hover:text-red-300 text-zinc-400 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: DATABASE / SUPABASE SETUP */}
        {activeTab === 'database' && (
          <div className="bg-[#121620] border border-white/10 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">
                  Instalación Integral de Supabase
                </h2>
                <p className="text-xs text-zinc-400">
                  Archivo SQL listo con tablas, RLS, función get_available_slots, canchas iniciales y bucket de comprobantes.
                </p>
              </div>

              <a
                href="https://supabase.com/dashboard/project/sembcqfavhepdyctgkcp/sql"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">open_in_new</span>
                <span>Abrir SQL Editor Supabase</span>
              </a>
            </div>

            <div className="bg-[#0b0e14] border border-white/5 rounded-xl p-3 text-xs font-mono text-zinc-300 flex items-center justify-between">
              <span>Ruta del script en el proyecto: src/db/complete_setup.sql</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText('src/db/complete_setup.sql');
                  showNotification('Ruta copiada al portapapeles');
                }}
                className="text-emerald-400 hover:underline cursor-pointer"
              >
                Copiar ruta
              </button>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex flex-col gap-1">
              <span className="font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">verified</span>
                Listo para ejecutar en 1 clic
              </span>
              <span>
                Copia y pega el contenido de <code>src/db/complete_setup.sql</code> en el SQL Editor de Supabase y presiona "Run" para sincronizar la base de datos completa.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Editar Cancha */}
      {editingCourt && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121620] border border-white/10 rounded-3xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white">
                Editar Cancha y Precios
              </h3>
              <button
                onClick={() => setEditingCourt(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveCourtForm} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">
                  Nombre de la Pista
                </label>
                <input
                  type="text"
                  value={courtForm.name}
                  onChange={(e) =>
                    setCourtForm({ ...courtForm, name: e.target.value })
                  }
                  className="w-full bg-[#181d2a] border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-emerald-400 block mb-1">
                    Tarifa 60 Min ($)
                  </label>
                  <input
                    type="number"
                    value={courtForm.hourly_rate}
                    onChange={(e) =>
                      setCourtForm({
                        ...courtForm,
                        hourly_rate: Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#181d2a] border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-emerald-400 block mb-1">
                    Tarifa 90 Min ($)
                  </label>
                  <input
                    type="number"
                    value={courtForm.rate_for_90m}
                    onChange={(e) =>
                      setCourtForm({
                        ...courtForm,
                        rate_for_90m: Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#181d2a] border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">
                  Tipo / Superficie
                </label>
                <input
                  type="text"
                  value={courtForm.type}
                  onChange={(e) =>
                    setCourtForm({ ...courtForm, type: e.target.value })
                  }
                  className="w-full bg-[#181d2a] border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between bg-[#181d2a] p-3 rounded-xl border border-white/5">
                <span className="text-xs font-bold text-zinc-300">
                  Estado de Disponibilidad
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCourtForm({ ...courtForm, is_active: !courtForm.is_active })
                  }
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    courtForm.is_active
                      ? 'bg-emerald-500 text-zinc-950'
                      : 'bg-red-500 text-white'
                  }`}
                >
                  {courtForm.is_active ? 'Cancha Activa' : 'Pausada'}
                </button>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCourt(null)}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ver Comprobante de Pago */}
      {viewingProofUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121620] border border-white/10 rounded-3xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400">receipt_long</span>
                Comprobante de Pago de Transferencia
              </h3>
              <button
                onClick={() => setViewingProofUrl(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <div className="relative w-full max-h-[65vh] rounded-2xl overflow-hidden bg-black/50 border border-white/5 flex items-center justify-center p-2">
              <img
                src={viewingProofUrl}
                alt="Comprobante de pago"
                className="w-full h-auto max-h-[60vh] object-contain rounded-xl"
              />
            </div>
            <button
              onClick={() => setViewingProofUrl(null)}
              className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Cerrar Vista
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
