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
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const stored = localStorage.getItem("supabaseSession");

        if (stored) {
          try {
            const parsed = JSON.parse(stored);

            // ✅ Verificar si la sesión es válida
            const { data, error } = await supabase.auth.setSession({
              access_token: parsed.session?.access_token || parsed.access_token,
              refresh_token:
                parsed.session?.refresh_token || parsed.refresh_token,
            });

            if (error) {
              console.error("❌ Error restaurando sesión:", error);
              localStorage.removeItem("supabaseSession");
              setSession(null);
            } else {
              // ✅ Usar la sesión de data.session que devuelve Supabase
              setSession(data.session || parsed);
              console.log(
                `✅ App - Sesión restaurada: ${data.session?.user?.email || parsed?.user?.email}`,
              );
            }
          } catch (e) {
            console.error("❌ Error parseando sesión:", e);
            localStorage.removeItem("supabaseSession");
            setSession(null);
          }
        }

        setAuthLoading(false);
        setAuthInitialized(true);
      } catch (error) {
        console.error("❌ Error en restoreSession:", error);
        setAuthLoading(false);
        setAuthInitialized(true);
      }
    };

    restoreSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`🔄 App - Evento: ${event}`);

      if (session) {
        console.log(`✅ App - Sesión activa: ${session.user.email}`);
        localStorage.setItem("supabaseSession", JSON.stringify(session));
        setSession(session);
      } else if (event === "SIGNED_OUT") {
        console.log("👋 App - Sesión cerrada");
        localStorage.removeItem("supabaseSession");
        setSession(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (authLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#1a1a2e",
          color: "#ffffff",
        }}
      >
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