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
  // ✅ RESTAURAR SESIÓN COMPLETA DE SUPABASE
  const [session, setSession] = useState(() => {
    const stored = localStorage.getItem("supabaseSession");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log("📌 App: Sesión encontrada:", parsed?.email);
        // ✅ Devolver el objeto completo para que sea compatible con Supabase
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
    // ✅ ESCUCHAR CAMBIOS EN AUTENTICACIÓN
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔄 Evento de autenticación:", event);
      
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (session) {
          // ✅ Guardar la sesión COMPLETA
          localStorage.setItem("supabaseSession", JSON.stringify(session));
          setSession(session);
          console.log("✅ App: Sesión guardada");
        }
      } else if (event === "SIGNED_OUT") {
        localStorage.removeItem("supabaseSession");
        setSession(null);
        console.log("❌ App: Sesión eliminada");
      } else if (event === "INITIAL_SESSION") {
        // ✅ En INITIAL_SESSION, mantener la sesión existente
        if (!session) {
          const stored = localStorage.getItem("supabaseSession");
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              setSession(parsed);
              console.log("✅ App: Sesión restaurada desde localStorage");
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
        localStorage.setItem("supabaseSession", JSON.stringify(supabaseSession));
        setSession(supabaseSession);
        console.log("✅ App: Sesión sincronizada con Supabase");
      }
    };

    syncSession();

    return () => subscription.unsubscribe();
  }, []);

  console.log("📊 App: Estado de sesión:", session?.user?.email || "No autenticado");

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