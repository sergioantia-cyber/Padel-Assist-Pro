import React, { useState, useEffect } from 'react';
import { Court, ClubSettings, Booking, UserProfile } from '../types';
import {
  getStoredCourts,
  saveStoredCourts,
  createCourtInDb,
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
  syncAuthenticatedUserFromSupabase,
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
  claimInitialAdminRole,
} from '../apiService';
import { isSupabaseConfigured } from '../supabaseClient';
import completeSetupSql from '../db/complete_setup.sql?raw';

export const AdminApp: React.FC = () => {
  // Real Supabase Authentication State
  const [adminUser, setAdminUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);
  const [submittingAuth, setSubmittingAuth] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'courts' | 'settings' | 'bookings' | 'database'
  >('courts');

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
    type: 'Cristal WPT',
    category: 'panoramica' as 'panoramica' | 'techada' | 'exterior',
    court_number_label: 'Pista 4',
    hourly_rate: 20,
    rate_for_90m: 28,
    rate_for_120m: 36,
    is_active: true,
    banner_badge: 'Panorámica Pro',
    photo_url: '',
    description: '',
  });

  // Settings form
  const [settingsForm, setSettingsForm] = useState<ClubSettings>(clubSettings);

  useEffect(() => {
    setSettingsForm(clubSettings);
  }, [clubSettings]);

  const refreshAdminData = () => {
    fetchCourtsFromSupabase().then((loaded) => {
      if (loaded && loaded.length > 0) setCourts(loaded);
    });
    fetchClubSettingsFromSupabase().then((loadedSettings) => {
      if (loadedSettings) setClubSettings(loadedSettings);
    });
    fetchBookingsFromSupabase().then((loadedBookings) => {
      if (loadedBookings) setBookings(loadedBookings);
    });
  };

  // Verify Supabase session on mount
  useEffect(() => {
    let mounted = true;
    syncAuthenticatedUserFromSupabase()
      .then((user) => {
        if (mounted) {
          setAdminUser(user);
          setAuthLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setAuthLoading(false);
      });

    refreshAdminData();

    const unsubscribe = subscribeToRealtimeBookings((updated) => {
      setBookings(updated);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const showNotification = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthInfo(null);
    setSubmittingAuth(true);

    try {
      if (authMode === 'login') {
        const { user, error } = await signInWithEmail(email, password);
        if (error || !user) {
          setAuthError(error || 'Credenciales inválidas.');
        } else {
          setAdminUser(user);
          refreshAdminData();
        }
      } else {
        const { user, error, needsEmailConfirmation } = await signUpWithEmail({
          email,
          password,
          fullName: fullName || 'Administrador del Club',
          phone,
          category: 'Administrador Club',
          claimAdmin: true,
        });

        if (error) {
          setAuthError(error);
        } else if (needsEmailConfirmation) {
          setAuthInfo(
            'Cuenta creada. Confirma tu correo en tu bandeja de entrada y luego inicia sesión.'
          );
          setAuthMode('login');
        } else if (user) {
          setAdminUser(user);
          refreshAdminData();
        }
      }
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleClaimAdmin = async () => {
    setAuthError(null);
    setSubmittingAuth(true);
    try {
      const { user, error } = await claimInitialAdminRole();
      if (error || !user) {
        setAuthError(
          error ||
            'No se pudo asignar el rol de administrador. Si ya existe un admin, inicia sesión con esa cuenta.'
        );
      } else {
        setAdminUser(user);
        refreshAdminData();
        showNotification('¡Rol de Administrador del Club activado!');
      }
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleLogout = async () => {
    await signOutUser();
    setAdminUser(null);
  };

  const handleOpenNewCourtModal = () => {
    setCourtForm({
      name: `Pista ${courts.length + 1} Pro`,
      type: 'Cristal WPT',
      category: 'panoramica',
      court_number_label: `Pista ${courts.length + 1}`,
      hourly_rate: 20,
      rate_for_90m: 28,
      rate_for_120m: 36,
      is_active: true,
      banner_badge: 'Panorámica Pro',
      photo_url: '',
      description:
        'Pista profesional con iluminación LED perimetral y césped de alta densidad.',
    });
    setIsNewCourtModalOpen(true);
  };

  const handleCreateNewCourt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await createCourtInDb({
        name: courtForm.name,
        type: courtForm.type,
        category: courtForm.category,
        court_number_label: courtForm.court_number_label,
        hourly_rate: Number(courtForm.hourly_rate),
        rate_for_90m: Number(courtForm.rate_for_90m),
        rate_for_120m: Number(courtForm.rate_for_120m),
        description: courtForm.description,
        photo_url: courtForm.photo_url,
      });
      setCourts(updated);
      setIsNewCourtModalOpen(false);
      showNotification('¡Nueva pista creada y publicada con éxito!');
    } catch (err: any) {
      showNotification(err?.message || 'Error al crear la nueva pista');
    }
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
      rate_for_120m: court.rate_for_120m || Math.round(court.hourly_rate * 1.8),
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
            rate_for_120m: Number(courtForm.rate_for_120m),
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
        Number(courtForm.rate_for_90m),
        Number(courtForm.rate_for_120m)
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
    showNotification('¡Pago confirmado y jugador notificado en tiempo real!');
  };

  const handleCancelBooking = async (bookingId: string) => {
    const updated = await cancelBookingInDb(bookingId);
    setBookings(updated);
    showNotification('Reserva cancelada y horario liberado');
  };

  const isAuthorizedAdmin =
    adminUser && (adminUser.role === 'club_admin' || adminUser.role === 'superadmin');

  // 1. Authentication & Role Verification Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center p-4 text-zinc-400 text-sm">
        Verificando sesión de administrador...
      </div>
    );
  }

  if (!isAuthorizedAdmin) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#121620] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col">
          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-emerald-400 text-3xl">
                shield_person
              </span>
            </div>
            <h1 className="text-xl font-bold text-white">
              Consola Admin • Padel Assist Pro
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Autenticación oficial con Supabase Auth y Row Level Security (RLS)
            </p>
          </div>

          {adminUser ? (
            /* Logged in as customer — allow claiming initial admin if no admin exists yet */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-1">
                <p className="font-bold text-amber-300">
                  Sesión iniciada como: {adminUser.full_name} ({adminUser.email})
                </p>
                <p>
                  Tu cuenta tiene actualmente el rol <code>{adminUser.role}</code>. Si eres el dueño o administrador inicial del club, reclama la administración con el botón inferior.
                </p>
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 font-semibold">
                  {authError}
                </div>
              )}

              <button
                type="button"
                disabled={submittingAuth}
                onClick={handleClaimAdmin}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                {submittingAuth
                  ? 'Activando Rol de Administrador...'
                  : 'Reclamar Administración Inicial del Club'}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-xl text-xs transition-colors"
              >
                Cerrar sesión e ingresar con otra cuenta
              </button>
            </div>
          ) : (
            /* Not logged in — show Supabase Auth Login / Signup */
            <>
              <div className="grid grid-cols-2 p-1 rounded-xl bg-[#0a0d14] border border-white/5 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError(null);
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    authMode === 'login'
                      ? 'bg-emerald-500 text-zinc-950'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Iniciar Sesión Admin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setAuthError(null);
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    authMode === 'signup'
                      ? 'bg-emerald-500 text-zinc-950'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Crear Cuenta Admin
                </button>
              </div>

              {authError && (
                <div className="mb-3 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 font-semibold">
                  {authError}
                </div>
              )}

              {authInfo && (
                <div className="mb-3 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 font-semibold">
                  {authInfo}
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="flex flex-col gap-3">
                {authMode === 'signup' && (
                  <>
                    <input
                      type="text"
                      required
                      placeholder="Nombre del Administrador o Canchero"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full py-2.5 px-3.5 rounded-xl bg-[#1a1f2c] border border-zinc-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="tel"
                      required
                      placeholder="WhatsApp (ej. +57 300 123 4567)"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full py-2.5 px-3.5 rounded-xl bg-[#1a1f2c] border border-zinc-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </>
                )}

                <input
                  type="email"
                  required
                  placeholder="Correo electrónico del administrador"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-[#1a1f2c] border border-zinc-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                />

                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Contraseña (mín. 6 caracteres)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-[#1a1f2c] border border-zinc-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                />

                <button
                  type="submit"
                  disabled={submittingAuth}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 cursor-pointer mt-1"
                >
                  {submittingAuth
                    ? 'Verificando...'
                    : authMode === 'login'
                      ? 'Ingresar al Panel'
                      : 'Registrar Administrador Inicial'}
                </button>
              </form>
            </>
          )}

          <a
            href="/"
            className="mt-6 text-xs text-zinc-500 hover:text-zinc-300 flex items-center justify-center gap-1 transition-colors"
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
                ADMIN VERIFICADO
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              {clubSettings.club_name} • {adminUser.full_name}
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
              {isSupabaseConfigured ? 'Supabase Realtime Activo' : 'Modo Local'}
            </span>
          </div>

          <a
            href="/"
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">open_in_new</span>
            <span>Ver App Jugador</span>
          </a>

          <button
            onClick={handleLogout}
            title="Cerrar Sesión"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
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
            <span>Esquema SQL Supabase</span>
          </button>
        </div>

        {/* TAB 1: COURTS & PRICING */}
        {activeTab === 'courts' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-base font-bold text-white">
                  Infraestructura y Tarifas de Canchas
                </h2>
                <p className="text-xs text-zinc-400">
                  Modifica precios por 60, 90 y 120 minutos o agrega nuevas pistas al club.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenNewCourtModal}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">add</span>
                <span>Crear Nueva Pista</span>
              </button>
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
                    <div className="bg-[#181d2a] p-2.5 rounded-xl border border-white/5 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                          60 Min
                        </span>
                        <span className="text-sm font-bold text-emerald-400">
                          ${court.hourly_rate}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                          90 Min
                        </span>
                        <span className="text-sm font-bold text-emerald-400">
                          ${court.rate_for_90m}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                          120 Min
                        </span>
                        <span className="text-sm font-bold text-emerald-400">
                          ${court.rate_for_120m || Math.round(court.hourly_rate * 1.8)}
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
                Al actualizar estos datos, todos los enlaces de WhatsApp, datos bancarios, zona horaria y tarifas nocturnas se actualizan automáticamente.
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
                  placeholder="ej: 573001234567"
                  className="w-full bg-[#181d2a] border border-emerald-500/50 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1">
                    Banco / Entidad
                  </label>
                  <input
                    type="text"
                    value={settingsForm.bank_name || ''}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, bank_name: e.target.value })
                    }
                    placeholder="Bancolombia / Nequi / Santander"
                    className="w-full bg-[#181d2a] border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1">
                    Titular de la Cuenta
                  </label>
                  <input
                    type="text"
                    value={settingsForm.account_holder || ''}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, account_holder: e.target.value })
                    }
                    placeholder="Padel Assist Club S.A.S."
                    className="w-full bg-[#181d2a] border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1">
                    Alias Bancario / Llave
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1">
                    Zona Horaria del Club
                  </label>
                  <select
                    value={settingsForm.timezone || 'America/Bogota'}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, timezone: e.target.value })
                    }
                    className="w-full bg-[#181d2a] border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="America/Bogota">America/Bogota (UTC-5)</option>
                    <option value="America/Argentina/Buenos_Aires">
                      America/Buenos_Aires (UTC-3)
                    </option>
                    <option value="America/Mexico_City">America/Mexico_City (UTC-6)</option>
                    <option value="America/Santiago">America/Santiago</option>
                    <option value="Europe/Madrid">Europe/Madrid</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1">
                    Plus Luz Nocturna desde 18:00 ($)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={settingsForm.night_light_surcharge ?? 4}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        night_light_surcharge: Number(e.target.value),
                      })
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
              Monitor de Reservas y Comprobantes ({bookings.length})
            </h2>

            {bookings.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#121620] border border-white/10 text-center text-sm text-zinc-400">
                No hay reservas registradas todavía.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {bookings.map((booking) => {
                  const playerPhoneClean = (
                    booking.player_phone ||
                    booking.guest_phone ||
                    ''
                  ).replace(/\D/g, '');

                  return (
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
                          <div className="flex items-center gap-2 flex-wrap">
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
                              {booking.is_block
                                ? 'BLOQUEO DE CANCHA'
                                : booking.status === 'confirmed'
                                  ? 'PAGADO'
                                  : booking.status === 'pending_payment'
                                    ? 'PENDIENTE VALIDACIÓN'
                                    : booking.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {booking.date_full} ({booking.duration_min} min)
                          </p>
                          <p className="text-xs text-emerald-400 font-semibold">
                            Jugador: {booking.user_name}{' '}
                            {booking.player_phone ? `(${booking.player_phone})` : ''} •
                            Monto: ${booking.total_price.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        {booking.payment_proof_url && (
                          <button
                            onClick={() => setViewingProofUrl(booking.payment_proof_url!)}
                            className="px-2.5 py-1.5 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-blue-500/30"
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              receipt_long
                            </span>
                            <span>Ver Comprobante</span>
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
                              `¡Hola ${booking.user_name}! El club ${clubSettings.club_name} ha APROBADO y confirmado tu reserva de pádel en ${booking.court_name} (${booking.date_full}). ¡Nos vemos en la pista! 🎾`
                            );
                            const waTarget = playerPhoneClean
                              ? `https://wa.me/${playerPhoneClean}?text=${text}`
                              : `https://wa.me/?text=${text}`;
                            window.open(waTarget, '_blank');
                          }}
                          className="px-2.5 py-1.5 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500 hover:text-zinc-950 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-emerald-500/20"
                          title="Enviar notificación por WhatsApp al teléfono del jugador"
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            send
                          </span>
                          <span>Avisar Jugador</span>
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
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DATABASE / SUPABASE SETUP */}
        {activeTab === 'database' && (
          <div className="bg-[#121620] border border-white/10 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-base font-bold text-white">
                  Esquema de Producción Supabase (RLS + GiST + Timezone + RPCs)
                </h2>
                <p className="text-xs text-zinc-400">
                  Copia el script SQL completo con 1 clic y ejecútalo en el SQL Editor de Supabase para actualizar triggers, políticas RLS y funciones.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(completeSetupSql);
                    showNotification('¡Script SQL completo copiado al portapapeles!');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-300 text-xs font-bold transition-all flex items-center gap-1.5 border border-emerald-500/30 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                  <span>Copiar SQL Completo</span>
                </button>

                <a
                  href="https://supabase.com/dashboard/project/sembcqfavhepdyctgkcp/sql/new"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                  <span>Abrir SQL Editor Supabase</span>
                </a>
              </div>
            </div>

            <pre className="bg-[#0b0e14] border border-white/5 rounded-xl p-4 text-[11px] font-mono text-zinc-300 max-h-96 overflow-y-auto whitespace-pre-wrap">
              {completeSetupSql}
            </pre>
          </div>
        )}
      </div>

      {/* Modal: Crear Nueva Cancha */}
      {isNewCourtModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121620] border border-white/10 rounded-3xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white">
                Crear Nueva Pista en el Club
              </h3>
              <button
                onClick={() => setIsNewCourtModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateNewCourt} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1">
                    Etiqueta Corta
                  </label>
                  <input
                    type="text"
                    required
                    value={courtForm.court_number_label}
                    onChange={(e) =>
                      setCourtForm({ ...courtForm, court_number_label: e.target.value })
                    }
                    placeholder="Pista 4"
                    className="w-full bg-[#181d2a] border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1">
                    Categoría Filtro
                  </label>
                  <select
                    value={courtForm.category}
                    onChange={(e) =>
                      setCourtForm({
                        ...courtForm,
                        category: e.target.value as 'panoramica' | 'techada' | 'exterior',
                      })
                    }
                    className="w-full bg-[#181d2a] border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    <option value="panoramica">Panorámica Pro</option>
                    <option value="techada">Cristal Techada</option>
                    <option value="exterior">Pista Exterior</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">
                  Nombre Oficial de la Pista
                </label>
                <input
                  type="text"
                  required
                  value={courtForm.name}
                  onChange={(e) => setCourtForm({ ...courtForm, name: e.target.value })}
                  className="w-full bg-[#181d2a] border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">
                  Tipo / Superficie
                </label>
                <input
                  type="text"
                  required
                  value={courtForm.type}
                  onChange={(e) => setCourtForm({ ...courtForm, type: e.target.value })}
                  className="w-full bg-[#181d2a] border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-bold text-emerald-400 block mb-1">
                    60 Min ($)
                  </label>
                  <input
                    type="number"
                    required
                    value={courtForm.hourly_rate}
                    onChange={(e) =>
                      setCourtForm({ ...courtForm, hourly_rate: Number(e.target.value) })
                    }
                    className="w-full bg-[#181d2a] border border-zinc-700 rounded-xl px-2.5 py-2 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-emerald-400 block mb-1">
                    90 Min ($)
                  </label>
                  <input
                    type="number"
                    required
                    value={courtForm.rate_for_90m}
                    onChange={(e) =>
                      setCourtForm({ ...courtForm, rate_for_90m: Number(e.target.value) })
                    }
                    className="w-full bg-[#181d2a] border border-zinc-700 rounded-xl px-2.5 py-2 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-emerald-400 block mb-1">
                    120 Min ($)
                  </label>
                  <input
                    type="number"
                    required
                    value={courtForm.rate_for_120m}
                    onChange={(e) =>
                      setCourtForm({ ...courtForm, rate_for_120m: Number(e.target.value) })
                    }
                    className="w-full bg-[#181d2a] border border-zinc-700 rounded-xl px-2.5 py-2 text-sm text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">
                  Descripción
                </label>
                <textarea
                  rows={2}
                  value={courtForm.description}
                  onChange={(e) =>
                    setCourtForm({ ...courtForm, description: e.target.value })
                  }
                  className="w-full bg-[#181d2a] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewCourtModalOpen(false)}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-xs shadow-md"
                >
                  Crear Pista
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-bold text-emerald-400 block mb-1">
                    60 Min ($)
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
                    className="w-full bg-[#181d2a] border border-zinc-700 rounded-xl px-2.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-emerald-400 block mb-1">
                    90 Min ($)
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
                    className="w-full bg-[#181d2a] border border-zinc-700 rounded-xl px-2.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-emerald-400 block mb-1">
                    120 Min ($)
                  </label>
                  <input
                    type="number"
                    value={courtForm.rate_for_120m}
                    onChange={(e) =>
                      setCourtForm({
                        ...courtForm,
                        rate_for_120m: Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#181d2a] border border-zinc-700 rounded-xl px-2.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
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
                <span className="material-symbols-outlined text-emerald-400">
                  receipt_long
                </span>
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
