-- ====================================================================
-- PADEL ASSIST PRO - ESQUEMA DE PRODUCCIÓN INTEGRAL (SUPABASE / POSTGRESQL)
-- Incluye:
--   1. Extensiones (btree_gist para evitar reservas dobles concurrentes)
--   2. Tablas: profiles, courts, amenities_catalog, club_settings, bookings,
--      open_matches, open_match_players
--   3. Triggers de seguridad: creación automática de perfil, protección de rol,
--      protección de precio y estado en reservas
--   4. Row Level Security (RLS) completa en todas las tablas y Storage
--   5. Procedimientos RPC con zona horaria real del club:
--      - cleanup_expired_and_completed_bookings()
--      - get_available_slots(p_court_id, p_date, p_slot_duration_minutes)
--      - create_booking(...) con cálculo de tarifa en servidor
--      - claim_initial_admin() para el primer administrador del club
--      - toggle_join_open_match(p_match_id) para el 4to jugador
-- ====================================================================

-- 1. EXTENSIONES Y ENUMS
CREATE EXTENSION IF NOT EXISTS btree_gist;

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
    full_name TEXT NOT NULL DEFAULT 'Jugador',
    phone TEXT NOT NULL DEFAULT '',
    avatar_url TEXT,
    category TEXT DEFAULT '5ª Categoría',
    role user_role DEFAULT 'customer',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '5ª Categoría';

-- Función auxiliar para verificar si el usuario actual es administrador del club
CREATE OR REPLACE FUNCTION public.is_club_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('club_admin', 'superadmin')
    );
$$;

-- Trigger para crear automáticamente el perfil cuando un usuario se registra en Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_has_admin BOOLEAN;
    v_role user_role := 'customer';
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.profiles WHERE role IN ('club_admin', 'superadmin')
    ) INTO v_has_admin;

    IF NOT v_has_admin AND COALESCE(NEW.raw_user_meta_data->>'claim_admin', 'false') = 'true' THEN
        v_role := 'club_admin';
    END IF;

    INSERT INTO public.profiles (id, full_name, phone, avatar_url, category, role)
    VALUES (
        NEW.id,
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), split_part(COALESCE(NEW.email, 'Jugador'), '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, ''),
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE(NEW.raw_user_meta_data->>'category', '5ª Categoría'),
        v_role
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
        phone = CASE WHEN EXCLUDED.phone <> '' THEN EXCLUDED.phone ELSE public.profiles.phone END;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para impedir que un usuario normal se cambie su propio rol a club_admin
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        IF current_setting('app.allow_role_change', true) IS DISTINCT FROM 'true'
           AND NOT public.is_club_admin()
           AND current_setting('role', true) <> 'service_role' THEN
            RAISE EXCEPTION 'No autorizado para modificar el rol del perfil';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- RPC para reclamar la administración inicial del club (solo funciona si aún no existe ningún admin)
CREATE OR REPLACE FUNCTION public.claim_initial_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_admin_exists BOOLEAN;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Debes iniciar sesión primero';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.profiles WHERE role IN ('club_admin', 'superadmin')
    ) INTO v_admin_exists;

    IF v_admin_exists THEN
        RETURN public.is_club_admin();
    END IF;

    PERFORM set_config('app.allow_role_change', 'true', true);

    INSERT INTO public.profiles (id, full_name, phone, role, category)
    VALUES (v_uid, 'Administrador del Club', '', 'club_admin', 'Administrador Club')
    ON CONFLICT (id) DO UPDATE SET role = 'club_admin';

    RETURN TRUE;
END;
$$;

-- 3. CANCHAS E INFRAESTRUCTURA
CREATE TABLE IF NOT EXISTS public.courts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT DEFAULT 'panoramica', -- 'panoramica', 'techada', 'exterior'
    court_number_label TEXT DEFAULT 'Pista 1',
    is_active BOOLEAN DEFAULT TRUE,
    hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 20.00,
    rate_for_90m NUMERIC(10, 2) NOT NULL DEFAULT 28.00,
    rate_for_120m NUMERIC(10, 2) NOT NULL DEFAULT 36.00,
    photos TEXT[] DEFAULT '{}',
    description TEXT,
    banner_badge TEXT DEFAULT 'Oficial',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.courts ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'panoramica';
ALTER TABLE public.courts ADD COLUMN IF NOT EXISTS court_number_label TEXT DEFAULT 'Pista';
ALTER TABLE public.courts ADD COLUMN IF NOT EXISTS rate_for_90m NUMERIC(10, 2) DEFAULT 28.00;
ALTER TABLE public.courts ADD COLUMN IF NOT EXISTS rate_for_120m NUMERIC(10, 2) DEFAULT 36.00;
ALTER TABLE public.courts ADD COLUMN IF NOT EXISTS banner_badge TEXT DEFAULT 'Oficial';

-- 4. CATÁLOGO DE SERVICIOS ADICIONALES (Amenities)
CREATE TABLE IF NOT EXISTS public.amenities_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subtitle TEXT DEFAULT 'Disponible en recepción',
    category TEXT NOT NULL DEFAULT 'alquiler', -- 'alquiler', 'tienda', 'servicio_gratis'
    price NUMERIC(10, 2) DEFAULT 0.00,
    icon TEXT DEFAULT 'sports_tennis',
    is_available BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.amenities_catalog ADD COLUMN IF NOT EXISTS subtitle TEXT DEFAULT 'Disponible en recepción';
ALTER TABLE public.amenities_catalog ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'sports_tennis';

-- 5. CONFIGURACIÓN DEL CLUB
CREATE TABLE IF NOT EXISTS public.club_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_name TEXT NOT NULL DEFAULT 'Padel Assist Pro Club',
    whatsapp_phone TEXT NOT NULL DEFAULT '573001234567',
    cbu_alias TEXT NOT NULL DEFAULT 'PADEL.CENTRAL.PRO',
    cbu_number TEXT DEFAULT '0000003100045892348210',
    bank_name TEXT DEFAULT 'Bancolombia / Nequi',
    account_holder TEXT DEFAULT 'Padel Assist Club S.A.S.',
    address TEXT DEFAULT 'Av. Los Pinos 1420, Sede Norte',
    timezone TEXT NOT NULL DEFAULT 'America/Bogota',
    open_time TIME NOT NULL DEFAULT '07:00:00',
    close_time TIME NOT NULL DEFAULT '23:00:00',
    night_light_surcharge NUMERIC(10, 2) NOT NULL DEFAULT 4.00,
    unpaid_expiry_minutes INT NOT NULL DEFAULT 30,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.club_settings ADD COLUMN IF NOT EXISTS bank_name TEXT DEFAULT 'Bancolombia / Nequi';
ALTER TABLE public.club_settings ADD COLUMN IF NOT EXISTS account_holder TEXT DEFAULT 'Padel Assist Club S.A.S.';
ALTER TABLE public.club_settings ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Bogota';
ALTER TABLE public.club_settings ADD COLUMN IF NOT EXISTS open_time TIME NOT NULL DEFAULT '07:00:00';
ALTER TABLE public.club_settings ADD COLUMN IF NOT EXISTS close_time TIME NOT NULL DEFAULT '23:00:00';
ALTER TABLE public.club_settings ADD COLUMN IF NOT EXISTS night_light_surcharge NUMERIC(10, 2) NOT NULL DEFAULT 4.00;
ALTER TABLE public.club_settings ADD COLUMN IF NOT EXISTS unpaid_expiry_minutes INT NOT NULL DEFAULT 30;

-- 6. RESERVAS DE CANCHAS (Con prevención de solapamiento GiST)
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    court_id UUID NOT NULL REFERENCES public.courts(id) ON DELETE RESTRICT,
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

-- Restricción de exclusión GiST para impedir reservas dobles concurrentes en la misma cancha
DO $$ BEGIN
    ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_no_overlap
    EXCLUDE USING gist (
        court_id WITH =,
        tstzrange(start_time, end_time, '[)') WITH &&
    )
    WHERE (status IN ('pending_payment', 'confirmed'));
EXCEPTION
    WHEN duplicate_object OR duplicate_table THEN null;
END $$;

-- Trigger para impedir que un cliente se auto-apruebe el pago o altere el precio
CREATE OR REPLACE FUNCTION public.enforce_booking_update_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT public.is_club_admin()
       AND current_setting('app.internal_booking_maintenance', true) IS DISTINCT FROM 'true'
       AND current_setting('role', true) <> 'service_role' THEN
        IF NEW.total_price IS DISTINCT FROM OLD.total_price
           OR NEW.court_id IS DISTINCT FROM OLD.court_id
           OR NEW.start_time IS DISTINCT FROM OLD.start_time
           OR NEW.end_time IS DISTINCT FROM OLD.end_time THEN
            RAISE EXCEPTION 'No autorizado para modificar precio u horario de una reserva creada';
        END IF;

        IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN
            RAISE EXCEPTION 'Solo el administrador del club puede confirmar o completar pagos';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_booking_update_rules ON public.bookings;
CREATE TRIGGER trg_enforce_booking_update_rules
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_update_rules();

-- 7. PARTIDOS ABIERTOS / 4TO JUGADOR (Matchmaking)
CREATE TABLE IF NOT EXISTS public.open_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    court_id UUID REFERENCES public.courts(id) ON DELETE CASCADE,
    court_name TEXT NOT NULL DEFAULT 'Pista Central Panorámica',
    match_time TEXT NOT NULL DEFAULT '20:00 hs',
    category_label TEXT NOT NULL DEFAULT '5ª Categoría',
    description TEXT NOT NULL DEFAULT 'Falta 1 jugador para completar partido nivel intermedio.',
    max_players INT NOT NULL DEFAULT 4,
    is_open BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.open_match_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.open_matches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    player_name TEXT NOT NULL,
    initials TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (match_id, user_id)
);

-- ====================================================================
-- 8. BUCKET DE STORAGE PARA COMPROBANTES
-- ====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprobantes', 'comprobantes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read comprobantes" ON storage.objects;
DROP POLICY IF EXISTS "Public or authenticated upload comprobantes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload comprobantes" ON storage.objects;

CREATE POLICY "Public read comprobantes"
ON storage.objects FOR SELECT
USING (bucket_id = 'comprobantes');

CREATE POLICY "Authenticated upload comprobantes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'comprobantes' AND auth.uid() IS NOT NULL);

-- ====================================================================
-- 9. ROW LEVEL SECURITY (RLS) COMPLETA
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenities_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.open_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.open_match_players ENABLE ROW LEVEL SECURITY;

-- PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id OR public.is_club_admin());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id OR public.is_club_admin());

-- COURTS
DROP POLICY IF EXISTS "Public read courts" ON public.courts;
CREATE POLICY "Public read courts"
ON public.courts FOR SELECT
USING (is_active = TRUE OR public.is_club_admin());

DROP POLICY IF EXISTS "Admin manage courts" ON public.courts;
CREATE POLICY "Admin manage courts"
ON public.courts FOR ALL
USING (public.is_club_admin())
WITH CHECK (public.is_club_admin());

-- AMENITIES
DROP POLICY IF EXISTS "Public read amenities" ON public.amenities_catalog;
CREATE POLICY "Public read amenities"
ON public.amenities_catalog FOR SELECT
USING (is_available = TRUE OR public.is_club_admin());

DROP POLICY IF EXISTS "Admin manage amenities" ON public.amenities_catalog;
CREATE POLICY "Admin manage amenities"
ON public.amenities_catalog FOR ALL
USING (public.is_club_admin())
WITH CHECK (public.is_club_admin());

-- CLUB SETTINGS
DROP POLICY IF EXISTS "Public read club settings" ON public.club_settings;
CREATE POLICY "Public read club settings"
ON public.club_settings FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admin manage club settings" ON public.club_settings;
CREATE POLICY "Admin manage club settings"
ON public.club_settings FOR ALL
USING (public.is_club_admin())
WITH CHECK (public.is_club_admin());

-- BOOKINGS (Lectura, Inserción y Actualización)
DROP POLICY IF EXISTS "Customers view own booking details" ON public.bookings;
CREATE POLICY "Customers view own booking details"
ON public.bookings FOR SELECT
USING (auth.uid() = user_id OR public.is_club_admin());

DROP POLICY IF EXISTS "Authenticated users can create bookings" ON public.bookings;
CREATE POLICY "Authenticated users can create bookings"
ON public.bookings FOR INSERT
WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR public.is_club_admin()
);

DROP POLICY IF EXISTS "Users and admins can update bookings" ON public.bookings;
CREATE POLICY "Users and admins can update bookings"
ON public.bookings FOR UPDATE
USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR public.is_club_admin()
)
WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR public.is_club_admin()
);

-- OPEN MATCHES
DROP POLICY IF EXISTS "Public read open matches" ON public.open_matches;
CREATE POLICY "Public read open matches"
ON public.open_matches FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read open match players" ON public.open_match_players;
CREATE POLICY "Public read open match players"
ON public.open_match_players FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated manage own open match slot" ON public.open_match_players;
CREATE POLICY "Authenticated manage own open match slot"
ON public.open_match_players FOR ALL
USING (auth.uid() = user_id OR public.is_club_admin())
WITH CHECK (auth.uid() = user_id OR public.is_club_admin());

-- ====================================================================
-- 10. MANTENIMIENTO AUTOMÁTICO Y PROCEDIMIENTOS RPC
-- ====================================================================

-- Limpia reservas impagas vencidas (sin comprobante) y marca como 'completed' las ya jugadas
CREATE OR REPLACE FUNCTION public.cleanup_expired_and_completed_bookings()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_expiry_min INT := 30;
BEGIN
    SELECT COALESCE(unpaid_expiry_minutes, 30)
    INTO v_expiry_min
    FROM public.club_settings
    LIMIT 1;

    PERFORM set_config('app.internal_booking_maintenance', 'true', true);

    -- Cancelar reservas pending_payment sin comprobante que superaron el tiempo límite
    UPDATE public.bookings
    SET status = 'cancelled',
        notes = COALESCE(notes || ' • ', '') || 'Liberado automáticamente por falta de pago en ' || v_expiry_min || ' min'
    WHERE status = 'pending_payment'
      AND payment_proof_url IS NULL
      AND created_at < (NOW() - (v_expiry_min || ' minutes')::INTERVAL);

    -- Completar reservas confirmadas cuyo horario ya finalizó
    UPDATE public.bookings
    SET status = 'completed'
    WHERE status = 'confirmed'
      AND end_time < NOW();
END;
$$;

-- Función de disponibilidad horaria consciente de la zona horaria del club
CREATE OR REPLACE FUNCTION public.get_available_slots(
    p_court_id UUID,
    p_date DATE,
    p_slot_duration_minutes INT DEFAULT 90
)
RETURNS TABLE (slot_start TIMESTAMPTZ, slot_end TIMESTAMPTZ, is_available BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_open TIME := '07:00:00';
    v_close TIME := '23:00:00';
    v_tz TEXT := 'America/Bogota';
    curr_slot_start TIMESTAMPTZ;
    curr_slot_end TIMESTAMPTZ;
    club_close_ts TIMESTAMPTZ;
BEGIN
    PERFORM public.cleanup_expired_and_completed_bookings();

    SELECT
        COALESCE(open_time, '07:00:00'::TIME),
        COALESCE(close_time, '23:00:00'::TIME),
        COALESCE(NULLIF(timezone, ''), 'America/Bogota')
    INTO v_open, v_close, v_tz
    FROM public.club_settings
    LIMIT 1;

    curr_slot_start := ((p_date + v_open) AT TIME ZONE v_tz);
    club_close_ts := ((p_date + v_close) AT TIME ZONE v_tz);

    WHILE (curr_slot_start + (p_slot_duration_minutes || ' minutes')::INTERVAL) <= club_close_ts LOOP
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

-- RPC seguro para crear reservas calculando el precio oficial en el servidor
CREATE OR REPLACE FUNCTION public.create_booking(
    p_court_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_notes TEXT DEFAULT NULL,
    p_guest_name TEXT DEFAULT NULL,
    p_guest_phone TEXT DEFAULT NULL,
    p_is_block BOOLEAN DEFAULT FALSE
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_court public.courts;
    v_tz TEXT := 'America/Bogota';
    v_surcharge NUMERIC(10, 2) := 4.00;
    v_duration_min INT;
    v_court_price NUMERIC(10, 2);
    v_lighting_price NUMERIC(10, 2) := 0.00;
    v_local_hour INT;
    v_status booking_status := 'pending_payment';
    v_profile public.profiles;
    v_inserted public.bookings;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Debes iniciar sesión para realizar una reserva.';
    END IF;

    PERFORM public.cleanup_expired_and_completed_bookings();

    SELECT * INTO v_court FROM public.courts WHERE id = p_court_id;
    IF NOT FOUND OR (NOT v_court.is_active AND NOT public.is_club_admin()) THEN
        RAISE EXCEPTION 'La cancha seleccionada no está disponible.';
    END IF;

    SELECT
        COALESCE(NULLIF(timezone, ''), 'America/Bogota'),
        COALESCE(night_light_surcharge, 4.00)
    INTO v_tz, v_surcharge
    FROM public.club_settings
    LIMIT 1;

    v_duration_min := ROUND(EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 60.0);
    IF v_duration_min <= 60 THEN
        v_court_price := v_court.hourly_rate;
    ELSIF v_duration_min <= 90 THEN
        v_court_price := COALESCE(v_court.rate_for_90m, ROUND(v_court.hourly_rate * 1.4, 2));
    ELSE
        v_court_price := COALESCE(v_court.rate_for_120m, ROUND(v_court.hourly_rate * 1.8, 2));
    END IF;

    v_local_hour := EXTRACT(HOUR FROM (p_start_time AT TIME ZONE v_tz));
    IF v_local_hour >= 18 THEN
        v_lighting_price := v_surcharge;
    END IF;

    IF p_is_block THEN
        IF NOT public.is_club_admin() THEN
            RAISE EXCEPTION 'Solo el canchero o administrador puede bloquear turnos.';
        END IF;
        v_status := 'confirmed';
        v_court_price := 0.00;
        v_lighting_price := 0.00;
    END IF;

    SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid;

    INSERT INTO public.bookings (
        court_id,
        user_id,
        guest_name,
        guest_phone,
        start_time,
        end_time,
        court_price,
        lighting_price,
        total_price,
        status,
        notes
    ) VALUES (
        p_court_id,
        v_uid,
        COALESCE(NULLIF(TRIM(p_guest_name), ''), v_profile.full_name, 'Jugador'),
        COALESCE(NULLIF(TRIM(p_guest_phone), ''), v_profile.phone, ''),
        p_start_time,
        p_end_time,
        v_court_price,
        v_lighting_price,
        v_court_price + v_lighting_price,
        v_status,
        p_notes
    )
    RETURNING * INTO v_inserted;

    RETURN v_inserted;
END;
$$;

-- RPC para unirse o salir de un partido abierto (4to jugador)
CREATE OR REPLACE FUNCTION public.toggle_join_open_match(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_profile public.profiles;
    v_exists BOOLEAN;
    v_initials TEXT;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Inicia sesión para sumarte al partido abierto.';
    END IF;

    SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid;

    SELECT EXISTS (
        SELECT 1 FROM public.open_match_players
        WHERE match_id = p_match_id AND user_id = v_uid
    ) INTO v_exists;

    IF v_exists THEN
        DELETE FROM public.open_match_players
        WHERE match_id = p_match_id AND user_id = v_uid;
        RETURN jsonb_build_object('joined', false, 'message', 'Has salido del partido abierto.');
    ELSE
        v_initials := UPPER(LEFT(COALESCE(v_profile.full_name, 'JG'), 2));
        INSERT INTO public.open_match_players (match_id, user_id, player_name, initials)
        VALUES (p_match_id, v_uid, COALESCE(v_profile.full_name, 'Jugador'), v_initials);
        RETURN jsonb_build_object('joined', true, 'message', '¡Te has sumado como 4to jugador! Te esperamos en la cancha.');
    END IF;
END;
$$;

-- ====================================================================
-- 11. DATOS INICIALES (SEED DATA)
-- ====================================================================
INSERT INTO public.courts (id, name, type, category, court_number_label, is_active, hourly_rate, rate_for_90m, rate_for_120m, photos, description, banner_badge)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Pista Central Panorámica',
    'Cristal Techada WPT',
    'panoramica',
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
    category = 'panoramica',
    court_number_label = EXCLUDED.court_number_label;

INSERT INTO public.courts (id, name, type, category, court_number_label, is_active, hourly_rate, rate_for_90m, rate_for_120m, photos, description, banner_badge)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'Pista Indoor 2 Climatizada',
    'Cristal Climatizada',
    'techada',
    'Pista 2',
    true,
    18.00,
    26.00,
    34.00,
    ARRAY['https://lh3.googleusercontent.com/aida-public/AB6AXuDrbGNhB6aWR6j-BIbwvQH1F8GUhAUz8EEXtqkxQDC7U1p8mZWg8pP93O_XXspeQEOPtjaTtXr-gueV0jZoj65OC8DHs6scWzxSEU5RVlIQ8VIUmWR8LwS8IwNmKymvx6jdkKBWZhbS_ml9AZ-101V4lUT0JYxIuYfl7Wcr5F6KpxHukWgZ6dTWWuWvGWl4mJ2NIOMCkxbvZ_RI6KFYZSn8qsZDpnh9QBfhbIC6h7BYcw1WnfUq0eOF'],
    'Ambiente climatizado con absorción acústica y luz LED cenital antirreflejo para partidos de máxima exigencia.',
    'Techada Cubierta'
)
ON CONFLICT (id) DO UPDATE SET
    category = 'techada',
    court_number_label = EXCLUDED.court_number_label;

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
    category = 'exterior',
    court_number_label = EXCLUDED.court_number_label;

-- Servicios del club (Amenities)
INSERT INTO public.amenities_catalog (id, title, subtitle, category, price, icon, is_available)
VALUES
    ('00000000-0000-0000-0000-000000000101', 'Alquiler de Palas Pro', 'Bullpadel / Nox Carbono', 'alquiler', 5.00, 'sports_tennis', true),
    ('00000000-0000-0000-0000-000000000102', 'Tubo Pelotas Presurizadas', 'Head Padel Pro S x3', 'tienda', 8.00, 'lens', true),
    ('00000000-0000-0000-0000-000000000103', 'Cafetería & Bebidas', 'Hidratación, café y snacks', 'tienda', 2.50, 'local_cafe', true),
    ('00000000-0000-0000-0000-000000000104', 'Vestuarios & Lockers', 'Duchas calientes y Wi-Fi Pro', 'servicio_gratis', 0.00, 'shower', true)
ON CONFLICT (id) DO NOTHING;

-- Configuración del club
INSERT INTO public.club_settings (
    id, club_name, whatsapp_phone, cbu_alias, cbu_number, bank_name, account_holder, address, timezone, open_time, close_time, night_light_surcharge, unpaid_expiry_minutes
)
VALUES (
    '00000000-0000-0000-0000-000000000099',
    'Club Central Padel & Sport',
    '573001234567',
    'PADEL.CENTRAL.PRO',
    '0000003100045892348210',
    'Bancolombia / Nequi',
    'Padel Assist Club S.A.S.',
    'Av. Los Pinos 1420, Sede Norte',
    'America/Bogota',
    '07:00:00',
    '23:00:00',
    4.00,
    30
)
ON CONFLICT (id) DO NOTHING;

-- Partido abierto inicial para 4to jugador
INSERT INTO public.open_matches (id, court_id, court_name, match_time, category_label, description, max_players, is_open)
VALUES (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000001',
    'Pista Central Panorámica',
    '20:00 hs',
    '5ª Categoría',
    'Falta 1 jugador de 5ª Categoría en Pista Central. ¡Únete en un toque!',
    4,
    true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.open_match_players (id, match_id, player_name, initials)
VALUES
    ('00000000-0000-0000-0000-000000000211', '00000000-0000-0000-0000-000000000201', 'Franco Ríos', 'FR'),
    ('00000000-0000-0000-0000-000000000212', '00000000-0000-0000-0000-000000000201', 'Andrés López', 'AL'),
    ('00000000-0000-0000-0000-000000000213', '00000000-0000-0000-0000-000000000201', 'Mateo Cruz', 'MC')
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 12. PUBLICACIÓN SUPABASE REALTIME
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

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.open_matches;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.open_match_players;
EXCEPTION WHEN duplicate_object THEN null; END $$;
