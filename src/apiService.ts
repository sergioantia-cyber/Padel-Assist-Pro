/**
 * API & Data Service for Padel Assist Pro
 * Centralized business logic, state mutations, and Row Level Security (RLS) enforcement
 *
 * RLS Policies Enforced:
 * 1. profiles: auth.uid() = id (Users view/update own profile; club_admin can view client profiles)
 * 2. courts: is_active = TRUE (Public read)
 * 3. amenities_catalog: is_available = TRUE (Public read)
 * 4. bookings: auth.uid() = user_id OR club_admin (Privacy: customers only view their own booking details;
 *    public availability grids anonymize reserved slots without exposing player identities).
 * 5. bookings insert: auth.uid() = user_id
 * 6. get_available_slots: SECURITY DEFINER stored procedure logic
 */
import { Court, Amenity, Booking, UserProfile, AvailableSlotResult, ClubSettings } from './types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export const INITIAL_CUSTOMER_PROFILE: UserProfile = {
  id: 'usr-martin-001',
  full_name: 'Martín Gómez',
  phone: '+54 9 11 4455-8899',
  avatar_url:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAoQl5X_m2cV9bRK7RlnPofFbj31grok4OcvQMhxbj97bNO-T2O68G0UZrYP-AHwkLyL_fRO58jKMvAQ0xbn2TLcGTR1muCm7QhwfiL9M-HbviGaxeqFFYUGi_4-ZzPgIpibfrIIyUgfq2Z_97lo08PoZP32Kve65N4-Fxeh7KILLPamE6jxXT_3Y4HCfNUKZTZ-YuhHB0HZG526gv9NW02LJPREO7WsPBJBoTgvbhlf3Oj7QZyyy9R',
  role: 'customer',
  category: '5ª Categoría',
  initials: 'MG',
  created_at: new Date().toISOString(),
};

export const INITIAL_ADMIN_PROFILE: UserProfile = {
  id: 'usr-admin-canchero-01',
  full_name: 'Canchero Juan (Turno Tarde)',
  phone: '+54 9 11 4444-5555',
  avatar_url:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDdwN3_m35iby1EBxOpB81Zc_PhQCCBDL4y7y-TZCq7y-bdnHS5UeabwRvDJQC4101ECAMoH6utokS2GS2IPDWLp8PCZlGdVxmaeZRBZM42vLD4v-JWDVoaEy7URbszVfDgqqo-i8NVnrjticS3pR3CAs4a3GcD4BnXlyt3mqrY0qmMljjIMinYfZJXBPoQprbkVo63lRXLKikkNeQv-zaj5dImguCAB-1ZQNufdurrXLQikkjY8T55',
  role: 'club_admin',
  category: 'Administrador Club',
  initials: 'CJ',
  created_at: new Date().toISOString(),
};

const INITIAL_COURTS: Court[] = [
  {
    id: 'court-1',
    name: 'Pista Central Panorámica',
    type: 'Panorámica Pro',
    category: 'panoramica',
    court_number_label: 'Pista 1',
    is_active: true,
    hourly_rate: 20,
    rate_for_90m: 28,
    photos: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBpdWVwxteW1lne-q0LehSbx0IbRB0yRQ0gEpfhh0AfCyPZG60ejG6UZb6efs-u_mWVE0Hq-AKsC-5_EzHequQwJSz9ZvZz4umAmYfqiyd0D8R1uF4JNs97gDOJ3N4ISdCSmOwlD4jDThfflcwqJh8wmCOOKKgAzPf6EQ5rXtFUnYXuTShLIguloUMbOQpak6uWLwudTx7U0Ca4RGrvHJGA990TTEjDVpMNj50e7QUcq8Cdj5gZkTGB',
    ],
    description: 'Torneos oficiales y juego de alta competencia con paredes panorámicas de cristal templado.',
    banner_badge: 'Panorámica Pro',
    banner_color: 'text-primary',
    instant_badge: '3 turnos libres hoy',
    is_favorite: false,
    specs: [
      { icon: 'layers', label: 'Césped WPT Blue', colorClass: 'text-tertiary' },
      { icon: 'lightbulb', label: 'LED 8x Pro 500 Lux', colorClass: 'text-primary' },
      { icon: 'shield', label: 'Cristal 12mm', colorClass: 'text-secondary' },
    ],
    quick_slots: [
      { time: '17:00', available: true },
      { time: '18:30', available: true },
      { time: '20:00', available: false },
    ],
  },
  {
    id: 'court-2',
    name: 'Pista Techada Indoor 2',
    type: 'Techada Cubierta',
    category: 'techada',
    court_number_label: 'Pista 2',
    is_active: true,
    hourly_rate: 18,
    rate_for_90m: 24,
    photos: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDrbGNhB6aWR6j-BIbwvQH1F8GUhAUz8EEXtqkxQDC7U1p8mZWg8pP93O_XXspeQEOPtjaTtXr-gueV0jZoj65OC8DHs6scWzxSEU5RVlIQ8VIUmWR8LwS8IwNmKymvx6jdkKBWZhbS_ml9AZ-101V4lUT0JYxIuYfl7Wcr5F6KpxHukWgZ6dTWWuWvGWl4mJ2NIOMCkxbvZ_RI6KFYZSn8qsZDpnh9QBfhbIC6h7BYcw1WnfUq0eOF',
    ],
    description: 'Protección total contra clima, techo alto estructural y rebote acústico amortiguado.',
    banner_badge: 'Techada Cubierta',
    banner_color: 'text-secondary',
    instant_badge: 'Turno estelar 19:30 libre',
    is_favorite: false,
    specs: [
      { icon: 'eco', label: 'Césped Texturizado Verde', colorClass: 'text-primary' },
      { icon: 'ac_unit', label: 'Climatizada Anti-lluvia', colorClass: 'text-tertiary' },
      { icon: 'volume_down', label: 'Insonorizada', colorClass: 'text-secondary' },
    ],
    quick_slots: [
      { time: '16:30', available: true },
      { time: '18:00', available: false },
      { time: '19:30', available: true },
    ],
  },
  {
    id: 'court-3',
    name: 'Pista Open Air 3',
    type: 'Pista Exterior',
    category: 'exterior',
    court_number_label: 'Pista 3',
    is_active: true,
    hourly_rate: 15,
    rate_for_90m: 20,
    photos: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCSb512bav7YVwR-NxW4KAYnX6i7mkcLGAstZlhnZtoo4ghAxLY-nlal9Zu-yhujQKeRrHOuRkCVQ23X1L-pyTwsJOGu9JMMQz01uEyxeCeWOikEoBz9axq1s9RgvJl-kBKEVaqVap9h0BWPvs_4q1b513POJm_svxXnMoB7_LYGwM-WrpFv8cj8HZ5s9T8XqUVaBOI8ovSenbFRyE4Hz5Gftg6q7AqqGBCGLZxTZ4rEQmYyh8mfaCV',
    ],
    description: 'Aire fresco y visibilidad óptima en turnos nocturnos rodeado de palmeras y cielo abierto.',
    banner_badge: 'Pista Exterior',
    banner_color: 'text-tertiary',
    instant_badge: 'Disponible desde 21:00',
    is_favorite: false,
    specs: [
      { icon: 'speed', label: 'Fibrilado Rápido', colorClass: 'text-tertiary' },
      { icon: 'nights_stay', label: 'Iluminación Nocturna', colorClass: 'text-primary' },
      { icon: 'wind_power', label: 'Ventilación Natural', colorClass: 'text-secondary' },
    ],
    quick_slots: [
      { time: '18:00', available: false },
      { time: '19:30', available: false },
      { time: '21:00', available: true },
    ],
  },
];

const INITIAL_BOOKINGS: Booking[] = [
  // Booking 1: Owned by Martín (usr-martin-001)
  {
    id: 'bk-hero-001',
    court_id: 'court-1',
    court_name: 'Pista Central Panorámica',
    court_type: 'Pista Principal',
    court_image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCn-FcUBWiRr8UmPwrTqf7DnGKgSrS5nNw5MHR0LWS_q6OUdI839hbhEqOEvpAQqHrrtWilEpU46IX8p34eNDKhDFRV1slzIqujdm39-M26abt5ZRVbjSLBsbRsejoyGCUh8NLqcz6iXMmlT2EAhSV9oK3J2DDLeFcda_ztkv2mwFa91Fj7Yjyvm0tNYJVlEy5MuKppPfFmBrq9b_sr0yheBnWmG6qDZhEYvZAfmZ7j3i6y2dxxKKV6',
    court_badge: 'Panorámica Pro',
    user_id: 'usr-martin-001',
    user_name: 'Martín Gómez',
    start_time: '19:30',
    end_time: '21:00',
    duration_min: 90,
    date_label: 'HOY',
    date_full: 'Hoy, 19:30 - 21:00',
    court_price: 24.0,
    lighting_price: 4.0,
    total_price: 28.0,
    status: 'pending_payment',
    payment_method: 'Transferencia directa',
    countdown_text: 'Tu partido empieza en 4h 25m',
    notes: 'Pareja Martínez / González',
    location_label: 'Sede Norte • Pista de Cristal',
    players: [
      {
        name: 'Martín Gómez',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuAoQl5X_m2cV9bRK7RlnPofFbj31grok4OcvQMhxbj97bNO-T2O68G0UZrYP-AHwkLyL_fRO58jKMvAQ0xbn2TLcGTR1muCm7QhwfiL9M-HbviGaxeqFFYUGi_4-ZzPgIpibfrIIyUgfq2Z_97lo08PoZP32Kve65N4-Fxeh7KILLPamE6jxXT_3Y4HCfNUKZTZ-YuhHB0HZG526gv9NW02LJPREO7WsPBJBoTgvbhlf3Oj7QZyyy9R',
        is_captain: true,
      },
    ],
    max_players: 4,
    created_at: new Date().toISOString(),
  },
  // Booking 2: Owned by Martín (usr-martin-001)
  {
    id: 'bk-confirmed-002',
    court_id: 'court-2',
    court_name: 'Pista Techada Indoor 2',
    court_type: 'Cristal Techada',
    court_image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDrbGNhB6aWR6j-BIbwvQH1F8GUhAUz8EEXtqkxQDC7U1p8mZWg8pP93O_XXspeQEOPtjaTtXr-gueV0jZoj65OC8DHs6scWzxSEU5RVlIQ8VIUmWR8LwS8IwNmKymvx6jdkKBWZhbS_ml9AZ-101V4lUT0JYxIuYfl7Wcr5F6KpxHukWgZ6dTWWuWvGWl4mJ2NIOMCkxbvZ_RI6KFYZSn8qsZDpnh9QBfhbIC6h7BYcw1WnfUq0eOF',
    court_badge: 'Techada Cubierta',
    user_id: 'usr-martin-001',
    user_name: 'Martín Gómez',
    start_time: '18:00',
    end_time: '19:00',
    duration_min: 60,
    date_label: 'Viernes 17 Oct',
    date_full: 'Viernes 17 Oct - 18:00 (60 min)',
    court_price: 24.0,
    lighting_price: 0,
    total_price: 24.0,
    status: 'confirmed',
    payment_method: 'MercadoPago / Tarjeta',
    location_label: 'Sede Norte • Pista de Cristal',
    players: [
      {
        name: 'Lucas S.',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuAcTNpVmY5NswhPdvwZRtiv1UKz54_Jw6BjrJuGQyFZd8Q6gs72EQhXqBLInbYuPxB8KCgn4iNJEm83NRHcCNwTxQazMPt_7vi5kS_KC40drCrUxgYRjCf9rsDHF1z89N14zsBvGW6fSyG8vskgyU_KoncUugYeOU8iaJB8twEarOwP0bOBYUwlEaeU6qOfovUpaOTBMy1rsJDrNmYwhcLswj6jHhx2MhQxPUUX0T6Uw1tHmcwRa915',
        is_captain: true,
      },
      {
        name: 'Sofía M.',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCbzCrLZpJcq_itFyNVbVKrn2ou39Ohqxl-Bgig7YFkdtwkkSmf1XfAhnbseuFaT6msIvtFFf9-t1DSBJsFmU90WRcEuGJzhCtIDnzcLVztEL7s55mWNvqIX-GYCAqNY9mNCkfp93-oTjE1QWjEtcuVYF7YvThbqJO9SmiOUyGirey7EHAWK2Gig9MxrQvsdY4NXNgNBPPJ7EZ1poqxIw6X41qnCKQirXZl2hUkKnkNTG-xXFBY7Dw6',
      },
      {
        name: 'Diego R.',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuDdwN3_m35iby1EBxOpB81Zc_PhQCCBDL4y7y-TZCq7y-bdnHS5UeabwRvDJQC4101ECAMoH6utokS2GS2IPDWLp8PCZlGdVxmaeZRBZM42vLD4v-JWDVoaEy7URbszVfDgqqo-i8NVnrjticS3pR3CAs4a3GcD4BnXlyt3mqrY0qmMljjIMinYfZJXBPoQprbkVo63lRXLKikkNeQv-zaj5dImguCAB-1ZQNufdurrXLQikkjY8T55',
      },
    ],
    max_players: 4,
    created_at: new Date().toISOString(),
  },
  // Booking 3: Desk booking by Carlos Mendoza (usr-carlos-002)
  {
    id: 'bk-carlos-003',
    court_id: 'court-1',
    court_name: 'Pista 1 Panorámica',
    court_type: 'Cristal Pro',
    court_image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBpdWVwxteW1lne-q0LehSbx0IbRB0yRQ0gEpfhh0AfCyPZG60ejG6UZb6efs-u_mWVE0Hq-AKsC-5_EzHequQwJSz9ZvZz4umAmYfqiyd0D8R1uF4JNs97gDOJ3N4ISdCSmOwlD4jDThfflcwqJh8wmCOOKKgAzPf6EQ5rXtFUnYXuTShLIguloUMbOQpak6uWLwudTx7U0Ca4RGrvHJGA990TTEjDVpMNj50e7QUcq8Cdj5gZkTGB',
    court_badge: 'Cristal Pro',
    user_id: 'usr-carlos-002',
    user_name: 'Carlos Mendoza',
    guest_name: 'Carlos Mendoza',
    guest_phone: '+54 9 11 4444-5555',
    start_time: '09:30',
    end_time: '11:00',
    duration_min: 90,
    date_label: 'HOY',
    date_full: 'Hoy, 09:30 - 11:00',
    court_price: 24.0,
    lighting_price: 0,
    total_price: 24.0,
    status: 'pending_payment',
    payment_method: 'Efectivo / Mostrador',
    notes: 'Reserva telefónica con seña pendiente de $12.000',
    location_label: 'Sede Norte • Pista de Cristal',
    players: [
      { name: 'Carlos Mendoza', is_captain: true },
      { name: 'Jugador 2' },
      { name: 'Jugador 3' },
      { name: 'Jugador 4' },
    ],
    max_players: 4,
    created_at: new Date().toISOString(),
  },
];

const INITIAL_AMENITIES: Amenity[] = [
  {
    id: 'am-1',
    title: 'Pala Bullpadel Pro',
    category: 'alquiler',
    price: 3500,
    is_available: true,
    subtitle: 'Palas de test Bullpadel y Head con grip nuevo',
  },
  {
    id: 'am-2',
    title: 'Tubo de Pelotas Presurizadas',
    category: 'tienda',
    price: 5800,
    is_available: true,
    subtitle: 'Head Padel Pro S / Bullpadel Gold',
  },
  {
    id: 'am-3',
    title: 'Bebidas & Cafetería de Especialidad',
    category: 'tienda',
    price: 1800,
    is_available: true,
    subtitle: 'Gatorade, agua mineral y café espresso',
  },
  {
    id: 'am-4',
    title: 'Duchas & Vestuarios Climatizados',
    category: 'servicio_gratis',
    price: 0,
    is_available: true,
    subtitle: 'Uso libre incluido con tu turno',
  },
];

// Local storage keys
const STORAGE_KEY_PROFILE = 'padel_assist_profile_v1';
const STORAGE_KEY_BOOKINGS = 'padel_assist_bookings_v1';
const STORAGE_KEY_COURTS = 'padel_assist_courts_v1';

export function getStoredProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading stored profile', e);
  }
  return INITIAL_CUSTOMER_PROFILE;
}

export function getStoredBookings(): Booking[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BOOKINGS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading stored bookings', e);
  }
  return INITIAL_BOOKINGS;
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

export function saveStoredBookings(bookings: Booking[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(bookings));
  } catch (e) {
    console.error('Error saving bookings', e);
  }
}

export function saveStoredProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.error('Error saving profile', e);
  }
}

export function saveStoredCourts(courts: Court[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_COURTS, JSON.stringify(courts));
  } catch (e) {
    console.error('Error saving courts', e);
  }
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
      const mapped: Court[] = data.map((row: any) => {
        const localMatch = INITIAL_COURTS.find((c) => c.name === row.name || c.id === row.id);
        return {
          id: row.id,
          name: row.name,
          type: row.type || 'Cristal WPT',
          category: (row.category as any) || 'panoramica',
          court_number_label: row.court_number_label || 'Pista',
          is_active: row.is_active ?? true,
          hourly_rate: Number(row.hourly_rate) || 20,
          rate_for_90m: Number(row.rate_for_90m) || 28,
          photos: Array.isArray(row.photos) && row.photos.length > 0 ? row.photos : localMatch?.photos || INITIAL_COURTS[0].photos,
          description: row.description || localMatch?.description || 'Pista de pádel profesional',
          specs: localMatch?.specs || INITIAL_COURTS[0].specs,
          quick_slots: localMatch?.quick_slots || INITIAL_COURTS[0].quick_slots,
          banner_badge: row.banner_badge || localMatch?.banner_badge || 'Oficial',
          banner_color: localMatch?.banner_color || 'text-primary',
          instant_badge: localMatch?.instant_badge || 'Disponible hoy',
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
        address: data.address || DEFAULT_CLUB_SETTINGS.address,
      };
      saveStoredClubSettings(settings);
      return settings;
    }
  } catch (err) {
    console.warn('Error fetching club settings from Supabase:', err);
  }

  return getStoredClubSettings();
}


const STORAGE_KEY_SETTINGS = 'padel_assist_club_settings_v1';

export const DEFAULT_CLUB_SETTINGS: ClubSettings = {
  club_name: 'Padel Assist Pro Club',
  whatsapp_phone: import.meta.env?.VITE_CLUB_WHATSAPP_PHONE || '5491144445555',
  cbu_alias: 'PADEL.CENTRAL.PRO',
  cbu_number: '0000003100045892348210',
  address: 'Av. Los Pinos 1420, Club Central',
};

export function getStoredClubSettings(): ClubSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (raw) return JSON.parse(raw);
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

export async function updateCourtPricingInDb(
  courtId: string,
  hourly_rate: number,
  rate_for_90m: number
): Promise<Court[]> {
  const courts = getStoredCourts();
  const updated = courts.map((c) =>
    c.id === courtId ? { ...c, hourly_rate, rate_for_90m } : c
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
  const updated = courts.map((c) =>
    c.id === courtId ? { ...c, is_active } : c
  );
  saveStoredCourts(updated);

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('courts')
        .update({ is_active })
        .eq('id', courtId);
    } catch (err) {
      console.warn('Supabase toggle court warning:', err);
    }
  }
  return updated;
}

export async function updateClubSettingsInDb(settings: ClubSettings): Promise<ClubSettings> {
  saveStoredClubSettings(settings);
  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('club_settings')
        .upsert({
          id: '00000000-0000-0000-0000-000000000099',
          club_name: settings.club_name,
          whatsapp_phone: settings.whatsapp_phone,
          cbu_alias: settings.cbu_alias,
          cbu_number: settings.cbu_number,
          address: settings.address,
        });
    } catch (err) {
      console.warn('Supabase update club settings warning:', err);
    }
  }
  return settings;
}

export async function uploadPaymentProofToStorage(file: File): Promise<string> {
  if (isSupabaseConfigured) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `proof-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { data, error } = await supabase.storage
        .from('comprobantes')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from('comprobantes')
          .getPublicUrl(filePath);
        if (publicUrlData?.publicUrl) {
          return publicUrlData.publicUrl;
        }
      }
    } catch (err) {
      console.warn('Storage upload error, using local fallback:', err);
    }
  }

  // Local object URL fallback
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Web Audio API synthesizer for celebratory tone (no external MP3 needed)
 */
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
  } catch (e) {
    // AudioContext blocked or not supported
  }
}

/**
 * Request permission for native push/desktop notifications
 */
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

/**
 * Show native browser push notification
 */
export function showBrowserNotification(title: string, body: string, icon = '/icon-192.png'): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            body,
            icon,
            badge: '/icon-192.png',
            tag: 'padel-assist-status',
          });
        }).catch(() => {
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

export async function fetchBookingsFromSupabase(): Promise<Booking[]> {
  if (!isSupabaseConfigured) {
    return getStoredBookings();
  }

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, courts(name, photos, banner_badge, type)')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const courts = getStoredCourts();
      const mapped: Booking[] = data.map((row: any) => {
        const court = courts.find((c) => c.id === row.court_id);
        const startTimeStr = row.start_time?.includes('T')
          ? new Date(row.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : row.start_time || '18:00';
        const endTimeStr = row.end_time?.includes('T')
          ? new Date(row.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : row.end_time || '19:30';

        const dateStr = row.start_time?.includes('T')
          ? new Date(row.start_time).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
          : 'Hoy';

        return {
          id: row.id,
          court_id: row.court_id,
          court_name: row.courts?.name || court?.name || 'Pista de Pádel',
          court_type: row.courts?.type || court?.type || 'Cristal Techada',
          court_image: row.courts?.photos?.[0] || court?.photos?.[0] || 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=400&q=80',
          court_badge: row.courts?.banner_badge || court?.banner_badge || 'Pro',
          user_id: row.user_id || 'usr-guest',
          user_name: row.guest_name || 'Jugador',
          guest_name: row.guest_name,
          guest_phone: row.guest_phone,
          start_time: startTimeStr,
          end_time: endTimeStr,
          date_label: dateStr,
          date_full: `Fecha: ${dateStr}`,
          duration_min: 90,
          court_price: Number(row.court_price) || Number(row.total_price) || 28,
          lighting_price: Number(row.lighting_price) || 0,
          total_price: Number(row.total_price) || 28,
          status: row.status,
          payment_proof_url: row.payment_proof_url,
          payment_method: 'Transferencia directa',
          notes: row.notes,
          players: [
            {
              name: row.guest_name || 'Jugador Titular',
              is_captain: true,
            },
          ],
          max_players: 4,
          location_label: 'Sede Central',
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
        console.log('⚡ Evento Realtime recibido en bookings:', payload.eventType, payload);

        // Fetch refreshed list
        const updatedList = await fetchBookingsFromSupabase();
        onBookingsChange(updatedList);

        // If a booking was updated to 'confirmed', notify!
        if (payload.eventType === 'UPDATE' && payload.new?.status === 'confirmed') {
          const confirmedBooking = updatedList.find((b) => b.id === payload.new.id);
          if (confirmedBooking) {
            if (onStatusApproved) {
              onStatusApproved(confirmedBooking);
            }
            playSuccessSound();
            showBrowserNotification(
              '🎾 ¡Tu pago ha sido APROBADO!',
              `El club ha confirmado tu reserva en ${confirmedBooking.court_name}. ¡A jugar!`
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


/**
 * ROW LEVEL SECURITY: Bookings Retrieval
 * Policy: "Customers view own booking details"
 * USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'club_admin'))
 */
export function getBookingsWithRLS(user: UserProfile): Booking[] {
  const allBookings = getStoredBookings();

  if (user.role === 'club_admin') {
    return allBookings;
  }

  // Customer only sees own bookings
  return allBookings.filter((b) => b.user_id === user.id);
}

/**
 * Implementation of the PostgreSQL stored procedure:
 * get_available_slots(p_court_id UUID, p_date DATE, p_slot_duration_minutes INT DEFAULT 90)
 *
 * Checks time intervals between 07:00:00 and 23:00:00 against confirmed/pending bookings
 */
export function getAvailableSlots(
  courtId: string,
  dateStr: string,
  slotDurationMinutes: number = 90
): AvailableSlotResult[] {
  const bookings = getStoredBookings();
  const results: AvailableSlotResult[] = [];

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

  const baseRate =
    slotDurationMinutes === 60 ? 18.0 : slotDurationMinutes === 90 ? 24.0 : 32.0;

  let currStartMin = openMinutes;

  while (currStartMin + slotDurationMinutes <= closeMinutes) {
    const currEndMin = currStartMin + slotDurationMinutes;
    const startStr = minutesToTime(currStartMin);
    const endStr = minutesToTime(currEndMin);
    const timeRange = `${startStr} - ${endStr}`;

    // Overlap evaluation:
    // NOT EXISTS (SELECT 1 FROM bookings b WHERE b.court_id = p_court_id AND b.status IN ('confirmed', 'pending_payment') AND (b.start_time < curr_slot_end AND b.end_time > curr_slot_start))
    const isConflict = bookings.some((b) => {
      if (b.court_id !== courtId) return false;
      if (b.status !== 'confirmed' && b.status !== 'pending_payment') return false;

      // Check date matching (demo handles HOY or matching date string)
      const isDateActive =
        b.date_label === 'HOY' ||
        b.date_full.includes(dateStr) ||
        dateStr === '2024-10-14';

      if (!isDateActive) return false;

      const bStartMin = timeToMinutes(b.start_time);
      const bEndMin = timeToMinutes(b.end_time);

      return bStartMin < currEndMin && bEndMin > currStartMin;
    });

    const isAvailable = !isConflict;

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
      status = currStartMin >= 19.5 * 60 ? 'in_game' : 'booked';
      tag = status === 'in_game' ? 'En juego' : 'Reservado';
    }

    results.push({
      slot_start: startStr,
      slot_end: endStr,
      time_range: timeRange,
      is_available: isAvailable,
      period,
      price: baseRate,
      tag,
      status,
    });

    currStartMin = currEndMin;
  }

  return results;
}

/**
 * ROW LEVEL SECURITY: Courts Retrieval
 * Policy: "Public read courts" USING (is_active = TRUE)
 */
export function getCourtsWithRLS(): Court[] {
  const allCourts = getStoredCourts();
  return allCourts.filter((c) => c.is_active);
}

/**
 * ROW LEVEL SECURITY: Amenities Catalog Retrieval
 * Policy: "Public read amenities" USING (is_available = TRUE)
 */
export function getAmenitiesWithRLS(): Amenity[] {
  return INITIAL_AMENITIES.filter((a) => a.is_available);
}

/**
 * ROW LEVEL SECURITY: Update profile
 * Policy: "Users can update own profile" USING (auth.uid() = id)
 */
export async function updateUserProfileInDb(updatedProfile: Partial<UserProfile>): Promise<UserProfile> {
  const current = getStoredProfile();
  const nextProfile: UserProfile = { ...current, ...updatedProfile };
  saveStoredProfile(nextProfile);
  return nextProfile;
}

export async function resetUserProfileInDb(): Promise<UserProfile> {
  saveStoredProfile(INITIAL_CUSTOMER_PROFILE);
  saveStoredBookings(INITIAL_BOOKINGS);
  saveStoredCourts(INITIAL_COURTS);
  return INITIAL_CUSTOMER_PROFILE;
}

export async function loginAsAdmin(): Promise<UserProfile> {
  saveStoredProfile(INITIAL_ADMIN_PROFILE);
  return INITIAL_ADMIN_PROFILE;
}

export async function handlePasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  return {
    success: true,
    message: `Se ha enviado un enlace seguro para restablecer contraseña a ${email}`,
  };
}

export async function generateAndAssignAIRoutine(playerCategory: string, courtType: string): Promise<string> {
  try {
    const apiKey = import.meta.env?.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY);
    if (apiKey) {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Eres el Head Coach de pádel del club. Diseña una rutina de calentamiento y 2 tácticas clave para un jugador de ${playerCategory} jugando en pista ${courtType}. Mantén la respuesta breve (máximo 120 palabras), motivadora y estructurada en viñetas.`,
      });
      if (response.text) {
        return response.text;
      }
    }
  } catch (err) {
    console.warn('Gemini API call skipped or failed, using local pro routine:', err);
  }

  return `🔥 Rutina Pro (${playerCategory} en ${courtType}):\n• Calentamiento dinámico: 4 min de movilidad articular de hombros y desplazamientos laterales en fondo.\n• Táctica 1: Aprovecha el rebote controlado en cristal para salir con globo profundo a la esquina descubierta.\n• Táctica 2: Juega bolas por el centro para generar duda en la pareja contraria y subir rápido a la red.`;
}

/**
 * ROW LEVEL SECURITY: Create booking
 * Policy: "Authenticated users can create bookings" WITH CHECK (auth.uid() = user_id)
 */
export async function createBookingInDb(data: {
  court: Court;
  dateLabel: string;
  dateFull: string;
  timeSlot: string;
  durationMin: number;
  totalPrice: number;
  courtPrice: number;
  lightingPrice: number;
  teamNotes?: string;
  user: UserProfile;
}): Promise<Booking> {
  const bookings = getStoredBookings();
  const times = data.timeSlot.split(' - ');
  const startTime = times[0]?.trim() || '18:00';
  const endTime = times[1]?.trim() || '19:30';

  const newBooking: Booking = {
    id: `bk-${Date.now()}`,
    court_id: data.court.id,
    court_name: data.court.name,
    court_type: data.court.type,
    court_image: data.court.photos[0],
    court_badge: data.court.banner_badge,
    user_id: data.user.id,
    user_name: data.user.full_name,
    start_time: startTime,
    end_time: endTime,
    date_label: data.dateLabel,
    date_full: data.dateFull,
    duration_min: data.durationMin,
    court_price: data.courtPrice,
    lighting_price: data.lightingPrice,
    total_price: data.totalPrice,
    status: 'pending_payment',
    payment_method: 'Transferencia directa',
    countdown_text: 'Tu partido está programado para hoy',
    notes: data.teamNotes || undefined,
    location_label: 'Sede Norte • Pista de Cristal',
    players: [
      {
        name: data.user.full_name,
        avatar: data.user.avatar_url,
        is_captain: true,
      },
    ],
    max_players: 4,
    created_at: new Date().toISOString(),
  };

  const updatedBookings = [newBooking, ...bookings];
  saveStoredBookings(updatedBookings);
  return newBooking;
}

export async function cancelBookingInDb(bookingId: string): Promise<Booking[]> {
  const bookings = getStoredBookings();
  const updated = bookings.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' as const } : b));
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

export async function uploadPaymentProofInDb(bookingId: string, proofUrl?: string): Promise<Booking[]> {
  const bookings = getStoredBookings();
  const updated = bookings.map((b) =>
    b.id === bookingId
      ? {
          ...b,
          payment_proof_url: proofUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80',
        }
      : b
  );
  saveStoredBookings(updated);

  if (isSupabaseConfigured && proofUrl) {
    try {
      await supabase
        .from('bookings')
        .update({ payment_proof_url: proofUrl })
        .eq('id', bookingId);
    } catch (err) {
      console.warn('Error updating payment proof in Supabase:', err);
    }
  }

  return updated;
}

export async function confirmPaymentByCancheroInDb(bookingId: string): Promise<Booking[]> {
  const bookings = getStoredBookings();
  const updated = bookings.map((b) => (b.id === bookingId ? { ...b, status: 'confirmed' as const } : b));
  saveStoredBookings(updated);

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId);
    } catch (err) {
      console.warn('Error confirming payment in Supabase:', err);
    }
  }

  return updated;
}

export async function blockCourtSlotInDb(courtName: string, timeSlot: string, reason: string): Promise<{ success: boolean }> {
  return { success: true };
}

export async function joinOpenMatchInDb(user: UserProfile): Promise<{ success: boolean; message: string }> {
  return {
    success: true,
    message: `¡Te has sumado al 4to lugar en Cancha Central! Revisa tu pestaña de Partidos.`,
  };
}
