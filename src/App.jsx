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
  const getInitialSession = () => {
    const stored = localStorage.getItem("supabaseSession");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log("📌 App - Sesión desde localStorage:", parsed?.user?.email);
        return parsed;
      } catch (e) {
        localStorage.removeItem("supabaseSession");
        return null;
      }
    }
    return null;
  };

  const [session, setSession] = useState(getInitialSession());
  const [authLoading, setAuthLoading] = useState(!getInitialSession());

  useEffect(() => {
    const initializeAuth = async () => {
      console.log("🚀 App - Inicializando autenticación...");
      const stored = localStorage.getItem("supabaseSession");
      
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          console.log("📌 App - Restaurando sesión desde localStorage:", parsed?.user?.email);
          
          const accessToken = parsed.session?.access_token || parsed.access_token;
          const refreshToken = parsed.session?.refresh_token || parsed.refresh_token;
          
          if (accessToken && refreshToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (error) {
              console.error("❌ App - Error restaurando sesión:", error);
              localStorage.removeItem("supabaseSession");
              setSession(null);
            } else {
              console.log("✅ App - Sesión restaurada correctamente");
              setSession(data.session || parsed);
            }
          } else {
            console.error("❌ App - Tokens incompletos en localStorage");
            localStorage.removeItem("supabaseSession");
            setSession(null);
          }
        } catch (e) {
          console.error("❌ App - Error parseando sesión:", e);
          localStorage.removeItem("supabaseSession");
          setSession(null);
        }
      }

      if (!stored || !session) {
        const { data: { session: supabaseSession } } = await supabase.auth.getSession();
        if (supabaseSession) {
          console.log("📌 App - Sesión desde Supabase:", supabaseSession.user.email);
          setSession(supabaseSession);
          localStorage.setItem("supabaseSession", JSON.stringify(supabaseSession));
        }
      }
      
      setAuthLoading(false);
      console.log("✅ App - Autenticación inicializada");
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`🔄 App - Evento de autenticación: ${event}`);
      
      if (session) {
        console.log(`👤 App - Usuario autenticado: ${session.user.email}`);
        localStorage.setItem("supabaseSession", JSON.stringify(session));
        setSession(session);
      } else if (event === "SIGNED_OUT") {
        console.log("👋 App - Usuario cerró sesión");
        localStorage.removeItem("supabaseSession");
        setSession(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [session]);

  console.log(`📊 App - Estado actual: ${session?.user?.email || "No autenticado"}`);

  if (authLoading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "#1a1a2e",
        color: "#ffffff",
      }}>
        <h2>Cargando...</h2>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <TaskContextProvider initialSession={session}>
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