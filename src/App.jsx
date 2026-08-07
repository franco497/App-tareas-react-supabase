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
  // ✅ LEER LOCALSTORAGE EN CADA RENDERIZADO
  const getSession = () => {
    const stored = localStorage.getItem("supabaseSession");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        localStorage.removeItem("supabaseSession");
        return null;
      }
    }
    return null;
  };

  const [session, setSession] = useState(getSession());
  const [authLoading, setAuthLoading] = useState(!getSession());

  useEffect(() => {
    // ✅ ESCUCHAR CAMBIOS EN AUTENTICACIÓN
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔄 Evento de autenticación:", event);
      console.log("👤 Usuario:", session?.user?.email || "No hay usuario");
      
      setSession(session);
      
      if (session) {
        localStorage.setItem("supabaseSession", JSON.stringify(session));
      } else {
        localStorage.removeItem("supabaseSession");
      }
      setAuthLoading(false);
    });

    // ✅ SI HAY SESIÓN EN LOCALSTORAGE, ACTUALIZAR ESTADO
    const stored = getSession();
    if (stored && !session) {
      setSession(stored);
      setAuthLoading(false);
    }

    // ✅ SINCROINZAR CON SUPABASE
    const syncSession = async () => {
      const { data: { session: supabaseSession } } = await supabase.auth.getSession();
      if (supabaseSession) {
        setSession(supabaseSession);
        localStorage.setItem("supabaseSession", JSON.stringify(supabaseSession));
      }
      setAuthLoading(false);
    };

    syncSession();

    return () => subscription.unsubscribe();
  }, []);

  console.log("📊 Estado de sesión en App:", session?.user?.email || "No autenticado");

  if (authLoading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}>
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