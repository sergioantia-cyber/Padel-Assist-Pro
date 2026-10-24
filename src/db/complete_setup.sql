-- ====================================================================
-- PADEL ASSIST PRO - INSTALACIÓN INTEGRAL SUPABASE
-- Incluye: Tablas, Enums, RLS, Función de Disponibilidad, 
-- Bucket de Storage para Comprobantes y Canchas Reales Iniciales.
-- ====================================================================

-- 1. TIPOS Y ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('customer', 'club_admin', 'superadmin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('pending_payment', 'confirmed', 'cancelled', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABLA DE PERFILES (Vinculada a auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    avatar_url TEXT,
    role user_role DEFAULT 'customer',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CANCHAS E INFRAESTRUCTURA
CREATE TABLE IF NOT EXISTS public.courts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- ej: 'Cristal Techada', 'Panorámica Pro', 'Malla Descubierta'
    category TEXT DEFAULT 'indoor', -- 'indoor', 'exterior', 'premium'
    court_number_label TEXT DEFAULT 'Pista',
    is_active BOOLEAN DEFAULT TRUE,
    hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 20.00,
    rate_for_90m NUMERIC(10, 2) DEFAULT 28.00,
    rate_for_120m NUMERIC(10, 2) DEFAULT 36.00,
    photos TEXT[] DEFAULT '{}',
    description TEXT,
    banner_badge TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CATÁLOGO DE SERVICIOS ADICIONALES
CREATE TABLE IF NOT EXISTS public.amenities_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL, -- 'alquiler', 'tienda', 'servicio_gratis'
    price NUMERIC(10, 2) DEFAULT 0.00,
    is_available BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CONFIGURACIÓN DEL CLUB (Teléfono WhatsApp, alias bancario, etc.)
CREATE TABLE IF NOT EXISTS public.club_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_name TEXT NOT NULL DEFAULT 'Padel Assist Pro Club',
    whatsapp_phone TEXT NOT NULL DEFAULT '5491144445555',
    cbu_alias TEXT NOT NULL DEFAULT 'PADEL.CENTRAL.PRO',
    cbu_number TEXT DEFAULT '0000003100045892348210',
    address TEXT DEFAULT 'Av. Los Pinos 1420, Club Central',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RESERVAS DE CANCHAS
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    court_id UUID REFERENCES public.courts(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    guest_name TEXT,
    guest_phone TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    court_price NUMERIC(10, 2) DEFAULT 0.00,
    lighting_price NUMERIC(10, 2) DEFAULT 0.00,
    status booking_status DEFAULT 'pending_payment',
    payment_proof_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_booking_duration CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_bookings_court_time ON public.bookings (court_id, start_time, end_time);

-- ====================================================================
-- 7. BUCKET DE STORAGE PARA COMPROBANTES DE PAGO
-- ====================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('comprobantes', 'comprobantes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de Storage
DO $$ BEGIN
    CREATE POLICY "Public read comprobantes" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'comprobantes');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Public or authenticated upload comprobantes" 
    ON storage.objects FOR INSERT 
    WITH CHECK (bucket_id = 'comprobantes');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ====================================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenities_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Políticas de Profiles
DO $$ BEGIN
    CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Políticas de Canchas y Catálogo (Lectura pública; Modificación sólo admin)
DO $$ BEGIN
    CREATE POLICY "Public read courts" 
    ON public.courts FOR SELECT USING (is_active = TRUE);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Admin manage courts" 
    ON public.courts FOR ALL 
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('club_admin', 'superadmin'))
        OR auth.role() = 'service_role'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Public read amenities" 
    ON public.amenities_catalog FOR SELECT USING (is_available = TRUE);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Public read club settings" 
    ON public.club_settings FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Políticas de Bookings
DO $$ BEGIN
    CREATE POLICY "Customers view own booking details" 
    ON public.bookings FOR SELECT 
    USING (
        auth.uid() = user_id 
        OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('club_admin', 'superadmin'))
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Authenticated users can create bookings" 
    ON public.bookings FOR INSERT 
    WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ====================================================================
-- 9. FUNCIÓN DE DISPONIBILIDAD HORARIA (SECURITY DEFINER)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.get_available_slots(
    p_court_id UUID,
    p_date DATE,
    p_slot_duration_minutes INT DEFAULT 90
)
RETURNS TABLE (slot_start TIMESTAMPTZ, slot_end TIMESTAMPTZ, is_available BOOLEAN) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    club_open TIME := '07:00:00';
    club_close TIME := '23:00:00';
    curr_slot_start TIMESTAMPTZ;
    curr_slot_end TIMESTAMPTZ;
BEGIN
    curr_slot_start := (p_date + club_open)::TIMESTAMPTZ;
    
    WHILE (curr_slot_start + (p_slot_duration_minutes || ' minutes')::INTERVAL) <= (p_date + club_close)::TIMESTAMPTZ LOOP
        curr_slot_end := curr_slot_start + (p_slot_duration_minutes || ' minutes')::INTERVAL;
        
        RETURN QUERY
        SELECT 
            curr_slot_start,
            curr_slot_end,
            NOT EXISTS (
                SELECT 1 FROM public.bookings b
                WHERE b.court_id = p_court_id
                  AND b.status IN ('confirmed', 'pending_payment')
                  AND (b.start_time < curr_slot_end AND b.end_time > curr_slot_start)
            );
            
        curr_slot_start := curr_slot_end;
    END LOOP;
END;
$$;

-- ====================================================================
-- 10. CARGA DE CANCHAS Y PRECIOS REALES INICIALES (SEED DATA)
-- ====================================================================

-- Pista 1: Panorámica
INSERT INTO public.courts (id, name, type, category, court_number_label, is_active, hourly_rate, rate_for_90m, rate_for_120m, photos, description, banner_badge)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Pista Central Panorámica',
    'Cristal Techada WPT',
    'indoor',
    'Pista 1',
    true,
    20.00,
    28.00,
    36.00,
    ARRAY['https://lh3.googleusercontent.com/aida-public/AB6AXuCn-FcUBWiRr8UmPwrTqf7DnGKgSrS5nNw5MHR0LWS_q6OUdI839hbhEqOEvpAQqHrrtWilEpU46IX8p34eNDKhDFRV1slzIqujdm39-M26abt5ZRVbjSLBsbRsejoyGCUh8NLqcz6iXMmlT2EAhSV9oK3J2DDLeFcda_ztkv2mwFa91Fj7Yjyvm0tNYJVlEy5MuKppPfFmBrq9b_sr0yheBnWmG6qDZhEYvZAfmZ7j3i6y2dxxKKV6'],
    'Pista oficial World Padel Tour de cristal templado de 12mm con césped monofilamento azul y gradas para espectadores.',
    'Panorámica Pro'
)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    hourly_rate = EXCLUDED.hourly_rate,
    rate_for_90m = EXCLUDED.rate_for_90m,
    rate_for_120m = EXCLUDED.rate_for_120m;

-- Pista 2: Climatizada
INSERT INTO public.courts (id, name, type, category, court_number_label, is_active, hourly_rate, rate_for_90m, rate_for_120m, photos, description, banner_badge)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'Pista Indoor 2 Climatizada',
    'Cristal Climatizada',
    'indoor',
    'Pista 2',
    true,
    18.00,
    26.00,
    34.00,
    ARRAY['https://lh3.googleusercontent.com/aida-public/AB6AXuDrbGNhB6aWR6j-BIbwvQH1F8GUhAUz8EEXtqkxQDC7U1p8mZWg8pP93O_XXspeQEOPtjaTtXr-gueV0jZoj65OC8DHs6scWzxSEU5RVlIQ8VIUmWR8LwS8IwNmKymvx6jdkKBWZhbS_ml9AZ-101V4lUT0JYxIuYfl7Wcr5F6KpxHukWgZ6dTWWuWvGWl4mJ2NIOMCkxbvZ_RI6KFYZSn8qsZDpnh9QBfhbIC6h7BYcw1WnfUq0eOF'],
    'Ambiente climatizado con absorción acústica y luz LED cenital antirreflejo para partidos de máxima exigencia.',
    'Climatizada'
)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    hourly_rate = EXCLUDED.hourly_rate,
    rate_for_90m = EXCLUDED.rate_for_90m,
    rate_for_120m = EXCLUDED.rate_for_120m;

-- Pista 3: Exterior
INSERT INTO public.courts (id, name, type, category, court_number_label, is_active, hourly_rate, rate_for_90m, rate_for_120m, photos, description, banner_badge)
VALUES (
    '00000000-0000-0000-0000-000000000003',
    'Pista Open Air 3 Exterior',
    'Malla Descubierta',
    'exterior',
    'Pista 3',
    true,
    15.00,
    20.00,
    28.00,
    ARRAY['https://lh3.googleusercontent.com/aida-public/AB6AXuCSb512bav7YVwR-NxW4KAYnX6i7mkcLGAstZlhnZtoo4ghAxLY-nlal9Zu-yhujQKeRrHOuRkCVQ23X1L-pyTwsJOGu9JMMQz01uEyxeCeWOikEoBz9axq1s9RgvJl-kBKEVaqVap9h0BWPvs_4q1b513POJm_svxXnMoB7_LYGwM-WrpFv8cj8HZ5s9T8XqUVaBOI8ovSenbFRyE4Hz5Gftg6q7AqqGBCGLZxTZ4rEQmYyh8mfaCV'],
    'Sensación de juego al aire libre con iluminación halógena para disfrutar del juego nocturno bajo las estrellas.',
    'Pista Exterior'
)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    hourly_rate = EXCLUDED.hourly_rate,
    rate_for_90m = EXCLUDED.rate_for_90m,
    rate_for_120m = EXCLUDED.rate_for_120m;

-- Inserción de configuración inicial del club
INSERT INTO public.club_settings (id, club_name, whatsapp_phone, cbu_alias, cbu_number, address)
VALUES (
    '00000000-0000-0000-0000-000000000099',
    'Padel Assist Pro Club',
    '5491144445555',
    'PADEL.CENTRAL.PRO',
    '0000003100045892348210',
    'Av. Los Pinos 1420, Club Central'
)
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 11. HABILITAR SUPABASE REALTIME EN TABLAS
-- ====================================================================
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.courts;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.club_settings;
EXCEPTION WHEN duplicate_object THEN null; END $$;

