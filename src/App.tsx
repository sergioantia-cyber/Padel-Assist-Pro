/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useCallback } from 'react';
import { NavView, UserProfile, Court, Booking, ToastMessage } from './types';
import {
  getStoredProfile,
  getStoredBookings,
  getStoredCourts,
  createBookingInDb,
  cancelBookingInDb,
  uploadPaymentProofInDb,
  confirmPaymentByCancheroInDb,
  blockCourtSlotInDb,
  joinOpenMatchInDb,
  resetUserProfileInDb,
  updateUserProfileInDb,
  getBookingsWithRLS,
  fetchCourtsFromSupabase,
  fetchClubSettingsFromSupabase,
  fetchBookingsFromSupabase,
  subscribeToRealtimeBookings,
  requestNotificationPermission,
} from './apiService';

import { AppHeader } from './components/AppHeader';
import { BottomNav } from './components/BottomNav';
import { ToastNotification } from './components/ToastNotification';
import { UserProfileModal } from './components/UserProfileModal';
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
  const [selectedCourtId, setSelectedCourtId] = useState<string>('court-1');
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [isMatchJoined, setIsMatchJoined] = useState<boolean>(false);

  // Modals & Floating Components
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);

  // Sync admin mode when user role changes
  useEffect(() => {
    if (user.role === 'club_admin') {
      setIsAdminMode(true);
    }
  }, [user.role]);

  // Synchronize courts, settings, and bookings from Supabase live database with Realtime
  useEffect(() => {
    fetchCourtsFromSupabase().then((loaded) => {
      if (loaded && loaded.length > 0) {
        setCourts(loaded);
        setSelectedCourtId(loaded[0].id);
      }
    });
    fetchClubSettingsFromSupabase();
    fetchBookingsFromSupabase().then((b) => {
      if (b && b.length > 0) setBookings(b);
    });

    // Request notification permission quietly on mount
    requestNotificationPermission();

    // Subscribe to Supabase Realtime changes
    const unsubscribe = subscribeToRealtimeBookings(
      (updatedList) => {
        setBookings(updatedList);
      },
      (confirmedBooking) => {
        showToast(
          '¡Pago Confirmado por el Club! 🎾',
          `Tu turno en ${confirmedBooking.court_name} está 100% confirmado.`
        );
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Toast Helper
  const showToast = useCallback((title: string, description: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ id: `toast-${Date.now()}`, title, description, type });
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast]);

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

  const handleBookingConfirmed = async (data: {
    court: Court;
    dateLabel: string;
    dateFull: string;
    timeSlot: string;
    durationMin: number;
    totalPrice: number;
    courtPrice: number;
    lightingPrice: number;
    teamNotes: string;
  }) => {
    const newBooking = await createBookingInDb({
      court: data.court,
      dateLabel: data.dateLabel,
      dateFull: data.dateFull,
      timeSlot: data.timeSlot,
      durationMin: data.durationMin,
      totalPrice: data.totalPrice,
      courtPrice: data.courtPrice,
      lightingPrice: data.lightingPrice,
      teamNotes: data.teamNotes,
      user,
    });
    setBookings((prev) => [newBooking, ...prev]);
    showToast('¡Pista Reservada!', 'Se ha bloqueado tu turno en ' + data.court.name);
    setView('mis-partidos');
  };

  const handleQuickBookingSuccess = () => {
    setBookings(getStoredBookings());
    showToast('¡Turno Reservado con Éxito!', 'Comprobante listo para enviar por WhatsApp.');
    setView('mis-partidos');
  };

  const handleUploadPaymentProof = async (bookingId: string, proofUrl?: string) => {
    const updated = await uploadPaymentProofInDb(bookingId, proofUrl);
    setBookings(updated);
    showToast('¡Comprobante Enviado!', 'Estamos validando tu comprobante de pago.');
  };

  const handleCancelBooking = async (bookingId: string) => {
    const updated = await cancelBookingInDb(bookingId);
    setBookings(updated);
    showToast('Turno Cancelado', 'La pista quedó liberada para otros jugadores.');
  };

  const handleInvitePlayers = (booking: Booking) => {
    const shareUrl = `https://padelassist.app/match/${booking.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    showToast('¡Enlace copiado!', 'Enlace de partido copiado al portapapeles.');
  };

  const handleCopyBankAlias = (alias: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(alias).catch(() => {});
    }
    showToast('¡Alias copiado!', `Alias ${alias} copiado al portapapeles.`);
  };

  const handleJoinOpenMatch = async () => {
    const res = await joinOpenMatchInDb(user);
    setIsMatchJoined(true);
    showToast('¡Sumado al partido!', res.message);
  };

  const handleAutoSlot = () => {
    setSelectedCourtId('court-1');
    setView('reservar');
    showToast('Reserva Relámpago', 'Seleccionamos la mejor pista para hoy 18:00 hs');
  };

  const handleConfirmCancheroPayment = async () => {
    // Confirm the first pending booking if available
    const pending = bookings.find((b) => b.status === 'pending_payment');
    if (pending) {
      const updated = await confirmPaymentByCancheroInDb(pending.id);
      setBookings(updated);
    }
    showToast('¡Pago Confirmado en Mostrador!', 'Turno 18:00 Pista 1 marcado como Pagado.');
  };

  const handleBlockCourtSlot = async (courtName: string, reason: string) => {
    await blockCourtSlotInDb(courtName, '18:00', reason);
    showToast('¡Slot Bloqueado!', `${courtName} congelada por: ${reason}`);
  };

  const handleSwitchUserRole = async () => {
    const nextRole = user.role === 'club_admin' ? 'customer' : 'club_admin';
    const updated = await updateUserProfileInDb({
      role: nextRole,
      full_name: nextRole === 'club_admin' ? 'Canchero Juan' : 'Martín Gómez',
    });
    setUser(updated);
    setIsAdminMode(nextRole === 'club_admin');
    showToast(
      'Rol Actualizado',
      `Ahora estás en modo ${nextRole === 'club_admin' ? 'Canchero Admin' : 'Jugador'}`
    );
  };

  const handleResetData = async () => {
    const reset = await resetUserProfileInDb();
    setUser(reset);
    setCourts(getStoredCourts());
    setBookings(getStoredBookings());
    setIsAdminMode(false);
    setIsMatchJoined(false);
    showToast('Datos Reiniciados', 'La aplicación volvió a su estado inicial de demostración.');
  };

  const hasPending = bookings.some((b) => b.status === 'pending_payment');

  return (
    <div className="bg-[#0f131c] text-[#dfe2ef] min-h-screen flex flex-col font-sans selection:bg-[#10b981] selection:text-[#00422b]">
      {/* Dynamic Toast Notification */}
      <ToastNotification
        toast={toast}
        onClose={() => setToast(null)}
      />

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
            courts={courts}
            onSelectCourtForBooking={handleSelectCourtForBooking}
            onJoinOpenMatch={handleJoinOpenMatch}
            onAutoSlot={handleAutoSlot}
            isMatchJoined={isMatchJoined}
          />
        )}

        {view === 'reservar' && (
          <ReservarScreen
            user={user}
            courts={courts}
            selectedCourtId={selectedCourtId}
            onCourtChange={(courtId) => setSelectedCourtId(courtId)}
            onBookingConfirmed={handleBookingConfirmed}
            onQuickBookingSuccess={handleQuickBookingSuccess}
          />
        )}

        {view === 'mis-partidos' && (
          <PartidosScreen
            bookings={getBookingsWithRLS(user)}
            onUploadPaymentProof={handleUploadPaymentProof}
            onCancelBooking={handleCancelBooking}
            onInvitePlayers={handleInvitePlayers}
            onCopyBankAlias={handleCopyBankAlias}
            onViewBookingDetails={(b) => setDetailBooking(b)}
          />
        )}

        {view === 'club-info' && (
          <ClubScreen
            isAdminMode={isAdminMode}
            onToggleAdminMode={(admin) => setIsAdminMode(admin)}
            onConfirmCancheroPayment={handleConfirmCancheroPayment}
            onBlockCourtSlot={handleBlockCourtSlot}
            onShowToast={showToast}
          />
        )}
      </main>

      {/* Profile & Role Management Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        user={user}
        onClose={() => setIsProfileModalOpen(false)}
        onSwitchRole={handleSwitchUserRole}
        onResetDb={handleResetData}
        onShowToast={showToast}
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
