/**
 * API & Data Service for Padel Assist Pro
 * Centralized business logic, Supabase Auth, Realtime, Storage, RPCs, and local fallback
 */
import {
  Court,
  Amenity,
  Booking,
  UserProfile,
  AvailableSlotResult,
  ClubSettings,
  CalendarDayItem,
  OpenMatch,
} from './types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const STORAGE_KEY_PROFILE = 'padel_assist_profile_v2';
const STORAGE_KEY_BOOKINGS = 'padel_assist_bookings_v2';
const STORAGE_KEY_COURTS = 'padel_assist_courts_v2';
const STORAGE_KEY_SETTINGS = 'padel_assist_club_settings_v2';
const STORAGE_KEY_AMENITIES = 'padel_assist_amenities_v2';
const STORAGE_KEY_OPEN_MATCH = 'padel_assist_open_match_v2';

export const DEFAULT_CLUB_SETTINGS: ClubSettings = {
  club_name: 'Club Central Padel & Sport',
  whatsapp_phone: import.meta.env?.VITE_CLUB_WHATSAPP_PHONE || '573001234567',
  cbu_alias: 'PADEL.CENTRAL.PRO',
  cbu_number: '0000003100045892348210',
  bank_name: 'Bancolombia / Nequi',
  account_holder: 'Padel Assist Club S.A.S.',
  address: 'Av. Los Pinos 1420, Sede Norte',
  timezone: 'America/Bogota',
  open_time: '07:00:00',
  close_time: '23:00:00',
  night_light_surcharge: 4.0,
  unpaid_expiry_minutes: 30,
};

export const INITIAL_CUSTOMER_PROFILE: UserProfile = {
  id: 'usr-guest-player',
  full_name: 'Invitado Padel',
  phone: '',
  avatar_url:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAoQl5X_m2cV9bRK7RlnPofFbj31grok4OcvQMhxbj97bNO-T2O68G0UZrYP-AHwkLyL_fRO58jKMvAQ0xbn2TLcGTR1muCm7QhwfiL9M-HbviGaxeqFFYUGi_4-ZzPgIpibfrIIyUgfq2Z_97lo08PoZP32Kve65N4-Fxeh7KILLPamE6jxXT_3Y4HCfNUKZTZ-YuhHB0HZG526gv9NW02LJPREO7WsPBJBoTgvbhlf3Oj7QZyyy9R',
  role: 'customer',
  category: '5ª Categoría',
  initials: 'IP',
  is_authenticated: false,
  created_at: new Date().toISOString(),
};

export const INITIAL_ADMIN_PROFILE: UserProfile = {
  id: 'usr-admin-canchero-01',
  full_name: 'Administrador del Club',
  phone: '+57 300 123 4567',
  avatar_url:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDdwN3_m35iby1EBxOpB81Zc_PhQCCBDL4y7y-TZCq7y-bdnHS5UeabwRvDJQC4101ECAMoH6utokS2GS2IPDWLp8PCZlGdVxmaeZRBZM42vLD4v-JWDVoaEy7URbszVfDgqqo-i8NVnrjticS3pR3CAs4a3GcD4BnXlyt3mqrY0qmMljjIMinYfZJXBPoQprbkVo63lRXLKikkNeQv-zaj5dImguCAB-1ZQNufdurrXLQikkjY8T55',
  role: 'club_admin',
  category: 'Administrador Club',
  initials: 'AC',
  is_authenticated: true,
  created_at: new Date().toISOString(),
};

const INITIAL_COURTS: Court[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Pista Central Panorámica',
    type: 'Cristal Techada WPT',
    category: 'panoramica',
    court_number_label: 'Pista 1',
    is_active: true,
    hourly_rate: 20,
    rate_for_90m: 28,
    rate_for_120m: 36,
    photos: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBpdWVwxteW1lne-q0LehSbx0IbRB0yRQ0gEpfhh0AfCyPZG60ejG6UZb6efs-u_mWVE0Hq-AKsC-5_EzHequQwJSz9ZvZz4umAmYfqiyd0D8R1uF4JNs97gDOJ3N4ISdCSmOwlD4jDThfflcwqJh8wmCOOKKgAzPf6EQ5rXtFUnYXuTShLIguloUMbOQpak6uWLwudTx7U0Ca4RGrvHJGA990TTEjDVpMNj50e7QUcq8Cdj5gZkTGB',
    ],
    description:
      'Pista oficial World Padel Tour de cristal templado de 12mm con césped monofilamento azul y gradas para espectadores.',
    banner_badge: 'Panorámica Pro',
    banner_color: 'text-primary',
    instant_badge: 'Turnos libres hoy',
    is_favorite: false,
    specs: [
      { icon: 'layers', label: 'Césped WPT Blue', colorClass: 'text-tertiary' },
      { icon: 'lightbulb', label: 'LED 8x Pro 500 Lux', colorClass: 'text-primary' },
      { icon: 'shield', label: 'Cristal 12mm', colorClass: 'text-secondary' },
    ],
    quick_slots: [
      { time: '17:00', available: true },
      { time: '18:30', available: true },
      { time: '20:00', available: true },
    ],
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Pista Indoor 2 Climatizada',
    type: 'Cristal Climatizada',
    category: 'techada',
    court_number_label: 'Pista 2',
    is_active: true,
    hourly_rate: 18,
    rate_for_90m: 26,
    rate_for_120m: 34,
    photos: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDrbGNhB6aWR6j-BIbwvQH1F8GUhAUz8EEXtqkxQDC7U1p8mZWg8pP93O_XXspeQEOPtjaTtXr-gueV0jZoj65OC8DHs6scWzxSEU5RVlIQ8VIUmWR8LwS8IwNmKymvx6jdkKBWZhbS_ml9AZ-101V4lUT0JYxIuYfl7Wcr5F6KpxHukWgZ6dTWWuWvGWl4mJ2NIOMCkxbvZ_RI6KFYZSn8qsZDpnh9QBfhbIC6h7BYcw1WnfUq0eOF',
    ],
    description:
      'Ambiente climatizado con absorción acústica y luz LED cenital antirreflejo para partidos de máxima exigencia.',
    banner_badge: 'Techada Cubierta',
    banner_color: 'text-secondary',
    instant_badge: 'Turnos libres hoy',
    is_favorite: false,
    specs: [
      { icon: 'eco', label: 'Césped Texturizado Verde', colorClass: 'text-primary' },
      { icon: 'ac_unit', label: 'Climatizada Anti-lluvia', colorClass: 'text-tertiary' },
      { icon: 'volume_down', label: 'Insonorizada', colorClass: 'text-secondary' },
    ],
    quick_slots: [
      { time: '16:30', available: true },
      { time: '18:00', available: true },
      { time: '19:30', available: true },
    ],
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Pista Open Air 3 Exterior',
    type: 'Malla Descubierta',
    category: 'exterior',
    court_number_label: 'Pista 3',
    is_active: true,
    hourly_rate: 15,
    rate_for_90m: 20,
    rate_for_120m: 28,
    photos: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCSb512bav7YVwR-NxW4KAYnX6i7mkcLGAstZlhnZtoo4ghAxLY-nlal9Zu-yhujQKeRrHOuRkCVQ23X1L-pyTwsJOGu9JMMQz01uEyxeCeWOikEoBz9axq1s9RgvJl-kBKEVaqVap9h0BWPvs_4q1b513POJm_svxXnMoB7_LYGwM-WrpFv8cj8HZ5s9T8XqUVaBOI8ovSenbFRyE4Hz5Gftg6q7AqqGBCGLZxTZ4rEQmYyh8mfaCV',
    ],
    description:
      'Sensación de juego al aire libre con iluminación halógena para disfrutar del juego nocturno bajo las estrellas.',
    banner_badge: 'Pista Exterior',
    banner_color: 'text-tertiary',
    instant_badge: 'Turnos libres hoy',
    is_favorite: false,
    specs: [
      { icon: 'speed', label: 'Fibrilado Rápido', colorClass: 'text-tertiary' },
      { icon: 'nights_stay', label: 'Iluminación Nocturna', colorClass: 'text-primary' },
      { icon: 'wind_power', label: 'Ventilación Natural', colorClass: 'text-secondary' },
    ],
    quick_slots: [
      { time: '18:00', available: true },
      { time: '19:30', available: true },
      { time: '21:00', available: true },
    ],
  },
];

const INITIAL_AMENITIES: Amenity[] = [
  {
    id: '00000000-0000-0000-0000-000000000101',
    title: 'Alquiler de Palas Pro',
    category: 'alquiler',
    price: 5.0,
    icon: 'sports_tennis',
    is_available: true,
    subtitle: 'Bullpadel / Nox Carbono',
  },
  {
    id: '00000000-0000-0000-0000-000000000102',
    title: 'Tubo Pelotas Presurizadas',
    category: 'tienda',
    price: 8.0,
    icon: 'lens',
    is_available: true,
    subtitle: 'Head Padel Pro S x3',
  },
  {
    id: '00000000-0000-0000-0000-000000000103',
    title: 'Cafetería & Bebidas',
    category: 'tienda',
    price: 2.5,
    icon: 'local_cafe',
    is_available: true,
    subtitle: 'Hidratación, café y snacks',
  },
  {
    id: '00000000-0000-0000-0000-000000000104',
    title: 'Vestuarios & Lockers',
    category: 'servicio_gratis',
    price: 0,
    icon: 'shower',
    is_available: true,
    subtitle: 'Duchas calientes y Wi-Fi Pro',
  },
];

const DEFAULT_OPEN_MATCH: OpenMatch = {
  id: '00000000-0000-0000-0000-000000000201',
  court_id: '00000000-0000-0000-0000-000000000001',
  court_name: 'Pista Central Panorámica',
  match_time: '20:00 hs',
  category_label: '5ª Categoría',
  description: 'Falta 1 jugador de 5ª Categoría en Pista Central. ¡Únete en un toque!',
  max_players: 4,
  players: [
    { id: 'omp-1', player_name: 'Franco Ríos', initials: 'FR' },
    { id: 'omp-2', player_name: 'Andrés López', initials: 'AL' },
    { id: 'omp-3', player_name: 'Mateo Cruz', initials: 'MC' },
  ],
  is_joined: false,
};

// ============================================================================
// DATE, TIMEZONE & COUNTDOWN UTILITIES
// ============================================================================

export function getClubTimezone(): string {
  const settings = getStoredClubSettings();
  return settings.timezone || 'America/Bogota';
}

export function getClubTodayDateStr(timezone?: string): string {
  const tz = timezone || getClubTimezone();
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {
    // Fallback to local date
  }
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getISOWeekNumber(date: Date): number {
  const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  return Math.ceil(((temp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function generateUpcomingCalendarDays(
  count: number = 14,
  timezone?: string
): CalendarDayItem[] {
  const todayStr = getClubTodayDateStr(timezone);
  const [baseY, baseM, baseD] = todayStr.split('-').map(Number);

  const dayNamesShort = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
  const dayNamesFull = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const monthNamesShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const monthNamesFull = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  const items: CalendarDayItem[] = [];

  for (let i = 0; i < count; i++) {
    const dt = new Date(baseY, baseM - 1, baseD + i, 12, 0, 0);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const dow = dt.getDay();

    const dayName = dayNamesShort[dow];
    const dayNum = String(dt.getDate()).padStart(2, '0');
    const monthShort = monthNamesShort[dt.getMonth()];
    const monthFull = monthNamesFull[dt.getMonth()];
    const weekNum = getISOWeekNumber(dt);

    const label =
      i === 0 ? 'HOY' : i === 1 ? 'MAÑANA' : `${dayNamesFull[dow].slice(0, 3)} ${dt.getDate()} ${monthShort}`;
    const fullLabel = `${dayNamesFull[dow]} ${dt.getDate()} de ${monthFull}`;

    items.push({
      dateStr,
      dayName,
      dayNum,
      label,
      fullLabel,
      monthYearLabel: `${monthFull} ${y}`,
      weekLabel: `Semana ${weekNum}`,
      isToday: i === 0,
    });
  }

  return items;
}

/**
 * Converts a club-local date (YYYY-MM-DD) and time (HH:MM) into an accurate UTC ISO string
 * taking into account the club's configured IANA timezone (default America/Bogota).
 */
export function buildClubTimestampISO(dateStr: string, timeStr: string, timezone?: string): string {
  const tz = timezone || getClubTimezone();
  const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const [year, month, day] = cleanDate.split('-').map(Number);
  const timeParts = timeStr.trim().split(':');
  const hour = parseInt(timeParts[0] || '18', 10);
  const minute = parseInt(timeParts[1] || '0', 10);

  try {
    // Approximate UTC first, then compute the exact offset of `tz` at that moment
    const approxUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(approxUtc);
    const tzYear = Number(parts.find((p) => p.type === 'year')?.value || year);
    const tzMonth = Number(parts.find((p) => p.type === 'month')?.value || month);
    const tzDay = Number(parts.find((p) => p.type === 'day')?.value || day);
    let tzHour = Number(parts.find((p) => p.type === 'hour')?.value || hour);
    if (tzHour === 24) tzHour = 0;
    const tzMinute = Number(parts.find((p) => p.type === 'minute')?.value || minute);

    const tzAsUtcMs = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, 0);
    const offsetMs = tzAsUtcMs - approxUtc.getTime();
    const targetUtcMs = approxUtc.getTime() - offsetMs;
    return new Date(targetUtcMs).toISOString();
  } catch {
    // Fallback to local Date constructor
    return new Date(year, month - 1, day, hour, minute, 0).toISOString();
  }
}

export function formatIsoTimeInClubTz(isoStr: string, timezone?: string): string {
  const tz = timezone || getClubTimezone();
  try {
    return new Intl.DateTimeFormat('es-CO', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(isoStr));
  } catch {
    const dt = new Date(isoStr);
    return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  }
}

export function formatIsoDateInClubTz(isoStr: string, timezone?: string): {
  dateIso: string;
  dateLabel: string;
  dateFull: string;
} {
  const tz = timezone || getClubTimezone();
  const todayIso = getClubTodayDateStr(tz);
  const dt = new Date(isoStr);

  let dateIso = todayIso;
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(dt);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    if (y && m && d) dateIso = `${y}-${m}-${d}`;
  } catch {
    dateIso = dt.toISOString().split('T')[0];
  }

  let prettyShort = dateIso;
  try {
    prettyShort = new Intl.DateTimeFormat('es-ES', {
      timeZone: tz,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(dt);
  } catch {
    // ignore
  }

  const isToday = dateIso === todayIso;
  const dateLabel = isToday ? 'HOY' : prettyShort;
  return {
    dateIso,
    dateLabel,
    dateFull: isToday ? `Hoy (${prettyShort})` : prettyShort,
  };
}

export function computeLiveCountdownText(startIso?: string, endIso?: string): string | undefined {
  if (!startIso) return undefined;
  const nowMs = Date.now();
  const startMs = new Date(startIso).getTime();
  const endMs = endIso ? new Date(endIso).getTime() : startMs + 90 * 60 * 1000;

  if (Number.isNaN(startMs)) return undefined;

  if (nowMs >= startMs && nowMs <= endMs) {
    return '¡Partido en curso ahora mismo!';
  }
  if (nowMs > endMs) {
    return 'Turno finalizado';
  }

  const diffMin = Math.max(1, Math.round((startMs - nowMs) / 60000));
  if (diffMin < 60) {
    return `Tu partido empieza en ${diffMin} min`;
  }
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  if (hours < 24) {
    return `Tu partido empieza en ${hours}h ${mins}m`;
  }
  const days = Math.floor(hours / 24);
  return `Faltan ${days} día${days > 1 ? 's' : ''} para tu partido`;
}

export function getInitials(name: string): string {
  const parts = (name || 'Jugador').trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) || 'JG').toUpperCase();
}

// ============================================================================
// LOCAL STORAGE HELPERS
// ============================================================================

export function getStoredProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading stored profile', e);
  }
  return INITIAL_CUSTOMER_PROFILE;
}

export function saveStoredProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.error('Error saving profile', e);
  }
}

export function getStoredBookings(): Booking[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BOOKINGS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading stored bookings', e);
  }
  return [];
}

export function saveStoredBookings(bookings: Booking[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(bookings));
  } catch (e) {
    console.error('Error saving bookings', e);
  }
}

export function getStoredCourts(): Court[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COURTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading stored courts', e);
  }
  return INITIAL_COURTS;
}

export function saveStoredCourts(courts: Court[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_COURTS, JSON.stringify(courts));
  } catch (e) {
    console.error('Error saving courts', e);
  }
}

export function getStoredClubSettings(): ClubSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (raw) return { ...DEFAULT_CLUB_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Error reading club settings', e);
  }
  return DEFAULT_CLUB_SETTINGS;
}

export function saveStoredClubSettings(settings: ClubSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving club settings', e);
  }
}

export function getStoredAmenities(): Amenity[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AMENITIES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading amenities', e);
  }
  return INITIAL_AMENITIES;
}

export function saveStoredAmenities(amenities: Amenity[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_AMENITIES, JSON.stringify(amenities));
  } catch (e) {
    console.error('Error saving amenities', e);
  }
}

// ============================================================================
// SUPABASE AUTHENTICATION & PROFILES
// ============================================================================

export async function syncAuthenticatedUserFromSupabase(): Promise<UserProfile | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const authUser = session?.user;
    if (!authUser) {
      return null;
    }

    const meta = authUser.user_metadata || {};
    const fallbackName =
      meta.full_name || meta.name || authUser.email?.split('@')[0] || 'Jugador Padel';
    const fallbackPhone = meta.phone || authUser.phone || '';
    const fallbackCategory = meta.category || '5ª Categoría';

    const { data: profileRow, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (!error && profileRow) {
      const profile: UserProfile = {
        id: profileRow.id,
        full_name: profileRow.full_name || fallbackName,
        phone: profileRow.phone || fallbackPhone,
        email: authUser.email,
        avatar_url:
          profileRow.avatar_url ||
          meta.avatar_url ||
          INITIAL_CUSTOMER_PROFILE.avatar_url,
        role: (profileRow.role as UserProfile['role']) || 'customer',
        category: profileRow.category || fallbackCategory,
        initials: getInitials(profileRow.full_name || fallbackName),
        is_authenticated: true,
        created_at: profileRow.created_at || authUser.created_at,
      };
      saveStoredProfile(profile);
      return profile;
    }

    // Profile row does not exist yet — create it for this authenticated user
    const newProfilePayload = {
      id: authUser.id,
      full_name: fallbackName,
      phone: fallbackPhone,
      avatar_url: meta.avatar_url || INITIAL_CUSTOMER_PROFILE.avatar_url,
      role: 'customer' as const,
      category: fallbackCategory,
    };

    await supabase.from('profiles').upsert(newProfilePayload, { onConflict: 'id' });

    const createdProfile: UserProfile = {
      ...newProfilePayload,
      email: authUser.email,
      initials: getInitials(fallbackName),
      is_authenticated: true,
      created_at: new Date().toISOString(),
    };
    saveStoredProfile(createdProfile);
    return createdProfile;
  } catch (err) {
    console.warn('Error syncing auth user from Supabase:', err);
    return null;
  }
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user: UserProfile | null; error?: string }> {
  if (!isSupabaseConfigured) {
    return { user: null, error: 'Supabase no está configurado.' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (data.user) {
      const synced = await syncAuthenticatedUserFromSupabase();
      return { user: synced };
    }

    return { user: null, error: 'No se pudo iniciar sesión.' };
  } catch (err: any) {
    return { user: null, error: err?.message || 'Error al iniciar sesión.' };
  }
}

export async function signUpWithEmail(params: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  category?: string;
  claimAdmin?: boolean;
}): Promise<{ user: UserProfile | null; error?: string; needsEmailConfirmation?: boolean }> {
  if (!isSupabaseConfigured) {
    return { user: null, error: 'Supabase no está configurado.' };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: params.email.trim(),
      password: params.password,
      options: {
        data: {
          full_name: params.fullName.trim(),
          phone: params.phone.trim(),
          category: params.category || '5ª Categoría',
          claim_admin: params.claimAdmin ? 'true' : 'false',
        },
      },
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (data.user && data.session) {
      // Ensure profile row is created with full details
      await supabase.from('profiles').upsert(
        {
          id: data.user.id,
          full_name: params.fullName.trim(),
          phone: params.phone.trim(),
          category: params.category || '5ª Categoría',
        },
        { onConflict: 'id' }
      );

      if (params.claimAdmin) {
        await claimInitialAdminRole();
      }

      const synced = await syncAuthenticatedUserFromSupabase();
      return { user: synced };
    }

    // If email confirmation is required by Supabase project settings
    return {
      user: null,
      needsEmailConfirmation: true,
    };
  } catch (err: any) {
    return { user: null, error: err?.message || 'Error al registrar la cuenta.' };
  }
}

export async function signInWithGoogle(): Promise<{ error?: string }> {
  if (!isSupabaseConfigured) {
    return { error: 'Supabase no está configurado.' };
  }
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname,
      },
    });
    if (error) return { error: error.message };
    return {};
  } catch (err: any) {
    return { error: err?.message || 'Error iniciando Google OAuth.' };
  }
}

export async function signOutUser(): Promise<UserProfile> {
  if (isSupabaseConfigured) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Error signing out from Supabase:', err);
    }
  }
  saveStoredProfile(INITIAL_CUSTOMER_PROFILE);
  return INITIAL_CUSTOMER_PROFILE;
}

export async function claimInitialAdminRole(): Promise<{
  user: UserProfile | null;
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    return { user: null, error: 'Supabase no está configurado.' };
  }

  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) {
      return { user: null, error: 'Debes iniciar sesión primero con tu correo y contraseña.' };
    }

    // 1. Try the SECURITY DEFINER RPC first
    const { data: rpcSuccess, error: rpcError } = await supabase.rpc('claim_initial_admin');
    if (!rpcError && rpcSuccess) {
      const synced = await syncAuthenticatedUserFromSupabase();
      return { user: synced };
    }

    // 2. Fallback if the new SQL RPC has not been run yet in Supabase SQL Editor:
    // Check if any admin exists in profiles
    const { data: existingAdmins } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['club_admin', 'superadmin'])
      .limit(1);

    if (existingAdmins && existingAdmins.length > 0 && existingAdmins[0].id !== authUser.id) {
      return {
        user: null,
        error: 'Ya existe un administrador registrado para este club. Inicia sesión con la cuenta de administrador.',
      };
    }

    const meta = authUser.user_metadata || {};
    const { error: upsertErr } = await supabase.from('profiles').upsert(
      {
        id: authUser.id,
        full_name: meta.full_name || authUser.email?.split('@')[0] || 'Administrador del Club',
        phone: meta.phone || '',
        role: 'club_admin',
      },
      { onConflict: 'id' }
    );

    if (upsertErr) {
      return { user: null, error: upsertErr.message };
    }

    const synced = await syncAuthenticatedUserFromSupabase();
    return { user: synced };
  } catch (err: any) {
    return { user: null, error: err?.message || 'No se pudo reclamar el rol de administrador.' };
  }
}

export async function handlePasswordReset(
  email: string
): Promise<{ success: boolean; message: string }> {
  if (isSupabaseConfigured && email.trim()) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      if (error) {
        return { success: false, message: error.message };
      }
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Error al solicitar recuperación de contraseña.',
      };
    }
  }
  return {
    success: true,
    message: `Se ha enviado un enlace seguro para restablecer tu contraseña a ${email}`,
  };
}

export async function updateUserProfileInDb(
  updatedProfile: Partial<UserProfile>
): Promise<UserProfile> {
  const current = getStoredProfile();
  // Prevent non-admins from escalating their own role via client profile updates
  const safeRole =
    current.role === 'club_admin' || current.role === 'superadmin'
      ? updatedProfile.role || current.role
      : 'customer';

  const nextName = updatedProfile.full_name ?? current.full_name;
  const nextProfile: UserProfile = {
    ...current,
    ...updatedProfile,
    role: safeRole,
    initials: getInitials(nextName),
  };
  saveStoredProfile(nextProfile);

  if (isSupabaseConfigured && current.is_authenticated && current.id) {
    try {
      await supabase
        .from('profiles')
        .update({
          full_name: nextProfile.full_name,
          phone: nextProfile.phone,
          avatar_url: nextProfile.avatar_url,
        })
        .eq('id', current.id);
    } catch (err) {
      console.warn('Error updating profile in Supabase:', err);
    }
  }

  return nextProfile;
}

export async function resetUserProfileInDb(): Promise<UserProfile> {
  return signOutUser();
}

// ============================================================================
// COURTS, AMENITIES & CLUB SETTINGS
// ============================================================================

export function normalizeCourtCategory(
  rawCategory?: string,
  courtName?: string
): 'panoramica' | 'techada' | 'exterior' {
  const lowerCat = (rawCategory || '').toLowerCase().trim();
  const lowerName = (courtName || '').toLowerCase();

  if (lowerCat === 'panoramica' || lowerName.includes('panorámica') || lowerName.includes('panoramica') || lowerName.includes('central')) {
    return 'panoramica';
  }
  if (lowerCat === 'techada' || lowerCat === 'indoor' || lowerName.includes('indoor') || lowerName.includes('techada')) {
    return 'techada';
  }
  if (lowerCat === 'exterior' || lowerName.includes('open air') || lowerName.includes('exterior')) {
    return 'exterior';
  }
  return 'panoramica';
}

export function computeDynamicCourtQuickSlots(
  courtId: string,
  bookings: Booking[]
): { quickSlots: Array<{ time: string; available: boolean }>; instantBadge: string } {
  const todayStr = getClubTodayDateStr();
  const candidateHours = ['17:00', '18:30', '20:00', '21:30'];

  const timeToMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const todayBookings = bookings.filter(
    (b) =>
      b.court_id === courtId &&
      (b.status === 'confirmed' || b.status === 'pending_payment') &&
      (b.date_iso === todayStr || b.date_label === 'HOY')
  );

  const slots = candidateHours.slice(0, 3).map((time) => {
    const slotStart = timeToMin(time);
    const slotEnd = slotStart + 90;
    const conflict = todayBookings.some((b) => {
      const bStart = timeToMin(b.start_time);
      const bEnd = timeToMin(b.end_time);
      return bStart < slotEnd && bEnd > slotStart;
    });
    return { time, available: !conflict };
  });

  const freeCount = slots.filter((s) => s.available).length;
  const firstFree = slots.find((s) => s.available);
  const instantBadge =
    freeCount === 0
      ? 'Alta demanda hoy'
      : freeCount === 1 && firstFree
        ? `Turno ${firstFree.time} libre`
        : `${freeCount} turnos estelares libres`;

  return { quickSlots: slots, instantBadge };
}

export async function fetchCourtsFromSupabase(): Promise<Court[]> {
  if (!isSupabaseConfigured) {
    return getStoredCourts();
  }

  try {
    const { data, error } = await supabase
      .from('courts')
      .select('*')
      .order('court_number_label', { ascending: true });

    if (!error && data && data.length > 0) {
      const storedBookings = getStoredBookings();
      const mapped: Court[] = data.map((row: any, index: number) => {
        const localMatch =
          INITIAL_COURTS.find((c) => c.id === row.id || c.name === row.name) ||
          INITIAL_COURTS[index % INITIAL_COURTS.length];
        const category = normalizeCourtCategory(row.category, row.name);
        const hourlyRate = Number(row.hourly_rate) || 20;
        const rate90 = Number(row.rate_for_90m) || Math.round(hourlyRate * 1.4);
        const rate120 = Number(row.rate_for_120m) || Math.round(hourlyRate * 1.8);
        const { quickSlots, instantBadge } = computeDynamicCourtQuickSlots(row.id, storedBookings);

        return {
          id: row.id,
          name: row.name,
          type: row.type || 'Cristal WPT',
          category,
          court_number_label: row.court_number_label || `Pista ${index + 1}`,
          is_active: row.is_active ?? true,
          hourly_rate: hourlyRate,
          rate_for_90m: rate90,
          rate_for_120m: rate120,
          photos:
            Array.isArray(row.photos) && row.photos.length > 0
              ? row.photos
              : localMatch.photos,
          description:
            row.description || localMatch.description || 'Pista de pádel profesional',
          specs: localMatch.specs,
          quick_slots: quickSlots,
          banner_badge:
            row.banner_badge ||
            (category === 'panoramica'
              ? 'Panorámica Pro'
              : category === 'techada'
                ? 'Techada Cubierta'
                : 'Pista Exterior'),
          banner_color:
            category === 'panoramica'
              ? 'text-primary'
              : category === 'techada'
                ? 'text-secondary'
                : 'text-tertiary',
          instant_badge: instantBadge,
          is_favorite: false,
        };
      });

      saveStoredCourts(mapped);
      return mapped;
    }
  } catch (err) {
    console.warn('Error fetching courts from Supabase, using stored:', err);
  }

  return getStoredCourts();
}

export async function createCourtInDb(courtInput: {
  name: string;
  type: string;
  category: 'panoramica' | 'techada' | 'exterior';
  court_number_label: string;
  hourly_rate: number;
  rate_for_90m: number;
  rate_for_120m?: number;
  description?: string;
  photo_url?: string;
}): Promise<Court[]> {
  const defaultPhoto =
    courtInput.photo_url?.trim() ||
    INITIAL_COURTS[0].photos[0];
  const rate120 = courtInput.rate_for_120m || Math.round(courtInput.hourly_rate * 1.8);
  const badge =
    courtInput.category === 'panoramica'
      ? 'Panorámica Pro'
      : courtInput.category === 'techada'
        ? 'Techada Cubierta'
        : 'Pista Exterior';

  if (isSupabaseConfigured) {
    const { error } = await supabase.from('courts').insert({
      name: courtInput.name.trim(),
      type: courtInput.type.trim() || 'Cristal WPT',
      category: courtInput.category,
      court_number_label: courtInput.court_number_label.trim() || 'Nueva Pista',
      is_active: true,
      hourly_rate: courtInput.hourly_rate,
      rate_for_90m: courtInput.rate_for_90m,
      photos: [defaultPhoto],
      description:
        courtInput.description?.trim() ||
        'Pista profesional equipada con césped de última generación e iluminación LED.',
      banner_badge: badge,
    });

    if (error) {
      throw new Error(error.message);
    }
    return fetchCourtsFromSupabase();
  }

  const current = getStoredCourts();
  const newCourt: Court = {
    id: `court-${Date.now()}`,
    name: courtInput.name.trim(),
    type: courtInput.type.trim() || 'Cristal WPT',
    category: courtInput.category,
    court_number_label: courtInput.court_number_label.trim() || `Pista ${current.length + 1}`,
    is_active: true,
    hourly_rate: courtInput.hourly_rate,
    rate_for_90m: courtInput.rate_for_90m,
    rate_for_120m: rate120,
    photos: [defaultPhoto],
    description:
      courtInput.description?.trim() ||
      'Pista profesional equipada con césped de última generación e iluminación LED.',
    specs: INITIAL_COURTS[0].specs,
    quick_slots: INITIAL_COURTS[0].quick_slots,
    banner_badge: badge,
    banner_color: 'text-primary',
    instant_badge: 'Disponible hoy',
    is_favorite: false,
  };
  const next = [...current, newCourt];
  saveStoredCourts(next);
  return next;
}

export async function updateCourtPricingInDb(
  courtId: string,
  hourly_rate: number,
  rate_for_90m: number,
  rate_for_120m?: number
): Promise<Court[]> {
  const computed120 = rate_for_120m || Math.round(hourly_rate * 1.8);
  const courts = getStoredCourts();
  const updated = courts.map((c) =>
    c.id === courtId ? { ...c, hourly_rate, rate_for_90m, rate_for_120m: computed120 } : c
  );
  saveStoredCourts(updated);

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('courts')
        .update({ hourly_rate, rate_for_90m })
        .eq('id', courtId);
    } catch (err) {
      console.warn('Supabase update court pricing warning:', err);
    }
  }
  return updated;
}

export async function toggleCourtActiveInDb(
  courtId: string,
  is_active: boolean
): Promise<Court[]> {
  const courts = getStoredCourts();
  const updated = courts.map((c) => (c.id === courtId ? { ...c, is_active } : c));
  saveStoredCourts(updated);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('courts').update({ is_active }).eq('id', courtId);
    } catch (err) {
      console.warn('Supabase toggle court warning:', err);
    }
  }
  return updated;
}

export async function fetchAmenitiesFromSupabase(): Promise<Amenity[]> {
  if (!isSupabaseConfigured) {
    return getStoredAmenities();
  }

  try {
    const { data, error } = await supabase
      .from('amenities_catalog')
      .select('*')
      .eq('is_available', true)
      .order('created_at', { ascending: true });

    if (!error && data && data.length > 0) {
      const mapped: Amenity[] = data.map((row: any, idx: number) => ({
        id: row.id,
        title: row.title,
        category: row.category || 'alquiler',
        price: Number(row.price) || 0,
        is_available: row.is_available ?? true,
        icon: row.icon || INITIAL_AMENITIES[idx % INITIAL_AMENITIES.length]?.icon || 'sports_tennis',
        image_url: row.image_url,
        subtitle:
          row.subtitle ||
          INITIAL_AMENITIES[idx % INITIAL_AMENITIES.length]?.subtitle ||
          'Disponible en recepción',
      }));
      saveStoredAmenities(mapped);
      return mapped;
    }
  } catch (err) {
    console.warn('Error fetching amenities from Supabase:', err);
  }

  return getStoredAmenities();
}

export async function fetchClubSettingsFromSupabase(): Promise<ClubSettings> {
  if (!isSupabaseConfigured) {
    return getStoredClubSettings();
  }

  try {
    const { data, error } = await supabase
      .from('club_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const settings: ClubSettings = {
        club_name: data.club_name || DEFAULT_CLUB_SETTINGS.club_name,
        whatsapp_phone: data.whatsapp_phone || DEFAULT_CLUB_SETTINGS.whatsapp_phone,
        cbu_alias: data.cbu_alias || DEFAULT_CLUB_SETTINGS.cbu_alias,
        cbu_number: data.cbu_number || DEFAULT_CLUB_SETTINGS.cbu_number,
        bank_name: data.bank_name || DEFAULT_CLUB_SETTINGS.bank_name,
        account_holder: data.account_holder || DEFAULT_CLUB_SETTINGS.account_holder,
        address: data.address || DEFAULT_CLUB_SETTINGS.address,
        timezone: data.timezone || DEFAULT_CLUB_SETTINGS.timezone,
        open_time: data.open_time || DEFAULT_CLUB_SETTINGS.open_time,
        close_time: data.close_time || DEFAULT_CLUB_SETTINGS.close_time,
        night_light_surcharge:
          data.night_light_surcharge !== undefined
            ? Number(data.night_light_surcharge)
            : DEFAULT_CLUB_SETTINGS.night_light_surcharge,
        unpaid_expiry_minutes:
          data.unpaid_expiry_minutes !== undefined
            ? Number(data.unpaid_expiry_minutes)
            : DEFAULT_CLUB_SETTINGS.unpaid_expiry_minutes,
      };
      saveStoredClubSettings(settings);
      return settings;
    }
  } catch (err) {
    console.warn('Error fetching club settings from Supabase:', err);
  }

  return getStoredClubSettings();
}

export async function updateClubSettingsInDb(settings: ClubSettings): Promise<ClubSettings> {
  const merged: ClubSettings = { ...DEFAULT_CLUB_SETTINGS, ...settings };
  saveStoredClubSettings(merged);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('club_settings').upsert({
        id: '00000000-0000-0000-0000-000000000099',
        club_name: merged.club_name,
        whatsapp_phone: merged.whatsapp_phone,
        cbu_alias: merged.cbu_alias,
        cbu_number: merged.cbu_number,
        address: merged.address,
      });
    } catch (err) {
      console.warn('Supabase update club settings warning:', err);
    }
  }
  return merged;
}

// ============================================================================
// STORAGE & NOTIFICATIONS
// ============================================================================

export async function uploadPaymentProofToStorage(file: File): Promise<string> {
  const maxBytes = 8 * 1024 * 1024; // 8 MB
  if (file.size > maxBytes) {
    throw new Error('El archivo supera el límite de 8 MB. Por favor sube una captura más liviana.');
  }

  if (isSupabaseConfigured) {
    const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const fileName = `proof-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `receipts/${fileName}`;

    const { data, error } = await supabase.storage
      .from('comprobantes')
      .upload(filePath, file, { cacheControl: '3600', upsert: true });

    if (error) {
      console.warn('Supabase storage upload warning:', error.message);
      throw new Error(
        `No se pudo subir el comprobante al servidor (${error.message}). Verifica haber iniciado sesión.`
      );
    }

    if (data) {
      const { data: publicUrlData } = supabase.storage
        .from('comprobantes')
        .getPublicUrl(filePath);
      if (publicUrlData?.publicUrl) {
        return publicUrlData.publicUrl;
      }
    }
  }

  // Fallback for offline/unconfigured mode
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Error leyendo el archivo seleccionado.'));
    reader.readAsDataURL(file);
  });
}

export function playSuccessSound(): void {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5
    osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.25); // G5
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);
  } catch {
    // AudioContext blocked or not supported
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }
  return false;
}

export function showBrowserNotification(
  title: string,
  body: string,
  icon = '/icon-192.png'
): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
          .then((reg) => {
            reg.showNotification(title, {
              body,
              icon,
              badge: '/icon-192.png',
              tag: 'padel-assist-status',
            });
          })
          .catch(() => {
            new Notification(title, { body, icon });
          });
      } else {
        new Notification(title, { body, icon });
      }
    } catch {
      new Notification(title, { body, icon });
    }
  }
}

// ============================================================================
// BOOKINGS & AVAILABILITY SLOTS
// ============================================================================

export function calculateOfficialSlotPrice(
  court: Court | undefined,
  durationMin: number,
  startHour24: number,
  clubSettings?: ClubSettings
): { courtPrice: number; lightingPrice: number; totalPrice: number } {
  const settings = clubSettings || getStoredClubSettings();
  const hourly = court?.hourly_rate || 20;
  const rate90 = court?.rate_for_90m || Math.round(hourly * 1.4);
  const rate120 = court?.rate_for_120m || Math.round(hourly * 1.8);

  const courtPrice = durationMin <= 60 ? hourly : durationMin <= 90 ? rate90 : rate120;
  const lightingPrice = startHour24 >= 18 ? Number(settings.night_light_surcharge ?? 4.0) : 0;

  return {
    courtPrice,
    lightingPrice,
    totalPrice: courtPrice + lightingPrice,
  };
}

export async function fetchBookingsFromSupabase(): Promise<Booking[]> {
  if (!isSupabaseConfigured) {
    return getStoredBookings();
  }

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, courts(name, photos, banner_badge, type, category), profiles(full_name, phone, avatar_url)')
      .order('start_time', { ascending: true });

    if (!error && data) {
      const courts = getStoredCourts();
      const tz = getClubTimezone();
      const nowMs = Date.now();
      const expiryMin = getStoredClubSettings().unpaid_expiry_minutes || 30;

      const mapped: Booking[] = data.map((row: any) => {
        const court = courts.find((c) => c.id === row.court_id);
        const isIsoStart = typeof row.start_time === 'string' && row.start_time.includes('T');
        const isIsoEnd = typeof row.end_time === 'string' && row.end_time.includes('T');

        const startTimeStr = isIsoStart
          ? formatIsoTimeInClubTz(row.start_time, tz)
          : row.start_time || '18:00';
        const endTimeStr = isIsoEnd
          ? formatIsoTimeInClubTz(row.end_time, tz)
          : row.end_time || '19:30';

        const { dateIso, dateLabel, dateFull } = isIsoStart
          ? formatIsoDateInClubTz(row.start_time, tz)
          : {
              dateIso: getClubTodayDateStr(tz),
              dateLabel: 'HOY',
              dateFull: 'Hoy',
            };

        const durationMin =
          isIsoStart && isIsoEnd
            ? Math.max(
                60,
                Math.round(
                  (new Date(row.end_time).getTime() - new Date(row.start_time).getTime()) / 60000
                )
              )
            : 90;

        // Auto-detect completed or expired bookings client-side as well
        let effectiveStatus = row.status as Booking['status'];
        if (
          effectiveStatus === 'confirmed' &&
          isIsoEnd &&
          new Date(row.end_time).getTime() < nowMs
        ) {
          effectiveStatus = 'completed';
        } else if (
          effectiveStatus === 'pending_payment' &&
          !row.payment_proof_url &&
          row.created_at &&
          nowMs - new Date(row.created_at).getTime() > expiryMin * 60 * 1000
        ) {
          effectiveStatus = 'cancelled';
        }

        const playerName =
          row.guest_name ||
          row.profiles?.full_name ||
          'Jugador Club';
        const playerPhone =
          row.guest_phone ||
          row.profiles?.phone ||
          '';

        const isBlock =
          Boolean(row.notes && String(row.notes).startsWith('BLOQUEO')) ||
          row.guest_name === 'BLOQUEO ADMIN';

        return {
          id: row.id,
          court_id: row.court_id,
          court_name: row.courts?.name || court?.name || 'Pista de Pádel',
          court_type: row.courts?.type || court?.type || 'Cristal Techada',
          court_image:
            row.courts?.photos?.[0] ||
            court?.photos?.[0] ||
            INITIAL_COURTS[0].photos[0],
          court_badge: row.courts?.banner_badge || court?.banner_badge || 'Oficial',
          user_id: row.user_id || 'usr-guest',
          user_name: playerName,
          player_phone: playerPhone,
          guest_name: row.guest_name,
          guest_phone: row.guest_phone,
          start_time: startTimeStr,
          end_time: endTimeStr,
          start_iso: isIsoStart ? row.start_time : undefined,
          end_iso: isIsoEnd ? row.end_time : undefined,
          date_iso: dateIso,
          date_label: dateLabel,
          date_full: `${dateFull} • ${startTimeStr} - ${endTimeStr}`,
          duration_min: durationMin,
          court_price: Number(row.court_price) || Number(row.total_price) || 28,
          lighting_price: Number(row.lighting_price) || 0,
          total_price: Number(row.total_price) ?? 28,
          status: effectiveStatus,
          payment_proof_url: row.payment_proof_url,
          payment_method: row.payment_proof_url ? 'Comprobante adjunto' : 'Transferencia directa',
          notes: row.notes,
          is_block: isBlock,
          players: [
            {
              name: playerName,
              avatar: row.profiles?.avatar_url,
              initials: getInitials(playerName),
              is_captain: true,
            },
          ],
          max_players: 4,
          location_label: getStoredClubSettings().address || 'Sede Norte • Pista Oficial',
          countdown_text: computeLiveCountdownText(row.start_time, row.end_time),
          created_at: row.created_at || new Date().toISOString(),
        };
      });

      saveStoredBookings(mapped);
      return mapped;
    }
  } catch (err) {
    console.warn('Error fetching bookings from Supabase:', err);
  }

  return getStoredBookings();
}

export function subscribeToRealtimeBookings(
  onBookingsChange: (bookings: Booking[]) => void,
  onStatusApproved?: (booking: Booking) => void
): () => void {
  if (!isSupabaseConfigured) {
    return () => {};
  }

  const channel = supabase
    .channel('public:bookings:realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'bookings' },
      async (payload) => {
        const updatedList = await fetchBookingsFromSupabase();
        onBookingsChange(updatedList);

        if (payload.eventType === 'UPDATE' && (payload.new as any)?.status === 'confirmed') {
          const confirmedBooking = updatedList.find((b) => b.id === (payload.new as any)?.id);
          if (confirmedBooking && !confirmedBooking.is_block) {
            if (onStatusApproved) {
              onStatusApproved(confirmedBooking);
            }
            playSuccessSound();
            showBrowserNotification(
              '🎾 ¡Tu pago ha sido APROBADO!',
              `El club ha confirmado tu reserva en ${confirmedBooking.court_name} (${confirmedBooking.start_time}). ¡A jugar!`
            );
          }
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function getBookingsWithRLS(user: UserProfile): Booking[] {
  const allBookings = getStoredBookings();

  if (user.role === 'club_admin' || user.role === 'superadmin') {
    return allBookings;
  }

  return allBookings.filter((b) => b.user_id === user.id && !b.is_block);
}

/**
 * Synchronous slot calculation with real dates, court prices, and conflict detection
 */
export function getAvailableSlots(
  courtId: string,
  dateStr: string,
  slotDurationMinutes: number = 90,
  courtObj?: Court
): AvailableSlotResult[] {
  const bookings = getStoredBookings();
  const courts = getStoredCourts();
  const court = courtObj || courts.find((c) => c.id === courtId) || courts[0];
  const settings = getStoredClubSettings();
  const todayStr = getClubTodayDateStr(settings.timezone);
  const targetDateStr = dateStr || todayStr;

  const openMinutes = 7 * 60; // 07:00
  const closeMinutes = 23 * 60; // 23:00

  const minutesToTime = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const timeToMinutes = (timeStr: string): number => {
    const parts = timeStr.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || '0', 10);
  };

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const results: AvailableSlotResult[] = [];
  let currStartMin = openMinutes;

  while (currStartMin + slotDurationMinutes <= closeMinutes) {
    const currEndMin = currStartMin + slotDurationMinutes;
    const startStr = minutesToTime(currStartMin);
    const endStr = minutesToTime(currEndMin);
    const timeRange = `${startStr} - ${endStr}`;
    const startHour24 = Math.floor(currStartMin / 60);

    const { totalPrice } = calculateOfficialSlotPrice(
      court,
      slotDurationMinutes,
      startHour24,
      settings
    );

    const matchingConflict = bookings.find((b) => {
      if (b.court_id !== courtId) return false;
      if (b.status !== 'confirmed' && b.status !== 'pending_payment') return false;

      const bookingDateMatches =
        b.date_iso === targetDateStr ||
        (targetDateStr === todayStr && b.date_label === 'HOY');

      if (!bookingDateMatches) return false;

      const bStartMin = timeToMinutes(b.start_time);
      const bEndMin = timeToMinutes(b.end_time);
      return bStartMin < currEndMin && bEndMin > currStartMin;
    });

    // If looking at today's date, mark slots that already ended in the past as unavailable
    const isPastToday = targetDateStr === todayStr && currEndMin <= nowMinutes;
    const isAvailable = !matchingConflict && !isPastToday;

    let period: 'morning' | 'afternoon' | 'night' = 'morning';
    let tag: string | undefined = undefined;

    if (currStartMin < 13 * 60) {
      period = 'morning';
      tag = currStartMin === 8 * 60 ? 'Fresca' : undefined;
    } else if (currStartMin < 19 * 60) {
      period = 'afternoon';
      tag = currStartMin === 16.5 * 60 ? 'Sin sol' : undefined;
    } else {
      period = 'night';
      if (currEndMin >= closeMinutes) {
        tag = 'Último';
      }
    }

    let status: 'available' | 'booked' | 'in_game' = 'available';
    if (!isAvailable) {
      const isInGameNow =
        targetDateStr === todayStr &&
        currStartMin <= nowMinutes &&
        currEndMin > nowMinutes &&
        Boolean(matchingConflict);

      status = isInGameNow ? 'in_game' : 'booked';
      tag = matchingConflict?.is_block
        ? 'Mantenimiento'
        : isInGameNow
          ? 'En juego'
          : isPastToday && !matchingConflict
            ? 'Finalizado'
            : 'Reservado';
    }

    results.push({
      slot_start: startStr,
      slot_end: endStr,
      slot_start_iso: buildClubTimestampISO(targetDateStr, startStr, settings.timezone),
      slot_end_iso: buildClubTimestampISO(targetDateStr, endStr, settings.timezone),
      time_range: timeRange,
      is_available: isAvailable,
      period,
      price: totalPrice,
      tag,
      status,
    });

    currStartMin = currEndMin;
  }

  return results;
}

/**
 * Asynchronous slot fetcher that queries Supabase RPC `get_available_slots`
 * and merges with local court pricing & timezone formatting.
 */
export async function fetchAvailableSlotsForCourt(
  courtId: string,
  dateStr: string,
  slotDurationMinutes: number = 90,
  courtObj?: Court
): Promise<AvailableSlotResult[]> {
  const localSlots = getAvailableSlots(courtId, dateStr, slotDurationMinutes, courtObj);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courtId);

  if (!isSupabaseConfigured || !isUuid) {
    return localSlots;
  }

  try {
    const { data, error } = await supabase.rpc('get_available_slots', {
      p_court_id: courtId,
      p_date: dateStr,
      p_slot_duration_minutes: slotDurationMinutes,
    });

    if (!error && Array.isArray(data) && data.length > 0) {
      const courts = getStoredCourts();
      const court = courtObj || courts.find((c) => c.id === courtId) || courts[0];
      const settings = getStoredClubSettings();
      const tz = settings.timezone || 'America/Bogota';
      const todayStr = getClubTodayDateStr(tz);
      const nowMs = Date.now();

      return data.map((row: any) => {
        const startStr = formatIsoTimeInClubTz(row.slot_start, tz);
        const endStr = formatIsoTimeInClubTz(row.slot_end, tz);
        const startHour24 = parseInt(startStr.split(':')[0] || '18', 10);
        const startMinTotal = startHour24 * 60 + parseInt(startStr.split(':')[1] || '0', 10);
        const { totalPrice } = calculateOfficialSlotPrice(
          court,
          slotDurationMinutes,
          startHour24,
          settings
        );

        const slotStartMs = new Date(row.slot_start).getTime();
        const slotEndMs = new Date(row.slot_end).getTime();
        const isPastToday = dateStr === todayStr && slotEndMs <= nowMs;
        const isAvailable = Boolean(row.is_available) && !isPastToday;

        let period: 'morning' | 'afternoon' | 'night' = 'morning';
        let tag: string | undefined = undefined;
        if (startMinTotal < 13 * 60) {
          period = 'morning';
          if (startHour24 === 8) tag = 'Fresca';
        } else if (startMinTotal < 19 * 60) {
          period = 'afternoon';
          if (startHour24 === 16) tag = 'Sin sol';
        } else {
          period = 'night';
          if (startHour24 >= 21) tag = 'Último';
        }

        const isInGameNow = !row.is_available && nowMs >= slotStartMs && nowMs < slotEndMs;
        const status: 'available' | 'booked' | 'in_game' = isAvailable
          ? 'available'
          : isInGameNow
            ? 'in_game'
            : 'booked';

        if (!isAvailable) {
          tag = isInGameNow ? 'En juego' : isPastToday && row.is_available ? 'Finalizado' : 'Reservado';
        }

        return {
          slot_start: startStr,
          slot_end: endStr,
          slot_start_iso: row.slot_start,
          slot_end_iso: row.slot_end,
          time_range: `${startStr} - ${endStr}`,
          is_available: isAvailable,
          period,
          price: totalPrice,
          tag,
          status,
        };
      });
    }
  } catch (err) {
    console.warn('RPC get_available_slots fallback to local calculation:', err);
  }

  return localSlots;
}

export function getCourtsWithRLS(): Court[] {
  const allCourts = getStoredCourts();
  return allCourts.filter((c) => c.is_active);
}

export function getAmenitiesWithRLS(): Amenity[] {
  return getStoredAmenities().filter((a) => a.is_available);
}

// ============================================================================
// SERVER-SIDE GEMINI COACH (Calls /api/coach Serverless Function)
// ============================================================================

export async function generateAndAssignAIRoutine(
  playerCategory: string,
  courtType: string
): Promise<string> {
  try {
    const res = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerCategory, courtType }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json?.routine) {
        return json.routine;
      }
    }
  } catch (err) {
    console.warn('Head Coach API fallback used:', err);
  }

  return `🔥 Rutina Pro (${playerCategory} en ${courtType}):\n• Calentamiento dinámico: 4 min de movilidad articular de hombros y desplazamientos laterales en fondo.\n• Táctica 1: Aprovecha el rebote controlado en cristal para salir con globo profundo a la esquina descubierta.\n• Táctica 2: Juega bolas por el centro para generar duda en la pareja contraria y subir rápido a la red.`;
}

// ============================================================================
// CREATE, CANCEL, UPLOAD PROOF, CONFIRM & BLOCK BOOKINGS
// ============================================================================

export async function createBookingInDb(data: {
  court: Court;
  dateIso?: string;
  dateLabel: string;
  dateFull: string;
  timeSlot: string;
  durationMin: number;
  totalPrice?: number;
  courtPrice?: number;
  lightingPrice?: number;
  teamNotes?: string;
  guestName?: string;
  guestPhone?: string;
  user: UserProfile;
}): Promise<Booking> {
  const settings = getStoredClubSettings();
  const targetDateIso = data.dateIso || getClubTodayDateStr(settings.timezone);
  const times = data.timeSlot.split(' - ');
  const startTime = times[0]?.trim() || '18:00';
  const endTime = times[1]?.trim() || '19:30';
  const startHour24 = parseInt(startTime.split(':')[0] || '18', 10);

  // Official price calculation from court + club settings
  const officialPricing = calculateOfficialSlotPrice(
    data.court,
    data.durationMin,
    startHour24,
    settings
  );

  const startIso = buildClubTimestampISO(targetDateIso, startTime, settings.timezone);
  const endIso = buildClubTimestampISO(targetDateIso, endTime, settings.timezone);

  const playerFullName = data.guestName?.trim() || data.user.full_name || 'Jugador';
  const playerPhone = data.guestPhone?.trim() || data.user.phone || '';

  let createdBookingId = `bk-${Date.now()}`;

  if (isSupabaseConfigured) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const authUid = session?.user?.id;

    // 1. Try server-side RPC `create_booking` if authenticated
    if (authUid) {
      const { data: rpcRow, error: rpcError } = await supabase.rpc('create_booking', {
        p_court_id: data.court.id,
        p_start_time: startIso,
        p_end_time: endIso,
        p_notes: data.teamNotes || null,
        p_guest_name: playerFullName,
        p_guest_phone: playerPhone,
        p_is_block: false,
      });

      if (!rpcError && rpcRow?.id) {
        createdBookingId = rpcRow.id;
      } else if (rpcError && rpcError.code === '23P01') {
        throw new Error(
          'Ese horario acaba de ser reservado por otro jugador. Por favor selecciona otro turno.'
        );
      } else {
        // Fallback to direct insert if RPC `create_booking` hasn't been created in SQL Editor yet
        const { data: insertedRow, error: insertError } = await supabase
          .from('bookings')
          .insert({
            court_id: data.court.id,
            user_id: authUid,
            guest_name: playerFullName,
            guest_phone: playerPhone,
            start_time: startIso,
            end_time: endIso,
            court_price: officialPricing.courtPrice,
            lighting_price: officialPricing.lightingPrice,
            total_price: officialPricing.totalPrice,
            status: 'pending_payment',
            notes: data.teamNotes || null,
          })
          .select()
          .maybeSingle();

        if (insertError) {
          if (insertError.code === '23P01') {
            throw new Error(
              'Ese horario acaba de ser reservado por otro jugador. Por favor selecciona otro turno.'
            );
          }
          throw new Error(`No se pudo registrar la reserva: ${insertError.message}`);
        }
        if (insertedRow?.id) {
          createdBookingId = insertedRow.id;
        }
      }
    } else {
      // Unauthenticated fallback insert (only succeeds if legacy public insert policy is active)
      const { data: insertedGuest, error: guestErr } = await supabase
        .from('bookings')
        .insert({
          court_id: data.court.id,
          guest_name: playerFullName,
          guest_phone: playerPhone,
          start_time: startIso,
          end_time: endIso,
          court_price: officialPricing.courtPrice,
          lighting_price: officialPricing.lightingPrice,
          total_price: officialPricing.totalPrice,
          status: 'pending_payment',
          notes: data.teamNotes || null,
        })
        .select()
        .maybeSingle();

      if (!guestErr && insertedGuest?.id) {
        createdBookingId = insertedGuest.id;
      }
    }
  }

  const newBooking: Booking = {
    id: createdBookingId,
    court_id: data.court.id,
    court_name: data.court.name,
    court_type: data.court.type,
    court_image: data.court.photos[0],
    court_badge: data.court.banner_badge,
    user_id: data.user.id,
    user_name: playerFullName,
    player_phone: playerPhone,
    guest_name: playerFullName,
    guest_phone: playerPhone,
    start_time: startTime,
    end_time: endTime,
    start_iso: startIso,
    end_iso: endIso,
    date_iso: targetDateIso,
    date_label: data.dateLabel,
    date_full: `${data.dateFull} • ${startTime} - ${endTime}`,
    duration_min: data.durationMin,
    court_price: officialPricing.courtPrice,
    lighting_price: officialPricing.lightingPrice,
    total_price: officialPricing.totalPrice,
    status: 'pending_payment',
    payment_method: 'Transferencia directa',
    countdown_text: computeLiveCountdownText(startIso, endIso),
    notes: data.teamNotes || undefined,
    location_label: settings.address || 'Sede Norte • Pista de Cristal',
    players: [
      {
        name: playerFullName,
        avatar: data.user.avatar_url,
        initials: getInitials(playerFullName),
        is_captain: true,
      },
    ],
    max_players: 4,
    created_at: new Date().toISOString(),
  };

  const bookings = getStoredBookings();
  const updatedBookings = [newBooking, ...bookings.filter((b) => b.id !== newBooking.id)];
  saveStoredBookings(updatedBookings);
  return newBooking;
}

export async function cancelBookingInDb(bookingId: string): Promise<Booking[]> {
  const bookings = getStoredBookings();
  const updated = bookings.map((b) =>
    b.id === bookingId ? { ...b, status: 'cancelled' as const } : b
  );
  saveStoredBookings(updated);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
    } catch (err) {
      console.warn('Error cancelling in Supabase:', err);
    }
  }

  return updated;
}

export async function uploadPaymentProofInDb(
  bookingId: string,
  proofUrl: string
): Promise<Booking[]> {
  const bookings = getStoredBookings();
  const updated = bookings.map((b) =>
    b.id === bookingId
      ? {
          ...b,
          payment_proof_url: proofUrl,
          payment_method: 'Comprobante adjunto',
        }
      : b
  );
  saveStoredBookings(updated);

  if (isSupabaseConfigured && proofUrl) {
    const { error } = await supabase
      .from('bookings')
      .update({ payment_proof_url: proofUrl })
      .eq('id', bookingId);

    if (error) {
      console.warn('Error updating payment proof in Supabase:', error.message);
    }
  }

  return updated;
}

export async function confirmPaymentByCancheroInDb(bookingId: string): Promise<Booking[]> {
  const bookings = getStoredBookings();
  const updated = bookings.map((b) =>
    b.id === bookingId ? { ...b, status: 'confirmed' as const } : b
  );
  saveStoredBookings(updated);

  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId);
    if (error) {
      console.warn('Error confirming payment in Supabase:', error.message);
    }
  }

  return updated;
}

export async function blockCourtSlotInDb(params: {
  courtId: string;
  courtName: string;
  dateStr?: string;
  timeSlot: string;
  reason: string;
}): Promise<{ success: boolean; bookings: Booking[]; error?: string }> {
  const settings = getStoredClubSettings();
  const targetDateStr = params.dateStr || getClubTodayDateStr(settings.timezone);
  const parts = params.timeSlot.split(' - ');
  const startTime = parts[0]?.trim() || '16:00';
  const endTime = parts[1]?.trim() || '17:30';
  const startIso = buildClubTimestampISO(targetDateStr, startTime, settings.timezone);
  const endIso = buildClubTimestampISO(targetDateStr, endTime, settings.timezone);
  const notesText = `BLOQUEO DE CANCHA: ${params.reason}`;

  let createdId = `blk-${Date.now()}`;

  if (isSupabaseConfigured) {
    try {
      const { data: rpcRow, error: rpcErr } = await supabase.rpc('create_booking', {
        p_court_id: params.courtId,
        p_start_time: startIso,
        p_end_time: endIso,
        p_notes: notesText,
        p_guest_name: 'BLOQUEO ADMIN',
        p_guest_phone: '',
        p_is_block: true,
      });

      if (!rpcErr && rpcRow?.id) {
        createdId = rpcRow.id;
      } else {
        const { data: insRow, error: insErr } = await supabase
          .from('bookings')
          .insert({
            court_id: params.courtId,
            guest_name: 'BLOQUEO ADMIN',
            start_time: startIso,
            end_time: endIso,
            total_price: 0,
            court_price: 0,
            lighting_price: 0,
            status: 'confirmed',
            notes: notesText,
          })
          .select()
          .maybeSingle();

        if (insErr) {
          return {
            success: false,
            bookings: getStoredBookings(),
            error: insErr.message,
          };
        }
        if (insRow?.id) createdId = insRow.id;
      }
    } catch (err: any) {
      return {
        success: false,
        bookings: getStoredBookings(),
        error: err?.message || 'Error bloqueando el horario',
      };
    }
  }

  const blockBooking: Booking = {
    id: createdId,
    court_id: params.courtId,
    court_name: params.courtName,
    court_type: 'Bloqueo Técnico',
    court_image: INITIAL_COURTS[0].photos[0],
    user_id: 'admin-block',
    user_name: 'BLOQUEO ADMIN',
    guest_name: 'BLOQUEO ADMIN',
    start_time: startTime,
    end_time: endTime,
    start_iso: startIso,
    end_iso: endIso,
    date_iso: targetDateStr,
    date_label: targetDateStr === getClubTodayDateStr(settings.timezone) ? 'HOY' : targetDateStr,
    date_full: `${targetDateStr} • ${startTime} - ${endTime}`,
    duration_min: 90,
    court_price: 0,
    lighting_price: 0,
    total_price: 0,
    status: 'confirmed',
    notes: notesText,
    is_block: true,
    players: [{ name: 'Mantenimiento / Canchero', is_captain: true }],
    max_players: 4,
    location_label: settings.address,
    created_at: new Date().toISOString(),
  };

  const nextBookings = [blockBooking, ...getStoredBookings()];
  saveStoredBookings(nextBookings);
  return { success: true, bookings: nextBookings };
}

// ============================================================================
// OPEN MATCHES / 4TH PLAYER MATCHMAKING
// ============================================================================

export function getStoredOpenMatch(): OpenMatch {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_OPEN_MATCH);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return DEFAULT_OPEN_MATCH;
}

export function saveStoredOpenMatch(match: OpenMatch): void {
  try {
    localStorage.setItem(STORAGE_KEY_OPEN_MATCH, JSON.stringify(match));
  } catch {
    // ignore
  }
}

export async function fetchOpenMatchFromSupabase(currentUserId?: string): Promise<OpenMatch> {
  if (!isSupabaseConfigured) {
    return getStoredOpenMatch();
  }

  try {
    const { data: matchRow, error } = await supabase
      .from('open_matches')
      .select('*, open_match_players(*)')
      .eq('is_open', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && matchRow) {
      const players = Array.isArray(matchRow.open_match_players)
        ? matchRow.open_match_players.map((p: any) => ({
            id: p.id,
            user_id: p.user_id,
            player_name: p.player_name,
            initials: p.initials || getInitials(p.player_name),
          }))
        : DEFAULT_OPEN_MATCH.players;

      const isJoined = Boolean(
        currentUserId && players.some((p: any) => p.user_id === currentUserId)
      );

      const openMatch: OpenMatch = {
        id: matchRow.id,
        court_id: matchRow.court_id || DEFAULT_OPEN_MATCH.court_id,
        court_name: matchRow.court_name || DEFAULT_OPEN_MATCH.court_name,
        match_time: matchRow.match_time || DEFAULT_OPEN_MATCH.match_time,
        category_label: matchRow.category_label || DEFAULT_OPEN_MATCH.category_label,
        description: matchRow.description || DEFAULT_OPEN_MATCH.description,
        max_players: Number(matchRow.max_players) || 4,
        players,
        is_joined: isJoined,
      };
      saveStoredOpenMatch(openMatch);
      return openMatch;
    }
  } catch (err) {
    console.warn('Open match fetch fallback to stored:', err);
  }

  return getStoredOpenMatch();
}

export async function toggleJoinOpenMatchInDb(
  matchId: string,
  user: UserProfile
): Promise<{ match: OpenMatch; joined: boolean; message: string }> {
  if (isSupabaseConfigured && user.is_authenticated) {
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('toggle_join_open_match', {
        p_match_id: matchId,
      });

      if (!rpcErr && rpcRes) {
        const refreshed = await fetchOpenMatchFromSupabase(user.id);
        return {
          match: refreshed,
          joined: Boolean(rpcRes.joined),
          message:
            rpcRes.message ||
            (rpcRes.joined
              ? '¡Te has sumado como 4to jugador!'
              : 'Has salido del partido abierto.'),
        };
      }
    } catch (err) {
      console.warn('toggle_join_open_match RPC fallback:', err);
    }
  }

  const current = getStoredOpenMatch();
  const alreadyIn = current.players.some(
    (p) => p.user_id === user.id || p.player_name === user.full_name
  );

  let nextPlayers = [...current.players];
  let joined = false;

  if (alreadyIn) {
    nextPlayers = nextPlayers.filter(
      (p) => p.user_id !== user.id && p.player_name !== user.full_name
    );
    joined = false;
  } else {
    nextPlayers.push({
      id: `omp-${Date.now()}`,
      user_id: user.id,
      player_name: user.full_name,
      initials: user.initials || getInitials(user.full_name),
    });
    joined = true;
  }

  const updatedMatch: OpenMatch = {
    ...current,
    players: nextPlayers,
    is_joined: joined,
  };
  saveStoredOpenMatch(updatedMatch);

  return {
    match: updatedMatch,
    joined,
    message: joined
      ? `¡Te has sumado al partido de ${updatedMatch.match_time} en ${updatedMatch.court_name}!`
      : 'Has liberado tu lugar en el partido abierto.',
  };
}
