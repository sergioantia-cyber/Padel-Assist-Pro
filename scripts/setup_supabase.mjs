import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

console.log('--- Diagnóstico de Conexión Supabase ---');
console.log('URL:', supabaseUrl);
console.log('Anon Key Presente:', Boolean(anonKey));
console.log('Service Role Key Presente:', Boolean(serviceKey));

if (!serviceKey) {
  console.log('\n⚠️ Nota: Para ejecutar migraciones DDL completas (CREATE TABLE, FUNCTION, BUCKETS) desde Node, se requiere el SUPABASE_SERVICE_ROLE_KEY en el archivo .env.');
  console.log('De forma alternativa, puedes copiar el archivo src/db/complete_setup.sql y ejecutarlo directamente en el SQL Editor del panel de Supabase:');
  console.log('👉 https://supabase.com/dashboard/project/sembcqfavhepdyctgkcp/sql');
} else {
  console.log('Iniciando ejecución con Service Role Key...');
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });
  // Execute checks
}
