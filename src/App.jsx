// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import Login from "./pages/login";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import ScheduledTasks from "./pages/ScheduledTasks";
import NotFound from "./pages/NotFound";
import { TaskContextProvider } from "./context";
import Trash from "./pages/Trash";

function App() {
  // ✅ LEER localStorage INMEDIATAMENTE
  const [session, setSession] = useState(() => {
    const stored = localStorage.getItem("supabaseSession");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log("📌 App: Sesión encontrada:", parsed?.email);
        return parsed;
      } catch (e) {
        localStorage.removeItem("supabaseSession");
        return null;
      }
    }
    return null;
  });

  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    // ✅ ESCUCHAR CAMBIOS EN AUTENTICACIÓN (PERO SIN BORRAR LOCALSTORAGE EN INITIAL_SESSION)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔄 Evento de autenticación:", event);
      console.log("👤 Sesión en evento:", session?.user?.email || "No hay usuario");
      
      // ✅ SOLO ACTUALIZAR SI ES UN EVENTO DE AUTENTICACIÓN REAL
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        if (session) {
          const sessionData = {
            email: session.user.email,
            access_token: session.session.access_token,
            refresh_token: session.session.refresh_token,
            expires_at: session.session.expires_at,
          };
          localStorage.setItem("supabaseSession", JSON.stringify(sessionData));
          setSession(sessionData);
          console.log("✅ App: Sesión guardada/actualizada en localStorage");
        } else {
          // ✅ SOLO BORRAR EN SIGNED_OUT
          if (event === "SIGNED_OUT") {
            localStorage.removeItem("supabaseSession");
            setSession(null);
            console.log("❌ App: Sesión eliminada de localStorage (SIGNED_OUT)");
          }
        }
      } else if (event === "INITIAL_SESSION") {
        // ✅ EN INITIAL_SESSION, NO BORRAR localStorage
        console.log("📌 App: INITIAL_SESSION - Manteniendo sesión existente");
        // Si hay sesión en localStorage y el evento no tiene sesión, mantener la de localStorage
        if (!session) {
          const stored = localStorage.getItem("supabaseSession");
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              setSession(parsed);
              console.log("✅ App: Sesión restaurada desde localStorage en INITIAL_SESSION");
            } catch (e) {
              localStorage.removeItem("supabaseSession");
            }
          }
        }
      }
    });

    // ✅ Sincronizar con Supabase
    const syncSession = async () => {
      const { data: { session: supabaseSession } } = await supabase.auth.getSession();
      if (supabaseSession) {
        const sessionData = {
          email: supabaseSession.user.email,
          access_token: supabaseSession.session.access_token,
          refresh_token: supabaseSession.session.refresh_token,
          expires_at: supabaseSession.session.expires_at,
        };
        localStorage.setItem("supabaseSession", JSON.stringify(sessionData));
        setSession(sessionData);
        console.log("✅ App: Sesión sincronizada con Supabase");
      }
    };

    syncSession();

    return () => subscription.unsubscribe();
  }, [session]);

  console.log("📊 App: Estado de sesión final:", session?.email || "No autenticado");

  if (authLoading) {
    return <div>Cargando...</div>;
  }

  return (
    <BrowserRouter>
      <TaskContextProvider>
        <Routes>
          <Route
            path="/"
            element={!session ? <Login /> : <Navigate to="/dashboard" />}
          />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route
            path="/dashboard"
            element={session ? <Dashboard /> : <Navigate to="/" />}
          />
          <Route
            path="/scheduled"
            element={session ? <ScheduledTasks /> : <Navigate to="/" />}
          />
          <Route path="*" element={<NotFound />} />
          <Route
            path="/trash"
            element={session ? <Trash /> : <Navigate to="/" />}
          />
        </Routes>
      </TaskContextProvider>
    </BrowserRouter>
  );
}

export default App;