/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  NavView,
  UserProfile,
  Court,
  Booking,
  ToastMessage,
  Amenity,
  ClubSettings,
  OpenMatch,
} from './types';
import {
  getStoredProfile,
  getStoredBookings,
  getStoredCourts,
  getStoredAmenities,
  getStoredClubSettings,
  getStoredOpenMatch,
  createBookingInDb,
  cancelBookingInDb,
  uploadPaymentProofInDb,
  confirmPaymentByCancheroInDb,
  blockCourtSlotInDb,
  toggleJoinOpenMatchInDb,
  signOutUser,
  updateUserProfileInDb,
  getBookingsWithRLS,
  fetchCourtsFromSupabase,
  fetchClubSettingsFromSupabase,
  fetchAmenitiesFromSupabase,
  fetchBookingsFromSupabase,
  fetchOpenMatchFromSupabase,
  subscribeToRealtimeBookings,
  requestNotificationPermission,
  syncAuthenticatedUserFromSupabase,
} from './apiService';
import { supabase, isSupabaseConfigured } from './supabaseClient';

import { AppHeader } from './components/AppHeader';
import { BottomNav } from './components/BottomNav';
import { ToastNotification } from './components/ToastNotification';
import { UserProfileModal } from './components/UserProfileModal';
import { AuthModal } from './components/AuthModal';
import { MatchDetailModal } from './components/MatchDetailModal';
import { OfflineIndicator } from './components/OfflineIndicator';

import { CanchasScreen } from './screens/CanchasScreen';
import { ReservarScreen } from './screens/ReservarScreen';
import { PartidosScreen } from './screens/PartidosScreen';
import { ClubScreen } from './screens/ClubScreen';

export default function App() {
  // Global View and State (App.tsx is the Router & State Coordinator)
  const [view, setView] = useState<NavView>('canchas');
  const [user, setUser] = useState<UserProfile>(getStoredProfile);
  const [courts, setCourts] = useState<Court[]>(getStoredCourts);
  const [bookings, setBookings] = useState<Booking[]>(getStoredBookings);
  const [amenities, setAmenities] = useState<Amenity[]>(getStoredAmenities);
  const [clubSettings, setClubSettings] = useState<ClubSettings>(getStoredClubSettings);
  const [openMatch, setOpenMatch] = useState<OpenMatch>(getStoredOpenMatch);
  const [selectedCourtId, setSelectedCourtId] = useState<string>(
    getStoredCourts()[0]?.id || '00000000-0000-0000-0000-000000000001'
  );
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);

  // Modals & Floating Components
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authPromptMessage, setAuthPromptMessage] = useState<string | undefined>(undefined);
  const [pendingBookingPayload, setPendingBookingPayload] = useState<{
    court: Court;
    dateIso: string;
    dateLabel: string;
    dateFull: string;
    timeSlot: string;
    durationMin: number;
    totalPrice: number;
    courtPrice: number;
    lightingPrice: number;
    teamNotes: string;
  } | null>(null);
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);

  const showToast = useCallback(
    (
      title: string,
      description: string,
      type: 'success' | 'info' | 'error' = 'success'
    ) => {
      setToast({ id: `toast-${Date.now()}`, title, description, type });
    },
    []
  );

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 3800);
    return () => clearTimeout(timer);
  }, [toast]);

  // Synchronize auth session, courts, settings, amenities, bookings, and open matches
  useEffect(() => {
    syncAuthenticatedUserFromSupabase().then((syncedUser) => {
      if (syncedUser) {
        setUser(syncedUser);
      }
    });

    fetchClubSettingsFromSupabase().then((settings) => setClubSettings(settings));
    fetchAmenitiesFromSupabase().then((items) => setAmenities(items));

    fetchBookingsFromSupabase().then((b) => {
      setBookings(b);
      fetchCourtsFromSupabase().then((loaded) => {
        if (loaded && loaded.length > 0) {
          setCourts(loaded);
          setSelectedCourtId((prev) =>
            loaded.some((c) => c.id === prev) ? prev : loaded[0].id
          );
        }
      });
    });

    fetchOpenMatchFromSupabase(user.id).then((m) => setOpenMatch(m));

    // Listen to Supabase Auth state changes
    let authSub: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const synced = await syncAuthenticatedUserFromSupabase();
          if (synced) setUser(synced);
        }
      });
      authSub = data.subscription;
    }

    // Subscribe to Supabase Realtime changes on bookings
    const unsubscribeBookings = subscribeToRealtimeBookings(
      (updatedList) => {
        setBookings(updatedList);
      },
      (confirmedBooking) => {
        showToast(
          '¡Pago Confirmado por el Club! 🎾',
          `Tu turno en ${confirmedBooking.court_name} (${confirmedBooking.start_time}) está 100% confirmado.`
        );
      }
    );

    return () => {
      unsubscribeBookings();
      if (authSub) authSub.unsubscribe();
    };
  }, [showToast]);

  // Actions passed down to components
  const handleNavigate = (newView: NavView) => {
    setView(newView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCourtForBooking = (courtId: string, _preselectedSlot?: string) => {
    setSelectedCourtId(courtId);
    setView('reservar');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const executeBookingCreation = async (
    data: {
      court: Court;
      dateIso: string;
      dateLabel: string;
      dateFull: string;
      timeSlot: string;
      durationMin: number;
      totalPrice: number;
      courtPrice: number;
      lightingPrice: number;
      teamNotes: string;
    },
    bookingUser: UserProfile
  ) => {
    try {
      // Request notification permission only upon explicit user booking action
      requestNotificationPermission();

      const newBooking = await createBookingInDb({
        court: data.court,
        dateIso: data.dateIso,
        dateLabel: data.dateLabel,
        dateFull: data.dateFull,
        timeSlot: data.timeSlot,
        durationMin: data.durationMin,
        totalPrice: data.totalPrice,
        courtPrice: data.courtPrice,
        lightingPrice: data.lightingPrice,
        teamNotes: data.teamNotes,
        user: bookingUser,
      });

      setBookings((prev) => [newBooking, ...prev.filter((b) => b.id !== newBooking.id)]);
      showToast(
        '¡Pista Reservada!',
        `Turno ${data.timeSlot} registrado en ${data.court.name}. Sube tu comprobante para confirmar.`
      );
      setView('mis-partidos');
    } catch (err: any) {
      showToast(
        'No se pudo reservar',
        err?.message || 'Verifica la disponibilidad del horario e intenta de nuevo.',
        'error'
      );
    }
  };

  const handleBookingConfirmed = async (data: {
    court: Court;
    dateIso: string;
    dateLabel: string;
    dateFull: string;
    timeSlot: string;
    durationMin: number;
    totalPrice: number;
    courtPrice: number;
    lightingPrice: number;
    teamNotes: string;
  }) => {
    if (!user.is_authenticated) {
      setPendingBookingPayload(data);
      setAuthPromptMessage(
        `Inicia sesión o regístrate en segundos para confirmar tu reserva en ${data.court.name} (${data.timeSlot}) y recibir alertas de tu partido.`
      );
      setIsAuthModalOpen(true);
      return;
    }

    await executeBookingCreation(data, user);
  };

  const handleAuthSuccess = async (authenticatedUser: UserProfile, message: string) => {
    setUser(authenticatedUser);
    showToast('Sesión Iniciada', message);

    if (pendingBookingPayload) {
      const payload = pendingBookingPayload;
      setPendingBookingPayload(null);
      await executeBookingCreation(payload, authenticatedUser);
    } else {
      const refreshedBookings = await fetchBookingsFromSupabase();
      setBookings(refreshedBookings);
    }
  };

  const handleQuickBookingSuccess = () => {
    setBookings(getStoredBookings());
    showToast(
      '¡Turno Reservado con Éxito!',
      'Comprobante listo para enviar por WhatsApp.'
    );
    setView('mis-partidos');
  };

  const handleUploadPaymentProof = async (bookingId: string, proofUrl?: string) => {
    if (!proofUrl) return;
    const updated = await uploadPaymentProofInDb(bookingId, proofUrl);
    setBookings(updated);
    showToast(
      '¡Comprobante Enviado!',
      'El administrador del club recibirá tu comprobante en tiempo real.'
    );
  };

  const handleCancelBooking = async (bookingId: string) => {
    const updated = await cancelBookingInDb(bookingId);
    setBookings(updated);
    showToast('Turno Cancelado', 'La pista quedó liberada para otros jugadores.');
  };

  const handleInvitePlayers = async (booking: Booking) => {
    const shareUrl = `${window.location.origin}/?match=${booking.id}`;
    const shareText = `🎾 ¡Partido de Pádel en ${clubSettings.club_name}! Cancha: ${booking.court_name} • Horario: ${booking.date_full}. Súmate aquí: ${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Partido en ${clubSettings.club_name}`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).catch(() => {});
    }
    showToast('¡Invitación Copiada!', 'El enlace del partido se copió al portapapeles.');
  };

  const handleCopyBankAlias = (alias: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(alias).catch(() => {});
    }
    showToast('¡Alias copiado!', `Alias ${alias} copiado al portapapeles.`);
  };

  const handleJoinOpenMatch = async () => {
    if (!user.is_authenticated) {
      setAuthPromptMessage(
        'Inicia sesión o regístrate para sumarte como 4to jugador al partido abierto.'
      );
      setIsAuthModalOpen(true);
      return;
    }

    const res = await toggleJoinOpenMatchInDb(openMatch.id, user);
    setOpenMatch(res.match);
    showToast(
      res.joined ? '¡Sumado al partido!' : 'Has salido del partido',
      res.message
    );
  };

  const handleAutoSlot = () => {
    const activeCourts = courts.filter((c) => c.is_active);
    if (activeCourts.length > 0) {
      setSelectedCourtId(activeCourts[0].id);
    }
    setView('reservar');
    showToast(
      'Reserva Relámpago',
      `Seleccionamos ${activeCourts[0]?.name || 'Pista Central'} con los mejores horarios libres de hoy.`
    );
  };

  const handleToggleAdminMode = (wantAdmin: boolean) => {
    if (!wantAdmin) {
      setIsAdminMode(false);
      return;
    }

    if (user.role === 'club_admin' || user.role === 'superadmin') {
      setIsAdminMode(true);
      return;
    }

    // Redirect or prompt authentication if not an admin
    showToast(
      'Acceso Restringido a Cancheros',
      'Inicia sesión con tu cuenta de administrador o configura el club desde /admin.',
      'info'
    );
    window.location.href = '/admin';
  };

  const handleConfirmCancheroPayment = async (bookingId: string) => {
    const updated = await confirmPaymentByCancheroInDb(bookingId);
    setBookings(updated);
    showToast(
      '¡Pago Confirmado en Mostrador!',
      'El jugador ha sido notificado automáticamente.'
    );
  };

  const handleBlockCourtSlot = async (params: {
    courtId: string;
    courtName: string;
    dateStr: string;
    timeSlot: string;
    reason: string;
  }) => {
    const res = await blockCourtSlotInDb(params);
    if (res.success) {
      setBookings(res.bookings);
      showToast(
        '¡Horario Bloqueado!',
        `${params.courtName} (${params.timeSlot}) bloqueada por: ${params.reason}`
      );
    } else {
      showToast(
        'Error al bloquear',
        res.error || 'Verifica tener permisos de administrador.',
        'error'
      );
    }
  };

  const handleUpdateProfile = async (updatedFields: Partial<UserProfile>) => {
    const updated = await updateUserProfileInDb(updatedFields);
    setUser(updated);
  };

  const handleSignOut = async () => {
    const guest = await signOutUser();
    setUser(guest);
    setIsAdminMode(false);
    showToast('Sesión Cerrada', 'Has cerrado sesión correctamente.');
  };

  const userVisibleBookings = getBookingsWithRLS(user);
  const hasPending = userVisibleBookings.some((b) => b.status === 'pending_payment');

  return (
    <div className="bg-[#0f131c] text-[#dfe2ef] min-h-screen flex flex-col font-sans selection:bg-[#10b981] selection:text-[#00422b]">
      {/* Dynamic Toast Notification */}
      <ToastNotification toast={toast} onClose={() => setToast(null)} />

      {/* Offline Connectivity Indicator */}
      <OfflineIndicator />

      {/* Global App Header */}
      <AppHeader
        user={user}
        onOpenProfile={() => setIsProfileModalOpen(true)}
      />

      {/* Main View Router Content */}
      <main className="flex-1 flex flex-col w-full max-w-lg mx-auto px-4 pt-20 pb-28">
        {view === 'canchas' && (
          <CanchasScreen
            user={user}
            courts={courts.filter((c) => c.is_active)}
            openMatch={openMatch}
            clubSettings={clubSettings}
            onSelectCourtForBooking={handleSelectCourtForBooking}
            onJoinOpenMatch={handleJoinOpenMatch}
            onAutoSlot={handleAutoSlot}
            isMatchJoined={Boolean(openMatch.is_joined)}
          />
        )}

        {view === 'reservar' && (
          <ReservarScreen
            user={user}
            courts={courts.filter((c) => c.is_active)}
            selectedCourtId={selectedCourtId}
            onCourtChange={(courtId) => setSelectedCourtId(courtId)}
            onBookingConfirmed={handleBookingConfirmed}
            onQuickBookingSuccess={handleQuickBookingSuccess}
            onRequireAuth={() => {
              setAuthPromptMessage(
                'Inicia sesión o regístrate para reservar tu turno vía Selector Rápido.'
              );
              setIsAuthModalOpen(true);
            }}
          />
        )}

        {view === 'mis-partidos' && (
          <PartidosScreen
            bookings={userVisibleBookings}
            onUploadPaymentProof={handleUploadPaymentProof}
            onCancelBooking={handleCancelBooking}
            onInvitePlayers={handleInvitePlayers}
            onCopyBankAlias={handleCopyBankAlias}
            onViewBookingDetails={(b) => setDetailBooking(b)}
          />
        )}

        {view === 'club-info' && (
          <ClubScreen
            user={user}
            bookings={bookings}
            courts={courts}
            amenities={amenities}
            clubSettings={clubSettings}
            isAdminMode={isAdminMode}
            onToggleAdminMode={handleToggleAdminMode}
            onConfirmCancheroPayment={handleConfirmCancheroPayment}
            onBlockCourtSlot={handleBlockCourtSlot}
          />
        )}
      </main>

      {/* Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        user={user}
        onClose={() => setIsProfileModalOpen(false)}
        onUpdateProfile={handleUpdateProfile}
        onOpenAuthModal={() => {
          setAuthPromptMessage(undefined);
          setIsAuthModalOpen(true);
        }}
        onSignOut={handleSignOut}
        onShowToast={showToast}
      />

      {/* Supabase Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingBookingPayload(null);
        }}
        onAuthSuccess={handleAuthSuccess}
        promptMessage={authPromptMessage}
      />

      {/* Booking Details Modal */}
      <MatchDetailModal
        booking={detailBooking}
        onClose={() => setDetailBooking(null)}
        onInvite={handleInvitePlayers}
      />

      {/* Bottom Navigation Bar */}
      <BottomNav
        currentView={view}
        onNavigate={handleNavigate}
        hasPendingPayment={hasPending}
      />
    </div>
  );
}
