/**
 * Types and interfaces for Padel Assist Pro
 * Matches the PostgreSQL schema and frontend components
 */

export type UserRole = 'customer' | 'club_admin' | 'superadmin';

export interface UserProfile {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  avatar_url?: string;
  role: UserRole;
  category?: string;
  initials?: string;
  is_authenticated?: boolean;
  created_at?: string;
}

export type CourtFilterType = 'all' | 'panoramica' | 'techada' | 'exterior';

export interface CourtSpec {
  icon: string;
  label: string;
  colorClass?: string;
}

export interface QuickSlot {
  time: string;
  available: boolean;
}

export interface Court {
  id: string;
  name: string;
  type: string;
  category: 'panoramica' | 'techada' | 'exterior';
  court_number_label: string;
  is_active: boolean;
  hourly_rate: number;
  rate_for_90m: number;
  rate_for_120m?: number;
  photos: string[];
  description: string;
  specs: CourtSpec[];
  quick_slots: QuickSlot[];
  banner_badge: string;
  banner_color: string;
  instant_badge: string;
  is_favorite?: boolean;
}

export interface Amenity {
  id: string;
  title: string;
  category: 'alquiler' | 'tienda' | 'servicio_gratis';
  price: number;
  is_available: boolean;
  icon?: string;
  image_url?: string;
  subtitle?: string;
}

export type BookingStatus = 'pending_payment' | 'confirmed' | 'cancelled' | 'completed';

export interface PlayerSlot {
  name: string;
  avatar?: string;
  initials?: string;
  is_captain?: boolean;
}

export interface Booking {
  id: string;
  court_id: string;
  court_name: string;
  court_type: string;
  court_image: string;
  court_badge?: string;
  user_id: string;
  user_name: string;
  player_phone?: string;
  guest_name?: string;
  guest_phone?: string;
  start_time: string;
  end_time: string;
  start_iso?: string;
  end_iso?: string;
  date_iso?: string;
  date_label: string;
  date_full: string;
  duration_min: number;
  court_price: number;
  lighting_price: number;
  total_price: number;
  status: BookingStatus;
  payment_proof_url?: string;
  payment_method?: string;
  notes?: string;
  is_block?: boolean;
  players: PlayerSlot[];
  max_players: number;
  location_label: string;
  countdown_text?: string;
  created_at: string;
}

export interface AvailableSlotResult {
  slot_start: string;
  slot_end: string;
  slot_start_iso?: string;
  slot_end_iso?: string;
  time_range: string;
  is_available: boolean;
  period: 'morning' | 'afternoon' | 'night';
  price: number;
  tag?: string;
  status: 'available' | 'booked' | 'in_game';
}

export interface TimeSlot {
  id: string;
  time_range: string;
  start_hour: string;
  period: 'morning' | 'afternoon' | 'night';
  price: number;
  label?: string;
  status: 'available' | 'booked' | 'in_game' | 'selected' | 'blocked';
  is_last?: boolean;
}

export interface CalendarDayItem {
  dateStr: string;
  dayName: string;
  dayNum: string;
  label: string;
  fullLabel: string;
  monthYearLabel: string;
  weekLabel: string;
  isToday: boolean;
}

export interface OpenMatchPlayer {
  id?: string;
  user_id?: string;
  player_name: string;
  initials: string;
}

export interface OpenMatch {
  id: string;
  court_id: string;
  court_name: string;
  match_time: string;
  category_label: string;
  description: string;
  max_players: number;
  players: OpenMatchPlayer[];
  is_joined?: boolean;
}

export type NavView = 'canchas' | 'reservar' | 'mis-partidos' | 'club-info';

export interface ToastMessage {
  id: string;
  title: string;
  description: string;
  type?: 'success' | 'info' | 'error';
}

export interface ClubSettings {
  club_name: string;
  whatsapp_phone: string;
  cbu_alias: string;
  cbu_number: string;
  bank_name?: string;
  account_holder?: string;
  address: string;
  timezone?: string;
  open_time?: string;
  close_time?: string;
  night_light_surcharge?: number;
  unpaid_expiry_minutes?: number;
}
