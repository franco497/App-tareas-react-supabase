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
  // ✅ FUNCIÓN QUE LEE localStorage CADA VEZ QUE SE LLAMA
  const getSessionFromStorage = () => {
    const stored = localStorage.getItem("supabaseSession");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log(
          "📌 Leyendo localStorage:",
          parsed?.user?.email || "No hay usuario",
        );
        return parsed;
      } catch (e) {
        localStorage.removeItem("supabaseSession");
        return null;
      }
    }
    console.log("📌 localStorage vacío");
    return null;
  };

  // ✅ INICIALIZAR CON localStorage
  const [session, setSession] = useState(getSessionFromStorage());
  const [authLoading, setAuthLoading] = useState(false);

  // ✅ EFECTO PARA SINCORNIZAR CON SUPABASE
  useEffect(() => {
    // ✅ ESCUCHAR CAMBIOS EN AUTENTICACIÓN
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔄 Evento de autenticación:", event);
      console.log("👤 Usuario:", session?.user?.email || "No hay usuario");

      if (session) {
        localStorage.setItem("supabaseSession", JSON.stringify(session));
        setSession(session);
      } else {
        localStorage.removeItem("supabaseSession");
        setSession(null);
      }
    });

    // ✅ SINCROINZAR CON SUPABASE
    const syncSession = async () => {
      const {
        data: { session: supabaseSession },
      } = await supabase.auth.getSession();
      if (supabaseSession) {
        localStorage.setItem(
          "supabaseSession",
          JSON.stringify(supabaseSession),
        );
        setSession(supabaseSession);
      } else {
        // ✅ SI NO HAY SESIÓN EN SUPABASE, PERO HAY EN LOCALSTORAGE, USAR LOCALSTORAGE
        const storedSession = getSessionFromStorage();
        if (storedSession) {
          setSession(storedSession);
        }
      }
    };

    syncSession();

    return () => subscription.unsubscribe();
  }, []);

  console.log(
    "📊 Estado de sesión en App:",
    session?.user?.email || "No autenticado",
  );

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
