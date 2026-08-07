// src/App.jsx
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
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
  // ✅ INICIALIZAR CON sessionStorage
  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSession] = useState(() => {
    const stored = sessionStorage.getItem("supabaseSession");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log(
          "📌 Sesión inicial desde sessionStorage:",
          parsed?.user?.email || "No hay usuario",
        );
        return parsed;
      } catch (e) {
        sessionStorage.removeItem("supabaseSession");
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    const initializeAuth = async () => {
      // ✅ Si ya hay sesión, no esperar a Supabase
      if (session) {
        console.log("📌 Sesión ya existe, saltando Supabase");
        setAuthLoading(false);
        return;
      }

      // ✅ Obtener sesión de Supabase
      const {
        data: { session: supabaseSession },
      } = await supabase.auth.getSession();
      console.log(
        "📌 Sesión desde Supabase:",
        supabaseSession?.user?.email || "No hay sesión",
      );

      if (supabaseSession) {
        setSession(supabaseSession);
        sessionStorage.setItem(
          "supabaseSession",
          JSON.stringify(supabaseSession),
        );
      }

      setAuthLoading(false);
    };

    initializeAuth();

    // ✅ Escuchar cambios en autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔄 Evento de autenticación:", event);
      console.log("👤 Usuario:", session?.user?.email || "No hay usuario");

      setSession(session);

      if (session) {
        sessionStorage.setItem("supabaseSession", JSON.stringify(session));
      } else {
        sessionStorage.removeItem("supabaseSession");
      }
    });

    return () => subscription.unsubscribe();
  }, [session]);

  console.log(
    "📊 Estado de sesión en App:",
    session?.user?.email || "No autenticado",
  );

  if (authLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <h2>Cargando...</h2>
      </div>
    );
  }

  return (
    <HashRouter>
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
    </HashRouter>
  );
}

export default App;
