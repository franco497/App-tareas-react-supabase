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
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // ✅ RESTAURAR SESIÓN DESDE LOCALSTORAGE
    const restoreSession = async () => {
      const stored = localStorage.getItem("supabaseSession");
      
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          console.log("📌 App: Sesión encontrada en localStorage:", parsed?.user?.email);
          
          // ✅ ESTABLECER LA SESIÓN EN SUPABASE
          // Supabase necesita que la sesión se establezca correctamente
          const { data, error } = await supabase.auth.setSession({
            access_token: parsed.session?.access_token || parsed.access_token,
            refresh_token: parsed.session?.refresh_token || parsed.refresh_token,
          });
          
          if (error) {
            console.error("❌ Error restaurando sesión:", error);
            localStorage.removeItem("supabaseSession");
            setSession(null);
          } else {
            console.log("✅ Sesión restaurada correctamente");
            setSession(parsed);
          }
        } catch (e) {
          console.error("❌ Error parseando sesión:", e);
          localStorage.removeItem("supabaseSession");
          setSession(null);
        }
      }
      
      setAuthLoading(false);
    };

    restoreSession();

    // ✅ ESCUCHAR CAMBIOS EN AUTENTICACIÓN
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔄 Evento de autenticación:", event);
      
      if (session) {
        console.log("👤 Usuario autenticado:", session.user.email);
        localStorage.setItem("supabaseSession", JSON.stringify(session));
        setSession(session);
      } else if (event === "SIGNED_OUT") {
        localStorage.removeItem("supabaseSession");
        setSession(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  console.log("📊 App: Estado de sesión:", session?.user?.email || "No autenticado");

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