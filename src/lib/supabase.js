// src/lib/supabase.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getRedirectUrl = () => {
  const hostname = window.location.hostname;
  const port = window.location.port;
  const protocol = window.location.protocol;

  // ✅ DETECTAR LOCALHOST (cualquier puerto)
  const isLocal = hostname === "localhost" || 
                  hostname === "127.0.0.1";

  // ✅ Si es local, usar la URL con el puerto actual
  if (isLocal) {
    return `${protocol}//${hostname}:${port}/auth/callback`;
  }

  // ✅ Para producción (Netlify)
  return "https://sistema-tareas-recordatorios.netlify.app/auth/callback";
};