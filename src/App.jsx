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
    console.log("📌 App: Leyendo localStorage al iniciar...");
    
    // 🔍 VERIFICAR TODAS LAS CLAVES EN LOCALSTORAGE
    console.log("📌 App: Todas las claves en localStorage:");
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      console.log(`   - ${key}: ${localStorage.getItem(key)?.substring(0, 50)}...`);
    }
    
    const stored = localStorage.getItem("supabaseSession");
    console.log("📌 App: Valor de supabaseSession:", stored ? "✅ Encontrado" : "❌ No encontrado");
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log("📌 App: Sesión encontrada:", parsed?.email || "No hay usuario");
        return parsed;
      } catch (e) {
        console.error("📌 App: Error parseando:", e);
        localStorage.removeItem("supabaseSession");
        return null;
      }
    }
    console.log("📌 App: localStorage vacío para supabaseSession");
    return null;
  });

  const [authLoading, setAuthLoading] = useState(false);

  // ✅ Escuchar cambios en autenticación
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔄 Evento de autenticación:", event);
      
      if (session) {
        const sessionData = {
          email: session.user.email,
          access_token: session.session.access_token,
          refresh_token: session.session.refresh_token,
          expires_at: session.session.expires_at,
        };
        localStorage.setItem("supabaseSession", JSON.stringify(sessionData));
        setSession(sessionData);
        console.log("✅ App: Sesión guardada en localStorage");
      } else {
        localStorage.removeItem("supabaseSession");
        setSession(null);
        console.log("❌ App: Sesión eliminada de localStorage");
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
  }, []);

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