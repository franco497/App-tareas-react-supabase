// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import Login from "./pages/login";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import { TaskContextProvider } from "./context/TaskContex";

function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Verificar si hay una sesión activa
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    // Escuchar cambios en la autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

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
    <BrowserRouter>
      <TaskContextProvider>
        <Routes>
          {/* Ruta de login - si ya está logueado, redirige al dashboard */}
          <Route
            path="/"
            element={!session ? <Login /> : <Navigate to="/dashboard" />}
          />

          {/* Ruta de callback para magic link */}
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Ruta del dashboard - si no está logueado, redirige al login */}
          <Route
            path="/dashboard"
            element={session ? <Dashboard /> : <Navigate to="/" />}
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TaskContextProvider>
    </BrowserRouter>
  );
}

export default App;
