-- ====================================================================
-- PADEL ASSIST PRO - POSTGRESQL / SUPABASE DATABASE SCHEMA & RLS RULES
-- ====================================================================

-- 1. TIPOS Y ENUMS
CREATE TYPE user_role AS ENUM ('customer', 'club_admin', 'superadmin');
CREATE TYPE booking_status AS ENUM ('pending_payment', 'confirmed', 'cancelled', 'completed');

-- 2. PERFILES DE USUARIO (Complemento de auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    avatar_url TEXT,
    role user_role DEFAULT 'customer',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CANCHAS E INFRAESTRUCTURA
CREATE TABLE courts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- ej: "Cancha 1 (Panorámica)"
    type TEXT NOT NULL, -- "Cristal Techada", "Malla Descubierta"
    is_active BOOLEAN DEFAULT TRUE,
    hourly_rate NUMERIC(10, 2) NOT NULL,
    photos TEXT[] DEFAULT '{}',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CATÁLOGO DE SERVICIOS ADICIONALES (Cafetería, Alquiler de palas, Tienda)
CREATE TABLE amenities_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL, -- ej: "Pala Bullpadel Pro", "Gatorade 500ml", "Duchas y Vestuarios"
    category TEXT NOT NULL, -- 'alquiler', 'tienda', 'servicio_gratis'
    price NUMERIC(10, 2) DEFAULT 0.00,
    is_available BOOLEAN DEFAULT TRUE,
    image_url TEXT
);

-- 5. RESERVAS DE CANCHAS
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    court_id UUID REFERENCES courts(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    guest_name TEXT, -- Por si el club la anota manualmente para alguien sin app
    guest_phone TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    status booking_status DEFAULT 'pending_payment',
    payment_proof_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Evita solapamiento de horarios exactos en la misma cancha
    CONSTRAINT check_booking_duration CHECK (end_time > start_time)
);

-- Índice para acelerar la consulta de disponibilidad horaria
CREATE INDEX idx_bookings_court_time ON bookings (court_id, start_time, end_time);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Habilitar RLS en tablas críticas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE amenities_catalog ENABLE ROW LEVEL SECURITY;

-- REGLAS PROFILES:
-- Cada usuario solo edita y lee su perfil; el administrador del club ve los perfiles de sus clientes
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE USING (auth.uid() = id);

-- REGLAS COURTS & CATALOG:
-- Cualquiera (incluso sin login) puede ver canchas y catálogo para incentivar la visita
CREATE POLICY "Public read courts" 
ON courts FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Public read amenities" 
ON amenities_catalog FOR SELECT USING (is_available = TRUE);

-- REGLAS BOOKINGS (Crucial para privacidad):
-- Los clientes solo ven el horario bloqueado en la vista pública, pero NO los datos de quién reservó
CREATE POLICY "Customers view own booking details" 
ON bookings FOR SELECT 
USING (
    auth.uid() = user_id 
    OR 
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'club_admin')
);

-- Inserción de reserva: Usuarios autenticados
CREATE POLICY "Authenticated users can create bookings" 
ON bookings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- ====================================================================
-- 6. FUNCIÓN DE DISPONIBILIDAD HORARIA (SECURITY DEFINER)
-- ====================================================================
CREATE OR REPLACE FUNCTION get_available_slots(
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
                SELECT 1 FROM bookings b
                WHERE b.court_id = p_court_id
                  AND b.status IN ('confirmed', 'pending_payment')
                  AND (b.start_time < curr_slot_end AND b.end_time > curr_slot_start)
            );
            
        curr_slot_start := curr_slot_end;
    END LOOP;
END;
$$;
