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
  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    // ✅ 1. RESTAURAR SESIÓN DESDE SESSIONSTORAGE
    const storedSession = sessionStorage.getItem("supabaseSession");
    if (storedSession) {
      try {
        const parsedSession = JSON.parse(storedSession);
        console.log("📌 Sesión restaurada desde sessionStorage:", parsedSession?.user?.email);
        setSession(parsedSession);
      } catch (e) {
        console.error("❌ Error restaurando sesión:", e);
        sessionStorage.removeItem("supabaseSession");
      }
    }

    // ✅ 2. OBTENER SESIÓN DE SUPABASE
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log("📌 Sesión desde Supabase:", session?.user?.email || "No hay sesión");
      
      if (session) {
        setSession(session);
        sessionStorage.setItem("supabaseSession", JSON.stringify(session));
      } else {
        sessionStorage.removeItem("supabaseSession");
      }
      
      setAuthLoading(false);
    };

    getSession();

    // ✅ 3. ESCUCHAR CAMBIOS EN AUTENTICACIÓN
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔄 Evento de autenticación:", event);
      console.log("👤 Usuario:", session?.user?.email || "No hay usuario");
      
      setSession(session);
      
      // ✅ Guardar o eliminar sesión en sessionStorage
      if (session) {
        sessionStorage.setItem("supabaseSession", JSON.stringify(session));
      } else {
        sessionStorage.removeItem("supabaseSession");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ✅ LOG DEL ESTADO DE SESIÓN
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