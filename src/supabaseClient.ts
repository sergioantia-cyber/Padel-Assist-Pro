import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://demo-padelassist.supabase.co';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'demo-anon-key-padel-assist-2025';

export const isSupabaseConfigured = Boolean(
  import.meta.env?.VITE_SUPABASE_URL &&
  !import.meta.env.VITE_SUPABASE_URL.includes('TU_PROYECTO') &&
  !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_PROJECT')
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
