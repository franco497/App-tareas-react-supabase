// src/App.jsx
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";  // ← Cambia BrowserRouter a HashRouter
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <h2>Cargando...</h2>
      </div>
    );
  }

  return (
    <HashRouter>  {/* ← Cambiado de BrowserRouter a HashRouter */}
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TaskContextProvider>
    </HashRouter>
  );
}

export default App;