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
  // ✅ IGUAL QUE CollapsibleAside: leer localStorage al iniciar
  const [session, setSession] = useState(() => {
    const stored = localStorage.getItem("supabaseSession");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log("📌 Sesión restaurada:", parsed?.email || "No hay usuario");
        return parsed;
      } catch (e) {
        localStorage.removeItem("supabaseSession");
        return null;
      }
    }
    return null;
  });

  const [authLoading, setAuthLoading] = useState(!session);

  // ✅ IGUAL QUE CollapsibleAside: guardar en localStorage cuando cambia
  useEffect(() => {
    if (session) {
      localStorage.setItem("supabaseSession", JSON.stringify(session));
    } else {
      localStorage.removeItem("supabaseSession");
    }
  }, [session]);

  // ✅ IGUAL QUE CollapsibleAside: sincronizar con Supabase
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔄 Evento:", event);

      if (session) {
        // ✅ Guardar solo lo necesario (como en AuthCallback)
        const sessionData = {
          email: session.user.email,
          access_token: session.session.access_token,
          refresh_token: session.session.refresh_token,
          expires_at: session.session.expires_at,
        };
        setSession(sessionData);
      } else {
        setSession(null);
      }
    });

    // ✅ Sincronizar con Supabase al inicio
    const syncSession = async () => {
      const {
        data: { session: supabaseSession },
      } = await supabase.auth.getSession();
      if (supabaseSession) {
        const sessionData = {
          email: supabaseSession.user.email,
          access_token: supabaseSession.session.access_token,
          refresh_token: supabaseSession.session.refresh_token,
          expires_at: supabaseSession.session.expires_at,
        };
        setSession(sessionData);
        setAuthLoading(false);
      } else {
        setAuthLoading(false);
      }
    };

    syncSession();

    return () => subscription.unsubscribe();
  }, []);

  console.log("📊 Estado:", session?.email || "No autenticado");

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
