// src/lib/supabase.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("🔍 Verificando conexión Supabase:");
console.log("URL:", supabaseUrl);
console.log("Key existe:", !!supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ✅ AGREGAR ESTA FUNCIÓN
export const getRedirectUrl = () => {
  const hostname = window.location.hostname;
  const port = window.location.port;
  const protocol = window.location.protocol;

  // Detectar si es localhost
  const isLocal = hostname === "localhost" || hostname === "5175";

  if (isLocal) {
    // Para local: usa el puerto actual (5173, 3000, etc.)
    return `${protocol}//${hostname}:${port}/auth/callback`;
  }

  // Para producción (Netlify)
  return "https://sistema-tareas-recordatorios.netlify.app/auth/callback";
};
