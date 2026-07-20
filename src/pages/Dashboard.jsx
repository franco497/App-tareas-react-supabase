// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import TaskForm from "../components/TaskForm";
import TaskList from "../components/TaskList";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function Dashboard() {
  const [showTaskDone, setShowTaskDone] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();
  }, []);

  const handleToggleView = () => {
    setShowTaskDone(!showTaskDone);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <h2 className="loading-container-text">Cargando...</h2>
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      <Navbar
        showTaskDone={showTaskDone}
        onToggleView={handleToggleView}
        userEmail={user?.email}
      />
      
      <main className="main-content">
        <div className="dashboard-container">
          {/* ✅ SECCIÓN DE PENDIENTES - Solo visible en tareas pendientes */}
          {!showTaskDone && (
            <>
              <p className="welcome-text">
                Bienvenido {user?.email || "Usuario"}
              </p>
              <TaskForm />
              <div className="supabase-info-banner">
                <div className="supabase-info-content">
                  <p className="supabase-info-text">
                    <span className="info-icon">ℹ️</span>
                    El sistema está conectado a un back-end de Supabase con una base
                    de datos PostgreSQL, puedes probar la integración de la API de
                    Gmail enviando una notificación a tu correo electrónico
                  </p>
                </div>
              </div>
            </>
          )}

          <TaskList done={showTaskDone} />
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

export default Dashboard;